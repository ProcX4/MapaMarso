import type { LatLon, LngLat } from '../state/types'
import { SOL_S, subsolarPoint } from './marsSky'

/*
 * Day, twilight or night at a point on Mars, from MapaMars src/lib/daylight.ts.
 * Matters for a Marswalk: a crew needs to be home before the light goes.
 */

const RAD = Math.PI / 180

/** Mars's dusty sky keeps glowing until the Sun is about this far below the horizon. */
export const TWILIGHT_DEG = 10

export type Daylight = 'day' | 'twilight' | 'night'

/** How high the Sun stands (degrees, negative below the horizon) at a point and time. */
export function sunElevation([lon, lat]: LngLat, ms: number) {
  return sunElevationAt({ lat, lon }, subsolarPoint(ms))
}

export const daylightOf = (elevation: number): Daylight => (elevation >= 0 ? 'day' : elevation > -TWILIGHT_DEG ? 'twilight' : 'night')

/** "Day · Sun 34° up", "Twilight · Sun 4° down", "Night" */
export function daylightText(elevation: number) {
  const light = daylightOf(elevation)
  if (light === 'night') return 'Night'
  const deg = Math.round(Math.abs(elevation))
  return light === 'day' ? `Day · Sun ${deg}° up` : `Twilight · Sun ${deg}° down`
}

const STEP_MS = 5 * 60 * 1000

/**
 * Minutes from `ms` until the Sun next sets at a point (null if it doesn't within a sol, e.g. polar day,
 * or it's already down). Stepped in 5-minute increments: plenty for planning a walk.
 */
export function minutesToSunset(at: LngLat, ms: number): number | null {
  if (sunElevation(at, ms) < 0) return null
  for (let t = ms + STEP_MS; t <= ms + SOL_S * 1000; t += STEP_MS) {
    if (sunElevation(at, t) < 0) return (t - ms) / 60_000
  }
  return null
}

/* ---------- Many points at one moment, and the day/night line (from MapaMars lib/daylight.ts) ---------- */

/** Where the Sun is overhead at this moment, for working out many points at once. */
export const sunAt = (ms: number): LatLon => subsolarPoint(ms)

/** How high the Sun stands (degrees, negative below the horizon) at a point, with the Sun overhead at `sun`. */
export function sunElevationAt(p: LatLon, sun: LatLon) {
  const s = Math.sin(p.lat * RAD) * Math.sin(sun.lat * RAD) + Math.cos(p.lat * RAD) * Math.cos(sun.lat * RAD) * Math.cos((p.lon - sun.lon) * RAD)
  return Math.asin(Math.max(-1, Math.min(1, s))) / RAD
}

/** Hours ahead of now, to the quarter hour: "6 h 15 min", or '' for now */
function aheadText(h: number) {
  const whole = Math.round(h * 4) / 4
  const hh = Math.floor(whole)
  const mm = Math.round((whole - hh) * 60)
  return [hh && `${hh} h`, mm && `${mm} min`].filter(Boolean).join(' ')
}

/** Hours ahead of now, to the quarter hour: "in 6 h 15 min", or "Now" */
export function formatAhead(h: number) {
  const text = aheadText(h)
  return text ? `in ${text}` : 'Now'
}

/** Hours ahead of now, to the quarter hour, as an offset: "+6 h 15 min", or '' for now */
export function formatOffset(h: number) {
  const text = aheadText(h)
  return text && `+${text}`
}

/** One point of the day/night line, and whether it's the sunrise (morning) or sunset (evening) side. */
export type TerminatorPoint = LatLon & { side: 'sunrise' | 'sunset' }

/**
 * The terminator: the circle 90° from where the Sun is overhead. It's a perfect circle on the globe;
 * drawn on a flat latitude/longitude map it becomes a wave, deepest at the solstices and almost straight
 * at the equinoxes. Longitudes are unwrapped so the line runs continuously once round the planet.
 * Mars turns eastward, so the sunrise half lies 90° west of the Sun and the sunset half 90° east.
 */
export function terminatorLine(sun: LatLon, steps = 720): TerminatorPoint[] {
  // At an exact equinox the circle runs through the poles; nudge it so longitudes stay continuous
  const la = (Math.abs(sun.lat) < 0.05 ? 0.05 : sun.lat) * RAD
  const lo = sun.lon * RAD
  const s = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
  // Two directions at right angles to the Sun: due east of it, and the one completing the set
  const u = [-Math.sin(lo), Math.cos(lo), 0]
  const v = [s[1] * u[2] - s[2] * u[1], s[2] * u[0] - s[0] * u[2], s[0] * u[1] - s[1] * u[0]]
  const points: TerminatorPoint[] = []
  let prevLon = 0
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI
    const p = [0, 1, 2].map((k) => Math.cos(t) * u[k] + Math.sin(t) * v[k])
    let lon = Math.atan2(p[1], p[0]) / RAD
    if (i > 0) lon += 360 * Math.round((prevLon - lon) / 360)
    prevLon = lon
    // East of the Sun's longitude it's afternoon heading to sunset; west of it, morning after sunrise
    const rel = ((((lon - sun.lon) % 360) + 540) % 360) - 180
    points.push({ lat: Math.asin(Math.max(-1, Math.min(1, p[2]))) / RAD, lon, side: rel > 0 ? 'sunset' : 'sunrise' })
  }
  return points
}

/** Degrees of longitude the day/night line drifts west each Earth hour: 360° per sol (Earth: 15°). */
export const TERMINATOR_DEG_PER_HOUR = 360 / (SOL_S / 3600)
