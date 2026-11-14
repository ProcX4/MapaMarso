import { useEffect, useState } from 'react'
import type { LngLat } from '../state/types'
import { elevationAt } from '../data/elevation'

export type ElevationResult = { status: 'idle' | 'loading' | 'ready' | 'nodata'; value: number | null }

/** Exact full-resolution DTM value at a point; 'nodata' outside the DTM or when it's missing. */
export function useElevationAt(at: LngLat | null): ElevationResult {
  const [result, setResult] = useState<ElevationResult>({ status: 'idle', value: null })
  const key = at ? `${at[0]},${at[1]}` : ''

  useEffect(() => {
    if (!at) {
      setResult({ status: 'idle', value: null })
      return
    }
    let alive = true
    setResult({ status: 'loading', value: null })
    elevationAt(at)
      .then((v) => alive && setResult(v === null ? { status: 'nodata', value: null } : { status: 'ready', value: v }))
      .catch(() => alive && setResult({ status: 'nodata', value: null }))
    return () => {
      alive = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed on the coordinate values
  }, [key])

  return result
}
