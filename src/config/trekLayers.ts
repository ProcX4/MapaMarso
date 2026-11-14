/*
 * The Mars Trek allow-list lives in the tile proxy (api/tiles.ts), which can't import
 * local modules on Vercel. Re-exported here so app code keeps importing from config/.
 */
export { MAX_ZOOM, TREK_LAYERS, TREK_UPSTREAM, type TrekLayerId } from '../../api/tiles'
