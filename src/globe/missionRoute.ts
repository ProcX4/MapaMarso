/* Mission routes as start, phases and end, for the flat map and the globe (from MapaMars lib/route.ts). */

/** A named point on a Marswalk: the start, a phase, or the end. */
export type RouteStop = { name: string; lat: number; lon: number }

/** Stops in walking order; a round trip finishes back at the start. */
export function routeStops(start: RouteStop, phases: RouteStop[], end: RouteStop, round = false): RouteStop[] {
  return round ? [start, ...phases, start] : [start, ...phases, end]
}
