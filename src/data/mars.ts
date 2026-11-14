import { getDistance } from 'ol/sphere'
import type { LngLat } from '../state/types'

/** Mean radius of Mars. Never let Earth's radius slip in: OpenLayers defaults to it. */
export const MARS_RADIUS_M = 3_389_500

/** Great-circle distance across the surface, in metres. Ignores terrain. */
export const distanceM = (a: LngLat, b: LngLat) => getDistance(a, b, MARS_RADIUS_M)

const rad = Math.PI / 180

/** Initial bearing from a to b, degrees clockwise from north. */
export function bearingDeg(a: LngLat, b: LngLat) {
  const [l1, p1] = [a[0] * rad, a[1] * rad]
  const [l2, p2] = [b[0] * rad, b[1] * rad]
  const y = Math.sin(l2 - l1) * Math.cos(p2)
  const x = Math.cos(p1) * Math.sin(p2) - Math.sin(p1) * Math.cos(p2) * Math.cos(l2 - l1)
  return ((Math.atan2(y, x) / rad) + 360) % 360
}

/** Point a fraction t of the way from a to b. Linear in lon/lat, fine at walking scale. */
export const lerp = (a: LngLat, b: LngLat, t: number): LngLat => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]

const MS_PER_DAY = 86_400_000

/** Mars Sol Date and Coordinated Mars Time (Allison & McEwen 2000, Mars24 algorithm). From MapaMars. */
export function marsClock(date: Date) {
  const jdUT = date.getTime() / MS_PER_DAY + 2440587.5
  const jdTT = jdUT + 69.184 / 86400
  const msd = (jdTT - 2451549.5) / 1.0274912517 + 44796.0 - 0.0009626
  const mtc = (((msd % 1) + 1) % 1) * 24
  return { msd, mtc }
}

/** Local mean solar time at an east longitude, in hours. */
export function localMeanSolarTime(mtc: number, lonEast: number) {
  return (((mtc + lonEast / 15) % 24) + 24) % 24
}

/**
 * Rough Earth–Mars distance from circular orbits with J2000 mean longitudes.
 * Good to ~10%, enough for an indicative one-way light time.
 */
export function earthMarsDistanceAU(date: Date) {
  const d = date.getTime() / MS_PER_DAY + 2440587.5 - 2451545.0
  const le = (100.464 + 0.9856474 * d) * rad
  const lm = (355.453 + 0.5240208 * d) * rad
  const am = 1.5237
  const dx = am * Math.cos(lm) - Math.cos(le)
  const dy = am * Math.sin(lm) - Math.sin(le)
  return Math.hypot(dx, dy)
}

/** Light minutes per astronomical unit. */
export const AU_LIGHT_MIN = 8.3167

/** Metres per degree of longitude and latitude at a latitude. */
export function metresPerDegree(lat: number) {
  const perLat = MARS_RADIUS_M * rad
  return { lon: perLat * Math.cos(lat * rad), lat: perLat }
}
