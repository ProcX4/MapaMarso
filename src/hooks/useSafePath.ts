import { useEffect, useState } from 'react'
import type { LngLat } from '../state/types'
import { findSafePath, type SafePath } from '../data/safePath'

export type SafePathState = { status: 'idle' | 'loading' | 'ready' | 'error'; value: SafePath | null }

const IDLE: SafePathState = { status: 'idle', value: null }
/** Wait for the stops to settle (a drag, a quick run of clicks) before routing */
const SETTLE_MS = 250

/**
 * The A* safe path through a list of points, worked out again whenever the points change. The last result stays
 * up (status 'loading') until the new one is ready, so the map doesn't flash back to straight lines.
 */
export function useSafePath(points: LngLat[] | null): SafePathState {
  const key = points && points.length > 1 ? points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(';') : ''
  // The result, tagged with the points it was found for; a newer set of points shows as loading over it
  const [found, setFound] = useState<SafePathState & { key: string }>({ ...IDLE, key: '' })

  useEffect(() => {
    if (!key) return
    const pts = key.split(';').map((p) => p.split(',').map(Number) as LngLat)
    const ctl = new AbortController()
    const id = setTimeout(() => {
      findSafePath(pts, ctl.signal)
        .then((value) => setFound({ status: 'ready', value, key }))
        .catch((err) => {
          if (ctl.signal.aborted) return
          console.info('Safe path not available:', err?.message ?? err)
          setFound({ status: 'error', value: null, key })
        })
    }, SETTLE_MS)
    return () => {
      clearTimeout(id)
      ctl.abort()
    }
  }, [key])

  if (!key) return IDLE
  if (found.key === key) return { status: found.status, value: found.value }
  return { status: 'loading', value: found.value }
}
