import { Circle, Fill, Stroke, Style, Text } from 'ol/style'
import type { FeatureLike } from 'ol/Feature'
import type { StopKind } from '../state/types'

/** Reads a design token from :root so map colours match the CSS exactly. */
export function cssVar(name: string) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--${name}`).trim() || '#fff'
}

/** "#ff8a5c" → [255, 138, 92, a] */
export function rgba(hex: string, a = 255): [number, number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255, a]
}

const FONT = '500 11px "IBM Plex Mono", ui-monospace, monospace'

export function routeLineStyle() {
  return [
    new Style({ stroke: new Stroke({ color: 'rgba(0,0,0,0.6)', width: 5 }) }),
    new Style({ stroke: new Stroke({ color: '#fff', width: 2 }) }),
  ]
}

/** The route option not being followed: faint and dashed, under the chosen one */
export function otherRouteStyle() {
  return new Style({ stroke: new Stroke({ color: 'rgba(255,255,255,0.55)', width: 2, lineDash: [4, 6] }) })
}

export function hazardLineStyle(token: string) {
  return new Style({ stroke: new Stroke({ color: cssVar(token), width: 4 }) })
}

/** Stop marker: white disc with a black badge letter; science stops in --ok. Text is canvas-drawn, never HTML. */
export function stopStyle(feature: FeatureLike) {
  const kind = feature.get('kind') as StopKind
  const badge = String(feature.get('badge') ?? '')
  const fill = kind === 'science' ? cssVar('ok') : '#fff'
  return new Style({
    image: new Circle({ radius: 10, fill: new Fill({ color: fill }), stroke: new Stroke({ color: '#000', width: 2 }) }),
    text: new Text({ text: badge, font: FONT, fill: new Fill({ color: '#000' }) }),
  })
}

export function targetStyle(feature: FeatureLike) {
  return new Style({
    image: new Circle({ radius: 6, fill: new Fill({ color: cssVar('ok') }), stroke: new Stroke({ color: '#000', width: 1.5 }), declutterMode: 'none' }),
    text: new Text({
      text: String(feature.get('name') ?? ''),
      font: FONT,
      offsetY: -16,
      fill: new Fill({ color: '#fff' }),
      stroke: new Stroke({ color: '#000', width: 3 }),
    }),
  })
}

export function cursorStyle(color = '#fff') {
  return new Style({
    image: new Circle({ radius: 7, fill: new Fill({ color: 'rgba(0,0,0,0.4)' }), stroke: new Stroke({ color, width: 2 }) }),
  })
}

export function evaPositionStyle() {
  return new Style({
    image: new Circle({ radius: 12, fill: new Fill({ color: '#000' }), stroke: new Stroke({ color: '#fff', width: 4 }) }),
  })
}

/** Debug: zoom points marks: a dashed outline round an area-only photo layer, and a pin where rover photos begin */
export function debugMarkStyle(feature: FeatureLike) {
  const label = new Text({
    text: String(feature.get('label') ?? ''),
    font: FONT,
    textAlign: 'left',
    offsetX: 12,
    fill: new Fill({ color: cssVar('info') }),
    stroke: new Stroke({ color: '#000', width: 3 }),
    overflow: true,
  })
  if (feature.get('kind') === 'rover') {
    return new Style({ image: new Circle({ radius: 6, fill: new Fill({ color: cssVar('ok') }), stroke: new Stroke({ color: '#000', width: 2 }) }), text: label })
  }
  label.setPlacement('point')
  return new Style({ stroke: new Stroke({ color: cssVar('info'), width: 2, lineDash: [8, 6] }), text: label })
}

