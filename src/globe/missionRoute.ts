import { marsDistanceKm } from '../data/mars'

/* Mission routes as start, phases and end, for the flat map and the globe (from MapaMars lib/route.ts). */

/** A named point on a Marswalk: the start, a phase, or the end. */
export type RouteStop = { name: string; lat: number; lon: number }

export type Leg = { from: string; to: string; km: number }

/** Stops in walking order; a round trip finishes back at the start. */
export function routeStops(start: RouteStop, phases: RouteStop[], end: RouteStop, round = false): RouteStop[] {
  return round ? [start, ...phases, start] : [start, ...phases, end]
}

/** Straight-line legs between consecutive stops, and their total. */
export function routeLegs(stops: RouteStop[]): { legs: Leg[]; totalKm: number } {
  const legs = stops.slice(1).map((to, i) => ({ from: stops[i].name, to: to.name, km: marsDistanceKm(stops[i], to) }))
  return { legs, totalKm: legs.reduce((sum, l) => sum + l.km, 0) }
}
