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

/** Metres per degree of longitude and latitude at a latitude. */
export function metresPerDegree(lat: number) {
  const perLat = MARS_RADIUS_M * rad
  return { lon: perLat * Math.cos(lat * rad), lat: perLat }
}
