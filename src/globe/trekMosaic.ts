import { TREK_LAYERS, type TrekLayerId } from '../config/trekLayers'

/*
 * A whole-planet equirectangular picture for the flat map, stitched from NASA Mars Trek tiles through MAPA's
 * tile proxy (api/tiles.ts), with the pre-fetched copies in public/tiles/ as the fallback. Replaces MapaMars's
 * "connect a NASA image URL" placeholder with the real data MAPA already serves.
 */

export const MOSAIC_LAYER: TrekLayerId = 'Mars_Viking_MDIM21_ClrMosaic_global_232m'
export const MOSAIC_CREDIT = 'NASA Viking MDIM 2.1 colour mosaic (Mars Trek)'
/** Zoom 2: 8 × 4 tiles of 256 px, a 2048 × 1024 picture (twice the generated stand-in's detail). */
const ZOOM = 2
const TIMEOUT_MS = 15_000

async function tile(z: number, row: number, col: number) {
  const ext = TREK_LAYERS[MOSAIC_LAYER].ext
  const path = `${MOSAIC_LAYER}/${z}/${row}/${col}.${ext}`
  for (const url of [`/api/tiles/${path}`, `/tiles/${path}`]) {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
      if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) continue
      return await createImageBitmap(await res.blob())
    } catch {
      // try the next source
    }
  }
  throw new Error(`tile ${path} unavailable`)
}

let pending: Promise<HTMLCanvasElement> | null = null

/** The stitched mosaic, built once and shared. Rejects if any tile can't be loaded. */
export function loadTrekMosaic() {
  pending ??= (async () => {
    const cols = 2 * 2 ** ZOOM, rows = 2 ** ZOOM
    const canvas = document.createElement('canvas')
    canvas.width = cols * 256
    canvas.height = rows * 256
    const ctx = canvas.getContext('2d')!
    const jobs: Promise<void>[] = []
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        jobs.push(tile(ZOOM, row, col).then((img) => ctx.drawImage(img, col * 256, row * 256, 256, 256)))
      }
    }
    await Promise.all(jobs)
    return canvas
  })()
  pending.catch(() => {
    pending = null
  })
  return pending
}
