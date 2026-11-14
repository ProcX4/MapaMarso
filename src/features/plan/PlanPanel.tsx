import { useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { formatDuration, formatKm, formatSlope } from '../../lib/format'
import { StopList } from './StopList'
import { RouteStats } from './RouteStats'
import { RouteOptions } from './RouteOptions'
import { ReturnEstimate } from './ReturnEstimate'
import { ScienceOpportunity } from './ScienceOpportunity'
import { ElevationProfile } from './ElevationProfile'
import { SaveMission } from './SaveMission'
import { ExportRoute } from './ExportRoute'
import { RadiationEstimate } from './RadiationEstimate'
import { useMissionFromCode } from './useMissionFromCode'
import { go, type BackTo } from '../../lib/missionPaths'
import './plan.css'

/** The planner in three steps (the old mission form's layout): one showing at a time, any one a click away */
type Step = 'route' | 'review' | 'save'
const STEPS: { id: Step; label: string }[] = [
  { id: 'route', label: 'Route' },
  { id: 'review', label: 'Review' },
  { id: 'save', label: 'Save' },
]

/**
 * Plan Marswalk mode: the one place missions are planned, created and edited. The steps float on the left,
 * the elevation profile along the bottom.
 *   1. Route: place the start and stops on the map, round trip or one way, the route options
 *   2. Review: distance, time, slope, the EVA margin, radiation, science opportunities, export
 *   3. Save: name, code and details
 */
/** `back`: where the planner was opened from (a mission's view, EVA or the map), for its Back link */
export function PlanPanel({ back = null }: { back?: BackTo | null }) {
  const { state } = useMarswalk()
  const route = useRoute()
  const load = useMissionFromCode()
  const m = state.mission
  const [step, setStep] = useState<Step>('route')
  const hasRoute = route.order.length > 1
  // A step counts as done once it has what the next one needs
  const done: Record<Step, boolean> = { route: hasRoute, review: hasRoute, save: !!m?.code }

  return (
    <>
      <section className="planner-panel" aria-label="Route planner">
        {back && (
          <button type="button" className="map-back" onClick={() => go(back.hash)}>
            ← {back.label}
          </button>
        )}
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

        <ol className="planner-steps" aria-label="Steps">
          {STEPS.map((s, i) => (
            <li key={s.id}>
              <button
                type="button"
                className={`${step === s.id ? 'is-on' : ''}${done[s.id] ? ' is-done' : ''}`}
                aria-current={step === s.id ? 'step' : undefined}
                onClick={() => setStep(s.id)}
              >
                <span className="planner-step-mark">{i + 1}</span>
                {s.label}
              </button>
            </li>
          ))}
        </ol>

        {step === 'route' && (
          <div className="planner-stage">
            <StopList />
            <RouteOptions />
            {hasRoute && (
              <p className="plan-route-summary num">
                {formatKm(route.totalM / 1000)} · {formatDuration(route.durationMin)}
                {route.maxSlope !== null && ` · max ${formatSlope(route.maxSlope)}`}
              </p>
            )}
          </div>
        )}
        {step === 'review' && (
          <div className="planner-stage">
            {!hasRoute && <p className="muted plan-note">Place a start and at least one more stop in step 1 to see the route's numbers.</p>}
            <RouteStats />
            <ReturnEstimate />
            <RadiationEstimate />
            <ScienceOpportunity />
            <ExportRoute />
          </div>
        )}
        {step === 'save' && (
          <div className="planner-stage">
            <SaveMission key={m?.id ?? 'new'} />
          </div>
        )}

        <div className="form-footer">
          <p className="form-footer-summary num">
            {hasRoute ? `${formatKm(route.totalM / 1000)} · ${formatDuration(route.durationMin)} · ${state.roundTrip ? 'round trip' : 'one way'}` : 'No route yet'}
          </p>
          {step !== 'save' && (
            <button type="button" className="button plan-next" disabled={!hasRoute} onClick={() => setStep(step === 'route' ? 'review' : 'save')}>
              Next: {step === 'route' ? 'Review' : 'Save'} →
            </button>
          )}
        </div>
      </section>
      <section className="plan-bottom" aria-label="Elevation profile">
        <ElevationProfile />
      </section>
    </>
  )
}
