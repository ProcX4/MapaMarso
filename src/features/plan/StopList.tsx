import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { formatDistance, formatLatLon } from '../../lib/format'
import { flyTo } from '../../map/mapControl'
import { LIMITS } from '../../config/assumptions'
import type { Stop } from '../../state/types'

const KIND_LABEL: Record<Stop['kind'], string> = { base: 'Base', waypoint: 'Waypoint', science: 'Science stop', destination: 'Destination' }

function badge(stop: Stop, i: number) {
  if (stop.kind === 'base') return 'H'
  if (stop.kind === 'destination') return 'B'
  return String(i)
}

/**
 * Stops in walking order, one row each, joined by a thin dashed line (the MapaMars planner).
 * Names are edited in place; move and remove show on hover or focus. Drag a stop on the map to move it.
 */
export function StopList() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  const n = state.stops.length

  return (
    <div className="plan-stops">
      <div className="plan-section-head">
        <h2 className="kicker">Stops</h2>
        <span className="muted plan-count num">{n}/{LIMITS.maxStops}</span>
      </div>
      <ol className="stops">
        {state.stops.map((s, i) => (
          <li key={s.id} className={`stop-row is-${s.kind}`}>
            <span className={`stop-pick is-${s.kind}`} aria-hidden>{badge(s, i)}</span>
            <div className="stop-body">
              <input
                className="stop-name"
                value={s.name}
                maxLength={LIMITS.nameLength}
                aria-label={`Name of stop ${i + 1}`}
                placeholder={KIND_LABEL[s.kind]}
                onChange={(e) => dispatch({ type: 'renameStop', id: s.id, name: e.target.value })}
              />
              <button type="button" className="stop-coords num" onClick={() => flyTo(s.at)} title="Show on map">
                {KIND_LABEL[s.kind]} · {formatLatLon(s.at)}
                {i > 0 && route.legs[i - 1] && <span className="stop-leg"> · +{formatDistance(route.legs[i - 1].m)}</span>}
              </button>
            </div>
            {s.kind !== 'base' && (
              <span className="stop-actions">
                <button type="button" aria-label={`Move ${s.name || 'stop'} earlier`} disabled={i <= 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i - 1 })}>↑</button>
                <button type="button" aria-label={`Move ${s.name || 'stop'} later`} disabled={i >= n - 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i + 1 })}>↓</button>
                <button type="button" aria-label={`Remove ${s.name || 'stop'}`} onClick={() => dispatch({ type: 'removeStop', id: s.id })}>×</button>
              </span>
            )}
          </li>
        ))}
      </ol>
      {n < 2 && <p className="muted plan-hint">Click the map, then <b>Add waypoint</b> or <b>Route here</b> on the site card.</p>}

      <div className="choice">
        <div className="segmented" role="radiogroup" aria-label="Trip type">
          <button type="button" role="radio" aria-checked={state.roundTrip} className={state.roundTrip ? 'is-on' : ''} onClick={() => dispatch({ type: 'setRoundTrip', value: true })}>
            Round trip
          </button>
          <button type="button" role="radio" aria-checked={!state.roundTrip} className={!state.roundTrip ? 'is-on' : ''} onClick={() => dispatch({ type: 'setRoundTrip', value: false })}>
            One way
          </button>
        </div>
        <p className="muted choice-hint">{state.roundTrip ? 'Finishes back at the habitat.' : 'Ends at the last stop; the walk home is not counted.'}</p>
      </div>
    </div>
  )
}
