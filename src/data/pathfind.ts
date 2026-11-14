import type { RouteOption } from '../state/types'

/*
 * What the page and the A* worker (pathfind.worker.ts) send each other. Kept apart from the worker itself, so
 * importing these never runs the worker's code on the page.
 */

export type { RouteOption }
export type Grid = { width: number; height: number; bbox: [number, number, number, number]; values: Float32Array }
export type LegStatus = 'safe' | 'blocked' | 'outside'
export type LegResult = { path: [number, number][]; status: LegStatus }

export type PathRequest = {
  grid: Grid
  /** Stops in walking order; one point (or none) just maps the terrain */
  points: [number, number][]
  /** Rocky share per cell on the same grid, 0–100 %, 255 = not covered (the site's HiRISE-derived map) */
  obstacles?: Uint8Array
}

export type PathResponse = {
  legs: Record<RouteOption, LegResult[]>
  slope: Float32Array
  /** Per cell: one of HAZARD */
  hazard: Uint8Array
  /** Per cell: spread (standard deviation) of slope within ROUGHNESS_RADIUS_M, in degrees: bumpy ground is high */
  roughness: Float32Array
}

/** How each cell of the terrain was judged */
export const HAZARD = { none: 0, caution: 1, hazard: 2, steep: 3, deepSoft: 4, deep: 5, noData: 6, rockySoft: 7, rocky: 8 } as const

/** No rocky-ground value for a cell (outside the HiRISE DTMs) */
export const NO_OBSTACLE_DATA = 255
