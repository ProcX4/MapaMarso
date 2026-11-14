import type { RouteAnalysis } from './route'
import { walkingAssumption } from '../config/assumptions'

/*
 * The planned route as a GeoJSON file the crew can keep or open in other tools (PS §16, route export).
 * Coordinates are Mars longitude/latitude in degrees (planetocentric, east positive), with the elevation in
 * metres as the third number where MAPA has it. They are NOT Earth coordinates: a GIS tool must be told the body is Mars.
 */

type Meta = { name: string; code?: string; roundTrip: boolean; walkingSpeedKmh: number; maxEvaHours: number; exportedAt: Date }

export function routeToGeoJSON(route: RouteAnalysis, meta: Meta) {
  const walked = route.profile.map((p) => (p.elevM === null ? [p.at[0], p.at[1]] : [p.at[0], p.at[1], Math.round(p.elevM * 10) / 10]))
  return {
    type: 'FeatureCollection',
    name: meta.name,
    properties: {
      generator: 'MAPA Marswalk Analysis & Planning Assistant',
      body: 'Mars',
      coordinates: 'longitude °E, latitude °N, optional elevation in metres; planetocentric, on a 3,389.5 km sphere. Not Earth coordinates.',
      exportedAt: meta.exportedAt.toISOString(),
      code: meta.code ?? null,
    },
    features: [
      {
        type: 'Feature',
        properties: {
          kind: 'route',
          name: meta.name,
          roundTrip: meta.roundTrip,
          distanceM: Math.round(route.totalM),
          durationMin: Math.round(route.durationMin),
          durationNote: `ESTIMATED. ${walkingAssumption()}; EVA planned for ${meta.maxEvaHours} h`,
          gainM: route.gainM === null ? null : Math.round(route.gainM),
          lossM: route.lossM === null ? null : Math.round(route.lossM),
          maxSlopeDeg: route.maxSlope === null ? null : Math.round(route.maxSlope * 10) / 10,
          avgSlopeDeg: route.avgSlope === null ? null : Math.round(route.avgSlope * 10) / 10,
          legs: route.legs.map((l) => ({ from: l.from.name, to: l.to.name, distanceM: Math.round(l.m), path: l.status })),
        },
        geometry: { type: 'LineString', coordinates: walked },
      },
      ...route.order.map((s, i) => ({
        type: 'Feature',
        properties: { kind: 'stop', index: i, stopKind: s.kind, name: s.name, note: s.note ?? null },
        geometry: { type: 'Point', coordinates: [s.at[0], s.at[1]] },
      })),
    ],
  }
}

/** A file name from the mission name: letters, digits and hyphens only. */
export function routeFileName(name: string) {
  const slug = name.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40)
  return `mapa-route-${slug || 'marswalk'}.geojson`
}

/** Hands the browser a text file to save. Nothing is sent anywhere. */
export function downloadText(fileName: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }))
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  a.rel = 'noopener'
  document.body.append(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}
