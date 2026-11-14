import Projection from 'ol/proj/Projection'
import TileGrid from 'ol/tilegrid/TileGrid'
import { MAX_ZOOM } from '../config/trekLayers'

/*
 * Mars Trek EQ layers are equirectangular: plain longitude/latitude, with zoom 0 =
 * 2 columns × 1 row of 256 px tiles. Not Web Mercator, so MAPA uses its own projection.
 * Verified against each Trek layer's WMTSCapabilities.xml (TopLeftCorner -180 90,
 * MatrixWidth 2 / MatrixHeight 1 at level 0) on 2026-11-14.
 *
 * Map coordinates are [lon, lat] in degrees, so never pass them through
 * ol/proj toLonLat/fromLonLat, which assume Earth's Web Mercator.
 */

export const MARS_EXTENT = [-180, -90, 180, 90]

export const marsProjection = new Projection({
  code: 'IAU2000:49900', // Mars 2000 geographic
  units: 'degrees',
  extent: MARS_EXTENT,
  global: true,
})

const resolutions = (maxZoom: number) => Array.from({ length: maxZoom + 1 }, (_, z) => 180 / 256 / 2 ** z)

/** Zoom 0: 2×1 tiles of 256 px → 180° per tile → 180/256 degrees per pixel. */
export function marsTileGrid(maxZoom = MAX_ZOOM) {
  return new TileGrid({ extent: MARS_EXTENT, origin: [-180, 90], tileSize: 256, resolutions: resolutions(maxZoom) })
}

export const VIEW_RESOLUTIONS = resolutions(MAX_ZOOM)
