import { createContext } from 'react'
import type { TerrainGrid } from '../data/terrain'
import type { SlopeGrid } from '../data/slope'
import type { HazardGrid } from '../data/safePath'
import type { ScienceTarget } from '../data/vectors'
import type { RouteAnalysis } from '../data/route'
import type { LngLat } from './types'

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
  targets: Loaded<ScienceTarget[]>
}

export const DatasetsContext = createContext<Datasets | null>(null)

/** How the planned route was found: still working, A* all the way, A* with some straight legs, or not at all */
export type Routing = 'none' | 'finding' | 'safe' | 'partial' | 'unavailable'

/** Route analysis, recalculated from stops (never stored in the reducer). */
export const RouteContext = createContext<(RouteAnalysis & { routing: Routing }) | null>(null)

/** Profile ↔ map hover link. Kept out of the reducer: it changes on every mouse move. */
export const HoverContext = createContext<{ hover: LngLat | null; setHover: (at: LngLat | null) => void } | null>(null)
