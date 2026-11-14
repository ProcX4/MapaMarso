/**
 * The NASA Mars Trek EQ (equirectangular) layers MAPA is allowed to fetch.
 * Shared by the tile proxy's allow-list (api/tiles.ts) and the layer registry,
 * so a layer can't be shown unless the proxy will also serve it.
 *
 * maxZoom: deepest zoom the layer has tiles for at the demo site (checked 2026-11-14
 * against the Trek tile endpoint); beyond it, OpenLayers upscales the last level.
 */
export const TREK_LAYERS = {
  Mars_MGS_MOLA_ClrShade_merge_global_463m: { ext: 'jpg', maxZoom: 7 },
  Mars_Viking_MDIM21_ClrMosaic_global_232m: { ext: 'jpg', maxZoom: 7 },
  THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018: { ext: 'png', maxZoom: 9 },
} as const satisfies Record<string, { ext: 'jpg' | 'png'; maxZoom: number }>

export type TrekLayerId = keyof typeof TREK_LAYERS

export const TREK_UPSTREAM = 'https://trek.nasa.gov/tiles/Mars/EQ'

/** Deepest zoom the map and the proxy accept. */
export const MAX_ZOOM = 18
