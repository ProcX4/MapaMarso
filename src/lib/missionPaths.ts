import { landingSites, landmarks } from '../data/mars'
import type { Mode } from '../state/types'

/*
 * Addresses and list helpers shared by the globe and the missions pages (from MapaMars pages/missions/shared.ts
 * and pages/globe/paths.ts). Kept in lib/ because features may not import from each other (Frontend Spec §3).
 */

// #/globe                 the 3D globe
// #/globe/2d              the 2D map: the whole planet on NASA's layers, with site analysis (Explore)
// #/globe/2d/plan[/CODE]  the same map with the Marswalk planner open (and a saved mission's route)
// #/globe/2d/eva          the same map following the planned route on foot
// #/globe/2d/mission/CODE the same map showing a saved mission: its summary, crew and log (or /m/<id>)
// #/globe/new             plan a new mission on the flat map, full screen
export const GLOBE_3D = '#/globe'
export const GLOBE_2D = '#/globe/2d'
export const MAP_PLAN = '#/globe/2d/plan'
export const MAP_EVA = '#/globe/2d/eva'
export const MAP_MISSION = '#/globe/2d/mission'
export const GLOBE_PLAN = '#/globe/new'

/** Where a saved Marswalk opens: the 2D map with its route in the planner. */
export const planPath = (code: string) => `${MAP_PLAN}/${code}`

/** Where a saved mission is viewed: the 2D map with its route, by code, or by id from the browse list. */
export const missionMapPath = (code: string) => `${MAP_MISSION}/${code}`
export const missionMapIdPath = (id: string) => `${MAP_MISSION}/m/${id}`

/** A way back across the 2D map's tools: where to, and what the button says */
export type BackTo = { hash: string; label: string }
export function backTo(hash: string): BackTo {
  const mode = mapModeOf(hash)
  const label = mode === 'mission' ? 'Back to mission' : mode === 'plan' ? 'Back to plan' : mode === 'eva' ? 'Back to EVA' : 'Back to map'
  return { hash, label }
}

/** Which of the 2D map's tools an address opens: site analysis, the Marswalk planner, EVA or a saved mission. */
export function mapModeOf(hash: string): Mode {
  if (hash.startsWith(`${MAP_MISSION}/`)) return 'mission'
  if (hash === MAP_PLAN || hash.startsWith(`${MAP_PLAN}/`)) return 'plan'
  if (hash === MAP_EVA) return 'eva'
  return 'explore'
}

/**
 * The site map used to be its own tab (#/explore, #/plan, #/plan/CODE, #/eva); it now lives in the globe's
 * 2D view. Old addresses, such as shared mission links, are read as their new ones.
 */
export function currentAddress(hash: string) {
  if (hash === '#/explore') return GLOBE_2D
  if (hash === '#/eva') return MAP_EVA
  if (hash === '#/plan' || hash.startsWith('#/plan/')) return MAP_PLAN + hash.slice('#/plan'.length)
  return hash
}

/** Places to start a mission from: the famous landmarks, then every landing site. */
export const presets = [
  ...landmarks.map((l) => ({ value: `lm:${l.name}`, name: l.name, lat: l.lat, lon: l.lon, group: 'Landmarks' })),
  ...landingSites.map((s) => ({ value: `ls:${s.id}`, name: `${s.location} (${s.mission})`, lat: s.lat, lon: s.lon, group: 'Landing sites' })),
]

export const missionPath = (code?: string, action?: 'edit') => ['#/missions', code, action].filter(Boolean).join('/')

/** Address for a mission opened from the browse list, where you don't know its code. */
export const missionIdPath = (id: string) => `#/missions/m/${id}`

/** Whose missions a list shows: everyone's, other users' only, or only yours (led or joined). */
export type OwnerFilter = 'all' | 'others' | 'mine'
export const OWNER_FILTERS: { id: OwnerFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'others', label: 'Others' },
  { id: 'mine', label: 'Mine' },
]

/**
 * Narrow a list to one owner group. `isMine` says whether a mission is yours (you lead it or joined it);
 * signed out, nothing is yours, so 'others' is everything and 'mine' is empty.
 */
export function byOwner<T extends { ownerId: string }>(list: T[], filter: OwnerFilter, isMine: (m: T) => boolean) {
  if (filter === 'all') return list
  return list.filter((m) => (filter === 'mine') === isMine(m))
}

export function go(path: string) {
  window.location.hash = path
}

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' })
export function timeAgo(iso: string, now: Date) {
  const seconds = (new Date(iso).getTime() - now.getTime()) / 1000
  const steps: [Intl.RelativeTimeFormatUnit, number][] = [['day', 86400], ['hour', 3600], ['minute', 60]]
  for (const [unit, size] of steps) if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  return 'just now'
}
