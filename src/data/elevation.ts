import { fromUrl, type GeoTIFFImage } from 'geotiff'
import type { LngLat } from '../state/types'

/*
 * Elevation comes from a Cloud-Optimized GeoTIFF of the demo site, in metres, in plain
 * lon/lat degrees (Mars 2000 geographic). Picture tiles only hold colours; this holds numbers.
 *
 * Two ways in:
 *  - elevationAt: one exact pixel from the full-resolution file (site card).
 *  - loadDtmGrid: the whole site, downsampled to at most GRID_MAX px a side, kept in memory
 *    for the profile, the slope worker and the elevation layer.
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
  return [a, b, c, d]
}

/** Elevation in metres at a point, or null outside the DTM / on no-data pixels. */
export async function elevationAt([lon, lat]: LngLat): Promise<number | null> {
  const img = await image()
  const [minX, minY, maxX, maxY] = bboxOf(img)
  if (lon < minX || lon >= maxX || lat <= minY || lat > maxY) return null
  const x = Math.floor(((lon - minX) / (maxX - minX)) * img.getWidth())
  const y = Math.floor(((maxY - lat) / (maxY - minY)) * img.getHeight())
  const [band] = (await img.readRasters({ window: [x, y, x + 1, y + 1], samples: [0] })) as unknown as ArrayLike<number>[]
  return clean(band[0], img.getGDALNoData())
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
