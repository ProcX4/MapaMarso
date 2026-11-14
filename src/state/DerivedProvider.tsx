import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { DatasetsContext, HoverContext, RouteContext, type Datasets } from './derivedContexts'
import { useMarswalk } from '../hooks/useMarswalk'
import { loadDtmGrid } from '../data/elevation'
import { computeSlope } from '../data/slope'
import { loadFeatures, toScienceTargets } from '../data/vectors'
import { analyseRoute } from '../data/route'
import { layerDef } from '../map/layers/registry'
import type { LngLat } from './types'

const loading = { status: 'loading', value: null } as const
const missing = { status: 'missing', value: null } as const

/** Loads the site datasets once, then provides route analysis and the hover link on top. */
export function DerivedProvider({ children }: { children: ReactNode }) {
  const { state } = useMarswalk()
  const [data, setData] = useState<Datasets>({ dtm: loading, slope: loading, geology: loading, targets: loading })
  const [hover, setHover] = useState<LngLat | null>(null)

  useEffect(() => {
    let alive = true
    const set = (patch: Partial<Datasets>) => alive && setData((d) => ({ ...d, ...patch }))

    loadDtmGrid()
      .then((dtm) => {
        set({ dtm: { status: 'ready', value: dtm } })
        return computeSlope(dtm).then((slope) => set({ slope: { status: 'ready', value: slope } }))
      })
      .catch((err) => {
        console.info('Site DTM not available:', err?.message ?? err)
        set({ dtm: missing, slope: missing })
      })

    loadFeatures(layerDef('geology')!.source)
      .then((f) => set({ geology: f.length ? { status: 'ready', value: f } : missing }))
      .catch(() => set({ geology: missing }))

    loadFeatures(layerDef('science-targets')!.source)
      .then((f) => {
        const targets = toScienceTargets(f)
        set({ targets: targets.length ? { status: 'ready', value: targets } : missing })
      })
      .catch(() => set({ targets: missing }))

    return () => {
      alive = false
    }
  }, [])

  const analysis = useMemo(
    () => analyseRoute(state.stops, state.roundTrip, state.walkingSpeedKmh, data.dtm.value, data.slope.value),
    [state.stops, state.roundTrip, state.walkingSpeedKmh, data.dtm.value, data.slope.value],
  )
  const hoverValue = useMemo(() => ({ hover, setHover }), [hover])

  return (
    <DatasetsContext value={data}>
      <RouteContext value={analysis}>
        <HoverContext value={hoverValue}>{children}</HoverContext>
      </RouteContext>
    </DatasetsContext>
  )
}
