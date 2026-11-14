import { useDatasets, useRoute } from '../../hooks/useDerived'
import { useMarswalk } from '../../hooks/useMarswalk'
import { scienceOpportunities } from '../../data/route'
import { formatDistance, formatDuration } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { Button } from '../../components/Button'
import { walkingAssumption } from '../../config/assumptions'

/** Science targets near the route, each with a reason and the detour it costs. */
export function ScienceOpportunity() {
  const { state, dispatch } = useMarswalk()
  const data = useDatasets()
  const route = useRoute()
  const list = scienceOpportunities(route.profile, data.targets.value ?? [], state.walkingSpeedKmh)

  return (
    <div className="plan-science">
      <h2 className="kicker">Science opportunities</h2>
      {data.targets.status === 'missing' && <p className="muted">No science target data loaded yet.</p>}
      {data.targets.status === 'ready' && !list.length && <p className="muted">No targets within 1 km of the route.</p>}
      <ul>
        {list.map((t) => (
          <li key={t.id} className="plan-science-item">
            <p className="plan-science-name">{t.name}</p>
            <p className="muted">{t.reason}</p>
            <p className="num plan-science-meta">
              {formatDistance(t.offRouteM)} off route · +{formatDuration(t.detourMin)} detour{' '}
              <ProvenanceTag category="estimated" note={`There and back from the closest route point. ${walkingAssumption()}`} />
            </p>
            <Button variant="ghost" onClick={() => dispatch({ type: 'addStop', stop: { id: crypto.randomUUID(), kind: 'science', name: t.name, at: t.at } })}>
              Add as science stop
            </Button>
          </li>
        ))}
      </ul>
    </div>
  )
}
