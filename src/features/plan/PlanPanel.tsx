import { useHash } from '../../hooks/useHash'
import { StopList } from './StopList'
import { RouteStats } from './RouteStats'
import { ReturnEstimate } from './ReturnEstimate'
import { ScienceOpportunity } from './ScienceOpportunity'
import { ElevationProfile } from './ElevationProfile'
import './plan.css'

/** Plan Marswalk mode: route editor on the right, profile along the bottom. */
export function PlanPanel() {
  const code = useHash().match(/^#\/plan\/([A-Za-z0-9-]{1,12})$/)?.[1]
  return (
    <>
      <section className="panel plan-panel" aria-label="Route planner">
        {code && (
          <p className="plan-code-note" role="status">
            Mission <span className="num">{code}</span>: saved missions aren't enabled in this build, so a new route is shown.
          </p>
        )}
        <StopList />
        <RouteStats />
        <ReturnEstimate />
        <ScienceOpportunity />
      </section>
      <section className="panel plan-bottom" aria-label="Elevation profile">
        <ElevationProfile />
      </section>
    </>
  )
}
