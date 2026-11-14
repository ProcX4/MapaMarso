import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { formatDuration, formatKm } from '../../lib/format'
import { StopList } from './StopList'
import { RouteStats } from './RouteStats'
import { RouteOptions } from './RouteOptions'
import { ReturnEstimate } from './ReturnEstimate'
import { ScienceOpportunity } from './ScienceOpportunity'
import { ElevationProfile } from './ElevationProfile'
import { SaveMission } from './SaveMission'
import { ExportRoute } from './ExportRoute'
import { useMissionFromCode } from './useMissionFromCode'
import './plan.css'

/** Plan Marswalk mode (the MapaMars full-screen planner): the form floats on the left, the profile along the bottom. */
export function PlanPanel() {
  const { state } = useMarswalk()
  const route = useRoute()
  const load = useMissionFromCode()
  const m = state.mission

  return (
    <>
      <section className="planner-panel" aria-label="Route planner">
        <div className="planner-head">
          <div>
            <p className="info-card-kicker">{m ? `Mission · ${m.commander}` : 'Plan Marswalk'}</p>
            <h1>{m?.name || 'New Marswalk'}</h1>
          </div>
          {m?.code && <span className="mono-code planner-code">{m.code}</span>}
        </div>
        {load.status === 'loading' && <p className="muted plan-note" role="status">Opening mission <span className="mono-code">{load.code}</span>…</p>}
        {load.status === 'notfound' && <p className="form-error" role="alert">No mission has the code <span className="mono-code">{load.code}</span>.</p>}
        {load.status === 'error' && <p className="form-error" role="alert">{load.error}</p>}
        {load.status === 'off' && <p className="muted plan-note" role="status">Saved missions aren't set up in this build, so <span className="mono-code">{load.code}</span> can't be opened.</p>}
        {m?.objective && <p className="planner-objective">{m.objective}</p>}

        <StopList />
        <RouteStats />
        <RouteOptions />
        <ReturnEstimate />
        <ScienceOpportunity />
        <ExportRoute />
        <SaveMission key={m?.id ?? 'new'} />

        <div className="form-footer">
          <p className="form-footer-summary num">
            {route.order.length > 1 ? `${formatKm(route.totalM / 1000)} · ${formatDuration(route.durationMin)} · ${state.roundTrip ? 'round trip' : 'one way'}` : 'No route yet'}
          </p>
        </div>
      </section>
      <section className="plan-bottom" aria-label="Elevation profile">
        <ElevationProfile />
      </section>
    </>
  )
}
