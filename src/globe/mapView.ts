import type { LatLon } from '../state/types'

/* The flat map's view maths (from MapaMars lib/mapView.ts). */

export type { LatLon }

// Map units: x = lon + 180 (0..360), y = 90 - lat (0..180), matching an equirectangular image.
export const toX = (lon: number) => lon + 180
export const toY = (lat: number) => 90 - lat

export type View = { cx: number; cy: number; w: number }

// Fit all points in view, or show the whole planet when there are none
export function initialView(points: LatLon[]): View {
  if (points.length === 0) return { cx: 180, cy: 90, w: 360 }
  if (points.length === 1) return { cx: toX(points[0].lon), cy: toY(points[0].lat), w: 20 }
  const lons = points.map((p) => p.lon)
  const lats = points.map((p) => p.lat)
  const [minLon, maxLon, minLat, maxLat] = [Math.min(...lons), Math.max(...lons), Math.min(...lats), Math.max(...lats)]
  const span = Math.max(maxLon - minLon, (maxLat - minLat) * 2) * 1.6
  return { cx: toX((minLon + maxLon) / 2), cy: toY((minLat + maxLat) / 2), w: Math.max(span, 0.1) }
}

/** The centre and width (degrees) that fit these points, for the map's `focus` prop. */
export function viewFor(points: LatLon[]): LatLon & { span: number } {
  const v = initialView(points)
  return { lat: 90 - v.cy, lon: v.cx - 180, span: v.w }
}
