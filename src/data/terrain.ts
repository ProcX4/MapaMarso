import type { LngLat } from '../state/types'
import { loadDtmGrid, sampleGrid, type DtmGrid } from './elevation'
import { bearingDeg, distanceM, metresPerDegree } from './mars'
import { PATHFINDING, SLOPE_BANDS } from '../config/assumptions'

/*
 * Elevation anywhere on Mars, as a grid of heights in metres:
 *  - inside the demo site, the 20 m/px Jezero CTX DTM (public/data/site-dtm.tif);
 *  - everywhere else, a window of the global 463 m/px MOLA DEM, through api/elevation.ts.
 * The A* route finder, the elevation profile and the site card all read from here.
 */

export type TerrainSource = 'site' | 'mola'
/** obstacles: rocky share per cell (0–100 %, 255 = not covered), on the site DTM only */
export type TerrainGrid = DtmGrid & { source: TerrainSource; resM: number; obstacles?: Uint8Array }

export const OBSTACLES_URL = '/data/site-obstacles.bin'

export const TERRAIN_NOTE: Record<TerrainSource, string> = {
  site: 'Jezero CTX DTM, 20 m/px (USGS)',
  mola: 'MOLA global DEM, 463 m/px (USGS)',
}

const TIMEOUT_MS = 30_000
/** Smallest MOLA window fetched, so even a short route has ground around it to steer through */
const MIN_SPAN_DEG = 0.3

let site: Promise<TerrainGrid | null> | null = null

/** The site DTM, or null when it's missing (then MOLA covers the site too). */
export function siteTerrain() {
  site ??= Promise.all([loadDtmGrid(), loadObstacles()])
    .then(([g, obstacles]): TerrainGrid => ({
      ...g,
      source: 'site',
      resM: ((g.bbox[3] - g.bbox[1]) / g.height) * metresPerDegree(0).lat,
      // Only if it was built for this exact grid (scripts/build-obstacles.mjs)
      obstacles: obstacles?.length === g.width * g.height ? obstacles : undefined,
    }))
    .catch((err) => {
      console.info('Site DTM not available:', err?.message ?? err)
      return null
    })
  return site
}

/** The site's rocky-ground map, or null if it hasn't been built */
async function loadObstacles() {
  try {
    const res = await fetch(OBSTACLES_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    return res.ok ? new Uint8Array(await res.arrayBuffer()) : null
  } catch {
    return null
  }
}

const inside = (g: DtmGrid, [lon, lat]: LngLat) => lon > g.bbox[0] && lon < g.bbox[2] && lat > g.bbox[1] && lat < g.bbox[3]

/** A window of the MOLA DEM, [west, south, east, north] in degrees. */
export async function molaGrid([w, s, e, n]: [number, number, number, number]): Promise<TerrainGrid> {
  const q = new URLSearchParams({ w: w.toFixed(4), s: s.toFixed(4), e: e.toFixed(4), n: n.toFixed(4) })
  const res = await fetch(`/api/elevation?${q}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`Elevation ${res.status}`)
  const width = Number(res.headers.get('x-grid-width'))
  const height = Number(res.headers.get('x-grid-height'))
  const bbox = (res.headers.get('x-grid-bbox') ?? '').split(',').map(Number) as TerrainGrid['bbox']
  const noData = Number(res.headers.get('x-grid-nodata'))
  const raw = new Int16Array(await res.arrayBuffer())
  if (!width || !height || raw.length !== width * height || bbox.length !== 4) throw new Error('Bad elevation grid')
  const values = new Float32Array(raw.length)
  let min = Infinity, max = -Infinity
  for (let i = 0; i < raw.length; i++) {
    const v = raw[i] === noData ? NaN : raw[i]
    values[i] = v
    if (v < min) min = v
    if (v > max) max = v
  }
  return { width, height, bbox, values, min, max, source: 'mola', resM: Number(res.headers.get('x-grid-res-m')) }
}

/**
 * Terrain for a route: the site DTM when every stop is on it, otherwise MOLA around the stops, with room
 * either side for the path to go round things.
 */
export async function terrainFor(points: LngLat[]): Promise<TerrainGrid> {
  const dtm = await siteTerrain()
  if (dtm && points.every((p) => inside(dtm, p))) return dtm
  const lons = points.map((p) => p[0]), lats = points.map((p) => p[1])
  let [w, e, s, n] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
  const spanM = Math.hypot((e - w) * metresPerDegree((s + n) / 2).lon, (n - s) * metresPerDegree(0).lat)
  const pad = Math.max(PATHFINDING.minSearchMarginM, PATHFINDING.searchMargin * spanM) / metresPerDegree(0).lat
  const padLon = pad / Math.max(0.2, Math.cos((((s + n) / 2) * Math.PI) / 180))
  w -= padLon; e += padLon; s -= pad; n += pad
  if (e - w < MIN_SPAN_DEG) [w, e] = [(w + e) / 2 - MIN_SPAN_DEG / 2, (w + e) / 2 + MIN_SPAN_DEG / 2]
  if (n - s < MIN_SPAN_DEG) [s, n] = [(s + n) / 2 - MIN_SPAN_DEG / 2, (s + n) / 2 + MIN_SPAN_DEG / 2]
  return molaGrid([Math.max(-180, w), Math.max(-90, s), Math.min(180, e), Math.min(90, n)])
}

export type NearbySteep = { m: number; bearingDeg: number; slopeDeg: number }
export type PointTerrain = { elevM: number | null; slopeDeg: number | null; nearbySteep: NearbySteep | null; source: TerrainSource }

/** How far round a clicked point the site card looks for steep ground */
export const NEARBY_HAZARD_M = 1000
const steepMin = SLOPE_BANDS.find((b) => b.token === 'hazard')!.min

/** Height, slope and the nearest steep ground round one point, from the best elevation there is for it. */
export async function pointTerrain(at: LngLat): Promise<PointTerrain> {
  const dtm = await siteTerrain()
  const grid = dtm && inside(dtm, at) ? dtm : await molaGrid(around(at))
  return {
    elevM: sampleGrid(grid, grid.values, at),
    slopeDeg: slopeAt(grid, at),
    nearbySteep: nearestSteep(grid, at, NEARBY_HAZARD_M),
    source: grid.source,
  }
}

/** MOLA pixels either side of a point, enough to look NEARBY_HAZARD_M round it */
function around([lon, lat]: LngLat): [number, number, number, number] {
  const d = Math.max(4 / 128, (1.5 * NEARBY_HAZARD_M) / metresPerDegree(0).lat)
  const dLon = d / Math.max(0.2, Math.cos((lat * Math.PI) / 180))
  return [Math.max(-180, lon - dLon), Math.max(-90, lat - d), Math.min(180, lon + dLon), Math.min(90, lat + d)]
}

/** The closest cell within radiusM whose slope is in the hazard band or steeper, with its distance and bearing. */
export function nearestSteep(g: DtmGrid, at: LngLat, radiusM: number): NearbySteep | null {
  const [west, south, east, north] = g.bbox
  const dLon = (east - west) / g.width, dLat = (north - south) / g.height
  const m = metresPerDegree(at[1])
  const rx = Math.ceil(radiusM / (dLon * m.lon)), ry = Math.ceil(radiusM / (dLat * m.lat))
  const cx = Math.floor((at[0] - west) / dLon), cy = Math.floor((north - at[1]) / dLat)
  let best: NearbySteep | null = null
  for (let y = cy - ry; y <= cy + ry; y++) {
    for (let x = cx - rx; x <= cx + rx; x++) {
      const p: LngLat = [west + (x + 0.5) * dLon, north - (y + 0.5) * dLat]
      const d = distanceM(at, p)
      if (d > radiusM || (best && d >= best.m)) continue
      const s = slopeAt(g, p)
      if (s !== null && s >= steepMin) best = { m: d, bearingDeg: bearingDeg(at, p), slopeDeg: s }
    }
  }
  return best
}

/** Slope in degrees at a point (Horn's method on the 3×3 cells round it), or null at the edge or by no-data. */
export function slopeAt(g: DtmGrid, [lon, lat]: LngLat): number | null {
  const [west, south, east, north] = g.bbox
  const x = Math.floor(((lon - west) / (east - west)) * g.width)
  const y = Math.floor(((north - lat) / (north - south)) * g.height)
  if (x < 1 || y < 1 || x > g.width - 2 || y > g.height - 2) return null
  const m = metresPerDegree(lat)
  const dx = ((east - west) / g.width) * m.lon
  const dy = ((north - south) / g.height) * m.lat
  const v = (i: number, j: number) => g.values[(y + j) * g.width + x + i]
  const dzdx = (v(1, -1) + 2 * v(1, 0) + v(1, 1) - (v(-1, -1) + 2 * v(-1, 0) + v(-1, 1))) / (8 * dx)
  const dzdy = (v(-1, 1) + 2 * v(0, 1) + v(1, 1) - (v(-1, -1) + 2 * v(0, -1) + v(1, -1))) / (8 * dy)
  const s = (Math.atan(Math.hypot(dzdx, dzdy)) * 180) / Math.PI
  return Number.isNaN(s) ? null : s
}
