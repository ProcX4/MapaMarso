import type { LngLat } from '../state/types'

/* Every number on screen goes through here, so units and rounding stay consistent. */

const MINUS = '−'
const int = new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 })
const fixed = (n: number, digits: number) => n.toFixed(digits).replace('-', MINUS)

/** 6.4 → "6.4 km" */
export const formatKm = (km: number) => `${fixed(km, 1)} km`

/** -2418 → "−2,418 m" */
export const formatM = (m: number) => `${int.format(Math.round(m)).replace('-', MINUS)} m`

/** Short distances in m, longer in km. */
export const formatDistance = (m: number) => (Math.abs(m) < 1000 ? formatM(m) : formatKm(m / 1000))

/** 14.73 → "14.7°" */
export const formatSlope = (deg: number) => `${fixed(deg, 1)}°`

/** Minutes → "3 h 48 min" (or "42 min" under an hour). */
export function formatDuration(min: number) {
  const total = Math.max(0, Math.round(min))
  const h = Math.floor(total / 60)
  const m = total % 60
  return h ? `${h} h ${m} min` : `${m} min`
}

/** [77.5, 18.44] → "18.440°N, 77.500°E" (planetocentric, east-positive). */
export function formatLatLon([lon, lat]: LngLat) {
  return `${Math.abs(lat).toFixed(3)}°${lat >= 0 ? 'N' : 'S'}, ${Math.abs(lon).toFixed(3)}°${lon >= 0 ? 'E' : 'W'}`
}

/** Signed metres with an explicit plus, for elevation change: "+42 m" / "−18 m". */
export const formatSignedM = (m: number) => (m > 0 ? `+${formatM(m)}` : formatM(m))

/** Compass bearing in whole degrees: "047°". */
export const formatBearing = (deg: number) => `${String(Math.round(((deg % 360) + 360) % 360)).padStart(3, '0')}°`

export const NO_DATA = 'No data'

/** Decimal hours → "14:05:09" (Mars clock times). */
export function formatHours(h: number) {
  const total = Math.floor(h * 3600)
  const hh = Math.floor(total / 3600)
  const mm = Math.floor((total % 3600) / 60)
  const ss = total % 60
  return [hh, mm, ss].map((n) => String(n).padStart(2, '0')).join(':')
}

const PH_TIME = new Intl.DateTimeFormat('en-CA', {
  timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit',
  hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23',
})

/** Philippine Standard Time (UTC+8), e.g. "2026-09-30 22:05:16 PHT". */
export function formatPhTime(ms: number) {
  return PH_TIME.format(ms).replace(',', '') + ' PHT'
}

/** 18.44 → "18.44°N" */
export function formatLat(lat: number, digits = 2) {
  return `${Math.abs(lat).toFixed(digits)}°${lat >= 0 ? 'N' : 'S'}`
}

/** -47.95 → "47.95°W" */
export function formatLon(lon: number, digits = 2) {
  return `${Math.abs(lon).toFixed(digits)}°${lon >= 0 ? 'E' : 'W'}`
}

/** Distance given in km: metres under 1 km, two decimals under 10 km (the MapaMars style), else one. */
export function formatDistanceKm(km: number) {
  return km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(km < 10 ? 2 : 1)} km`
}
