import type { LayerState, LngLat, MarswalkState, Mode, OpenMission, Placing, RouteOption, Stop, StopKind } from './types'
import { LAYERS } from '../map/layers/registry'
import { EVA, LIMITS, WALKING } from '../config/assumptions'
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
  | { type: 'setBase'; at: LngLat; name: string }
  | { type: 'setPlacing'; placing: Placing }
  | { type: 'placeAt'; at: LngLat }
  | { type: 'setRouteOption'; value: RouteOption }
  | { type: 'setEvaPosition'; at: LngLat }
  | { type: 'renameStop'; id: string; name: string }
  | { type: 'loadRoute'; stops: Stop[]; roundTrip: boolean; mission: OpenMission | null }
  | { type: 'setMission'; mission: OpenMission | null }
  | { type: 'newRoute' }

export const LAYER_PREFS_KEY = 'mapa.layers'

export function initialState(): MarswalkState {
  const saved = readJson<LayerState[]>(LAYER_PREFS_KEY) ?? []
  const layers = LAYERS.map((def) => {
    const prev = saved.find((s) => s?.id === def.id)
    return {
      id: def.id,
      visible: def.onAtStart || (typeof prev?.visible === 'boolean' ? prev.visible : def.defaultVisible),
      opacity: typeof prev?.opacity === 'number' ? clamp(prev.opacity, [0, 1]) : def.defaultOpacity,
    }
  })
  return {
    mode: 'explore',
    layers,
    selected: null,
    stops: [],
    placing: 'base',
    roundTrip: true,
    routeOption: 'safest',
    walkingSpeedKmh: clamp(WALKING.speedKmh, LIMITS.speedKmh),
    maxEvaHours: clamp(EVA.maxHours, LIMITS.evaHours),
    evaPosition: null,
    mission: null,
  }
}

/** Default names for stops placed from the map */
const PLACED_NAME: Record<StopKind, string> = { base: 'Start', waypoint: 'Waypoint', science: 'Science stop', destination: 'Destination' }

/** The route with its start moved to `at`, or created there when the route has none yet */
function withBase(state: MarswalkState, at: LngLat, name: string): MarswalkState {
  const clean = cleanText(name, LIMITS.nameLength) || PLACED_NAME.base
  const has = state.stops.some((s) => s.kind === 'base')
  const stops = has
    ? state.stops.map((s) => (s.kind === 'base' ? { ...s, at, name: clean } : s))
    : [{ id: 'base', kind: 'base' as const, name: clean, at }, ...state.stops.slice(0, LIMITS.maxStops - 1)]
  return { ...state, stops }
}

/** Stops from outside (a saved mission): valid coordinates, clean names, base first, within the limit. */
function cleanStops(stops: Stop[]): Stop[] | null {
  const [base, ...rest] = stops
  if (!base || !stops.every((s) => isLngLat(s.at))) return null
  const name = (s: Stop) => cleanText(s.name, LIMITS.nameLength) || 'Stop'
  return [
    { id: 'base', kind: 'base', name: name(base), at: base.at },
    ...rest.slice(0, LIMITS.maxStops - 1).map((s) => ({ ...s, kind: s.kind === 'base' ? ('waypoint' as const) : s.kind, name: name(s) })),
  ]
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
      // The start can go only when it's all there is (the route always walks from its start)
      return { ...state, stops: state.stops.filter((s) => s.id !== action.id || (s.kind === 'base' && state.stops.length > 1)) }

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

    // A mission can start anywhere on Mars: the start is placed (or moved) wherever the user puts it
    case 'setBase':
      if (!isLngLat(action.at)) return state
      return withBase(state, action.at, action.name)

    case 'setPlacing':
      return { ...state, placing: action.placing }

    // A click on the map. Planning: place what the left panel's picker says (the start first, if there is none
    // yet), then show the spot's site card. Otherwise, and on "just look", only the site card.
    case 'placeAt': {
      if (!isLngLat(action.at)) return state
      const looked = { ...state, selected: action.at }
      if (state.mode !== 'plan' || state.placing === 'look') return looked
      const hasBase = state.stops.some((s) => s.kind === 'base')
      if (!hasBase || state.placing === 'base') {
        // After the start, the next clicks add waypoints
        return { ...withBase(looked, action.at, hasBase ? state.stops.find((s) => s.kind === 'base')!.name : PLACED_NAME.base), placing: 'waypoint' }
      }
      if (state.stops.length >= LIMITS.maxStops) return looked
      const kind = state.placing
      return { ...looked, stops: [...state.stops, { id: crypto.randomUUID(), kind, name: PLACED_NAME[kind], at: action.at }] }
    }

    case 'setRouteOption':
      if (action.value !== 'safest' && action.value !== 'direct') return state
      return { ...state, routeOption: action.value }

    case 'setEvaPosition':
      if (!isLngLat(action.at)) return state
      return { ...state, evaPosition: action.at }

    case 'renameStop': {
      const name = cleanText(action.name, LIMITS.nameLength)
      return { ...state, stops: state.stops.map((s) => (s.id === action.id ? { ...s, name } : s)) }
    }

    case 'loadRoute': {
      const stops = cleanStops(action.stops)
      if (!stops) return state
      // A loaded route already has its start: the next clicks add stops
      return { ...state, stops, placing: 'waypoint', roundTrip: action.roundTrip, mission: action.mission, selected: null, evaPosition: null }
    }

    case 'setMission':
      return { ...state, mission: action.mission }

    case 'newRoute':
      return { ...state, stops: [], placing: 'base', roundTrip: true, routeOption: 'safest', mission: null, evaPosition: null }
  }
}
