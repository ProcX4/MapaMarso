import { useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useDatasets } from '../../hooks/useDerived'
import { GROUPS, LAYERS, provenanceLine, type LayerDef } from '../../map/layers/registry'
import { Switch } from '../../components/Switch'
import { Slider } from '../../components/Slider'
import { Icon } from '../../components/Icon'
import { PlaceholderTag, ProvenanceTag } from '../../components/ProvenanceTag'
import type { LoadStatus } from '../../state/derivedContexts'

/** Which dataset feeds a layer, so the panel can say "No data loaded" honestly. */
function useLayerStatus(def: LayerDef): LoadStatus {
  const data = useDatasets()
  if (def.id === 'site-dtm') return data.dtm.status
  if (def.id === 'slope') return data.slope.status
  if (def.id === 'geology') return data.geology.status
  if (def.id === 'science-targets') return data.targets.status
  return 'ready'
}

function LayerRow({ def }: { def: LayerDef }) {
  const { state, dispatch } = useMarswalk()
  const layer = state.layers.find((l) => l.id === def.id)!
  const status = useLayerStatus(def)
  return (
    <li className="layer-row">
      <div className="layer-row-head">
        <Switch checked={layer.visible} label={`Show ${def.name}`} onChange={() => dispatch({ type: 'toggleLayer', id: def.id })} />
        <span className="layer-name">{def.name}</span>
        <ProvenanceTag category={def.category} />
      </div>
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
          {def.legend && status === 'ready' && (
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
      {status === 'loading' && <p className="layer-status">Loading…</p>}
      {status === 'missing' && <p className="layer-status">No data loaded</p>}
      <p className="provenance-line">
        {provenanceLine(def)} {def.placeholder && <PlaceholderTag note={def.placeholder} />}
      </p>
    </li>
  )
}

/**
 * Layers, top right under the menu (the MapaMars Missions-panel pattern): a button that slides the list
 * out. The list makes way for the site card, which opens in the same corner.
 */
export function LayerPanel() {
  const { state } = useMarswalk()
  // Open by default on wide screens, so first-time visitors see the NASA layers straight away
  const [open, setOpen] = useState(() => !window.matchMedia('(max-width: 720px)').matches)
  const shown = open && !state.selected
  const visible = state.layers.filter((l) => l.visible).length

  return (
    <div className="layers-hud">
      <button type="button" className={`hud-link layers-link${shown ? ' is-open' : ''}`} aria-expanded={shown} aria-controls="layers-panel" onClick={() => setOpen(!shown)}>
        <Icon name="layers" size={17} />
        Layers
      </button>
      <section id="layers-panel" className={`hud-panel layers-panel${shown ? ' is-open' : ''}`} aria-label="Layers" inert={!shown}>
        <div className="hud-panel-head">
          <span>NASA layers</span>
          <span className="hud-count">{visible}/{LAYERS.length} on</span>
        </div>
        <div className="hud-panel-body">
          {GROUPS.map((g) => (
            <div key={g.id} className="layer-group">
              <h3 className="layer-group-head">{g.label}</h3>
              <ul>
                {LAYERS.filter((l) => l.group === g.id).map((def) => (
                  <LayerRow key={def.id} def={def} />
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
