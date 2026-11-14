import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import { LineString, Point } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import ImageLayer from 'ol/layer/Image'
import VectorSource from 'ol/source/Vector'
import type BaseLayer from 'ol/layer/Base'
import type Translate from 'ol/interaction/Translate'
import 'ol/ol.css'
import { useMarswalk } from '../hooks/useMarswalk'
import { useDatasets, useHover, useRoute } from '../hooks/useDerived'
import { LAYERS } from './layers/registry'
import { createLayer, gridSource } from './layers/createLayer'
import { marsProjection, VIEW_RESOLUTIONS } from './projection'
import { attachInteractions } from './interactions'
import { registerMap } from './mapControl'
import { cssVar, cursorStyle, evaPositionStyle, geologyStyle, hazardLineStyle, rgba, routeLineStyle, stopStyle, targetStyle } from './styles'
import { slopeBand } from '../data/slope'
import { pointAlong } from '../data/route'
import { SITE } from '../config/site'
import type { LngLat, Stop } from '../state/types'
import './map.css'

const HOVER_PX = 12

function badgeFor(stop: Stop, index: number) {
  if (stop.kind === 'base') return 'H'
  if (stop.kind === 'destination') return 'B'
  return String(index)
}

/**
 * The single OpenLayers map. React creates it once and then only talks to it
 * (the map is the TV, React is the remote): layers are toggled, never rebuilt.
 */
export function MapView() {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const layers = useRef<Record<string, BaseLayer>>({})
  const stopsLayer = useRef(new VectorLayer({ source: new VectorSource(), style: stopStyle, zIndex: 20 }))
  const markerLayer = useRef(new VectorLayer({ source: new VectorSource(), zIndex: 30 }))
  const translate = useRef<Translate | null>(null)

  const { state, dispatch } = useMarswalk()
  const data = useDatasets()
  const route = useRoute()
  const { hover, setHover } = useHover()

  // Latest values for the map's own event handlers, which are attached once.
  const latest = useRef({ route, setHover, mode: state.mode })
  useEffect(() => {
    latest.current = { route, setHover, mode: state.mode }
  }, [route, setHover, state.mode])

  // Create once
  useEffect(() => {
    LAYERS.forEach((def, i) => {
      const layer = createLayer(def)
      layer.setZIndex(i)
      layers.current[def.id] = layer
    })
    ;(layers.current['route'] as VectorLayer).setZIndex(19)

    const m = new Map({
      target: el.current!,
      layers: [...Object.values(layers.current), stopsLayer.current, markerLayer.current],
      view: new View({
        projection: marsProjection,
        center: SITE.center,
        zoom: SITE.zoom,
        resolutions: VIEW_RESOLUTIONS,
        constrainResolution: true,
      }),
    })
    map.current = m
    registerMap(m)

    translate.current = attachInteractions(m, stopsLayer.current, {
      onSelect: (at) => dispatch({ type: 'select', at }),
      onMoveStop: (id, at) => dispatch({ type: 'moveStop', id, at }),
      onPointer: (_at, pixel) => {
        const { route: r, setHover: set, mode } = latest.current
        if (!pixel || mode !== 'plan' || r.profile.length < 2) return set(null)
        let best: LngLat | null = null
        let bestPx = HOVER_PX
        for (const p of r.profile) {
          const px = m.getPixelFromCoordinate(p.at)
          const d = Math.hypot(px[0] - pixel[0], px[1] - pixel[1])
          if (d < bestPx) [best, bestPx] = [p.at, d]
        }
        set(best)
      },
    }).translate

    return () => {
      registerMap(null)
      m.setTarget(undefined)
    }
  }, [dispatch])

  // Sync layer visibility / opacity when state changes
  useEffect(() => {
    for (const l of state.layers) {
      layers.current[l.id]?.setVisible(l.visible)
      layers.current[l.id]?.setOpacity(l.opacity)
    }
    const routeState = state.layers.find((l) => l.id === 'route')
    stopsLayer.current.setVisible(routeState?.visible ?? true)
  }, [state.layers])

  // Dragging stops only while planning
  useEffect(() => {
    translate.current?.setActive(state.mode === 'plan')
  }, [state.mode])

  // Attach rasters once computed
  useEffect(() => {
    const dtm = data.dtm.value
    if (!dtm) return
    const span = dtm.max - dtm.min || 1
    ;(layers.current['site-dtm'] as ImageLayer<never>).setSource(
      gridSource(dtm, (v) => {
        const g = Math.round(((v - dtm.min) / span) * 255)
        return [g, g, g, 255]
      }) as never,
    )
  }, [data.dtm.value])

  useEffect(() => {
    const slope = data.slope.value
    if (!slope) return
    const colours = Object.fromEntries(['caution', 'hazard', 'alert'].map((t) => [t, rgba(cssVar(t), 200)]))
    ;(layers.current['slope'] as ImageLayer<never>).setSource(
      gridSource(slope, (v) => {
        const token = slopeBand(v).token
        return token ? colours[token] : null // walkable ground stays transparent
      }) as never,
    )
  }, [data.slope.value])

  useEffect(() => {
    const layer = layers.current['geology'] as VectorLayer
    layer.setStyle(geologyStyle)
    layer.getSource()!.clear()
    if (data.geology.value) layer.getSource()!.addFeatures(data.geology.value)
  }, [data.geology.value])

  useEffect(() => {
    const layer = layers.current['science-targets'] as VectorLayer
    layer.setStyle(targetStyle)
    const src = layer.getSource()!
    src.clear()
    for (const t of data.targets.value ?? []) src.addFeature(new Feature({ geometry: new Point(t.at), name: t.name }))
  }, [data.targets.value])

  // Redraw the route when it changes
  useEffect(() => {
    const src = (layers.current['route'] as VectorLayer).getSource()!
    src.clear()
    if (route.order.length > 1) {
      const line = new Feature(new LineString(route.order.map((s) => s.at)))
      line.setStyle(routeLineStyle())
      src.addFeature(line)
      for (const h of route.hazards) {
        const pts = route.profile.filter((p) => p.distM >= h.fromM && p.distM <= h.toM).map((p) => p.at)
        if (pts.length < 2) continue
        const seg = new Feature(new LineString(pts))
        seg.setStyle(hazardLineStyle(h.token))
        src.addFeature(seg)
      }
    }

    const stops = stopsLayer.current.getSource()!
    stops.clear()
    state.stops.forEach((s, i) => {
      stops.addFeature(new Feature({ geometry: new Point(s.at), stopId: s.id, kind: s.kind, badge: badgeFor(s, i) }))
    })
  }, [route, state.stops])

  // Markers: selected point, profile hover, simulated EVA position
  useEffect(() => {
    const src = markerLayer.current.getSource()!
    src.clear()
    const add = (at: LngLat, style: ReturnType<typeof cursorStyle>) => {
      const f = new Feature(new Point(at))
      f.setStyle(style)
      src.addFeature(f)
    }
    if (state.selected && state.mode !== 'eva') add(state.selected, cursorStyle('rgba(255,255,255,0.9)'))
    if (hover && state.mode === 'plan') add(hover, cursorStyle(cssVar('ok')))
    if (state.mode === 'eva') {
      const at = state.evaPosition ?? pointAlong(route.profile, 0)?.at
      if (at) add(at, evaPositionStyle())
    }
  }, [state.selected, state.mode, state.evaPosition, hover, route.profile])

  return <div ref={el} className="map" tabIndex={0} aria-label="Map of the demo site. Arrow keys pan, plus and minus zoom." />
}
