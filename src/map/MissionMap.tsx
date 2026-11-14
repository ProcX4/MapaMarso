import { useEffect, useRef } from 'react'
import Map from 'ol/Map'
import View from 'ol/View'
import VectorLayer from 'ol/layer/Vector'
import VectorSource from 'ol/source/Vector'
import { boundingExtent } from 'ol/extent'
import 'ol/ol.css'
import { layerDef } from './layers/registry'
import { createLayer, planetBackdrop } from './layers/createLayer'
import { marsProjection, VIEW_RESOLUTIONS } from './projection'
import { routeFeatures, routeStyle, type PlanetRoute } from './planetLayers'
import './map.css'

/** The photo layers under the route: CTX from zoom 10, HiRISE at Jezero from zoom 12 (as on the 2D view) */
const PHOTO_LAYERS = ['ctx', 'hirise']
/** Room round the route when it's framed, in pixels */
const FIT_PADDING = [56, 56, 56, 56]
/** Close enough to read the ground, even for a very short walk */
const MAX_FIT_ZOOM = 15

type Props = {
  /** The mission's route: its stops, and the A* path once it's found (drawn instead of straight lines) */
  route: PlanetRoute
  label: string
}

/**
 * A mission's route on the same NASA map as the globe page's 2D view: the colour backdrop, the CTX and HiRISE
 * photos as you zoom in, and the route drawn the same way (green dashes along the safe path, numbered stops).
 * Read-only: drag to pan, scroll or + / − to zoom.
 */
export function MissionMap({ route, label }: Props) {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const routeLayer = useRef(new VectorLayer({ source: new VectorSource(), style: routeStyle, zIndex: 10 }))
  // Frame the route once its path is in; after that the view is the reader's
  const framed = useRef(false)

  useEffect(() => {
    const photos = PHOTO_LAYERS.map((id) => layerDef(id)).flatMap((def, i) => {
      if (!def) return []
      const layer = createLayer(def)
      layer.setZIndex(i + 1)
      return [layer]
    })
    const m = new Map({
      target: el.current!,
      layers: [planetBackdrop(), ...photos, routeLayer.current],
      view: new View({ projection: marsProjection, resolutions: VIEW_RESOLUTIONS, constrainResolution: true, extent: [-1e6, -90, 1e6, 90], center: [0, 0], zoom: 2 }),
    })
    map.current = m
    return () => {
      m.setTarget(undefined)
      map.current = null
    }
  }, [])

  useEffect(() => {
    const src = routeLayer.current.getSource()!
    src.clear()
    src.addFeatures(routeFeatures([route], route.key))
    const m = map.current
    if (!m || framed.current) return
    const coords = route.path ?? route.points.map((p) => [p.lon, p.lat])
    if (!coords.length) return
    m.getView().fit(boundingExtent(coords), { padding: FIT_PADDING, maxZoom: MAX_FIT_ZOOM })
    // Once the safe path is in, keep that framing; until then the stops alone frame it
    if (route.path) framed.current = true
  }, [route])

  return (
    <div className="mission-olmap">
      <div ref={el} className="map" tabIndex={0} aria-label={`${label}. Drag to pan; scroll or press plus and minus to zoom.`} />
    </div>
  )
}
