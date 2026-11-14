import type Map from 'ol/Map'
import type { LngLat } from '../state/types'

/*
 * Imperative camera moves (Search, EVA follow) without putting the view in React state:
 * panning would otherwise re-render the whole app on every frame.
 */

let current: Map | null = null

export function registerMap(map: Map | null) {
  current = map
}

/** Instant recentre, for following a moving position. */
export function centerOn(at: LngLat) {
  current?.getView().setCenter(at)
}

export function flyTo(at: LngLat, zoom?: number) {
  const view = current?.getView()
  if (!view) return
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  if (reduce) {
    view.setCenter(at)
    if (zoom !== undefined) view.setZoom(zoom)
  } else {
    view.animate({ center: at, zoom: zoom ?? view.getZoom(), duration: 600 })
  }
}
