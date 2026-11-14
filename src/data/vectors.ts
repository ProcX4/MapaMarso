import GeoJSON from 'ol/format/GeoJSON'
import type Feature from 'ol/Feature'
import type { Geometry, Point } from 'ol/geom'
import type { LngLat } from '../state/types'
import { marsProjection } from '../map/projection'

/*
 * Small vector datasets served from public/data/ (geology units, science targets).
 * Coordinates are lon/lat degrees on Mars; there is no reprojection.
 */

export type GeologyUnit = { unit: string; name: string; description?: string }
export type ScienceTarget = { id: string; name: string; reason: string; at: LngLat; source?: string }

const format = new GeoJSON({ dataProjection: marsProjection, featureProjection: marsProjection })
const TIMEOUT_MS = 10_000

export async function loadFeatures(url: string): Promise<Feature<Geometry>[]> {
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT_MS) })
  if (!res.ok) throw new Error(`${url}: ${res.status}`)
  return format.readFeatures(await res.json()) as Feature<Geometry>[]
}

/** Geologic unit polygon containing a point, if any. */
export function geologyAt(features: Feature<Geometry>[], at: LngLat): GeologyUnit | null {
  const hit = features.find((f) => f.getGeometry()?.intersectsCoordinate(at))
  if (!hit) return null
  const p = hit.getProperties()
  return { unit: String(p.unit ?? '?'), name: String(p.name ?? 'Unnamed unit'), description: p.description ? String(p.description) : undefined }
}

export function toScienceTargets(features: Feature<Geometry>[]): ScienceTarget[] {
  return features.flatMap((f, i) => {
    const g = f.getGeometry()
    if (g?.getType() !== 'Point') return []
    const [lon, lat] = (g as Point).getCoordinates()
    const p = f.getProperties()
    return [{
      id: String(f.getId() ?? `target-${i}`),
      name: String(p.name ?? 'Science target'),
      reason: String(p.reason ?? 'No reason recorded'),
      at: [lon, lat] as LngLat,
      source: p.source ? String(p.source) : undefined,
    }]
  })
}
