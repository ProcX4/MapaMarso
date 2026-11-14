import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import Feature from 'ol/Feature'
import { LineString, Point, Polygon } from 'ol/geom'
import VectorLayer from 'ol/layer/Vector'
import ImageLayer from 'ol/layer/Image'
import VectorSource from 'ol/source/Vector'
import type BaseLayer from 'ol/layer/Base'
import type Translate from 'ol/interaction/Translate'
import 'ol/ol.css'
import { useMarswalk } from '../hooks/useMarswalk'
import { useDatasets, useHover, useRoute } from '../hooks/useDerived'
import { LAYERS } from './layers/registry'
import { createLayer, gridSource, planetBackdrop } from './layers/createLayer'
import { marsProjection, VIEW_RESOLUTIONS } from './projection'
import { attachInteractions } from './interactions'
import { currentZoom, fitTo, flyTo, registerMap, takePendingView } from './mapControl'
import { daylightFeatures, daylightStyle, routeFeatures, routeStyle, type PlanetRoute } from './planetLayers'
import { sunAt as subsolar } from '../data/daylight'
import { cssVar, cursorStyle, evaPositionStyle, hazardLineStyle, otherRouteStyle, rgba, routeLineStyle, stopStyle, targetStyle } from './styles'
import { HAZARD } from '../data/pathfind'
import { DEEP_COLOURS, ROCK_COLOURS } from './layers/registry'
import type { SafePath } from '../data/safePath'
import { pointAlong } from '../data/route'
import { SITE } from '../config/site'
import type { LngLat, Stop } from '../state/types'
import { useDebugZoom } from '../lib/debugZoom'
import { ZoomDebug } from './ZoomDebug'
import { MapGuide } from './MapGuide'
import { debugMarkStyle } from './styles'
import './map.css'

const HOVER_PX = 12
// Below this zoom the walk-scale site is too small to see: planning or walking first zooms in to it
const SITE_ZOOM = 6
const NO_ROUTES: PlanetRoute[] = []

type Props = {
  /** Missions to draw across the planet; clicking one (its line or a marker) calls onSelectRoute */
  routes?: PlanetRoute[]
  selectedRoute?: string | null
  onSelectRoute?: (key: string) => void
  /** A click on open ground, after the site card has been given the point */
  onPick?: () => void
  /** Shade the night side as it is at this moment (ms), and mark where the Sun is overhead */
  sunAt?: number | null
  /** The picked mission's A* safe path: its steep and deep ground is shaded instead of the planned route's */
  missionPath?: SafePath | null
}

function badgeFor(stop: Stop, index: number) {
  if (stop.kind === 'base') return 'A'
  if (stop.kind === 'destination') return 'B'
  return String(index)
}

/**
 * The single OpenLayers map, the globe page's 2D view of the whole planet. React creates it once and then
 * only talks to it (the map is the TV, React is the remote): layers are toggled, never rebuilt.
 */
export function MapView({ routes = NO_ROUTES, selectedRoute = null, onSelectRoute, onPick, sunAt = null, missionPath = null }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const layers = useRef<Record<string, BaseLayer>>({})
  const stopsLayer = useRef(new VectorLayer({ source: new VectorSource(), style: stopStyle, zIndex: 20 }))
  const markerLayer = useRef(new VectorLayer({ source: new VectorSource(), zIndex: 30 }))
  // Debug: zoom points (☰ menu): where the area-only photo layers are, and where the rover photos start
  const debugLayer = useRef(new VectorLayer({ source: new VectorSource({ features: debugMarks() }), style: debugMarkStyle, zIndex: 45, visible: false }))
  const debugZoom = useDebugZoom()
  const missionLayer = useRef(new VectorLayer({ source: new VectorSource(), style: routeStyle, zIndex: 18 }))
  const nightLayer = useRef(new VectorLayer({ source: new VectorSource(), style: daylightStyle, zIndex: 17, updateWhileInteracting: true }))
  const translate = useRef<Translate | null>(null)

  const { state, dispatch } = useMarswalk()
  const data = useDatasets()
  const route = useRoute()
  const { hover, setHover } = useHover()

  // Latest values for the map's own event handlers, which are attached once.
  const latest = useRef({ route, setHover, mode: state.mode, onSelectRoute, onPick })
  useEffect(() => {
    latest.current = { route, setHover, mode: state.mode, onSelectRoute, onPick }
  }, [route, setHover, state.mode, onSelectRoute, onPick])

  // Create once
  useEffect(() => {
    // Imagery at the bottom: opaque base maps first, then walking-scale imagery (CTX, HiRISE; only shows zoomed right
    // in, where the coarser maps are blurred), then the see-through ones (elevation colour, roughness, TES) so they
    // show over whichever base is on; then the overlays drawn from data (hazards, targets) on top
    const tiles = LAYERS.filter((d) => d.kind === 'xyz' || d.kind === 'wmts')
    const imagery = [
      ...tiles.filter((d) => !d.walkScale && d.defaultOpacity >= 1),
      ...tiles.filter((d) => d.walkScale),
      ...tiles.filter((d) => !d.walkScale && d.defaultOpacity < 1),
    ]
    LAYERS.forEach((def) => {
      const layer = createLayer(def)
      const i = imagery.indexOf(def)
      layer.setZIndex(i >= 0 ? i : imagery.length + LAYERS.indexOf(def))
      layers.current[def.id] = layer
    })
    ;(layers.current['route'] as VectorLayer).setZIndex(19)

    const m = new Map({
      target: el.current!,
      layers: [planetBackdrop(), ...Object.values(layers.current), nightLayer.current, missionLayer.current, stopsLayer.current, markerLayer.current, debugLayer.current],
      view: new View({
        projection: marsProjection,
        center: SITE.center,
        zoom: SITE.zoom,
        resolutions: VIEW_RESOLUTIONS,
        constrainResolution: true,
        // East-west the planet wraps round; north-south the view stops at the poles
        extent: [-1e6, -90, 1e6, 90],
      }),
    })
    // Asked to open somewhere (the home page's Jezero button); otherwise exploring opens on the whole planet,
    // and planning and EVA on the walk-scale site
    const pending = takePendingView()
    if (pending) {
      m.getView().setCenter(pending.at)
      m.getView().setZoom(pending.zoom)
    } else if (latest.current.mode === 'explore') {
      m.getView().setCenter([0, 0])
      m.getView().setZoom(0)
    }
    map.current = m
    registerMap(m)

    translate.current = attachInteractions(m, stopsLayer.current, {
      onSelect: (at) => {
        // Planning, this places what the left panel's picker says; otherwise it just opens the site card
        dispatch({ type: 'placeAt', at })
        latest.current.onPick?.()
      },
      onRoute: (key) => {
        dispatch({ type: 'select', at: null })
        latest.current.onSelectRoute?.(key)
      },
      onMoveStop: (id, at) => dispatch({ type: 'moveStop', id, at }),
      onPointer: (_at, pixel) => {
        const { route: r, setHover: set, mode } = latest.current
        if (!pixel || (mode !== 'plan' && mode !== 'mission') || r.profile.length < 2) return set(null)
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

  // Dragging stops only while planning. Planning or walking from the whole planet first zooms in to the route.
  useEffect(() => {
    translate.current?.setActive(state.mode === 'plan')
    if (state.mode === 'explore' || currentZoom() >= SITE_ZOOM) return
    const stops = latest.current.route.order.map((s) => s.at)
    if (stops.length > 1) fitTo(stops)
    else flyTo(SITE.center, SITE.zoom)
  }, [state.mode])

  // Missions across the planet
  useEffect(() => {
    const src = missionLayer.current.getSource()!
    src.clear()
    src.addFeatures(routeFeatures(routes, selectedRoute))
  }, [routes, selectedRoute])

  // Night side and the Sun
  useEffect(() => {
    const src = nightLayer.current.getSource()!
    src.clear()
    if (sunAt !== null) src.addFeatures(daylightFeatures(subsolar(sunAt)))
  }, [sunAt])

  // Steep and deep ground round the route on show: the picked mission's, or else the planned route's
  const hazard = missionPath?.hazard ?? data.hazard.value
  useEffect(() => {
    const layer = layers.current['slope'] as ImageLayer<never>
    if (!hazard) return layer.setSource(null)
    const colours: Record<number, [number, number, number, number] | null> = {
      [HAZARD.caution]: rgba(cssVar('caution'), 200),
      [HAZARD.hazard]: rgba(cssVar('hazard'), 200),
      [HAZARD.steep]: rgba(cssVar('alert'), 210),
      [HAZARD.deepSoft]: rgba(DEEP_COLOURS.soft, 150),
      [HAZARD.deep]: rgba(DEEP_COLOURS.deep, 200),
      [HAZARD.rockySoft]: rgba(ROCK_COLOURS.soft, 150),
      [HAZARD.rocky]: rgba(ROCK_COLOURS.rocky, 210),
    }
    // Easy ground and no-data stay transparent
    layer.setSource(gridSource({ ...hazard, values: Float32Array.from(hazard.values) }, (v) => colours[v] ?? null) as never)
  }, [hazard])

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
      // The route option not taken, faint and dashed underneath, for comparison
      if (route.otherPath) {
        const other = new Feature(new LineString(route.otherPath))
        other.setStyle(otherRouteStyle())
        src.addFeature(other)
      }
      // The A* safe path, leg by leg (each a straight line until its path is in)
      const line = new Feature(new LineString(route.legs.flatMap((l, i) => (i ? l.path.slice(1) : l.path))))
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
    if (hover && (state.mode === 'plan' || state.mode === 'mission')) add(hover, cursorStyle(cssVar('ok')))
    if (state.mode === 'eva') {
      const at = state.evaPosition ?? pointAlong(route.profile, 0)?.at
      if (at) add(at, evaPositionStyle())
    }
  }, [state.selected, state.mode, state.evaPosition, hover, route.profile])

  useEffect(() => {
    debugLayer.current.setVisible(debugZoom)
  }, [debugZoom])

  return (
    <>
      <div ref={el} className="map" tabIndex={0} aria-label="Map of Mars with NASA layers and the demo site. Arrow keys pan, plus and minus zoom." />
      {debugZoom && <ZoomDebug />}
      <MapGuide />
    </>
  )
}

/** Debug marks: an outline of every photo layer that covers only one area, and the rover's first stop */
function debugMarks() {
  const out: Feature[] = []
  for (const def of LAYERS) {
    const bbox = def.coverage?.bbox
    if (def.group !== 'optical' || !bbox) continue
    const [w, s, e, n] = bbox
    const start = def.minZoom !== undefined ? def.minZoom + 1 : 0
    out.push(new Feature({ geometry: new Polygon([[[w, s], [e, s], [e, n], [w, n], [w, s]]]), kind: 'area', label: `${def.name.split(' (')[0]} photos · zoom ${start}+` }))
  }
  out.push(new Feature({ geometry: new Point(SITE.base), kind: 'rover', label: 'Rover photos: click near the rover track' }))
  return out
}

