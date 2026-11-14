/*
 * Tile proxy for NASA Mars Trek and the Esri Astro CTX mosaic (Security Spec §3).
 * Only ever calls those two fixed hosts, with an allow-listed layer and validated tile
 * coordinates, so it can't be used as an open proxy. Nothing from the caller (cookies,
 * auth, IP) is forwarded upstream, and nothing but the image and its type comes back.
 *
 * This file must not import local modules: Vercel compiles it on its own and does not
 * rewrite import paths, so a local import crashes the function (FUNCTION_INVOCATION_FAILED).
 * The browser reads the allow-list from here via src/config/trekLayers.ts instead.
 */

/**
 * The NASA Mars Trek EQ (equirectangular) layers MAPA is allowed to fetch.
 * Shared by this proxy and the layer registry, so a layer can't be shown unless the
 * proxy will also serve it.
 *
 * maxZoom: deepest zoom the layer has tiles for at the demo site (checked 2026-11-15
 * against the Trek tile endpoint); beyond it, OpenLayers upscales the last level.
 * All of them cover the whole planet.
 */
export const TREK_LAYERS = {
  // Topographic
  Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw: { ext: 'jpg', maxZoom: 8 },
  mola_roughness: { ext: 'png', maxZoom: 1 },
  // Optical
  Mars_Viking_MDIM21_ClrMosaic_global_232m: { ext: 'jpg', maxZoom: 7 },
  msss_atlas_simp_clon: { ext: 'png', maxZoom: 6 },
  // HiRISE 25 cm orthomosaic of the Jezero landing area only (77.22–77.58°E, 18.31–18.67°N); 404 outside it.
  // Tiles from zoom 10, native at 17 (0.32 m/px); 18 and deeper are 404. Checked 2026-11-15.
  JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd: { ext: 'png', maxZoom: 17 },
  // Spectral
  THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018: { ext: 'png', maxZoom: 9 },
  THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018: { ext: 'png', maxZoom: 9 },
  TES_Thermal_Inertia: { ext: 'png', maxZoom: 1 },
  TES_Clinopyroxene: { ext: 'png', maxZoom: 1 },
  TES_Plagioclase: { ext: 'png', maxZoom: 1 },
  TES_Glass_Clay: { ext: 'png', maxZoom: 1 },
  TES_Dust: { ext: 'png', maxZoom: 1 },
  tes_ruffdust: { ext: 'png', maxZoom: 2 },
  Mars_MGS_TES_Albedo_mosaic_global_7410m: { ext: 'png', maxZoom: 1 },
} as const satisfies Record<string, { ext: 'jpg' | 'png'; maxZoom: number }>

export type TrekLayerId = keyof typeof TREK_LAYERS

export const TREK_UPSTREAM = 'https://trek.nasa.gov/tiles/Mars/EQ'

/**
 * Esri Astro tiled map services MAPA is allowed to fetch. Trek's catalogue lists the global CTX
 * mosaic (CTX_beta01_uncontrolled_5m_Caltech), but Trek's own tile path for it is 404: the entry's
 * WMTS template points here instead, so this is where its tiles are.
 *
 * Same equirectangular Mars 2000 layout as Trek (wkid 104971, origin -180/90, 2 x 1 tiles at
 * level 0), so a z/row/col covers the same ground; but tiles are 512 px, so each level is twice as
 * sharp as Trek's. Levels 0-12 (12 = 5.1 m/px, CTX's native scale); 13 and deeper answer 400.
 * The URL is .../MapServer/tile/{z}/{row}/{col}, with no extension. Checked 2026-11-15.
 */
export const ESRI_LAYERS = {
  OnMars_CTX: { service: 'OnMars/CTX', ext: 'png', maxZoom: 12, tileSize: 512 },
} as const satisfies Record<string, { service: string; ext: 'jpg' | 'png'; maxZoom: number; tileSize: number }>

export type EsriLayerId = keyof typeof ESRI_LAYERS

export const ESRI_UPSTREAM = 'https://astro.arcgis.com/arcgis/rest/services'

/** Any layer the proxy serves */
export type TileLayerId = TrekLayerId | EsriLayerId

const isTrek = (id: string): id is TrekLayerId => Object.hasOwn(TREK_LAYERS, id)
const isEsri = (id: string): id is EsriLayerId => Object.hasOwn(ESRI_LAYERS, id)

/** A layer's file type, deepest zoom and tile size, whichever host serves it; null if it isn't allow-listed */
export function tileLayerInfo(id: string): { ext: 'jpg' | 'png'; maxZoom: number; tileSize: number } | null {
  if (isTrek(id)) return { ...TREK_LAYERS[id], tileSize: 256 }
  if (isEsri(id)) return ESRI_LAYERS[id]
  return null
}

/** Deepest zoom the map and the proxy accept. */
export const MAX_ZOOM = 18

const TIMEOUT_MS = 10_000
const MAX_BYTES = 2_000_000
const PATH = /^\/api\/tiles\/([A-Za-z0-9_-]+)\/(\d{1,2})\/(\d{1,7})\/(\d{1,7})\.(jpg|png)$/

async function fetchTile(url: string, retries = 1): Promise<Response> {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS), redirect: 'error' })
    if (res.status >= 500 && retries > 0) return fetchTile(url, retries - 1)
    return res
  } catch (err) {
    if (retries > 0) return fetchTile(url, retries - 1)
    throw err
  }
}

export async function GET(request: Request): Promise<Response> {
  if (request.method !== 'GET') return text('Method not allowed', 405, { allow: 'GET' })

  const m = new URL(request.url).pathname.match(PATH)
  if (!m) return text('Bad tile path', 400)
  const [, layer, zs, rs, cs, ext] = m
  const info = tileLayerInfo(layer)
  if (!info) return text('Unknown layer', 400)
  if (ext !== info.ext) return text('Wrong format for layer', 400)

  const z = Number(zs), row = Number(rs), col = Number(cs)
  if (z > MAX_ZOOM || row >= 2 ** z || col >= 2 * 2 ** z) return text('Tile out of range', 400)
  // Esri answers 400 past its deepest level: say 404 like Trek, so the map upscales the last level
  if (isEsri(layer) && z > info.maxZoom) return text('No tile', 404)

  const url = isEsri(layer)
    ? `${ESRI_UPSTREAM}/${ESRI_LAYERS[layer].service}/MapServer/tile/${z}/${row}/${col}`
    : `${TREK_UPSTREAM}/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.${ext}`
  let upstream: Response
  try {
    upstream = await fetchTile(url)
  } catch {
    return text('Upstream timeout', 504)
  }
  // Trek answers 404 past a layer's deepest zoom; pass that through so the map can fall back.
  if (upstream.status === 404) return text('No tile', 404)
  const type = upstream.headers.get('content-type') ?? ''
  if (!upstream.ok || !type.startsWith('image/')) return text('Upstream error', 502)
  const declared = Number(upstream.headers.get('content-length') ?? 0)
  if (declared > MAX_BYTES) return text('Tile too large', 502)
  const body = await upstream.arrayBuffer()
  if (body.byteLength > MAX_BYTES) return text('Tile too large', 502)

  return new Response(body, {
    headers: {
      'content-type': type,
      'cache-control': 'public, max-age=604800, immutable',
      'x-content-type-options': 'nosniff',
    },
  })
}

// Vercel calls the exported method handler; anything else gets a 405 from the same check.
export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET

function text(message: string, status: number, headers: Record<string, string> = {}) {
  return new Response(message, { status, headers: { 'content-type': 'text/plain; charset=utf-8', ...headers } })
}
