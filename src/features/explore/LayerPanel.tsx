import { useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useDatasets, useRoute } from '../../hooks/useDerived'
import { TERRAIN_NOTE, type TerrainGrid } from '../../data/terrain'
import type { SafePathState } from '../../hooks/useSafePath'
import { GROUPS, LAYERS, provenanceLine, type LayerDef } from '../../map/layers/registry'
import { SITE } from '../../config/site'
import { Switch } from '../../components/Switch'
import { useMapView } from '../../hooks/useMapView'
import { flyTo, type MapViewInfo } from '../../map/mapControl'
import type { LngLat } from '../../state/types'
import { Slider } from '../../components/Slider'
import { Icon } from '../../components/Icon'
import { PlaceholderTag, ProvenanceTag } from '../../components/ProvenanceTag'
import type { LoadStatus, Routing } from '../../state/derivedContexts'

/** Where the topographic rows get their news: the selected mission's safe path, or else the planned route's */
type PathInfo = { status: LoadStatus | 'no-route'; routing: Routing; terrain: TerrainGrid | null }

function usePathInfo(missionPath: SafePathState | null | undefined): PathInfo {
  const data = useDatasets()
  const route = useRoute()
  if (missionPath && missionPath.status !== 'idle') {
    const v = missionPath.value
    const routing: Routing =
      missionPath.status === 'error' ? 'unavailable'
      : missionPath.status === 'loading' || !v ? 'finding'
      : v.legs.safest.every((l) => l.status === 'safe') ? 'safe'
      : 'partial'
    return { status: v ? 'ready' : missionPath.status === 'error' ? 'missing' : 'loading', routing, terrain: v?.terrain ?? null }
  }
  if (!route.legs.length) return { status: 'no-route', routing: 'none', terrain: null }
  return { status: data.hazard.status, routing: route.routing, terrain: data.dtm.value }
}

/** Which dataset feeds a layer, so the panel can say "No data loaded" honestly. */
function layerStatus(def: LayerDef, path: PathInfo, targets: LoadStatus, reach: LoadStatus): LoadStatus | 'no-route' {
  if (def.id === 'slope' || def.id === 'route') return path.status
  if (def.id === 'reach') return reach
  if (def.id === 'science-targets') return targets
  return 'ready'
}

type HintAction = { label: string; at: LngLat; zoom: number }
type ViewHint = { text: string; actions: HintAction[] }

/** Why a layer that's switched on can't be seen in the view right now, and buttons that fix it */
function viewHint(def: LayerDef, view: MapViewInfo): ViewHint | null {
  if (!view) return null
  const bbox = def.coverage?.bbox
  const [lon, lat] = view.center
  if (bbox && (lon < bbox[0] || lon > bbox[2] || lat < bbox[1] || lat > bbox[3])) {
    return { text: 'Not in this part of Mars: it only covers one area.', actions: def.coverage?.goTo ? [def.coverage.goTo] : [] }
  }
  // minZoom is exclusive: the layer draws from minZoom + 1. Zoom in where you are, or go to the demo site
  if (def.minZoom !== undefined && view.zoom <= def.minZoom) {
    const zoom = def.minZoom + 1
    return {
      text: 'Zoomed out too far to show it: zoom in closer.',
      actions: [
        { label: 'Zoom in here', at: view.center, zoom },
        { label: `Zoom to ${SITE.name}`, at: SITE.center, zoom: Math.max(SITE.zoom, zoom) },
      ],
    }
  }
  if (def.kind === 'xyz' && def.maxZoom !== undefined && view.zoom > def.maxZoom + 3) return { text: 'Too blurry this close: zoom out to read it.', actions: [] }
  return null
}

const ROUTING_TEXT: Record<Routing, string | null> = {
  none: null,
  finding: 'Finding a safe path…',
  safe: 'Safe path found round steep, deep and rocky ground',
  partial: 'Some legs have no safe way through: shown as straight lines',
  unavailable: "Elevation data couldn't be loaded: legs shown as straight lines",
}

function LayerRow({ def, path, view }: { def: LayerDef; path: PathInfo; view: MapViewInfo }) {
  const { state, dispatch } = useMarswalk()
  const layer = state.layers.find((l) => l.id === def.id)!
  const data = useDatasets()
  const status = layerStatus(def, path, data.targets.status, data.reach.status)
  const topographic = def.id === 'slope' || def.id === 'route'
  const routing = def.id === 'route' ? ROUTING_TEXT[path.routing] : null
  // Switched on but not visible from here (too far out, too close, or another part of Mars): say why, rather than
  // leave a switch that seems to do nothing
  const hint = layer.visible ? viewHint(def, view) : null
  const source = provenanceLine(def)
  return (
    <li className="layer-row">
      <div className="layer-row-head">
        <Switch checked={layer.visible} label={`Show ${def.name}`} onChange={() => dispatch({ type: 'toggleLayer', id: def.id })} />
        <span className="layer-name">{def.name}</span>
        <ProvenanceTag category={def.category} />
      </div>
      <p className="layer-howto">{def.howTo}</p>
      {hint && (
        <p className="layer-hint" role="status">
          {hint.text}
          {hint.actions.map((a) => (
            <button key={a.label} type="button" className="layer-hint-go" onClick={() => flyTo(a.at, a.zoom)}>
              {a.label}
            </button>
          ))}
        </p>
      )}
      {layer.visible && (
        <div className="layer-row-body">
          <Slider
            label={`${def.name} opacity`}
            value={layer.opacity}
            min={0}
            max={1}
            valueText={`${Math.round(layer.opacity * 100)}%`}
            onChange={(opacity) => dispatch({ type: 'setOpacity', id: def.id, opacity })}
          />
          {def.ramp && (
            <div className="layer-ramp">
              <span className="ramp-bar" style={{ background: `linear-gradient(to right, ${def.ramp.stops.join(', ')})` }} aria-hidden />
              <span className="ramp-ends">
                <span>{def.ramp.low}</span>
                <span>{def.ramp.high}</span>
              </span>
            </div>
          )}
          {def.legend && (status === 'ready' || def.kind === 'xyz') && (
            <ul className="layer-legend">
              {def.legend.map((l) => (
                <li key={l.label}>
                  <span className="swatch" style={{ background: l.color }} aria-hidden /> {l.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      {status === 'loading' && !routing && <p className="layer-status">Loading…</p>}
      {status === 'missing' && <p className="layer-status">No data loaded</p>}
      {status === 'no-route' && def.id === 'route' && <p className="layer-status">Plan a route of two stops or more, or pick a mission</p>}
      {routing && <p className="layer-status">{routing}</p>}
      {topographic && path.terrain && <p className="layer-status">Terrain: {TERRAIN_NOTE[path.terrain.source]}</p>}
      {def.placeholder && (
        <p className="layer-status">
          <PlaceholderTag note={def.placeholder} />
        </p>
      )}
      {(source || def.coverage) && (
        <details className="layer-source">
          <summary>Source</summary>
          {def.coverage && <p className="layer-status">{def.coverage.note}</p>}
          {source && <p className="provenance-line">{source}</p>}
        </details>
      )}
    </li>
  )
}

type PanelProps = {
  /** Open state kept by the page, so it can make way for the page's other panels; left out, the panel keeps its own */
  open?: boolean
  onOpenChange?: (open: boolean) => void
  /** Leave out the panel's own button (the page shows LayersButton elsewhere) */
  button?: boolean
  /** Another card has the corner, so the list stays tucked away */
  blocked?: boolean
  /** The safe path of the mission picked on the map, which the Topographic rows then describe */
  missionPath?: SafePathState | null
}

/** The Layers button, lit while the list is out. */
export function LayersButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button type="button" className={`hud-link layers-link${open ? ' is-open' : ''}`} aria-expanded={open} aria-controls="layers-panel" onClick={onClick}>
      <Icon name="layers" size={17} />
      Layers
    </button>
  )
}

/**
 * Layers, top right under the menu (the MapaMars Missions-panel pattern): a button that slides the list
 * out. The list makes way for the site card, which opens in the same corner.
 */
export function LayerPanel({ open: openProp, onOpenChange, button = true, blocked = false, missionPath }: PanelProps) {
  const { state } = useMarswalk()
  const path = usePathInfo(missionPath)
  const view = useMapView()
  // Open by default on wide screens, so first-time visitors see the NASA layers straight away
  const [ownOpen, setOwnOpen] = useState(() => !window.matchMedia('(max-width: 720px)').matches)
  const open = openProp ?? ownOpen
  const setOpen = onOpenChange ?? setOwnOpen
  const shown = open && !state.selected && !blocked
  const visible = state.layers.filter((l) => l.visible).length

  return (
    <div className={`layers-hud${button ? '' : ' is-buttonless'}`}>
      {button && <LayersButton open={shown} onClick={() => setOpen(!shown)} />}
      <section id="layers-panel" className={`hud-panel layers-panel${shown ? ' is-open' : ''}`} aria-label="Layers" inert={!shown}>
        <div className="hud-panel-head">
          <span>NASA layers</span>
          <span className="hud-count">{visible}/{LAYERS.length} on</span>
        </div>
        <div className="hud-panel-body">
          {GROUPS.map((g) => (
            <div key={g.id} className="layer-group">
              <h3 className="layer-group-head">{g.label}</h3>
              <p className="layer-group-note">{g.note}</p>
              <ul>
                {LAYERS.filter((l) => l.group === g.id).map((def) => (
                  <LayerRow key={def.id} def={def} path={path} view={view} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
