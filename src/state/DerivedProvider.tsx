import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatasetsContext, HoverContext, RouteContext, type Datasets, type Loaded, type RouteSummary, type Routing } from './derivedContexts'
import { useMarswalk } from '../hooks/useMarswalk'
import { useSafePath } from '../hooks/useSafePath'
import { loadFeatures, toScienceTargets } from '../data/vectors'
import { analyseRoute, walkingOrder, type RouteAnalysis } from '../data/route'
import { layerDef } from '../map/layers/registry'
import type { ScienceTarget } from '../data/vectors'
import type { LngLat, RouteOption } from './types'

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

  // With only the start placed, the terrain round it is still mapped (the hazard shading), with no route
  const points = useMemo(() => walkingOrder(state.stops, state.roundTrip).map((s) => s.at), [state.stops, state.roundTrip])
  const safe = useSafePath(points)
  const found = safe.value

  const data = useMemo<Datasets>(() => {
    const ready = <T,>(value: T | undefined): Loaded<T> =>
      value ? { status: 'ready', value } : safe.status === 'loading' ? loading : missing
    return {
      dtm: ready(found?.terrain),
      slope: ready(found?.slope),
      hazard: ready(found?.hazard),
      roughness: ready(found?.roughness),
      targets,
    }
  }, [found, safe.status, targets])

  const analysis = useMemo(() => {
    const analyse = (option: RouteOption) =>
      analyseRoute(state.stops, state.roundTrip, state.walkingSpeedKmh, found?.terrain ?? null, found?.slope ?? null, found?.legs[option] ?? null, found?.roughness ?? null)
    const route = analyse(state.routeOption)
    const sum = (r: RouteAnalysis): RouteSummary => ({
      totalM: r.totalM,
      durationMin: r.durationMin,
      maxSlope: r.maxSlope,
      avgSlope: r.avgSlope,
      hazardM: r.hazards.reduce((m, h) => m + h.toM - h.fromM, 0),
    })
    const other: RouteOption = state.routeOption === 'safest' ? 'direct' : 'safest'
    const both = found && route.legs.length && route.legs.every((l) => l.status !== 'straight')
    const alt = both ? analyse(other) : null
    const options = alt ? ({ [state.routeOption]: sum(route), [other]: sum(alt) } as Record<RouteOption, RouteSummary>) : null
    // The route not taken, drawn faintly on the map for comparison
    const otherPath = alt ? alt.legs.flatMap((l, i) => (i ? l.path.slice(1) : l.path)) : null
    const statuses = route.legs.map((l) => l.status)
    const routing: Routing =
      !route.legs.length ? 'none'
      : statuses.includes('straight') ? (safe.status === 'error' ? 'unavailable' : 'finding')
      : statuses.every((s) => s === 'safe') ? 'safe'
      : 'partial'
    return { ...route, routing, options, otherPath }
  }, [state.stops, state.roundTrip, state.walkingSpeedKmh, state.routeOption, found, safe.status])
  const hoverValue = useMemo(() => ({ hover, setHover }), [hover])

  return (
    <DatasetsContext value={data}>
      <RouteContext value={analysis}>
        <HoverContext value={hoverValue}>{children}</HoverContext>
      </RouteContext>
    </DatasetsContext>
  )
}
