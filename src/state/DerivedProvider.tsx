import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatasetsContext, HoverContext, RouteContext, type Datasets, type Loaded, type Routing } from './derivedContexts'
import { useMarswalk } from '../hooks/useMarswalk'
import { useSafePath } from '../hooks/useSafePath'
import { loadFeatures, toScienceTargets } from '../data/vectors'
import { analyseRoute, walkingOrder } from '../data/route'
import { layerDef } from '../map/layers/registry'
import type { ScienceTarget } from '../data/vectors'
import type { LngLat } from './types'

const loading = { status: 'loading', value: null } as const
const missing = { status: 'missing', value: null } as const

/**
 * Loads the site datasets once, finds the planned route's A* safe path whenever its stops change, then provides
 * the route analysis and the hover link on top.
 */
export function DerivedProvider({ children }: { children: ReactNode }) {
  const { state } = useMarswalk()
  const [targets, setTargets] = useState<Loaded<ScienceTarget[]>>(loading)
  const [hover, setHover] = useState<LngLat | null>(null)

  useEffect(() => {
    let alive = true
    loadFeatures(layerDef('science-targets')!.source)
      .then((f) => {
        const list = toScienceTargets(f)
        if (alive) setTargets(list.length ? { status: 'ready', value: list } : missing)
      })
      .catch(() => alive && setTargets(missing))
    return () => {
      alive = false
    }
  }, [])

  const points = useMemo(() => walkingOrder(state.stops, state.roundTrip).map((s) => s.at), [state.stops, state.roundTrip])
  const safe = useSafePath(points)
  const found = safe.value

  const data = useMemo<Datasets>(() => {
    const ready = <T,>(value: T | undefined): Loaded<T> =>
      value ? { status: 'ready', value } : safe.status === 'loading' ? loading : missing
    return { dtm: ready(found?.terrain), slope: ready(found?.slope), hazard: ready(found?.hazard), targets }
  }, [found, safe.status, targets])

  const analysis = useMemo(() => {
    const route = analyseRoute(state.stops, state.roundTrip, state.walkingSpeedKmh, found?.terrain ?? null, found?.slope ?? null, found?.legs ?? null)
    const statuses = route.legs.map((l) => l.status)
    const routing: Routing =
      !route.legs.length ? 'none'
      : statuses.includes('straight') ? (safe.status === 'error' ? 'unavailable' : 'finding')
      : statuses.every((s) => s === 'safe') ? 'safe'
      : 'partial'
    return { ...route, routing }
  }, [state.stops, state.roundTrip, state.walkingSpeedKmh, found, safe.status])
  const hoverValue = useMemo(() => ({ hover, setHover }), [hover])

  return (
    <DatasetsContext value={data}>
      <RouteContext value={analysis}>
        <HoverContext value={hoverValue}>{children}</HoverContext>
      </RouteContext>
    </DatasetsContext>
  )
}
