import type { LngLat } from '../state/types'
import type { RoverPhotosResponse } from '../../api/rover-photos'

export type { RoverPhoto, RoverPhotosResponse, RoverStop } from '../../api/rover-photos'

/** How far from a point a Perseverance stop may be for its photos to count as "what you'll see there" */
export const ROVER_PHOTO_RADIUS_M = 250

const cache = new Map<string, Promise<RoverPhotosResponse>>()

/**
 * Perseverance photos taken at the rover stop nearest a point (within ROVER_PHOTO_RADIUS_M), through our own
 * API (api/rover-photos.ts), which finds the stop and reads NASA's raw-image feed. Kept per point for the visit.
 */
export function fetchRoverPhotos(at: LngLat, radiusM = ROVER_PHOTO_RADIUS_M): Promise<RoverPhotosResponse> {
  const key = `${at[0].toFixed(5)},${at[1].toFixed(5)},${radiusM}`
  let p = cache.get(key)
  if (!p) {
    const q = new URLSearchParams({ lon: at[0].toFixed(6), lat: at[1].toFixed(6), radius: String(radiusM) })
    p = fetch(`/api/rover-photos?${q}`, { signal: AbortSignal.timeout(30_000) }).then((r) => {
      if (!r.ok) throw new Error(`Rover photos: HTTP ${r.status}`)
      return r.json() as Promise<RoverPhotosResponse>
    })
    p.catch(() => cache.delete(key))
    cache.set(key, p)
  }
  return p
}

const DIRECTIONS = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW']

/** "looking NE" for a compass bearing */
export const lookingToward = (azimuth: number) => `looking ${DIRECTIONS[Math.round(azimuth / 45) % 8]}`
