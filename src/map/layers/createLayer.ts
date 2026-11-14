import TileLayer from 'ol/layer/Tile'
import ImageLayer from 'ol/layer/Image'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import XYZ from 'ol/source/XYZ'
import ImageStatic from 'ol/source/ImageStatic'
import TileState from 'ol/TileState'
import type ImageTile from 'ol/ImageTile'
import type Tile from 'ol/Tile'
import type BaseLayer from 'ol/layer/Base'
import type { LayerDef } from './registry'
import { TREK_LAYERS, type TrekLayerId } from '../../config/trekLayers'
import { marsProjection, marsTileGrid } from '../projection'

/*
 * Turns a registry entry into an OpenLayers layer. Layers are created once and then
 * only shown, hidden or re-faded; data that arrives later is attached to them.
 */

const TILE_TIMEOUT_MS = 10_000

/**
 * Tiles come through our proxy (api/tiles.ts); if that fails, the pre-fetched copy in
 * public/tiles/ is tried, so the demo survives a slow or offline network.
 */
function loadTileWithFallback(tile: Tile, src: string) {
  const img = (tile as ImageTile).getImage() as HTMLImageElement
  const fallback = src.replace(/^\/api\/tiles\//, '/tiles/')
  const get = (url: string) =>
    fetch(url, { signal: AbortSignal.timeout(TILE_TIMEOUT_MS) }).then((r) => {
      const type = r.headers.get('content-type') ?? ''
      if (!r.ok || !type.startsWith('image/')) throw new Error(String(r.status))
      return r.blob()
    })
  get(src)
    .catch(() => get(fallback))
    .then((blob) => {
      const url = URL.createObjectURL(blob)
      img.addEventListener('load', () => URL.revokeObjectURL(url), { once: true })
      img.src = url
    })
    .catch(() => tile.setState(TileState.ERROR))
}

export function createLayer(def: LayerDef): BaseLayer {
  const common = { visible: def.defaultVisible, opacity: def.defaultOpacity, minZoom: def.minZoom, properties: { id: def.id } }

  switch (def.kind) {
    case 'xyz':
    case 'wmts': {
      const ext = TREK_LAYERS[def.source as TrekLayerId]?.ext ?? 'jpg'
      return new TileLayer({
        ...common,
        source: new XYZ({
          projection: marsProjection,
          tileGrid: marsTileGrid(def.maxZoom),
          url: `/api/tiles/${def.source}/{z}/{y}/{x}.${ext}`,
          tileLoadFunction: loadTileWithFallback,
          wrapX: false,
          attributions: 'NASA/JPL-Caltech Mars Trek',
        }),
      })
    }
    case 'cog':
      // Source is attached once the DTM (or slope) grid has been computed.
      return new ImageLayer({ ...common })
    case 'vector':
      return new VectorLayer({ ...common, source: new VectorSource() })
  }
}

type Grid = { width: number; height: number; bbox: [number, number, number, number]; values: Float32Array }

/** Paints a grid into an image source, one RGBA colour per cell (null = transparent). */
export function gridSource(grid: Grid, color: (v: number) => [number, number, number, number] | null) {
  const canvas = document.createElement('canvas')
  canvas.width = grid.width
  canvas.height = grid.height
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(grid.width, grid.height)
  for (let i = 0; i < grid.values.length; i++) {
    const v = grid.values[i]
    const c = Number.isNaN(v) ? null : color(v)
    if (c) img.data.set(c, i * 4)
  }
  ctx.putImageData(img, 0, 0)
  return new ImageStatic({
    url: canvas.toDataURL(),
    imageExtent: grid.bbox,
    projection: marsProjection,
    interpolate: false,
  })
}
