import { useEffect, useMemo, useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { nextStop, pointAlong, walkMinutes } from '../../data/route'
import { distanceM } from '../../data/mars'
import { centerOn } from '../../map/mapControl'
import { daylightText, minutesToSunset, sunElevation } from '../../data/daylight'
import { Button } from '../../components/Button'
import { Slider } from '../../components/Slider'
import { formatDistance } from '../../lib/format'
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
  // The simulated walk starts now, so daylight is real: the Sun keeps moving as the crew walks
  const [startMs] = useState(() => Date.now())
  const total = route.totalM

  const here = useMemo(() => pointAlong(route.profile, alongM), [route.profile, alongM])
  const base = state.stops[0]

  useEffect(() => {
    if (!here) return
    dispatch({ type: 'setEvaPosition', at: here.at })
    centerOn(here.at)
  }, [here, dispatch])

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

  const next = returning ? { stop: base, remainingM: distanceM(here.at, base.at) } : nextStop(route, alongM)
  const elapsedMin = total ? route.durationMin * (alongM / total) : 0
  const toBaseM = distanceM(here.at, base.at)
  const toBaseMin = walkMinutes(toBaseM, 0, state.walkingSpeedKmh)
  const leftMin = state.maxEvaHours * 60 - elapsedMin
  const simMs = startMs + elapsedMin * 60_000
  const sun = sunElevation(here.at, simMs)
  const sunsetMin = minutesToSunset(here.at, simMs)
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
        <HazardAlert returnMin={toBaseMin} leftMin={leftMin} sunUp={sun >= 0} sunsetMin={sunsetMin} hazard={hazardAhead} hazardStartsInM={hazardAhead ? Math.max(0, hazardAhead.fromM - alongM) : null} />
      </div>

      <div className="eva-facts">
        <NextWaypoint from={here} next={next} />
        <ReturnEstimate toBaseM={toBaseM} toBaseMin={toBaseMin} leftMin={leftMin} />
      </div>

      <div className="eva-bottom">
        <div className="eva-progress">
          <Slider label="Simulated position along route" value={alongM} min={0} max={total} step={1} valueText={`${formatDistance(alongM)} of ${formatDistance(total)}`} onChange={setAlongM} />
          <span className="num muted">{formatDistance(alongM)} / {formatDistance(total)}</span>
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
