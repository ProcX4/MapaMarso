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

/** Zooms to show every point, with room for the floating panels. */
export function fitTo(points: LngLat[]) {
  const view = current?.getView()
  if (!view || points.length === 0) return
  if (points.length === 1) return flyTo(points[0])
  const lons = points.map((p) => p[0])
  const lats = points.map((p) => p[1])
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  view.fit([Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)], {
    padding: [96, 380, 240, 440],
    maxZoom: 15,
    duration: reduce ? 0 : 600,
  })
}
