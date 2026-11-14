import { useEffect, useState } from 'react'
import type { LngLat } from '../state/types'
import { fetchRoverPhotos, type RoverPhotosResponse } from '../services/roverPhotos'

export type RoverPhotosResult = { status: 'idle' | 'loading' | 'ready' | 'error'; value: RoverPhotosResponse | null }

/** Perseverance photos near a point; 'ready' with no stop when the rover never came within range. */
export function useRoverPhotos(at: LngLat | null): RoverPhotosResult {
  const [result, setResult] = useState<RoverPhotosResult>({ status: 'idle', value: null })
  const key = at ? `${at[0]},${at[1]}` : ''

  useEffect(() => {
    if (!at) {
      setResult({ status: 'idle', value: null })
      return
    }
    let alive = true
    setResult({ status: 'loading', value: null })
    fetchRoverPhotos(at)
      .then((v) => alive && setResult({ status: 'ready', value: v }))
      .catch(() => alive && setResult({ status: 'error', value: null }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the coordinate values
  }, [key])

  return result
}
