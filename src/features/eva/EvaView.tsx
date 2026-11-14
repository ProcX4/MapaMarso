import { useEffect, useMemo, useRef, useState } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { nearestOnRoute, nextStop, pointAlong, returnAlongRoute, walkMinutes } from '../../data/route'
import { bearingDeg, lmstAt, offsetFromHeading } from '../../data/mars'
import { centerOn } from '../../map/mapControl'
import { daylightOf, daylightText, minutesToSunrise, minutesToSunset, sunElevation } from '../../data/daylight'
import { Button } from '../../components/Button'
import { Slider } from '../../components/Slider'
import { Icon } from '../../components/Icon'
import { formatDistance, formatDuration, formatHours } from '../../lib/format'
import { EVA } from '../../config/assumptions'
import { NextWaypoint } from './NextWaypoint'
import { ReturnEstimate } from './ReturnEstimate'
import { HazardAlert } from './HazardAlert'
import { MAP_PLAN } from '../../lib/missionPaths'
import './eva.css'

const KEY_STEP_M = 50
/** Playback steps this often (real time): smooth enough to watch, light enough not to redraw the page every frame */
const TICK_MS = 200
/** Walking minutes per real second */
const SPEEDS = [
  { minPerS: 1, label: '1 min/s' },
  { minPerS: 5, label: '5 min/s' },
  { minPerS: 15, label: '15 min/s' },
]
/** How long the "Arrived at …" banner stays up, real time */
const ARRIVED_MS = 3500

/** Where the simulated walk is: metres along the route, and walking minutes since it set off (time only runs forward) */
type Walk = { alongM: number; elapsedMin: number }

/**
 * EVA mode: big type, a few facts, one alert, and the walk played out. Position is SIMULATED: press Play and the
 * crew walks the A* safe path at the route's walking pace, or drag the scrubber (or use the arrow keys). The
 * walk keeps its own clock from the moment EVA opens, so daylight is real for that time: the Sun climbs and sets
 * as the crew walks, the status bar says when it next sets or rises, and the map's night side follows it.
 * MAPA never asks for the device's real location.
 */
export function EvaView() {
  const { state, dispatch } = useMarswalk()
  const route = useRoute()
  const [walk, setWalk] = useState<Walk>({ alongM: 0, elapsedMin: 0 })
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(SPEEDS[1].minPerS)
  const [returning, setReturning] = useState(false)
  // Simulated drift to the right of the planned path, to try the off-route warning (the simulated position is otherwise always on the route)
  const [driftM, setDriftM] = useState(0)
  const [arrived, setArrived] = useState<{ name: string; at: number } | null>(null)
  // The simulated walk starts now, so daylight is real: the Sun keeps moving as the crew walks
  const [startMs] = useState(() => Date.now())
  const total = route.totalM
  const { alongM, elapsedMin } = walk
  const simMs = startMs + elapsedMin * 60_000

  const here = useMemo(() => pointAlong(route.profile, alongM), [route.profile, alongM])
  const base = state.stops[0]
  // Where the crew is: on the route, or driftM metres to the right of it
  const at = useMemo(() => {
    if (!here) return null
    if (!driftM) return here.at
    const ahead = pointAlong(route.profile, alongM + 20)
    const heading = ahead && ahead !== here ? bearingDeg(here.at, ahead.at) : bearingDeg(pointAlong(route.profile, alongM - 20)?.at ?? here.at, here.at)
    return offsetFromHeading(here.at, heading, driftM)
  }, [here, driftM, route.profile, alongM])

  // Distance along the route of each stop after the start, for the scrubber's marks and the arrival banner
  const stopMarks = useMemo(
    () =>
      route.legs.map((leg, i) => ({
        name: leg.to.name || 'Stop',
        kind: leg.to.kind,
        m: route.legs.slice(0, i + 1).reduce((sum, l) => sum + l.m, 0),
      })),
    [route.legs],
  )

  useEffect(() => {
    if (!at) return
    dispatch({ type: 'setEvaPosition', at })
    centerOn(at)
  }, [at, dispatch])

  // The map's day and night follow the walk's clock while EVA is open
  useEffect(() => {
    dispatch({ type: 'setEvaTime', ms: simMs })
  }, [simMs, dispatch])
  useEffect(() => () => dispatch({ type: 'setEvaTime', ms: null }), [dispatch])

  // The latest route and choices, for the playback timer and the key handler, which are set up once
  const latest = useRef({ total, duration: route.durationMin, stopMarks, returning, roundTrip: state.roundTrip, profile: route.profile, alongM })
  useEffect(() => {
    latest.current = { total, duration: route.durationMin, stopMarks, returning, roundTrip: state.roundTrip, profile: route.profile, alongM }
  })

  /** Jump the walk to a point along the route: the clock is set to the time it takes to walk there */
  const seekTo = (m: number) => {
    const { total: len, duration } = latest.current
    const d = Math.min(len, Math.max(0, m))
    setWalk({ alongM: d, elapsedMin: len ? (duration * d) / len : 0 })
  }
  const seek = useRef(seekTo)
  useEffect(() => {
    seek.current = seekTo
  })

  // Playback: the walk's clock runs at `speed`, and the crew moves along the route at the route's own pace
  // (its whole length over its estimated walking time), forward, or home when returning
  useEffect(() => {
    if (!playing) return
    const id = setInterval(() => {
      const { total: len, duration, stopMarks: marks, returning: home, roundTrip, profile } = latest.current
      if (!len || !duration) return setPlaying(false)
      const stepMin = (TICK_MS / 1000) * speed
      const stepM = (len / duration) * stepMin
      setWalk((w) => {
        // Home: back the way you came, or on round the rest of a round trip, whichever is shorter
        const dir = home ? (returnAlongRoute(profile, w.alongM, roundTrip).way === 'back' ? -1 : 1) : 1
        const next = Math.min(len, Math.max(0, w.alongM + dir * stepM))
        const ends = dir > 0 ? next >= len : next <= 0
        // Passing a stop on the way out: say so
        if (!home) {
          const passed = marks.find((s) => s.m > w.alongM && s.m <= next)
          if (passed) setArrived({ name: roundTrip && passed === marks[marks.length - 1] ? 'base' : passed.name, at: Date.now() })
        }
        if (ends) {
          setPlaying(false)
          if (home) setArrived({ name: 'base', at: Date.now() })
        }
        return { alongM: next, elapsedMin: w.elapsedMin + stepMin }
      })
    }, TICK_MS)
    return () => clearInterval(id)
  }, [playing, speed])

  useEffect(() => {
    if (!arrived) return
    const id = setTimeout(() => setArrived(null), ARRIVED_MS)
    return () => clearTimeout(id)
  }, [arrived])

  // Keys: Space plays and pauses, the arrows step along the route (the slider and buttons keep their own keys)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLButtonElement || e.target instanceof HTMLTextAreaElement) return
      if (e.key === 'ArrowRight') seek.current(latest.current.alongM + KEY_STEP_M)
      if (e.key === 'ArrowLeft') seek.current(latest.current.alongM - KEY_STEP_M)
      if (e.key === ' ') {
        e.preventDefault()
        setPlaying((p) => !p)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

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
  const toBaseM = home.m
  const toBaseMin = walkMinutes(home.m, home.climbM, state.walkingSpeedKmh)
  const leftMin = state.maxEvaHours * 60 - elapsedMin
  const sun = sunElevation(here.at, simMs)
  const light = daylightOf(sun)
  const sunsetMin = minutesToSunset(here.at, simMs)
  const sunriseMin = sun < 0 ? minutesToSunrise(here.at, simMs) : null
  const offRouteM = at ? (nearestOnRoute(route.profile, at)?.offM ?? 0) : 0
  const lmstNow = formatHours(lmstAt(simMs, here.at[0])).slice(0, 5)
  const backAtLmst = formatHours(lmstAt(simMs + toBaseMin * 60_000, base.at[0])).slice(0, 5)
  const hazardAhead = route.hazards.find((h) => h.toM >= alongM && h.fromM <= alongM + 200) ?? null
  const done = !returning && alongM >= total - 0.5
  const sunNext = sunsetMin !== null ? `sets in ${formatDuration(sunsetMin)}` : sunriseMin !== null ? `rises in ${formatDuration(sunriseMin)}` : null

  const jumpToNext = (kind?: 'science') => {
    const stop = stopMarks.find((s) => s.m > alongM + 1 && (!kind || s.kind === kind))
    if (stop) seekTo(stop.m)
  }
  const togglePlay = () => {
    // Played to the end: play again from the start
    if (!playing && done) seekTo(0)
    setPlaying((p) => !p)
  }

  return (
    <div className={`eva is-${light}`}>
      <div className="eva-top">
        <p className="eva-status num">
          <span className="eva-sim-badge">
            <span className="live-dot" aria-hidden /> Simulation
          </span>
          <span>
            {lmstNow} <small>LMST</small>
          </span>
          <span className={`eva-sun is-${light}`}>
            <Icon name={light === 'night' ? 'moon' : 'sun'} size={15} />
            {daylightText(sun)}
            {sunNext && <small> · {sunNext}</small>}
          </span>
          <span>
            {formatDuration(elapsedMin)} <small>walked</small>
          </span>
        </p>
        <HazardAlert returnMin={toBaseMin} leftMin={leftMin} sunUp={sun >= 0} sunsetMin={sunsetMin} hazard={hazardAhead} hazardStartsInM={hazardAhead ? Math.max(0, hazardAhead.fromM - alongM) : null} offRouteM={offRouteM} />
        {arrived && (
          <p className="eva-arrived" role="status">
            {arrived.name === 'base' ? 'Back at base' : `Arrived at ${arrived.name}`}
          </p>
        )}
      </div>

      <aside className="eva-facts" aria-label="Walk facts">
        <NextWaypoint from={{ ...here, at: at ?? here.at }} next={next} />
        <ReturnEstimate toBaseM={toBaseM} toBaseMin={toBaseMin} leftMin={leftMin} way={home.way} safe={route.routing === 'safe'} backAtLmst={backAtLmst} />
      </aside>

      <div className="eva-bottom">
        <div className="eva-player">
          <button type="button" className="eva-play" onClick={togglePlay} aria-label={playing ? 'Pause the walk' : done ? 'Play the walk again' : 'Play the walk'} title={playing ? 'Pause (Space)' : 'Play (Space)'}>
            <Icon name={playing ? 'pause' : 'play'} size={22} />
          </button>
          <div className="eva-scrub">
            <div className="eva-scrub-track">
              <Slider
                label="Simulated position along route"
                value={alongM}
                min={0}
                max={total}
                step={1}
                valueText={`${formatDistance(alongM)} of ${formatDistance(total)}`}
                onChange={(m) => {
                  setPlaying(false)
                  setReturning(false)
                  seekTo(m)
                }}
              />
              {/* A mark at each stop: the destination B, science stops in green */}
              {stopMarks.map((s, i) => (
                <span key={i} className={`eva-scrub-mark is-${s.kind}`} style={{ left: `${(s.m / total) * 100}%` }} title={s.name} aria-hidden />
              ))}
            </div>
            <p className="eva-scrub-text num">
              <span>
                {formatDistance(alongM)} of {formatDistance(total)}
              </span>
              <span>{returning ? 'Walking home' : done ? 'Route complete' : `${formatDuration(Math.max(0, route.durationMin - elapsedMin))} to go`}</span>
            </p>
          </div>
          <div className="eva-speed" role="radiogroup" aria-label="Playback speed: walking minutes per second">
            {SPEEDS.map((s) => (
              <button key={s.minPerS} type="button" role="radio" aria-checked={speed === s.minPerS} className={speed === s.minPerS ? 'is-on' : ''} onClick={() => setSpeed(s.minPerS)}>
                {s.label}
              </button>
            ))}
          </div>
        </div>
        <div className="eva-actions">
          <Button size="large" onClick={() => { setReturning(false); jumpToNext() }}>Next stop</Button>
          <Button size="large" variant="ghost" onClick={() => { setReturning(false); jumpToNext('science') }}>Next science</Button>
          <Button size="large" variant="ghost" aria-pressed={returning} onClick={() => setReturning((r) => !r)}>
            {returning ? 'Resume route' : 'Return to base'}
          </Button>
          <Button size="large" variant="ghost" onClick={() => (window.location.hash = MAP_PLAN)}>Back to plan</Button>
        </div>
        <details className="eva-practice">
          <summary>Practice: drift off the route</summary>
          <div className="eva-progress">
            <Slider label="Simulated drift off the route" value={driftM} min={0} max={150} step={5} valueText={driftM ? `${driftM} m to the right` : 'On the route'} onChange={setDriftM} />
            <span className="num muted">{driftM ? `${driftM} m off · warns past ${EVA.offRouteWarnM} m` : `Warns past ${EVA.offRouteWarnM} m`}</span>
          </div>
        </details>
      </div>
    </div>
  )
}
