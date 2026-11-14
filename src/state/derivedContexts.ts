import { createContext } from 'react'
import type { TerrainGrid } from '../data/terrain'
import type { SlopeGrid } from '../data/slope'
import type { HazardGrid } from '../data/safePath'
import type { ScienceTarget } from '../data/vectors'
import type { RouteAnalysis } from '../data/route'
import type { LngLat, RouteOption } from './types'

export type LoadStatus = 'loading' | 'ready' | 'missing'
export type Loaded<T> = { status: LoadStatus; value: T | null }

/**
 * Datasets behind the map and the planner. 'missing' = file absent or unreadable.
 * dtm, slope and hazard cover the ground around the planned route: the Jezero DTM at the site, MOLA elsewhere.
 */
export type Datasets = {
  dtm: Loaded<TerrainGrid>
  slope: Loaded<SlopeGrid>
  hazard: Loaded<HazardGrid>
  /** Spread of slope nearby, degrees */
  roughness: Loaded<SlopeGrid>
  targets: Loaded<ScienceTarget[]>
}

export const DatasetsContext = createContext<Datasets | null>(null)

/** How the planned route was found: still working, A* all the way, A* with some straight legs, or not at all */
export type Routing = 'none' | 'finding' | 'safe' | 'partial' | 'unavailable'

/** One of the two A* routes, summed up for comparing them side by side */
export type RouteSummary = { totalM: number; durationMin: number; maxSlope: number | null; avgSlope: number | null; hazardM: number }

/**
 * Route analysis, recalculated from stops (never stored in the reducer), for the route option chosen; options
 * sums up both, once their paths are in.
 */
export const RouteContext = createContext<
  (RouteAnalysis & { routing: Routing; options: Record<RouteOption, RouteSummary> | null; otherPath: LngLat[] | null }) | null
>(null)

/** Profile ↔ map hover link. Kept out of the reducer: it changes on every mouse move. */
export const HoverContext = createContext<{ hover: LngLat | null; setHover: (at: LngLat | null) => void } | null>(null)
