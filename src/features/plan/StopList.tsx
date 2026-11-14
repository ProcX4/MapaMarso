import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { formatDistance, formatLatLon } from '../../lib/format'
import { flyTo } from '../../map/mapControl'
import { LIMITS } from '../../config/assumptions'
import type { Placing, Stop } from '../../state/types'
import { Icon } from '../../components/Icon'

const KIND_LABEL: Record<Stop['kind'], string> = { base: 'Start', waypoint: 'Waypoint', science: 'Science stop', destination: 'Destination' }

/**
 * What the next click on the map places: the left panel is where stops are added (the site card only shows).
 * Each is an icon button, drawn like the stop it places (the badges in the list and on the map); hovering or
 * focusing one shows its name and what a click does.
 */
const PICKS: { id: Placing; label: string; hint: string }[] = [
  { id: 'base', label: 'Start', hint: 'Click the map where the walk starts. Click again to move it.' },
  { id: 'waypoint', label: 'Waypoint', hint: 'Each click on the map adds a waypoint to the end of the route.' },
  { id: 'science', label: 'Science stop', hint: 'Each click on the map adds a science stop to the end of the route.' },
  { id: 'destination', label: 'Destination', hint: 'Click the map where the walk ends.' },
  { id: 'look', label: 'Just look', hint: "Clicks only open the site card on the right: nothing's added." },
]

/** The picker's icon for a pick: the same badge its stop gets in the list and on the map, or an eye for Just look */
function PickIcon({ id }: { id: Placing }) {
  if (id === 'look') return <Icon name="eye" size={18} />
  const text = id === 'base' ? 'A' : id === 'destination' ? 'B' : id === 'waypoint' ? '1' : ''
  return (
    <span className={`stop-pick is-${id}`} aria-hidden>
      {text}
    </span>
  )
}

function badge(stop: Stop, i: number) {
  if (stop.kind === 'base') return 'A'
  if (stop.kind === 'destination') return 'B'
  return String(i)
}

/**
 * Step 1 of the planner. Pick what a click on the map places, then click the map: the start first (there is no
 * placeholder), then waypoints, science stops and a destination. Stops show in walking order, joined by a thin
 * dashed line; names are edited in place, and move and remove show on hover or focus. Drag a stop on the map
 * to move it.
 */
export function StopList() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  const n = state.stops.length
  const hasStart = state.stops.some((s) => s.kind === 'base')
  // Until the start is placed, any click places it
  const placing: Placing = hasStart ? state.placing : 'base'
  const pick = PICKS.find((p) => p.id === placing)!
  const full = n >= LIMITS.maxStops && placing !== 'base' && placing !== 'look'

  return (
    <div className="plan-stops">
      <div className="plan-place">
        <p className="kicker plan-place-head">Click the map to place</p>
        <div className="plan-place-picks" role="radiogroup" aria-label="What a click on the map places">
          {PICKS.map((p) => {
            const locked = !hasStart && p.id !== 'base'
            return (
              <button
                key={p.id}
                type="button"
                role="radio"
                aria-checked={placing === p.id}
                aria-label={p.label}
                aria-describedby={`pick-tip-${p.id}`}
                className={`plan-place-pick is-${p.id}${placing === p.id ? ' is-on' : ''}`}
                disabled={locked}
                onClick={() => dispatch({ type: 'setPlacing', placing: p.id })}
              >
                <PickIcon id={p.id} />
                <span id={`pick-tip-${p.id}`} className="plan-pick-tip" role="tooltip">
                  <strong>{p.label}</strong>
                  {locked ? 'Place the start first.' : p.hint}
                </span>
              </button>
            )
          })}
        </div>
        <p className={`muted plan-hint${full ? ' is-warning' : ''}`} role="status">
          {full ? `The route is full (${LIMITS.maxStops} stops): remove one to add more.` : hasStart ? pick.hint : 'Start by clicking the map where the walk begins.'}
        </p>
      </div>

      <div className="plan-section-head">
        <h2 className="kicker">Stops</h2>
        <span className="muted plan-count num">{n}/{LIMITS.maxStops}</span>
      </div>
      {!hasStart && (
        <p className="plan-start-empty">
          <span className="stop-pick is-base" aria-hidden>A</span> Start: not placed yet
        </p>
      )}
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
            <span className="stop-actions">
              {s.kind !== 'base' && (
                <>
                  <button type="button" aria-label={`Move ${s.name || 'stop'} earlier`} disabled={i <= 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i - 1 })}>↑</button>
                  <button type="button" aria-label={`Move ${s.name || 'stop'} later`} disabled={i >= n - 1} onClick={() => dispatch({ type: 'reorderStops', from: i, to: i + 1 })}>↓</button>
                </>
              )}
              {/* The start goes only when it's the last stop left; move it with the Start pick instead */}
              {(s.kind !== 'base' || n === 1) && (
                <button type="button" aria-label={`Remove ${s.name || 'stop'}`} onClick={() => dispatch({ type: 'removeStop', id: s.id })}>×</button>
              )}
            </span>
          </li>
        ))}
      </ol>

      <div className="choice">
        <div className="segmented" role="radiogroup" aria-label="Trip type">
          <button type="button" role="radio" aria-checked={state.roundTrip} className={state.roundTrip ? 'is-on' : ''} onClick={() => dispatch({ type: 'setRoundTrip', value: true })}>
            Round trip
          </button>
          <button type="button" role="radio" aria-checked={!state.roundTrip} className={!state.roundTrip ? 'is-on' : ''} onClick={() => dispatch({ type: 'setRoundTrip', value: false })}>
            One way
          </button>
        </div>
        <p className="muted choice-hint">{state.roundTrip ? 'Finishes back at the start.' : 'Ends at the last stop; the walk home is not counted.'}</p>
      </div>
    </div>
  )
}
