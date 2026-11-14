import type { LngLat, Stop } from '../state/types'
import { distanceM, lerp } from './mars'
import { sampleGrid, type DtmGrid } from './elevation'
import { slopeBand, type SlopeGrid } from './slope'
import type { ScienceTarget } from './vectors'
import { PROFILE_STEP_M, SLOPE_BANDS, WALKING } from '../config/assumptions'

/*
 * Everything MAPA works out about a route. Nothing here is stored in state:
 * it is recalculated from the stops whenever they change, so it can't drift.
 * Legs are straight lines between stops (terrain-aware routing is a stretch goal).
 */

export type Leg = { from: Stop; to: Stop; m: number }
export type ProfilePoint = { at: LngLat; distM: number; elevM: number | null; slopeDeg: number | null; leg: number }
export type HazardSection = { fromM: number; toM: number; maxSlope: number; label: string; token: string }

export type RouteAnalysis = {
  order: Stop[]
  legs: Leg[]
  totalM: number
  profile: ProfilePoint[]
  /** null when the DTM doesn't cover the route ("No data", never 0). */
  gainM: number | null
  lossM: number | null
  maxSlope: number | null
  durationMin: number
  hazards: HazardSection[]
  elevationCoverage: number // share of profile points with elevation, 0–1
}

const MAX_SAMPLES = 5000
const firstHazardBand = SLOPE_BANDS.find((b) => b.token)!

/** Stops in walking order; a round trip finishes back at base. */
export function walkingOrder(stops: Stop[], roundTrip: boolean): Stop[] {
  return roundTrip && stops.length > 1 ? [...stops, { ...stops[0], id: 'base-return' }] : stops
}

export function analyseRoute(
  stops: Stop[],
  roundTrip: boolean,
  speedKmh: number,
  dtm: DtmGrid | null,
  slope: SlopeGrid | null,
): RouteAnalysis {
  const order = walkingOrder(stops, roundTrip)
  const legs = order.slice(1).map((to, i) => ({ from: order[i], to, m: distanceM(order[i].at, to.at) }))
  const totalM = legs.reduce((sum, l) => sum + l.m, 0)
  const step = Math.max(PROFILE_STEP_M, totalM / MAX_SAMPLES)

  const profile: ProfilePoint[] = []
  let walked = 0
  legs.forEach((leg, li) => {
    const n = Math.max(1, Math.ceil(leg.m / step))
    for (let k = li === 0 ? 0 : 1; k <= n; k++) {
      const at = lerp(leg.from.at, leg.to.at, k / n)
      profile.push({
        at,
        distM: walked + (leg.m * k) / n,
        elevM: dtm ? sampleGrid(dtm, dtm.values, at) : null,
        slopeDeg: slope ? sampleGrid(slope, slope.values, at) : null,
        leg: li,
      })
    }
    walked += leg.m
  })

  let gain = 0, loss = 0, withElev = 0
  for (let i = 0; i < profile.length; i++) {
    const e = profile[i].elevM
    if (e === null) continue
    withElev++
    const prev = profile[i - 1]?.elevM
    if (prev === null || prev === undefined) continue
    if (e > prev) gain += e - prev
    else loss += prev - e
  }
  const elevationCoverage = profile.length ? withElev / profile.length : 0
  const hasElev = elevationCoverage > 0

  const slopes = profile.map((p) => p.slopeDeg).filter((s): s is number => s !== null)
  const maxSlope = slopes.length ? Math.max(...slopes) : null

  return {
    order,
    legs,
    totalM,
    profile,
    gainM: hasElev ? gain : null,
    lossM: hasElev ? loss : null,
    maxSlope,
    durationMin: walkMinutes(totalM, hasElev ? gain : 0, speedKmh),
    hazards: hazardSections(profile),
    elevationCoverage,
  }
}

/** ESTIMATED walking time: flat-ground speed plus a penalty per metre climbed. */
export function walkMinutes(distM: number, climbM: number, speedKmh: number) {
  return (distM / 1000 / speedKmh) * 60 + climbM * WALKING.minPerMetreClimb
}

/** Stretches of the route above the first hazard slope band. */
function hazardSections(profile: ProfilePoint[]): HazardSection[] {
  const out: HazardSection[] = []
  let open: HazardSection | null = null
  for (const p of profile) {
    const steep = p.slopeDeg !== null && p.slopeDeg >= firstHazardBand.min
    if (steep && p.slopeDeg !== null) {
      if (!open) open = { fromM: p.distM, toM: p.distM, maxSlope: p.slopeDeg, label: '', token: '' }
      open.toM = p.distM
      open.maxSlope = Math.max(open.maxSlope, p.slopeDeg)
    } else if (open) {
      out.push(open)
      open = null
    }
  }
  if (open) out.push(open)
  return out.map((h) => {
    const band = slopeBand(h.maxSlope)
    return { ...h, label: band.label, token: band.token ?? 'caution' }
  })
}

/** Point on the route at a distance from the start. */
export function pointAlong(profile: ProfilePoint[], distM: number): ProfilePoint | null {
  if (!profile.length) return null
  const i = profile.findIndex((p) => p.distM >= distM)
  return i === -1 ? profile[profile.length - 1] : profile[i]
}

/** Closest profile point to a position, by straight-line distance. */
export function nearestOnRoute(profile: ProfilePoint[], at: LngLat) {
  let best: { point: ProfilePoint; index: number; offM: number } | null = null
  profile.forEach((point, index) => {
    const offM = distanceM(point.at, at)
    if (!best || offM < best.offM) best = { point, index, offM }
  })
  return best as { point: ProfilePoint; index: number; offM: number } | null
}

export type ScienceOpportunity = ScienceTarget & { offRouteM: number; detourMin: number; alongM: number }

/** Targets near the route, with a there-and-back detour time from the closest route point. */
export function scienceOpportunities(profile: ProfilePoint[], targets: ScienceTarget[], speedKmh: number, withinM = 1000) {
  return targets
    .flatMap((t): ScienceOpportunity[] => {
      const near = nearestOnRoute(profile, t.at)
      if (!near || near.offM > withinM) return []
      return [{ ...t, offRouteM: near.offM, alongM: near.point.distM, detourMin: walkMinutes(2 * near.offM, 0, speedKmh) }]
    })
    .sort((a, b) => a.alongM - b.alongM)
}

/** Next stop ahead of a position along the route. */
export function nextStop(analysis: RouteAnalysis, alongM: number) {
  let cum = 0
  for (const leg of analysis.legs) {
    cum += leg.m
    if (cum > alongM + 1) return { stop: leg.to, remainingM: cum - alongM }
  }
  return null
}
