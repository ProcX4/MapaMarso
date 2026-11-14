import type Map from 'ol/Map'
import type { LatLon, LngLat } from '../state/types'

/*
 * Imperative camera moves (Search, EVA follow) without putting the view in React state:
 * panning would otherwise re-render the whole app on every frame.
 */

let current: Map | null = null

/** Where the view settled last (zoom and centre), for panels that react to it; null with no map */
export type MapViewInfo = { zoom: number; center: LngLat } | null
let viewInfo: MapViewInfo = null
const listeners = new Set<() => void>()

function viewChanged() {
  const view = current?.getView()
  const center = view?.getCenter()
  viewInfo = view && center ? { zoom: view.getZoom() ?? 0, center: [center[0], center[1]] } : null
  listeners.forEach((l) => l())
}

export function registerMap(map: Map | null) {
  current?.un('moveend', viewChanged)
  current = map
  // Only once a move has finished, so panning doesn't re-render whatever is listening on every frame
  current?.on('moveend', viewChanged)
  viewChanged()
}

/** For useSyncExternalStore: subscribe to the view settling after a move */
export function subscribeView(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
export const viewSnapshot = () => viewInfo

/** Where the next 2D map to open should start, asked for before it exists (the home page's Jezero button) */
let pendingView: { at: LngLat; zoom: number } | null = null
export function openMapAt(at: LngLat, zoom: number) {
  pendingView = { at, zoom }
}
/** The start view asked for, once: the map takes it when it's created */
export function takePendingView() {
  const v = pendingView
  pendingView = null
  return v
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
