import { useSyncExternalStore } from 'react'
import { subscribeView, viewSnapshot, type MapViewInfo } from '../map/mapControl'

/** The 2D map's zoom and centre, updated when a pan or zoom finishes; null when no map is on screen. */
export function useMapView(): MapViewInfo {
  return useSyncExternalStore(subscribeView, viewSnapshot)
}
