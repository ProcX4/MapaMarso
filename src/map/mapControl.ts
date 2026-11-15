import type Map from 'ol/Map'
import type { LatLon, LngLat } from '../state/types'

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

/** Shows an area `span` degrees wide around a point (the whole planet at 360), for the globe page's catalog and missions. */
export function showArea(at: LatLon & { span?: number }) {
  const view = current?.getView()
  if (!view) return
  const half = Math.min(360, at.span ?? 30) / 2
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  view.fit([at.lon - half, Math.max(-90, at.lat - half / 2), at.lon + half, Math.min(90, at.lat + half / 2)], { duration: reduce ? 0 : 600 })
}

/** Zoom level the view is at now (0 when there is no map). */
export const currentZoom = () => current?.getView().getZoom() ?? 0

/** Run once the 2D map is on screen: straight away, or after switching to it (gives up after ~3 s) */
export function whenMapReady(fn: () => void, tries = 30) {
  if (current) fn()
  else if (tries > 0) setTimeout(() => whenMapReady(fn, tries - 1), 100)
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
