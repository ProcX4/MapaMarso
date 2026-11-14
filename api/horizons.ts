/*
 * Positions of Phobos, Deimos and the spacecraft orbiting Mars, from JPL Horizons
 * (https://ssd-api.jpl.nasa.gov/doc/horizons.html), from MapaMars.
 * Horizons sends no CORS headers, so the browser can't call it directly: this runs as a Vercel function
 * in production and as dev-server middleware locally (see vite.config.ts).
 * Only fixed queries go out: the caller picks one of the bodies below and a start day, nothing else, so this
 * can't be used as an open proxy (Security Spec §3). Responses are cached for a day, so Horizons sees a few
 * requests a day at most.
 *
 * Like api/tiles.ts, this file must not import local modules: Vercel compiles it on its own.
 */

const HORIZONS_URL = 'https://ssd.jpl.nasa.gov/api/horizons.api'
const TIMEOUT_MS = 15_000
/**
 * The bodies served: Horizons ID, how many days each table covers from its start day, and the minutes between
 * rows. Spacecraft in low orbit go round in about two hours, so their rows are closer together.
 */
const BODIES = {
  phobos: { code: '401', days: 4, minutes: 15 },
  deimos: { code: '402', days: 4, minutes: 15 },
  mro: { code: '-74', days: 3, minutes: 2 },
  odyssey: { code: '-53', days: 3, minutes: 2 },
  tgo: { code: '-143', days: 3, minutes: 2 },
  mex: { code: '-41', days: 3, minutes: 5 },
  emm: { code: '-62', days: 4, minutes: 15 },
} as const
export type HorizonsBody = keyof typeof BODIES
const SECONDS_PER_DAY = 86400

export type HorizonsTable = {
  body: HorizonsBody
  /** Days since J2000.0 (TDB) of the first row */
  start: number
  /** Days between rows */
  step: number
  /** Mars-centred ICRF state per row: x, y, z in km, then vx, vy, vz in km/day */
  rows: number[][]
}

const json = (body: unknown, status: number, cache: string, extra: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': cache, ...extra } })

export async function GET(request: Request) {
  if (request.method !== 'GET') return json({ error: 'Method not allowed' }, 405, 'no-store', { allow: 'GET' })
  const params = new URL(request.url).searchParams
  // `moon=` is the older name for `body=`
  const name = params.get('body') ?? params.get('moon') ?? ''
  const day = params.get('day') ?? ''
  if (!Object.hasOwn(BODIES, name)) return json({ error: `body must be one of ${Object.keys(BODIES).join(', ')}` }, 400, 'no-store')
  const body = name as HorizonsBody
  const { code, days, minutes } = BODIES[body]
  const dayMs = Date.parse(`${day}T00:00:00Z`)
  // A calendar day within a year of today: enough for the live globe, and keeps the cache small
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || Number.isNaN(dayMs) || Math.abs(dayMs - Date.now()) > 366 * SECONDS_PER_DAY * 1000) {
    return json({ error: 'day must be YYYY-MM-DD within a year of today' }, 400, 'no-store')
  }
  const stop = new Date(dayMs + days * SECONDS_PER_DAY * 1000).toISOString().slice(0, 10)
  const query = new URLSearchParams({
    format: 'json',
    COMMAND: `'${code}'`,
    CENTER: "'500@499'",
    EPHEM_TYPE: "'VECTORS'",
    REF_PLANE: "'FRAME'",
    REF_SYSTEM: "'ICRF'",
    VEC_TABLE: "'2'",
    OUT_UNITS: "'KM-S'",
    CSV_FORMAT: "'YES'",
    OBJ_DATA: "'NO'",
    START_TIME: `'${day}'`,
    STOP_TIME: `'${stop}'`,
    STEP_SIZE: `'${minutes} m'`,
  })

  try {
    // Horizons sometimes turns a request away while busy: give it one more try after a moment
    let upstream = await fetch(`${HORIZONS_URL}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    if (!upstream.ok) {
      await new Promise((resolve) => setTimeout(resolve, 1500))
      upstream = await fetch(`${HORIZONS_URL}?${query}`, { signal: AbortSignal.timeout(TIMEOUT_MS) })
    }
    if (!upstream.ok) return json({ error: `Horizons answered ${upstream.status}` }, 502, 'no-store')
    const reply = (await upstream.json()) as { result?: string; error?: string }
    const table = reply.result?.split('$$SOE')[1]?.split('$$EOE')[0]
    if (!table) return json({ error: reply.error ?? 'Horizons returned no ephemeris' }, 502, 'no-store')
    // Rows: JDTDB, calendar date, X, Y, Z, VX, VY, VZ (km, km/s)
    const parsed = table.trim().split('\n').map((line) => line.split(',').map((cell) => cell.trim()))
    const rows = parsed.map((r) => [+r[2], +r[3], +r[4], +r[5] * SECONDS_PER_DAY, +r[6] * SECONDS_PER_DAY, +r[7] * SECONDS_PER_DAY])
    if (rows.length < 2 || rows.some((r) => r.some((v) => !Number.isFinite(v)))) {
      return json({ error: 'Could not read the Horizons table' }, 502, 'no-store')
    }
    const result: HorizonsTable = { body, start: +parsed[0][0] - 2451545, step: minutes / (24 * 60), rows }
    return json(result, 200, 'public, max-age=3600, s-maxage=86400')
  } catch {
    // Say what failed without passing on internal details (Security Spec §3)
    return json({ error: 'Horizons unreachable' }, 502, 'no-store')
  }
}

// Vercel calls the exported method handler; anything else gets a 405 from the same check.
export const POST = GET
export const PUT = GET
export const DELETE = GET
export const PATCH = GET
