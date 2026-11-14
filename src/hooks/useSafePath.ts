import { useEffect, useMemo, useState } from 'react'
import type { LngLat } from '../state/types'
import { findSafePath, type SafePath } from '../data/safePath'
import { TERRAIN_NOTE } from '../data/terrain'
import { distanceM } from '../data/mars'
import { formatKm } from '../lib/format'

export type SafePathState = { status: 'idle' | 'loading' | 'ready' | 'error'; value: SafePath | null }

const IDLE: SafePathState = { status: 'idle', value: null }
/** Wait for the stops to settle (a drag, a quick run of clicks) before routing */
const SETTLE_MS = 250

/**
 * The A* safe path through a list of points, worked out again whenever the points change. The last result stays
 * up (status 'loading') until the new one is ready, so the map doesn't flash back to straight lines.
 * One point maps the terrain round it with no route (the habitat before any stop is added).
 * reachBudgetM: also mark the safety envelope round the first point, for that walking budget.
 */
export function useSafePath(points: LngLat[] | null, reachBudgetM: number | null = null): SafePathState {
  const pointsKey = points?.length ? points.map((p) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`).join(';') : ''
  const key = pointsKey && `${pointsKey}|${reachBudgetM ? Math.round(reachBudgetM) : ''}`
  // The result, tagged with the points it was found for; a newer set of points shows as loading over it
  const [found, setFound] = useState<SafePathState & { key: string }>({ ...IDLE, key: '' })

  useEffect(() => {
    if (!key) return
    const [ptsPart, budgetPart] = key.split('|')
    const pts = ptsPart.split(';').map((p) => p.split(',').map(Number) as LngLat)
    const budget = budgetPart ? Number(budgetPart) : null
    const ctl = new AbortController()
    const id = setTimeout(() => {
      findSafePath(pts, budget, ctl.signal)
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

const samePoint = (a: LngLat, b: LngLat) => Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6
const lengthOf = (path: LngLat[]) => path.slice(1).reduce((m, p, i) => m + distanceM(path[i], p), 0)

export type MissionPath = {
  safe: SafePathState
  /** The whole walk along the safe path, stop to stop, once it fits these points; null until then */
  line: LngLat[] | null
  /** Each leg's length along the safe path, in metres (null until it fits) */
  legM: number[] | null
  /** One line about it for a card, e.g. "13.9 km on foot, round steep and deep ground · Jezero CTX DTM, 20 m/px (USGS)" */
  note: string | undefined
}

/**
 * A saved mission's route walked by its A* safe path (the Topographic layers), the same way on the globe page's
 * 2D map and on the mission's own page. points: the stops in walking order, a round trip ending back at the start.
 */
export function useMissionPath(points: LngLat[] | null): MissionPath {
  const { status, value } = useSafePath(points && points.length > 1 ? points : null)
  return useMemo(() => {
    const safe = { status, value }
    const legs = value?.legs.safest
    // The last path found stays up while the next is worked out: only use it if it joins these stops
    const fits =
      !!legs && !!points && legs.length === points.length - 1 &&
      legs.every((l, i) => samePoint(l.path[0], points[i]) && samePoint(l.path[l.path.length - 1], points[i + 1]))
    const line = fits ? legs.flatMap((l, i) => (i ? l.path.slice(1) : l.path)) : null
    const legM = fits ? legs.map((l) => lengthOf(l.path)) : null
    let note: string | undefined
    if (status === 'error') note = 'No elevation data to route by: drawn as straight lines'
    else if (status !== 'idle' && (!line || !value)) note = 'Finding a way round steep and deep ground…'
    else if (line && value) {
      const stuck = legs!.filter((l) => l.status !== 'safe').length
      const how = stuck ? `${stuck} leg${stuck > 1 ? 's' : ''} with no safe way through (straight)` : 'round steep and deep ground'
      note = `${formatKm(lengthOf(line) / 1000)} on foot, ${how} · ${TERRAIN_NOTE[value.terrain.source]}`
    }
    return { safe, line, legM, note }
  }, [status, value, points])
}
