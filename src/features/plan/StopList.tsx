import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { Switch } from '../../components/Switch'
import { formatDistance, formatLatLon } from '../../lib/format'
import { flyTo } from '../../map/mapControl'
import { LIMITS } from '../../config/assumptions'
import type { Stop } from '../../state/types'

const KIND_LABEL: Record<Stop['kind'], string> = { base: 'Base', waypoint: 'Waypoint', science: 'Science', destination: 'Destination' }

function badge(stop: Stop, i: number) {
  if (stop.kind === 'base') return 'H'
  if (stop.kind === 'destination') return 'B'
  return String(i)
}

/** Ordered stops in walking order. Reorder with the arrow buttons (keyboard-friendly), drag on the map to move. */
export function StopList() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  const n = state.stops.length

  return (
    <div className="plan-stops">
      <div className="plan-stops-head">
        <h2 className="kicker">Stops</h2>
        <span className="muted plan-count num">
          {n}/{LIMITS.maxStops}
        </span>
      </div>
      {n < 2 && <p className="muted plan-hint">Click the map, then use <b>Add waypoint</b> or <b>Route here</b> on the site card.</p>}
      <ol className="plan-stop-list">
        {state.stops.map((s, i) => (
          <li key={s.id} className={`plan-stop is-${s.kind}`}>
            <span className="plan-badge num" aria-hidden>{badge(s, i)}</span>
            <button type="button" className="plan-stop-main" onClick={() => flyTo(s.at)} title="Show on map">
              <span>{s.name}</span>
              <small className="muted num">
                {KIND_LABEL[s.kind]} · {formatLatLon(s.at)}
                {i > 0 && route.legs[i - 1] && ` · +${formatDistance(route.legs[i - 1].m)}`}
              </small>
            </button>
            {s.kind !== 'base' && (
              <span className="plan-stop-actions">
                <button type="button" className="icon-button" aria-label={`Move ${s.name} earlier`} disabled={i <= 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i - 1 })}>↑</button>
                <button type="button" className="icon-button" aria-label={`Move ${s.name} later`} disabled={i >= n - 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i + 1 })}>↓</button>
                <button type="button" className="icon-button" aria-label={`Remove ${s.name}`} onClick={() => dispatch({ type: 'removeStop', id: s.id })}>×</button>
              </span>
            )}
          </li>
        ))}
      </ol>
      <label className="plan-roundtrip">
        <Switch checked={state.roundTrip} label="Round trip: finish back at base" onChange={(value) => dispatch({ type: 'setRoundTrip', value })} />
        <span>Round trip (finish at base)</span>
      </label>
    </div>
  )
}
