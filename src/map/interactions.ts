import type Map from 'ol/Map'
import Translate from 'ol/interaction/Translate'
import type VectorLayer from 'ol/layer/Vector'
import type { Point } from 'ol/geom'
import type { LngLat } from '../state/types'

/*
 * Map → app events. The map only reports what happened; the reducer decides what it means.
 * Coordinates are already [lon, lat] degrees in the Mars projection.
 */

type Handlers = {
  onSelect: (at: LngLat) => void
  /** A click on a mission's route or marker (features carrying a routeKey) */
  onRoute: (key: string) => void
  onMoveStop: (id: string, at: LngLat) => void
  onPointer: (at: LngLat | null, pixel: number[] | null) => void
}

const routeAt = (map: Map, pixel: number[]) => map.forEachFeatureAtPixel(pixel, (f) => f.get('routeKey') as string | undefined, { hitTolerance: 6 })

export function attachInteractions(map: Map, stopsLayer: VectorLayer, h: Handlers) {
  const translate = new Translate({ layers: [stopsLayer] })
  translate.on('translateend', (e) => {
    const f = e.features.item(0)
    const id = f?.get('stopId') as string | undefined
    const geom = f?.getGeometry() as Point | undefined
    if (!id || !geom) return
    const [lon, lat] = geom.getCoordinates()
    h.onMoveStop(id, [lon, lat])
  })
  map.addInteraction(translate)

  map.on('singleclick', (e) => {
    const onStop = map.hasFeatureAtPixel(e.pixel, { layerFilter: (l) => l === stopsLayer })
    if (onStop) return
    const route = routeAt(map, e.pixel)
    if (route) h.onRoute(route)
    else h.onSelect([e.coordinate[0], e.coordinate[1]])
  })

  map.on('pointermove', (e) => {
    if (e.dragging) return
    h.onPointer([e.coordinate[0], e.coordinate[1]], e.pixel)
    const overStop = map.hasFeatureAtPixel(e.pixel, { layerFilter: (l) => l === stopsLayer })
    const target = map.getTargetElement()
    if (target) target.style.cursor = overStop && translate.getActive() ? 'grab' : !overStop && routeAt(map, e.pixel) ? 'pointer' : ''
  })
  map.getViewport()?.addEventListener('pointerleave', () => h.onPointer(null, null))

  return { translate }
}
