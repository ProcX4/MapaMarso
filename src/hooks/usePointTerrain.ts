import { useEffect, useState } from 'react'
import type { LngLat } from '../state/types'
import { pointTerrain, type PointTerrain } from '../data/terrain'

export type PointTerrainResult = { status: 'idle' | 'loading' | 'ready' | 'nodata'; value: PointTerrain | null }

/** Elevation and slope at a point anywhere on Mars (the site DTM there, MOLA elsewhere); 'nodata' when neither answers. */
export function usePointTerrain(at: LngLat | null): PointTerrainResult {
  const [result, setResult] = useState<PointTerrainResult>({ status: 'idle', value: null })
  const key = at ? `${at[0]},${at[1]}` : ''

  useEffect(() => {
    if (!at) {
      setResult({ status: 'idle', value: null })
      return
    }
    let alive = true
    setResult({ status: 'loading', value: null })
    pointTerrain(at)
      .then((v) => alive && setResult(v.elevM === null ? { status: 'nodata', value: v } : { status: 'ready', value: v }))
      .catch(() => alive && setResult({ status: 'nodata', value: null }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the coordinate values
  }, [key])

  return result
}
