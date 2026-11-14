import { landingSites, landmarks } from '../data/mars'

/*
 * Addresses and list helpers shared by the globe and the missions pages (from MapaMars pages/missions/shared.ts
 * and pages/globe/paths.ts). Kept in lib/ because features may not import from each other (Frontend Spec §3).
 */

// #/globe      the 3D globe
// #/globe/2d   the flat map
// #/globe/new  plan a new mission on the flat map, full screen
export const GLOBE_3D = '#/globe'
export const GLOBE_2D = '#/globe/2d'
export const GLOBE_PLAN = '#/globe/new'

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
