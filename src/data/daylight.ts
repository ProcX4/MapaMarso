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

/** Minutes from `ms` until the Sun next rises at a point (null if it's already up, or doesn't rise within a sol). */
export function minutesToSunrise(at: LngLat, ms: number): number | null {
  if (sunElevation(at, ms) >= 0) return null
  for (let t = ms + STEP_MS; t <= ms + SOL_S * 1000; t += STEP_MS) {
    if (sunElevation(at, t) >= 0) return (t - ms) / 60_000
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
