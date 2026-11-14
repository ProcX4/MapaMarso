/*
 * Rover photos near a point (Security Spec §3): "what you'll see when you arrive".
 * Finds the Perseverance stop nearest the point, from NASA's own traverse waypoints (the data behind the
 * "Where is Perseverance" map), then fetches the raw images taken at that stop from the mars.nasa.gov
 * raw-image feed, and returns a few, normalised and spread round the compass. Both are fetched here, on
 * the server: the waypoints file sends no CORS header. Only ever calls those two fixed mars.nasa.gov
 * URLs, with validated numbers, and only passes on image links on the raw-image host.
 *
 * What the upstream data looks like (checked 2026-11-15; a sample is in scripts/fixtures/):
 * - Waypoints: GeoJSON points, one per stop, properties { RMC: "site_drive", site, drive, sol, lon (°E),
 *   lat (°N, planetocentric), yaw (rover heading, ° clockwise from north), final: "y" | "n" }. Several
 *   records can share an RMC; "final" marks the one to use. `sol` is when the stop was logged: the rover
 *   can have been there since the previous stop's sol.
 * - Feed: { images: [...], total_results }. Each image: imageid, sol, site (number), drive (string),
 *   camera.instrument, sample_type, date_taken_utc, credit, link, image_files { small (320 px),
 *   medium (800), large (1200), full_res }, extended { mastAz, mastEl (° in the rover frame, mast cameras),
 *   dimension "(w,h)" }. Filenames carry the same site/drive as a motion counter, e.g. N0030000 = site 3,
 *   drive 0.
 * - Feed query: num (≤ 100), page, order=sol+desc, search=CAMERA|CAMERA, extended=sample_type::full,
 *   condition_N=<value>:sol:gte|lte (as the gallery page sends them). The feed ignores site and drive
 *   conditions, so those are matched here.
 *
 * This file must not import local modules (see api/tiles.ts).
 */

const WAYPOINTS_URL = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json'
const FEED_URL = 'https://mars.nasa.gov/rss/api/?feed=raw_images&category=mars2020&feedtype=json&ver=1.2'
/** The only hosts image and page links may point to */
const IMAGE_PREFIX = 'https://mars.nasa.gov/mars2020-raw-images/'
const PAGE_PREFIX = 'https://mars.nasa.gov/mars2020/multimedia/raw-images/'

const MARS_RADIUS_M = 3_389_500
const DEFAULT_RADIUS_M = 250
const MAX_RADIUS_M = 1000
/** Photos returned at most */
const MAX_PHOTOS = 8
/** Feed pages read at most per request (100 images each), newest first */
const MAX_PAGES = 4
const TIMEOUT_MS = 15_000
const MAX_BYTES = 8_000_000
/** Waypoints change once a drive is downlinked: keep them a few hours in this server instance */
const WAYPOINTS_TTL_MS = 6 * 3_600_000

/** Context cameras, left eye only (the right is a stereo twin), best first */
const CAMERAS = [
  { instrument: 'MCZ_LEFT', name: 'Mastcam-Z', mast: true },
  { instrument: 'NAVCAM_LEFT', name: 'Navcam', mast: true },
  { instrument: 'FRONT_HAZCAM_LEFT_A', name: 'Front Hazcam', mast: false },
] as const

export type RoverStop = { rmc: string; site: number; drive: number; sol: number; lon: number; lat: number; distanceM: number }

export type RoverPhoto = {
  id: string
  sol: number
  camera: string
  takenAt: string
  thumbUrl: string
  largeUrl: string
  /** The original, full resolution (the viewer swaps it in once you zoom); the large copy when there's none */
  fullUrl: string
  pageUrl: string
  /** Compass bearing the camera looked toward (rover heading + mast azimuth), when known */
  azimuth?: number
  siteDrive: string
  credit: string
}

export type RoverPhotosResponse = {
  /** The stop the photos come from, or null when Perseverance never stopped within the radius */
  stop: RoverStop | null
  /** Photos taken at that very stop, or (none there) on the sol it was logged */
  match: 'site-drive' | 'sol' | 'none'
  photos: RoverPhoto[]
}

type Waypoint = { rmc: string; site: number; drive: number; sol: number; lon: number; lat: number; yaw: number }

let waypoints: { at: number; list: Waypoint[] } | null = null

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error', headers: { accept: 'application/json' } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  if (Number(res.headers.get('content-length') ?? 0) > MAX_BYTES) throw new Error('Too large')
  const body = await res.text()
  if (body.length > MAX_BYTES) throw new Error('Too large')
  return JSON.parse(body)
}

const num = (v: unknown) => (typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN)

/** The rover's stops in driving order, one per RMC (the "final" record) */
async function loadWaypoints(): Promise<Waypoint[]> {
  if (waypoints && Date.now() - waypoints.at < WAYPOINTS_TTL_MS) return waypoints.list
  const data = (await getJson(WAYPOINTS_URL)) as { features?: { properties?: Record<string, unknown> }[] }
  const byRmc = new Map<string, Waypoint>()
  for (const f of data.features ?? []) {
    const p = f.properties ?? {}
    const w = { rmc: String(p.RMC), site: num(p.site), drive: num(p.drive), sol: num(p.sol), lon: num(p.lon), lat: num(p.lat), yaw: num(p.yaw) }
    if (![w.site, w.drive, w.sol, w.lon, w.lat].every(Number.isFinite)) continue
    if (p.final === 'y' || !byRmc.has(w.rmc)) byRmc.set(w.rmc, w)
  }
  const list = [...byRmc.values()].sort((a, b) => a.sol - b.sol || a.site - b.site || a.drive - b.drive)
  waypoints = { at: Date.now(), list }
  return list
}

/** Great-circle distance in metres on a 3,389.5 km Mars sphere */
function distanceM(lon1: number, lat1: number, lon2: number, lat2: number) {
  const rad = Math.PI / 180
  const dLat = (lat2 - lat1) * rad, dLon = (lon2 - lon1) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2
  return 2 * MARS_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)))
}

type FeedImage = {
  imageid?: string
  sol?: number
  site?: number
  drive?: string | number
  sample_type?: string
  date_taken_utc?: string
  credit?: string
  link?: string
  camera?: { instrument?: string }
  image_files?: { small?: string; large?: string; full_res?: string }
  extended?: { mastAz?: string; mastEl?: string; dimension?: string; subframeRect?: string }
}

async function feedPage(fromSol: number, toSol: number, page: number): Promise<FeedImage[]> {
  const q = [
    'num=100',
    `page=${page}`,
    'order=sol+desc',
    `search=${CAMERAS.map((c) => c.instrument).join('%7C')}`,
    'extended=sample_type::full,',
    `condition_2=${fromSol}:sol:gte`,
    `condition_3=${toSol}:sol:lte`,
  ].join('&')
  const data = (await getJson(`${FEED_URL}&${q}`)) as { images?: FeedImage[] }
  return Array.isArray(data.images) ? data.images : []
}

/** A usable context photo: full frame, real links, not pointed at the rover's own deck or the sky */
function usable(img: FeedImage) {
  const cam = CAMERAS.find((c) => c.instrument === img.camera?.instrument)
  if (!cam || img.sample_type !== 'Full' || !img.imageid) return false
  if (!img.image_files?.small?.startsWith(IMAGE_PREFIX) || !img.image_files.large?.startsWith(IMAGE_PREFIX)) return false
  // Subframes (calibration targets, close-ups of the rover) are small; full frames are 1,000+ px wide
  const width = Number(/^\((\d+),/.exec(img.extended?.dimension ?? '')?.[1])
  if (Number.isFinite(width) && width < 1000) return false
  const el = num(img.extended?.mastEl)
  if (cam.mast && Number.isFinite(el) && (el < -50 || el > 25)) return false
  return true
}

/** The frame shows the camera's whole view (perhaps scaled down), not a tile cut out of it */
const wholeFrame = (img: FeedImage) => (img.extended?.subframeRect ?? '').startsWith('(1,1,')

/**
 * One photo per exposure. Big frames come down as several tiles, and some twice over (two processings, e.g.
 * EBY and ECM), all with the same camera and time; keep the whole-frame version when there is one.
 */
function keepBest(byShot: Map<string, FeedImage>, img: FeedImage) {
  const key = `${img.camera?.instrument} ${img.date_taken_utc?.slice(0, 19)}`
  const had = byShot.get(key)
  if (!had || (wholeFrame(img) && !wholeFrame(had))) byShot.set(key, img)
}

function normalise(img: FeedImage, yaw: number): RoverPhoto {
  const cam = CAMERAS.find((c) => c.instrument === img.camera?.instrument)!
  const az = num(img.extended?.mastAz)
  // Mast cameras: rover heading + mast azimuth (rover frame, clockwise from forward); the front Hazcam looks
  // straight ahead
  const bearing = Number.isFinite(yaw) ? (cam.mast ? (Number.isFinite(az) ? yaw + az : NaN) : yaw) : NaN
  return {
    id: img.imageid!,
    sol: Number(img.sol),
    camera: cam.name,
    takenAt: img.date_taken_utc ?? '',
    thumbUrl: img.image_files!.small!,
    largeUrl: img.image_files!.large!,
    fullUrl: img.image_files!.full_res?.startsWith(IMAGE_PREFIX) ? img.image_files!.full_res : img.image_files!.large!,
    pageUrl: img.link?.startsWith(PAGE_PREFIX) ? img.link : `${PAGE_PREFIX}${encodeURIComponent(img.imageid!)}`,
    azimuth: Number.isFinite(bearing) ? Math.round(((bearing % 360) + 360) % 360) : undefined,
    siteDrive: `${img.site}_${img.drive}`,
    credit: (img.credit ?? 'NASA/JPL-Caltech').slice(0, 80),
  }
}

/**
 * Up to MAX_PHOTOS, spread round the compass: photos are grouped by which of eight directions they look
 * toward, best camera then newest first in each, and taken one direction at a time, round and round, so a
 * mosaic of many frames facing one way can't fill the strip. Returned newest first.
 */
function pick(photos: RoverPhoto[]) {
  const rank = (p: RoverPhoto) => CAMERAS.findIndex((c) => c.name === p.camera)
  const sorted = [...photos].sort((a, b) => rank(a) - rank(b) || b.takenAt.localeCompare(a.takenAt))
  const groups = new Map<string, RoverPhoto[]>()
  for (const p of sorted) {
    const key = p.azimuth === undefined ? 'unknown' : String(Math.round(p.azimuth / 45) % 8)
    groups.set(key, [...(groups.get(key) ?? []), p])
  }
  const queues = [...groups.values()]
  const chosen: RoverPhoto[] = []
  while (chosen.length < MAX_PHOTOS && queues.some((q) => q.length)) {
    for (const q of queues) if (q.length && chosen.length < MAX_PHOTOS) chosen.push(q.shift()!)
  }
  return chosen.sort((a, b) => b.takenAt.localeCompare(a.takenAt))
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') return text('Method not allowed', 405, { allow: 'GET' })
  const q = new URL(request.url).searchParams
  const lon = Number(q.get('lon')), lat = Number(q.get('lat'))
  const radius = q.has('radius') ? Number(q.get('radius')) : DEFAULT_RADIUS_M
  if (!(lon >= -180 && lon <= 180 && lat >= -90 && lat <= 90)) return text('Bad point: lon (°E, -180..180) and lat (°N)', 400)
  if (!(radius > 0 && radius <= MAX_RADIUS_M)) return text(`Bad radius: 1..${MAX_RADIUS_M} m`, 400)

  let stops: Waypoint[]
  try {
    stops = await loadWaypoints()
  } catch {
    return text('Rover waypoints unavailable', 502)
  }

  let best = -1, bestM = Infinity
  stops.forEach((w, i) => {
    const m = distanceM(lon, lat, w.lon, w.lat)
    if (m < bestM) [best, bestM] = [i, m]
  })
  // Most of Mars: no rover stop nearby, nothing rover-specific to show
  if (best < 0 || bestM > radius) return json({ stop: null, match: 'none', photos: [] }, 86_400)

  const w = stops[best]
  // The rover was here from the previous stop's sol until the next one's
  const fromSol = best > 0 ? stops[best - 1].sol : 0
  const next = stops[best + 1]
  const toSol = next ? next.sol : w.sol + 30
  const stop: RoverStop = { rmc: w.rmc, site: w.site, drive: w.drive, sol: w.sol, lon: w.lon, lat: w.lat, distanceM: Math.round(bestM) }

  const atStop = new Map<string, FeedImage>()
  const onSol = new Map<string, FeedImage>()
  try {
    for (let page = 0; page < MAX_PAGES && atStop.size < MAX_PHOTOS * 3; page++) {
      const images = await feedPage(fromSol, toSol, page)
      for (const img of images) {
        if (!usable(img)) continue
        if (img.site === w.site && Number(img.drive) === w.drive) keepBest(atStop, img)
        else if (img.sol === w.sol) keepBest(onSol, img)
      }
      if (images.length < 100) break
    }
  } catch {
    return text('Rover image feed unavailable', 502)
  }

  const match = atStop.size ? 'site-drive' : onSol.size ? 'sol' : 'none'
  const photos = atStop.size ? [...atStop.values()].map((img) => normalise(img, w.yaw)) : [...onSol.values()].map((img) => normalise(img, NaN))
  const body: RoverPhotosResponse = { stop, match, photos: pick(photos) }
  // A stop the rover has left won't get new pictures: keep it a day in the browser and a month at the edge.
  // The latest stop can still gain some, so only ten minutes.
  return json(body, next ? 86_400 : 600, next ? 2_592_000 : 600)
}

// Vercel calls the exported method handler; anything else gets a 405 from the same check.
export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET

function json(body: RoverPhotosResponse, maxAge: number, sMaxAge = maxAge) {
  return new Response(JSON.stringify(body), {
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${maxAge}, s-maxage=${sMaxAge}`,
      'x-content-type-options': 'nosniff',
    },
  })
}

function text(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
}
