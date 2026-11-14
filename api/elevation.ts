/*
 * Elevation proxy for anywhere on Mars (Security Spec §3).
 * Reads a window of the USGS global MOLA DEM (MGS MOLA, 463 m/px, metres from the areoid) and returns it as a
 * grid of numbers, for the A* route finder and the site card. Picture tiles only hold colours; this holds heights.
 *
 * The DEM is a single 2 GB GeoTIFF on the USGS bucket, stored uncompressed one image row after another, so a
 * window is read as one byte range per row it needs. Large windows are thinned to at most MAX_SIDE samples a
 * side, taking every n-th row and column. Only ever calls that one fixed file, with validated numbers.
 *
 * This file must not import local modules (see api/tiles.ts).
 */

const UPSTREAM = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif'

/** The file's layout, read once from its TIFF header (checked 2026-11-15): little-endian int16, one strip per row. */
const DEM = {
  width: 46080,
  height: 23040,
  /** Byte offset of row 0; rows follow back to back */
  dataOffset: 184973,
  bytesPerSample: 2,
  noData: -32768,
  /** Simple cylindrical, 128 px per degree, from 180°W/90°N */
  pxPerDeg: 128,
  resM: 463.0935415503709,
}

/** Most samples a side per request; a bigger area comes back coarser rather than slower. */
const MAX_SIDE = 320
/** Range requests in flight at once */
const CONCURRENCY = 48
const TIMEOUT_MS = 20_000

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') return text('Method not allowed', 405, { allow: 'GET' })

  const q = new URL(request.url).searchParams
  const [w, s, e, n] = ['w', 's', 'e', 'n'].map((k) => Number(q.get(k)))
  const valid = [w, s, e, n].every(Number.isFinite) && w >= -180 && e <= 180 && s >= -90 && n <= 90 && w < e && s < n
  if (!valid) return text('Bad area: w, s, e, n in degrees, west < east, south < north', 400)

  // Native pixel window, inclusive, and the thinning step that keeps it within MAX_SIDE
  const c0 = clampInt(Math.floor((w + 180) * DEM.pxPerDeg), DEM.width)
  const c1 = clampInt(Math.ceil((e + 180) * DEM.pxPerDeg) - 1, DEM.width)
  const r0 = clampInt(Math.floor((90 - n) * DEM.pxPerDeg), DEM.height)
  const r1 = clampInt(Math.ceil((90 - s) * DEM.pxPerDeg) - 1, DEM.height)
  const step = Math.max(1, Math.ceil(Math.max(c1 - c0 + 1, r1 - r0 + 1) / MAX_SIDE))
  const width = Math.floor((c1 - c0) / step) + 1
  const height = Math.floor((r1 - r0) / step) + 1

  const out = new Int16Array(width * height)
  const rowBytes = DEM.width * DEM.bytesPerSample
  let next = 0
  try {
    const worker = async () => {
      while (next < height) {
        const j = next++
        const row = r0 + j * step
        const from = DEM.dataOffset + row * rowBytes + c0 * DEM.bytesPerSample
        const to = DEM.dataOffset + row * rowBytes + (c1 + 1) * DEM.bytesPerSample - 1
        const bytes = await fetchRange(from, to)
        const view = new DataView(bytes)
        for (let i = 0; i < width; i++) out[j * width + i] = view.getInt16(i * step * DEM.bytesPerSample, true)
      }
    }
    await Promise.all(Array.from({ length: Math.min(CONCURRENCY, height) }, worker))
  } catch {
    return text('Upstream error', 502)
  }

  // The grid's outer edges in degrees: each sample stands for a step × step block of native pixels
  const deg = 1 / DEM.pxPerDeg
  const bbox = [c0 * deg - 180, 90 - (r0 + height * step) * deg, (c0 + width * step) * deg - 180, 90 - r0 * deg]
  return new Response(out.buffer, {
    headers: {
      'content-type': 'application/octet-stream',
      'cache-control': 'public, max-age=604800, immutable',
      'x-content-type-options': 'nosniff',
      'x-grid-width': String(width),
      'x-grid-height': String(height),
      'x-grid-bbox': bbox.map((v) => v.toFixed(7)).join(','),
      'x-grid-res-m': String(DEM.resM * step),
      'x-grid-nodata': String(DEM.noData),
      'access-control-expose-headers': 'x-grid-width, x-grid-height, x-grid-bbox, x-grid-res-m, x-grid-nodata',
    },
  })
}

async function fetchRange(from: number, to: number, retries = 1): Promise<ArrayBuffer> {
  try {
    const res = await fetch(UPSTREAM, { headers: { range: `bytes=${from}-${to}` }, signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' })
    if (res.status !== 206) throw new Error(String(res.status))
    const body = await res.arrayBuffer()
    if (body.byteLength !== to - from + 1) throw new Error('Short read')
    return body
  } catch (err) {
    if (retries > 0) return fetchRange(from, to, retries - 1)
    throw err
  }
}

const clampInt = (v: number, size: number) => Math.min(size - 1, Math.max(0, v))

// Vercel calls the exported method handler; anything else gets a 405 from the same check.
export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET

function text(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
}
