import type { LngLat } from '../state/types'
import { GAZETTEER } from '../config/site'

/*
 * Place names for Search: every Mars name the IAU has adopted (public/data/gazetteer.json, built from the USGS
 * Gazetteer of Planetary Nomenclature by `npm run build-gazetteer`), plus the few NASA mission names that are
 * not IAU names (GAZETTEER in config/site.ts).
 */

export type Place = { name: string; at: LngLat; kind: string; diameterKm: number; iau: boolean }

const TIMEOUT_MS = 10_000
let loading: Promise<Place[]> | null = null

/** Loads the gazetteer once, on first use (88 KB); a failed load is retried on the next search. */
export function loadGazetteer(): Promise<Place[]> {
  loading ??= (async () => {
    const res = await fetch('/data/gazetteer.json', { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`gazetteer: HTTP ${res.status}`)
    const rows = (await res.json()) as [string, number, number, string, number][]
    const iau = rows.map(([name, lon, lat, kind, diameterKm]): Place => ({ name, at: [lon, lat], kind, diameterKm, iau: true }))
    const nasa = GAZETTEER.map((p): Place => ({ name: p.name, at: p.at, kind: p.note, diameterKm: 0, iau: false }))
    return [...nasa, ...iau]
  })().catch((err) => {
    loading = null
    throw err
  })
  return loading
}

/** Lower case, accents removed, so "seitah" finds "Séítah". */
const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase()

/** Names that start with the query first, then names that contain it; at most `limit`. */
export function searchPlaces(places: Place[], query: string, limit = 8): Place[] {
  const q = fold(query.trim())
  if (!q) return []
  const starts: Place[] = []
  const contains: Place[] = []
  for (const p of places) {
    const n = fold(p.name)
    if (n.startsWith(q)) starts.push(p)
    else if (n.includes(q)) contains.push(p)
    if (starts.length >= limit) break
  }
  return [...starts, ...contains].slice(0, limit)
}

/** Zoom that shows a feature about a third of the screen wide: 0.9 km craters at 12, Olympus Mons at about 4. */
export function zoomFor(diameterKm: number) {
  if (!(diameterKm > 0)) return 9
  return Math.min(12, Math.max(2, Math.round(Math.log2(11_083 / diameterKm))))
}
