/*
 * What the page and the A* worker (pathfind.worker.ts) send each other. Kept apart from the worker itself, so
 * importing these never runs the worker's code on the page.
 */

export type Grid = { width: number; height: number; bbox: [number, number, number, number]; values: Float32Array }
export type PathRequest = { grid: Grid; points: [number, number][] }
export type LegStatus = 'safe' | 'blocked' | 'outside'
export type PathResponse = {
  legs: { path: [number, number][]; status: LegStatus }[]
  slope: Float32Array
  /** Per cell: one of HAZARD */
  hazard: Uint8Array
}

/** How each cell of the terrain was judged */
export const HAZARD = { none: 0, caution: 1, hazard: 2, steep: 3, deepSoft: 4, deep: 5, noData: 6 } as const
