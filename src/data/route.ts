import type { LngLat, Stop } from '../state/types'
import { distanceM, lerp } from './mars'
import { sampleGrid, type DtmGrid } from './elevation'
import { slopeBand, type SlopeGrid } from './slope'
import type { ScienceTarget } from './vectors'
import type { LegPath, LegStatus } from './safePath'
import { PROFILE_STEP_M, SLOPE_BANDS, WALKING } from '../config/assumptions'

/*
 * Everything MAPA works out about a route. Nothing here is stored in state:
 * it is recalculated from the stops whenever they change, so it can't drift.
 * Each leg follows the A* safe path between its stops once that's been found (safePath.ts), and is a
 * straight line until then, or where no path could be found.
 */

/** path: the way the leg is walked, stop to stop; status 'straight' until the safe path is in */
export type Leg = { from: Stop; to: Stop; m: number; path: LngLat[]; status: LegStatus | 'straight' }
export type ProfilePoint = { at: LngLat; distM: number; elevM: number | null; slopeDeg: number | null; roughDeg: number | null; leg: number }
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
  /** Mean slope along the walk, weighted by distance */
  avgSlope: number | null
  /** Mean and worst roughness (spread of slope within ~100 m, degrees) along the walk */
  avgRoughness: number | null
  maxRoughness: number | null
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
  paths: LegPath[] | null = null,
  roughness: SlopeGrid | null = null,
): RouteAnalysis {
  const order = walkingOrder(stops, roundTrip)
  const legs: Leg[] = order.slice(1).map((to, i) => {
    const from = order[i]
    // A path found for an earlier set of stops is only used if it still joins this leg's two stops
    const found = paths?.[i]
    const fits = found && same(found.path[0], from.at) && same(found.path[found.path.length - 1], to.at)
    const path = fits ? found.path : [from.at, to.at]
    return { from, to, path, status: fits ? found.status : 'straight', m: pathLength(path) }
  })
  const totalM = legs.reduce((sum, l) => sum + l.m, 0)
  const step = Math.max(PROFILE_STEP_M, totalM / MAX_SAMPLES)

  const profile: ProfilePoint[] = []
  let walked = 0
  legs.forEach((leg, li) => {
    leg.path.slice(1).forEach((b, si) => {
      const a = leg.path[si]
      const segM = distanceM(a, b)
      const n = Math.max(1, Math.ceil(segM / step))
      for (let k = li === 0 && si === 0 ? 0 : 1; k <= n; k++) {
        const at = lerp(a, b, k / n)
        profile.push({
          at,
          distM: walked + (segM * k) / n,
          elevM: dtm ? sampleGrid(dtm, dtm.values, at) : null,
          slopeDeg: slope ? sampleGrid(slope, slope.values, at) : null,
          roughDeg: roughness ? sampleGrid(roughness, roughness.values, at) : null,
          leg: li,
        })
      }
      walked += segM
    })
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
  const roughs = profile.map((p) => p.roughDeg).filter((r): r is number => r !== null)

  return {
    order,
    legs,
    totalM,
    profile,
    gainM: hasElev ? gain : null,
    lossM: hasElev ? loss : null,
    maxSlope,
    avgSlope: along(profile, (p) => p.slopeDeg),
    avgRoughness: along(profile, (p) => p.roughDeg),
    maxRoughness: roughs.length ? Math.max(...roughs) : null,
    durationMin: walkMinutes(totalM, hasElev ? gain : 0, speedKmh),
    hazards: hazardSections(profile),
    elevationCoverage,
  }
}

// The route finder is given the stops to 6 decimal places (useSafePath), about 6 cm on Mars
/** Distance-weighted mean of a profile value; null when no point has it */
function along(profile: ProfilePoint[], value: (p: ProfilePoint) => number | null) {
  let sum = 0, weight = 0
  for (let i = 1; i < profile.length; i++) {
    const v = value(profile[i])
    if (v === null) continue
    const w = profile[i].distM - profile[i - 1].distM
    sum += v * w
    weight += w
  }
  return weight ? sum / weight : null
}

/**
 * The way back to base from a point along the route, on the path itself (it was found safe): back the way you
 * came, or, on a round trip, on along the rest of the loop if that's shorter. Climb counts the uphill metres in
 * the direction walked.
 */
export function returnAlongRoute(profile: ProfilePoint[], alongM: number, roundTrip: boolean) {
  const total = profile.length ? profile[profile.length - 1].distM : 0
  const climb = (from: number, to: number, reverse: boolean) => {
    let m = 0
    for (let i = 1; i < profile.length; i++) {
      const [a, b] = [profile[i - 1], profile[i]]
      if (b.distM <= from || a.distM >= to || a.elevM === null || b.elevM === null) continue
      const dz = reverse ? a.elevM - b.elevM : b.elevM - a.elevM
      if (dz > 0) m += dz
    }
    return m
  }
  const back = { m: alongM, climbM: climb(0, alongM, true), way: 'back' as const }
  if (!roundTrip) return back
  const on = { m: total - alongM, climbM: climb(alongM, total, false), way: 'on' as const }
  return on.m < back.m ? on : back
}

const same = (a: LngLat, b: LngLat) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6

function pathLength(path: LngLat[]) {
  let m = 0
  for (let i = 1; i < path.length; i++) m += distanceM(path[i - 1], path[i])
  return m
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
