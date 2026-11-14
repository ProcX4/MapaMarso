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
  onMoveStop: (id: string, at: LngLat) => void
  onPointer: (at: LngLat | null, pixel: number[] | null) => void
}

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
    if (!onStop) h.onSelect([e.coordinate[0], e.coordinate[1]])
  })

  map.on('pointermove', (e) => {
    if (e.dragging) return
    h.onPointer([e.coordinate[0], e.coordinate[1]], e.pixel)
    const overStop = map.hasFeatureAtPixel(e.pixel, { layerFilter: (l) => l === stopsLayer })
    const target = map.getTargetElement()
    if (target) target.style.cursor = overStop && translate.getActive() ? 'grab' : ''
  })
  map.getViewport()?.addEventListener('pointerleave', () => h.onPointer(null, null))

  return { translate }
}
