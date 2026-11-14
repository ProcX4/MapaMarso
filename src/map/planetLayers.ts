import Feature from 'ol/Feature'
import { LineString, Point, Polygon } from 'ol/geom'
import { Circle, Fill, RegularShape, Stroke, Style, Text } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import { cssVar } from './styles'
import type { LatLon } from '../state/types'

/*
 * The whole-planet overlays the 2D map carries on top of MAPA's NASA layers: every mission's route
 * (from the globe page's mission list), the night side at the time shown, and where the Sun is overhead.
 * Map coordinates are [lon, lat] degrees, as everywhere in the Mars projection.
 */

const MISSION = '#8be3a8'
const FONT = '500 11px "IBM Plex Mono", ui-monospace, monospace'
const LABEL_FONT = '500 12px "IBM Plex Sans", system-ui, sans-serif'
const NIGHT = 'rgba(0, 0, 0, 0.5)'

export type RoutePoint = LatLon & { key: string; badge: string; label: string; variant: 'start' | 'phase' | 'end' | 'finish' }
export type PlanetRoute = { key: string; points: RoutePoint[]; closed?: boolean }

const at = (p: LatLon) => [p.lon, p.lat]

/** One feature per route line and per marker; each carries its route's key so a click can pick the mission. */
export function routeFeatures(routes: PlanetRoute[], selected: string | null): Feature[] {
  const out: Feature[] = []
  for (const r of routes) {
    const on = r.key === selected
    if (r.points.length > 1) {
      const line = [...r.points, ...(r.closed ? [r.points[0]] : [])].map(at)
      out.push(new Feature({ geometry: new LineString(line), routeKey: r.key, kind: 'line', on }))
    }
    for (const p of r.points) {
      out.push(new Feature({ geometry: new Point(at(p)), routeKey: r.key, kind: p.variant, badge: p.badge, label: p.label, on }))
    }
  }
  return out
}

const labelText = (feature: FeatureLike, offsetX = 14) =>
  new Text({
    text: String(feature.get('label') ?? ''),
    font: LABEL_FONT,
    textAlign: 'left',
    offsetX,
    fill: new Fill({ color: '#fff' }),
    stroke: new Stroke({ color: 'rgba(0,0,0,0.85)', width: 3 }),
  })

export function routeStyle(feature: FeatureLike) {
  const kind = feature.get('kind') as string
  const on = feature.get('on') as boolean
  if (kind === 'line') {
    return [
      new Style({ stroke: new Stroke({ color: 'rgba(0,0,0,0.55)', width: on ? 5 : 4 }) }),
      new Style({ stroke: new Stroke({ color: MISSION, width: on ? 2.5 : 2, lineDash: [6, 5] }) }),
    ]
  }
  if (kind === 'start') {
    // The green diamond where a mission starts
    return new Style({
      image: new RegularShape({ points: 4, radius: on ? 9 : 7, fill: new Fill({ color: MISSION }), stroke: new Stroke({ color: '#000', width: 1.5 }) }),
      text: on ? labelText(feature) : undefined,
    })
  }
  if (kind === 'finish') {
    return new Style({
      image: new RegularShape({ points: 3, radius: 8, fill: new Fill({ color: MISSION }), stroke: new Stroke({ color: '#000', width: 1.5 }) }),
      text: labelText(feature),
    })
  }
  if (kind === 'end') {
    // A picked landing site
    return new Style({
      image: new Circle({ radius: 7, fill: new Fill({ color: '#fff' }), stroke: new Stroke({ color: '#000', width: 2 }) }),
      text: labelText(feature),
    })
  }
  return new Style({
    image: new Circle({ radius: 10, fill: new Fill({ color: 'rgba(255,255,255,0.9)' }), stroke: new Stroke({ color: '#000', width: 1.5 }) }),
    text: new Text({ text: String(feature.get('badge') ?? ''), font: FONT, fill: new Fill({ color: '#000' }) }),
  })
}

const RAD = Math.PI / 180

/**
 * The night side as a polygon: the day/night line across the map from -180° to 180°, closed over the pole that
 * is in darkness. OpenLayers repeats it on each copy of the planet as the map wraps east-west. Where the Sun
 * is overhead, and the sunrise and sunset halves of the line, are features of their own.
 */
export function daylightFeatures(sun: LatLon): Feature[] {
  // At an exact equinox the line runs through the poles; nudge it so it stays a curve
  const dec = (Math.abs(sun.lat) < 0.05 ? 0.05 : sun.lat) * RAD
  const line: { lon: number; lat: number; sunset: boolean }[] = []
  for (let lon = -180; lon <= 180; lon += 1) {
    const hourAngle = (lon - sun.lon) * RAD
    const rel = ((((lon - sun.lon) % 360) + 540) % 360) - 180
    // Sun on the horizon: tan(lat) = -cos(hour angle) / tan(declination)
    line.push({ lon, lat: Math.atan(-Math.cos(hourAngle) / Math.tan(dec)) / RAD, sunset: rel > 0 })
  }
  const darkPole = sun.lat >= 0 ? -90 : 90
  const out: Feature[] = [
    new Feature({ geometry: new Polygon([[...line.map((p) => [p.lon, p.lat]), [180, darkPole], [-180, darkPole]]]), kind: 'night' }),
    new Feature({ geometry: new Point([sun.lon, sun.lat]), kind: 'sun', label: 'Sun overhead' }),
  ]
  // East of the Sun it's afternoon heading to sunset; west of it, morning after sunrise
  let run: number[][] = []
  let sunset = line[0].sunset
  for (const p of line) {
    if (p.sunset !== sunset) {
      if (run.length > 1) out.push(new Feature({ geometry: new LineString(run), kind: sunset ? 'sunset' : 'sunrise' }))
      run = run.slice(-1)
      sunset = p.sunset
    }
    run.push([p.lon, p.lat])
  }
  if (run.length > 1) out.push(new Feature({ geometry: new LineString(run), kind: sunset ? 'sunset' : 'sunrise' }))
  return out
}

export function daylightStyle(feature: FeatureLike) {
  const kind = feature.get('kind') as string
  if (kind === 'night') return new Style({ fill: new Fill({ color: NIGHT }) })
  if (kind === 'sunrise') return new Style({ stroke: new Stroke({ color: cssVar('caution'), width: 1.5 }) })
  if (kind === 'sunset') return new Style({ stroke: new Stroke({ color: cssVar('hazard'), width: 1.5, lineDash: [5, 4] }) })
  return new Style({
    image: new Circle({ radius: 8, fill: new Fill({ color: '#ffd98a' }), stroke: new Stroke({ color: 'rgba(255,200,97,0.35)', width: 6 }) }),
    text: new Text({
      text: String(feature.get('label') ?? ''),
      font: LABEL_FONT,
      textAlign: 'left',
      offsetX: 16,
      fill: new Fill({ color: '#ffd98a' }),
      stroke: new Stroke({ color: 'rgba(0,0,0,0.85)', width: 3 }),
    }),
  })
}
