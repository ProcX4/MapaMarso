// Live Phobos and Deimos positions from JPL Horizons, fetched through /api/horizons (see api/horizons.ts).
// Each table holds a few days of Mars-centred positions and velocities every 15 minutes; between rows the
// path is interpolated, which stays well under a kilometre of Horizons. When a table isn't available
// (offline, still loading, or the API is down) the built-in orbit model in marsSky.ts stands in.

import type { HorizonsBody, HorizonsTable } from '../../api/horizons'
import { daysSinceJ2000, icrfToMei, moonPosition, type MoonId, type Vec3 } from './marsSky'

const MOONS: MoonId[] = ['phobos', 'deimos']
/** Fetch a new table once less than this many days of it are left ahead of now (a Deimos lap is 1.26 days). */
const REFRESH_AHEAD_DAYS = 1.5
/** After a failed fetch, wait this long before trying again. */
const RETRY_MS = 10 * 60 * 1000
const TIMEOUT_MS = 20_000

/**
 * Fetch one table through /api/horizons. Requests wait their turn: Horizons turns away several at once, so
 * the moons and the orbiters (see orbiters.ts) all go through this one queue.
 */
let queue: Promise<unknown> = Promise.resolve()
export function fetchTable(body: HorizonsBody, day: string) {
  const job = queue.then(async () => {
    const res = await fetch(`/api/horizons?body=${body}&day=${day}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!res.ok) throw new Error(`Horizons ${body}: ${res.status}`)
    return (await res.json()) as HorizonsTable
  })
  queue = job.catch(() => {})
  return job
}

const tables = new Map<MoonId, HorizonsTable>()
let loading = false
let failedAt = -Infinity
let version = 0

/** Changes whenever new tables arrive, so drawings based on positions can be refreshed. */
export const ephemerisVersion = () => version

/** True while the moons are placed from Horizons data rather than the built-in model. */
export const moonsFromHorizons = () => tables.size === MOONS.length

const tableEnd = (t: HorizonsTable) => t.start + t.step * (t.rows.length - 1)

/** Make sure tables covering the next day or so are loaded or on their way; cheap to call every frame. */
export function ensureMoonEphemeris(nowMs: number) {
  const d = daysSinceJ2000(nowMs)
  const fresh = MOONS.every((id) => {
    const t = tables.get(id)
    return t && t.start <= d && tableEnd(t) - d > REFRESH_AHEAD_DAYS
  })
  if (fresh || loading || nowMs - failedAt < RETRY_MS) return
  loading = true
  // Start the day before (UTC) so the table also covers the recent past; the same day for every visitor,
  // so the server's cached copy is reused
  const day = new Date(nowMs - 86_400_000).toISOString().slice(0, 10)
  Promise.all(MOONS.map((id) => fetchTable(id, day)))
    .then((loaded) => {
      for (const t of loaded) tables.set(t.body as MoonId, t)
      version++
    })
    .catch((err) => {
      failedAt = nowMs
      console.warn('Moon positions: using the built-in orbit model.', err)
    })
    .finally(() => {
      loading = false
    })
}

/**
 * Position (km) and velocity (km/day) at day d from a Horizons table, in ICRF, or null outside the table.
 * Cubic Hermite between the two rows around d, from their positions and velocities.
 */
export function tableState(t: HorizonsTable, d: number): { pos: Vec3; vel: Vec3 } | null {
  const x = (d - t.start) / t.step
  if (x < 0 || x > t.rows.length - 1) return null
  const k = Math.min(Math.floor(x), t.rows.length - 2)
  const u = x - k
  const a = t.rows[k], b = t.rows[k + 1]
  const h00 = 2 * u ** 3 - 3 * u ** 2 + 1, h10 = u ** 3 - 2 * u ** 2 + u
  const h01 = -2 * u ** 3 + 3 * u ** 2, h11 = u ** 3 - u ** 2
  // Their rates of change, for the velocity (per row step, then per day)
  const d00 = 6 * u ** 2 - 6 * u, d10 = 3 * u ** 2 - 4 * u + 1, d01 = -6 * u ** 2 + 6 * u, d11 = 3 * u ** 2 - 2 * u
  const pos = [0, 1, 2].map((i) => h00 * a[i] + h10 * t.step * a[i + 3] + h01 * b[i] + h11 * t.step * b[i + 3]) as Vec3
  const vel = [0, 1, 2].map((i) => (d00 * a[i] + d10 * t.step * a[i + 3] + d01 * b[i] + d11 * t.step * b[i + 3]) / t.step) as Vec3
  return { pos, vel }
}

/** Moon position relative to Mars's centre, km, MEI: from Horizons when loaded, else the built-in model. */
export function livePosition(id: MoonId, d: number): Vec3 {
  const t = tables.get(id)
  const state = t ? tableState(t, d) : null
  return state ? icrfToMei(state.pos, d) : moonPosition(id, d)
}
