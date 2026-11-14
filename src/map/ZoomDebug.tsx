import { useMarswalk } from '../hooks/useMarswalk'
import { useMapView } from '../hooks/useMapView'
import { LAYERS, type LayerDef } from './layers/registry'
import { tileLayerInfo } from '../config/trekLayers'
import { flyTo } from './mapControl'
import { metresPerDegree } from '../data/mars'
import { formatDistance } from '../lib/format'

/*
 * Debug: zoom points (☰ menu). The 2D map's zoom, how much ground one screen pixel covers, which photo layer is
 * drawing, and the zoom each Optical photo layer starts at, read from the layer registry so it can't drift.
 */

type Rung = { def: LayerDef; start: number; sharpest: number; covers: boolean; drawing: boolean }

/** Zoom where a layer's own tiles are sharpest: its deepest level, plus one per doubling of tile size over 256 px */
function sharpestZoom(def: LayerDef) {
  const tile = tileLayerInfo(def.source)?.tileSize ?? 256
  return (def.maxZoom ?? 0) + Math.log2(tile / 256)
}

const PHOTO_LAYERS = LAYERS.filter((d) => d.group === 'optical' && (d.kind === 'xyz' || d.kind === 'wmts'))

export function ZoomDebug() {
  const view = useMapView()
  const { state } = useMarswalk()
  if (!view) return null
  const z = view.zoom
  const [lon, lat] = view.center
  const metresPerPixel = (180 / 256 / 2 ** z) * metresPerDegree(0).lat

  const rungs: Rung[] = PHOTO_LAYERS.map((def) => {
    const start = def.minZoom !== undefined ? def.minZoom + 1 : 0
    const bbox = def.coverage?.bbox
    const covers = !bbox || (lon >= bbox[0] && lon <= bbox[2] && lat >= bbox[1] && lat <= bbox[3])
    const visible = state.layers.find((l) => l.id === def.id)?.visible ?? false
    return { def, start, sharpest: sharpestZoom(def), covers, drawing: visible && covers && z >= start }
  }).sort((a, b) => a.start - b.start || a.sharpest - b.sharpest)
  // The walking-scale photos draw on top once they start; otherwise the colour mosaics (or the backdrop) show
  const now = [...rungs].reverse().find((r) => r.drawing && r.def.walkScale) ?? rungs.find((r) => r.drawing)

  const jump = (r: Rung) => {
    const goTo = r.def.coverage?.goTo
    if (!r.covers && goTo) flyTo(goTo.at, Math.max(goTo.zoom, r.start))
    else flyTo(view.center, Math.max(r.start, Math.min(r.sharpest, r.start + 2)))
  }

  return (
    <aside className="zoom-debug" aria-label="Debug: zoom points">
      <p className="zoom-debug-kicker">Debug · zoom points</p>
      <p className="zoom-debug-zoom num">
        Zoom {z.toFixed(1)} <span className="muted">≈ {formatDistance(metresPerPixel)} per screen pixel</span>
      </p>
      <p className="zoom-debug-now">
        Photo now: <strong>{now ? now.def.name : 'Colour backdrop (Viking mosaic, always under the map)'}</strong>
      </p>
      <ol className="zoom-debug-ladder">
        {rungs.map((r) => {
          const here = r === now
          return (
            <li key={r.def.id} className={`${here ? 'is-here' : ''}${!r.covers ? ' is-elsewhere' : ''}`}>
              <span className="zoom-debug-range num">
                {r.start}
                {r.def.walkScale ? '+' : `–${Math.round(r.sharpest)}`}
              </span>
              <span className="zoom-debug-name">
                {r.def.name}
                <small className="muted">
                  sharpest at zoom {Math.round(r.sharpest)}
                  {r.def.provenance.resolution ? ` · ${r.def.provenance.resolution}` : ''}
                  {!r.covers ? ' · not in this area' : ''}
                  {here ? ' · drawing now' : ''}
                </small>
              </span>
              <button type="button" onClick={() => jump(r)} title={!r.covers && r.def.coverage?.goTo ? r.def.coverage.goTo.label : `Zoom to ${Math.max(r.start, Math.min(r.sharpest, r.start + 2))} here`}>
                Go
              </button>
            </li>
          )
        })}
      </ol>
      <p className="zoom-debug-note muted">Dashed outlines on the map mark where the area-only photos are; the green pin marks where Perseverance's photos start.</p>
    </aside>
  )
}
