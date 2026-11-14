import { createContext } from 'react'
import type Feature from 'ol/Feature'
import type { Geometry } from 'ol/geom'
import type { DtmGrid } from '../data/elevation'
import type { SlopeGrid } from '../data/slope'
import type { ScienceTarget } from '../data/vectors'
import type { RouteAnalysis } from '../data/route'
import type { LngLat } from './types'

export type LoadStatus = 'loading' | 'ready' | 'missing'
export type Loaded<T> = { status: LoadStatus; value: T | null }

/** Site datasets loaded once at start. 'missing' = file absent or unreadable. */
export type Datasets = {
  dtm: Loaded<DtmGrid>
  slope: Loaded<SlopeGrid>
  geology: Loaded<Feature<Geometry>[]>
  targets: Loaded<ScienceTarget[]>
}

export const DatasetsContext = createContext<Datasets | null>(null)

/** Route analysis, recalculated from stops (never stored in the reducer). */
export const RouteContext = createContext<RouteAnalysis | null>(null)

/** Profile ↔ map hover link. Kept out of the reducer: it changes on every mouse move. */
export const HoverContext = createContext<{ hover: LngLat | null; setHover: (at: LngLat | null) => void } | null>(null)
