import { useEffect, useMemo, useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { nearestOnRoute, nextStop, pointAlong, returnAlongRoute, walkMinutes } from '../../data/route'
import { bearingDeg, lmstAt, offsetFromHeading } from '../../data/mars'
import { centerOn } from '../../map/mapControl'
import { daylightText, minutesToSunset, sunElevation } from '../../data/daylight'
import { Button } from '../../components/Button'
import { Slider } from '../../components/Slider'
import { formatDistance, formatHours } from '../../lib/format'
import { EVA } from '../../config/assumptions'
import { NextWaypoint } from './NextWaypoint'
import { ReturnEstimate } from './ReturnEstimate'
import { HazardAlert } from './HazardAlert'
import { MAP_PLAN } from '../../lib/missionPaths'
import './eva.css'

const KEY_STEP_M = 50

/**
 * EVA mode: big type, three facts, one alert. Position is SIMULATED by sliding along the
 * planned route (or arrow keys); MAPA never asks for the device's real location.
 */
export function EvaView() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  const [alongM, setAlongM] = useState(0)
  const [returning, setReturning] = useState(false)
  // Simulated drift to the right of the planned path, to try the off-route warning (the simulated position is otherwise always on the route)
  const [driftM, setDriftM] = useState(0)
  // The simulated walk starts now, so daylight is real: the Sun keeps moving as the crew walks
  const [startMs] = useState(() => Date.now())
  const total = route.totalM

  const here = useMemo(() => pointAlong(route.profile, alongM), [route.profile, alongM])
  const base = state.stops[0]
  // Where the crew is: on the route, or driftM metres to the right of it
  const at = useMemo(() => {
    if (!here) return null
    if (!driftM) return here.at
    const ahead = pointAlong(route.profile, alongM + 20)
    const heading = ahead && ahead !== here ? bearingDeg(here.at, ahead.at) : (bearingDeg(pointAlong(route.profile, alongM - 20)?.at ?? here.at, here.at))
    return offsetFromHeading(here.at, heading, driftM)
  }, [here, driftM, route.profile, alongM])

  useEffect(() => {
    if (!at) return
    dispatch({ type: 'setEvaPosition', at })
    centerOn(at)
  }, [at, dispatch])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement) return // the slider handles its own keys
      if (e.key === 'ArrowRight') setAlongM((a) => Math.min(total, a + KEY_STEP_M))
      if (e.key === 'ArrowLeft') setAlongM((a) => Math.max(0, a - KEY_STEP_M))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [total])

  if (route.order.length < 2 || !here) {
    return (
      <div className="eva eva-empty">
        <p className="eva-empty-text">No route planned yet.</p>
        <Button size="large" onClick={() => (window.location.hash = MAP_PLAN)}>Plan a Marswalk</Button>
      </div>
    )
  }

  // Home along the safe path: back the way you came, or on round the rest of a round trip if that's shorter
  const home = returnAlongRoute(route.profile, alongM, state.roundTrip)
  const next = returning ? { stop: base, remainingM: home.m } : nextStop(route, alongM)
  const elapsedMin = total ? route.durationMin * (alongM / total) : 0
  const toBaseM = home.m
  const toBaseMin = walkMinutes(home.m, home.climbM, state.walkingSpeedKmh)
  const leftMin = state.maxEvaHours * 60 - elapsedMin
  const simMs = startMs + elapsedMin * 60_000
  const sun = sunElevation(here.at, simMs)
  const sunsetMin = minutesToSunset(here.at, simMs)
  const offRouteM = at ? (nearestOnRoute(route.profile, at)?.offM ?? 0) : 0
  const backAtLmst = formatHours(lmstAt(simMs + toBaseMin * 60_000, base.at[0])).slice(0, 5)
  const hazardAhead = route.hazards.find((h) => h.toM >= alongM && h.fromM <= alongM + 200) ?? null

  const jumpToNext = (kind?: 'science') => {
    let cum = 0
    for (const leg of route.legs) {
      cum += leg.m
      if (cum > alongM + 1 && (!kind || leg.to.kind === kind)) return setAlongM(cum)
    }
  }

  return (
    <div className="eva">
      <div className="eva-top">
        <p className="eva-sim">
          <span className="live-dot" aria-hidden /> SIMULATION · position along planned route · {daylightText(sun)}
        </p>
        <HazardAlert returnMin={toBaseMin} leftMin={leftMin} sunUp={sun >= 0} sunsetMin={sunsetMin} hazard={hazardAhead} hazardStartsInM={hazardAhead ? Math.max(0, hazardAhead.fromM - alongM) : null} offRouteM={offRouteM} />
      </div>

      <div className="eva-facts">
        <NextWaypoint from={{ ...here, at: at ?? here.at }} next={next} />
        <ReturnEstimate toBaseM={toBaseM} toBaseMin={toBaseMin} leftMin={leftMin} way={home.way} safe={route.routing === 'safe'} backAtLmst={backAtLmst} />
      </div>

      <div className="eva-bottom">
        <div className="eva-progress">
          <Slider label="Simulated position along route" value={alongM} min={0} max={total} step={1} valueText={`${formatDistance(alongM)} of ${formatDistance(total)}`} onChange={setAlongM} />
          <span className="num muted">{formatDistance(alongM)} / {formatDistance(total)}</span>
        </div>
        <div className="eva-progress eva-drift">
          <Slider label="Simulated drift off the route" value={driftM} min={0} max={150} step={5} valueText={driftM ? `${driftM} m to the right` : 'On the route'} onChange={setDriftM} />
          <span className="num muted">{driftM ? `${driftM} m off · warns past ${EVA.offRouteWarnM} m` : `Drift off route: warns past ${EVA.offRouteWarnM} m`}</span>
        </div>
        <div className="eva-actions">
          <Button size="large" onClick={() => { setReturning(false); jumpToNext() }}>Next</Button>
          <Button size="large" variant="ghost" onClick={() => { setReturning(false); jumpToNext('science') }}>Science</Button>
          <Button size="large" variant="ghost" onClick={() => (window.location.hash = MAP_PLAN)}>Route</Button>
          <Button size="large" variant="ghost" aria-pressed={returning} onClick={() => setReturning((r) => !r)}>
            {returning ? 'Resume route' : 'Return to base'}
          </Button>
        </div>
      </div>
    </div>
  )
}
