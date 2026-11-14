import type { LayerState, LngLat, MarswalkState, Mode, Stop } from './types'
import { LAYERS } from '../map/layers/registry'
import { EVA, LIMITS, WALKING } from '../config/assumptions'
import { SITE } from '../config/site'
import { clamp, cleanText, isLngLat } from '../lib/validate'
import { readJson } from '../lib/storage'

export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'toggleLayer'; id: string }
  | { type: 'setOpacity'; id: string; opacity: number }
  | { type: 'select'; at: LngLat | null }
  | { type: 'addStop'; stop: Stop; index?: number }
  | { type: 'moveStop'; id: string; at: LngLat }
  | { type: 'removeStop'; id: string }
  | { type: 'reorderStops'; from: number; to: number }
  | { type: 'setRoundTrip'; value: boolean }
  | { type: 'setEvaPosition'; at: LngLat }

export const LAYER_PREFS_KEY = 'mapa.layers'

export function initialState(): MarswalkState {
  const saved = readJson<LayerState[]>(LAYER_PREFS_KEY) ?? []
  const layers = LAYERS.map((def) => {
    const prev = saved.find((s) => s?.id === def.id)
    return {
      id: def.id,
      visible: typeof prev?.visible === 'boolean' ? prev.visible : def.defaultVisible,
      opacity: typeof prev?.opacity === 'number' ? clamp(prev.opacity, [0, 1]) : def.defaultOpacity,
    }
  })
  return {
    mode: 'explore',
    layers,
    selected: null,
    stops: [{ id: 'base', kind: 'base', name: SITE.baseName, at: SITE.base }],
    roundTrip: true,
    walkingSpeedKmh: clamp(WALKING.speedKmh, LIMITS.speedKmh),
    maxEvaHours: clamp(EVA.maxHours, LIMITS.evaHours),
    evaPosition: null,
  }
}

/** The one place state changes. Invalid input is ignored rather than stored. */
export function reducer(state: MarswalkState, action: Action): MarswalkState {
  switch (action.type) {
    case 'setMode':
      return { ...state, mode: action.mode }

    case 'toggleLayer':
      return { ...state, layers: state.layers.map((l) => (l.id === action.id ? { ...l, visible: !l.visible } : l)) }

    case 'setOpacity':
      if (!Number.isFinite(action.opacity)) return state
      return {
        ...state,
        layers: state.layers.map((l) => (l.id === action.id ? { ...l, opacity: clamp(action.opacity, [0, 1]) } : l)),
      }

    case 'select':
      if (action.at && !isLngLat(action.at)) return state
      return { ...state, selected: action.at }

    case 'addStop': {
      const { stop } = action
      if (!isLngLat(stop.at) || state.stops.length >= LIMITS.maxStops) return state
      if (stop.kind === 'base') return state // there is exactly one base, created at start
      const clean: Stop = {
        ...stop,
        name: cleanText(stop.name, LIMITS.nameLength) || 'Stop',
        note: stop.note ? cleanText(stop.note, LIMITS.noteLength) : undefined,
      }
      const stops = [...state.stops]
      // Base always stays first.
      const index = clamp(action.index ?? stops.length, [1, stops.length])
      stops.splice(index, 0, clean)
      return { ...state, stops }
    }

    case 'moveStop':
      if (!isLngLat(action.at)) return state
      return { ...state, stops: state.stops.map((s) => (s.id === action.id ? { ...s, at: action.at } : s)) }

    case 'removeStop':
      return { ...state, stops: state.stops.filter((s) => s.id !== action.id || s.kind === 'base') }

    case 'reorderStops': {
      const { from, to } = action
      const n = state.stops.length
      if (from < 1 || to < 1 || from >= n || to >= n || from === to) return state
      const stops = [...state.stops]
      const [moved] = stops.splice(from, 1)
      stops.splice(to, 0, moved)
      return { ...state, stops }
    }

    case 'setRoundTrip':
      return { ...state, roundTrip: action.value }

    case 'setEvaPosition':
      if (!isLngLat(action.at)) return state
      return { ...state, evaPosition: action.at }
  }
}
