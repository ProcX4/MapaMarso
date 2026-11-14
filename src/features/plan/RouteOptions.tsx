import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { formatDistance, formatDuration, formatKm, formatSlope } from '../../lib/format'
import type { RouteOption } from '../../state/types'
import { SLOPE_BANDS } from '../../config/assumptions'

/** Where the hazard bands start: distance on ground at least this steep is what the options are compared on */
const CAUTION_MIN = SLOPE_BANDS.find((b) => b.token === 'caution')!.min

const OPTIONS: { id: RouteOption; name: string; about: string }[] = [
  { id: 'safest', name: 'Safest', about: 'Steers round steep and deep ground, and avoids climbing' },
  { id: 'direct', name: 'Most direct', about: 'Only goes round ground that can’t be crossed at all' },
]

/**
 * The two A* routes side by side, so the crew can weigh time against ground: pick one, and the map, stats,
 * profile and EVA all follow it. The other is drawn faintly on the map.
 */
export function RouteOptions() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  if (!route.options) return null
  const same = Math.abs(route.options.safest.totalM - route.options.direct.totalM) < 1

  return (
    <section className="route-options" aria-label="Route options">
      <p className="info-card-kicker route-options-head">
        Route options <ProvenanceTag category="derived" note="Both found by A* on the same elevation; neither crosses impassable ground" />
      </p>
      <ul>
        {OPTIONS.map((o) => {
          const r = route.options![o.id]
          const on = state.routeOption === o.id
          return (
            <li key={o.id}>
              <button type="button" className="route-option" aria-pressed={on} onClick={() => dispatch({ type: 'setRouteOption', value: o.id })} title={o.about}>
                <span className="route-option-name">{o.name}</span>
                <span className="route-option-pick">{on ? 'Following' : 'Use this'}</span>
                <span className="route-option-facts">
                  {formatKm(r.totalM / 1000)} · {formatDuration(r.durationMin)} · max {r.maxSlope === null ? '–' : formatSlope(r.maxSlope)} ·{' '}
                  {r.hazardM ? `${formatDistance(r.hazardM)} over ${CAUTION_MIN}°` : `nothing over ${CAUTION_MIN}°`}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
      {same && <p className="muted route-option-note">Both come out the same here: nothing on the way is worth going round.</p>}
    </section>
  )
}
