import type { LngLat } from '../state/types'
import { terrainFor, type TerrainGrid } from './terrain'
import type { SlopeGrid } from './slope'
import type { LegStatus, PathRequest, PathResponse, RouteOption } from './pathfind'

/*
 * A route's safe path: the terrain under it (terrain.ts), then A* through it in a worker (pathfind.worker.ts).
 * One leg per pair of consecutive points; a leg the finder can't route (off the terrain, or walled in) stays a
 * straight line and says so. Each route is found two ways (safest, most direct) so they can be compared.
 */

export type { LegStatus, RouteOption }
export type LegPath = { path: LngLat[]; status: LegStatus }
export type HazardGrid = Omit<SlopeGrid, 'values'> & { values: Uint8Array }
export type SafePath = {
  legs: Record<RouteOption, LegPath[]>
  terrain: TerrainGrid
  slope: SlopeGrid
  hazard: HazardGrid
  /** Spread of slope nearby, in degrees */
  roughness: SlopeGrid
}

export async function findSafePath(points: LngLat[], signal?: AbortSignal): Promise<SafePath> {
  const terrain = await terrainFor(points)
  signal?.throwIfAborted()
  const request: PathRequest = {
    grid: { width: terrain.width, height: terrain.height, bbox: terrain.bbox, values: terrain.values.slice() },
    points,
    obstacles: terrain.obstacles,
  }
  const res = await new Promise<PathResponse>((resolve, reject) => {
    const worker = new Worker(new URL('./pathfind.worker.ts', import.meta.url), { type: 'module' })
    const stop = () => {
      worker.terminate()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', stop, { once: true })
    worker.onmessage = (e: MessageEvent<PathResponse>) => {
      signal?.removeEventListener('abort', stop)
      worker.terminate()
      resolve(e.data)
    }
    worker.onerror = (e) => {
      signal?.removeEventListener('abort', stop)
      worker.terminate()
      reject(new Error(e.message))
    }
    worker.postMessage(request, [request.grid.values.buffer])
  })
  const shape = { width: terrain.width, height: terrain.height, bbox: terrain.bbox }
  return {
    legs: res.legs,
    terrain,
    slope: { ...shape, values: res.slope },
    hazard: { ...shape, values: res.hazard },
    roughness: { ...shape, values: res.roughness },
  }
}
