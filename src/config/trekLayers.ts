/*
 * The tile allow-list (Mars Trek, and Esri Astro for the global CTX mosaic) lives in the tile proxy
 * (api/tiles.ts), which can't import local modules on Vercel. Re-exported here so app code keeps
 * importing from config/.
 */
export {
  ESRI_LAYERS,
  MAX_ZOOM,
  TREK_LAYERS,
  TREK_UPSTREAM,
  tileLayerInfo,
  type EsriLayerId,
  type TileLayerId,
  type TrekLayerId,
} from '../../api/tiles'
