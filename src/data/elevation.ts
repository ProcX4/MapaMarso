import { fromUrl, type GeoTIFFImage } from 'geotiff'
import type { LngLat } from '../state/types'

/*
 * Elevation of the demo site, in metres: the USGS Mars 2020 CTX DTM of Jezero (20 m/px), a GeoTIFF in lon/lat
 * degrees or in equirectangular metres on the Mars sphere. Picture tiles only hold colours; this holds numbers.
 * Everywhere else on Mars, see terrain.ts (the global MOLA DEM).
 *
 * loadDtmGrid reads the whole site, downsampled to at most GRID_MAX px a side, and keeps it in memory
 * for the route finder, the profile and the site card.
 */

export const DTM_URL = '/data/site-dtm.tif'
const GRID_MAX = 2048

export type DtmGrid = {
  width: number
  height: number
  /** [minLon, minLat, maxLon, maxLat] */
  bbox: [number, number, number, number]
  values: Float32Array // row-major from the north edge; NaN = no data
  min: number
  max: number
}

let imagePromise: Promise<GeoTIFFImage> | null = null

function image() {
  imagePromise ??= fromUrl(DTM_URL).then((tiff) => tiff.getImage())
  return imagePromise
}

function bboxOf(img: GeoTIFFImage): DtmGrid['bbox'] {
  const [a, b, c, d] = img.getBoundingBox()
  const keys = img.getGeoKeys() as Record<string, number> | null
  // USGS products often come in equirectangular metres on the Mars sphere, centred on 0°: a plain scale to degrees
  if (keys?.ProjCoordTransGeoKey === 17 && !keys.ProjCenterLongGeoKey && !keys.ProjStdParallel1GeoKey) {
    const deg = 180 / (Math.PI * (keys.GeogSemiMajorAxisGeoKey || 3396190))
    return [a * deg, b * deg, c * deg, d * deg]
  }
  return [a, b, c, d]
}

let gridPromise: Promise<DtmGrid> | null = null

export function loadDtmGrid(): Promise<DtmGrid> {
  gridPromise ??= image().then(async (img) => {
    const scale = Math.min(1, GRID_MAX / Math.max(img.getWidth(), img.getHeight()))
    const width = Math.max(1, Math.round(img.getWidth() * scale))
    const height = Math.max(1, Math.round(img.getHeight() * scale))
    const [band] = (await img.readRasters({ samples: [0], width, height, resampleMethod: 'bilinear' })) as unknown as ArrayLike<number>[]
    const noData = img.getGDALNoData()
    const values = new Float32Array(width * height)
    let min = Infinity
    let max = -Infinity
    for (let i = 0; i < values.length; i++) {
      const v = clean(band[i], noData) ?? NaN
      values[i] = v
      if (v < min) min = v
      if (v > max) max = v
    }
    return { width, height, bbox: bboxOf(img), values, min, max }
  })
  return gridPromise
}

/** Bilinear lookup in the in-memory grid; null outside it or next to no-data. */
export function sampleGrid(grid: Pick<DtmGrid, 'width' | 'height' | 'bbox'>, values: Float32Array, [lon, lat]: LngLat): number | null {
  const [minX, minY, maxX, maxY] = grid.bbox
  const fx = ((lon - minX) / (maxX - minX)) * grid.width - 0.5
  const fy = ((maxY - lat) / (maxY - minY)) * grid.height - 0.5
  if (fx < 0 || fy < 0 || fx > grid.width - 1 || fy > grid.height - 1) return null
  const x0 = Math.floor(fx), y0 = Math.floor(fy)
  const x1 = Math.min(x0 + 1, grid.width - 1), y1 = Math.min(y0 + 1, grid.height - 1)
  const tx = fx - x0, ty = fy - y0
  const at = (x: number, y: number) => values[y * grid.width + x]
  const v =
    at(x0, y0) * (1 - tx) * (1 - ty) + at(x1, y0) * tx * (1 - ty) + at(x0, y1) * (1 - tx) * ty + at(x1, y1) * tx * ty
  return Number.isNaN(v) ? null : v
}

function clean(v: number, noData: number | null) {
  if (!Number.isFinite(v) || (noData !== null && v === noData) || v < -1e5) return null
  return v
}
