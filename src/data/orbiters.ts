// The spacecraft working in orbit around Mars, placed from NASA JPL Horizons (through /api/horizons, see
// api/horizons.ts); from MapaMars. Each table holds three or four days of Mars-centred positions and
// velocities, every 2 to 15 minutes. Every number shown about an orbit (height, speed, period, its low and
// high points, its tilt) is worked out from those live positions, not written in here; only the short
// background below is.
//
// Left out: MAVEN (NASA lost contact in December 2025; Horizons has no trajectory for it after March 2026) and
// Tianwen-1's orbiter (Horizons has only an unofficial 2020 trajectory for it).

import type { HorizonsBody, HorizonsTable } from '../../api/horizons'
import { daysSinceJ2000, icrfToMei, MARS_EQUATOR_RADIUS_KM, meiToBodyFixed, toLatLon, type Vec3 } from './marsSky'
import { fetchTable, tableState } from './moonEphemeris'

export type OrbiterId = Extract<HorizonsBody, 'mro' | 'odyssey' | 'mex' | 'tgo' | 'emm'>

export type Orbiter = {
  id: OrbiterId
  name: string
  short: string
  agency: string
  launched: string
  arrived: string
  /** Two or three sentences on what it does */
  about: string
  /** NASA's 3D model of it, where one is published */
  model?: { url: string; credit: string }
  color: string
}

export const ORBITERS: Orbiter[] = [
  {
    id: 'mro', name: 'Mars Reconnaissance Orbiter', short: 'MRO', agency: 'NASA / JPL', launched: '12 Aug 2005', arrived: '10 Mar 2006',
    about: 'Its HiRISE camera sees details on the ground as small as a kitchen table, and its radar looks for ice under the surface. It also relays data from the rovers back to Earth.',
    model: { url: '/resources/orbiters/mro.glb', credit: 'NASA 3D Resources' },
    color: '#ffd27a',
  },
  {
    id: 'odyssey', name: '2001 Mars Odyssey', short: 'Odyssey', agency: 'NASA / JPL', launched: '7 Apr 2001', arrived: '24 Oct 2001',
    about: 'The longest-working spacecraft at Mars. Its gamma-ray spectrometer found water ice just under the surface near the poles, and its THEMIS camera maps the ground by its warmth.',
    model: { url: '/resources/orbiters/odyssey.glb', credit: 'NASA 3D Resources' },
    color: '#9ad7ff',
  },
  {
    id: 'mex', name: 'Mars Express', short: 'Mars Express', agency: 'ESA', launched: '2 Jun 2003', arrived: '25 Dec 2003',
    about: "Europe's first Mars mission. Its stereo camera maps the planet in 3D and its MARSIS radar sounds the polar ice caps. Its long, looping orbit swings from about 300 km to over 10,000 km.",
    color: '#c7b8ff',
  },
  {
    id: 'tgo', name: 'ExoMars Trace Gas Orbiter', short: 'TGO', agency: 'ESA (launched with Roscosmos)', launched: '14 Mar 2016', arrived: '19 Oct 2016',
    about: "Sniffs the thin air for traces of gases such as methane that could come from geology or life, and maps hidden water ice with its neutron detector. It also relays data from NASA's rovers.",
    model: { url: '/resources/orbiters/tgo.glb', credit: 'NASA Visualization Technology Applications and Development' },
    color: '#8cf0c4',
  },
  {
    id: 'emm', name: 'Hope (Emirates Mars Mission)', short: 'Hope', agency: 'UAE Space Agency / MBRSC', launched: '19 Jul 2020', arrived: '9 Feb 2021',
    about: "The first Arab mission to another planet. Its wide orbit lets it watch the whole planet's weather at every time of day, from the lower atmosphere up to where it escapes into space.",
    color: '#ff9fb1',
  },
]
/** Shown wherever a spacecraft is drawn with a stand-in shape rather than a published model */
export const APPROXIMATE_MODEL_NOTE = 'Approximate model: no official 3D model of this spacecraft is published, so a simple shape of its real size stands in'
export const orbiterById = (id: OrbiterId) => ORBITERS.find((o) => o.id === id)!

/** Mars's gravity (GM), km³/s² */
const MARS_GM = 42828.37
const SECONDS_PER_DAY = 86400
/** Fetch new tables once less than this many days are left ahead of now. */
const REFRESH_AHEAD_DAYS = 1.5
const RETRY_MS = 10 * 60 * 1000

const tables = new Map<OrbiterId, HorizonsTable>()
let loading = false
let failedAt = -Infinity
let version = 0

/** Changes whenever new tables arrive, so orbit lines can be redrawn. */
export const orbiterVersion = () => version

const tableEnd = (t: HorizonsTable) => t.start + t.step * (t.rows.length - 1)

/** Make sure tables covering the next day or so are loaded or on their way; cheap to call every frame. */
export function ensureOrbiters(nowMs: number) {
  const d = daysSinceJ2000(nowMs)
  const fresh = ORBITERS.every(({ id }) => {
    const t = tables.get(id)
    return t && t.start <= d && tableEnd(t) - d > REFRESH_AHEAD_DAYS
  })
  if (fresh || loading || nowMs - failedAt < RETRY_MS) return
  loading = true
  const day = new Date(nowMs - 86_400_000).toISOString().slice(0, 10)
  // One after another (through the shared Horizons queue), each on its own: one that can't be served doesn't
  // hold up the rest. Each appears as soon as it arrives.
  ;(async () => {
    let failed = 0
    for (const { id } of ORBITERS) {
      try {
        tables.set(id, await fetchTable(id, day))
        version++
      } catch {
        failed++
      }
    }
    if (failed) {
      failedAt = nowMs
      console.warn(`Orbiters: ${failed} could not be loaded from Horizons.`)
    }
  })().finally(() => {
    loading = false
  })
}

/** Position relative to Mars's centre, km, MEI, or null while it hasn't been loaded. */
export function orbiterPosition(id: OrbiterId, d: number): Vec3 | null {
  const t = tables.get(id)
  const state = t ? tableState(t, d) : null
  return state ? icrfToMei(state.pos, d) : null
}

export type OrbitFacts = {
  /** Height above Mars's mean surface, km */
  altitude: number
  /** Speed, km/s */
  speed: number
  /** Time to go round once, hours */
  periodH: number
  /** Lowest and highest points of the orbit above the surface, km */
  periapsis: number
  apoapsis: number
  /** Tilt of the orbit to Mars's equator, degrees (near 90° passes over the poles) */
  inclination: number
  /** The point on Mars directly below it */
  lat: number
  lon: number
}

/** What its orbit is like at a moment (Unix ms), all from Horizons' live position and velocity. */
export const orbitFacts = (id: OrbiterId, ms: number) => factsAt(id, daysSinceJ2000(ms))

function factsAt(id: OrbiterId, d: number): OrbitFacts | null {
  const t = tables.get(id)
  const state = t ? tableState(t, d) : null
  if (!state) return null
  const r = icrfToMei(state.pos, d)
  const v = icrfToMei(state.vel, d).map((x) => x / SECONDS_PER_DAY) as Vec3
  const rLen = Math.hypot(...r), speed = Math.hypot(...v)
  // The orbit through this point at this speed: its size (semi-major axis) and shape (eccentricity)
  const a = 1 / (2 / rLen - (speed * speed) / MARS_GM)
  const h: Vec3 = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]]
  const hLen = Math.hypot(...h)
  const e = Math.sqrt(Math.max(0, 1 - (hLen * hLen) / (MARS_GM * a)))
  const below = toLatLon(meiToBodyFixed(r, d))
  return {
    altitude: rLen - MARS_EQUATOR_RADIUS_KM,
    speed,
    periodH: (2 * Math.PI * Math.sqrt(a ** 3 / MARS_GM)) / 3600,
    periapsis: a * (1 - e) - MARS_EQUATOR_RADIUS_KM,
    apoapsis: a * (1 + e) - MARS_EQUATOR_RADIUS_KM,
    inclination: (Math.acos(h[2] / hLen) * 180) / Math.PI,
    lat: below.lat,
    lon: below.lon,
  }
}

/** One lap of its orbit from day d (MEI, km), sampled from the table, for drawing. */
export function orbitPath(id: OrbiterId, d: number, steps = 180): Vec3[] | null {
  const facts = factsAt(id, d)
  if (!facts) return null
  const lap = facts.periodH / 24
  const points: Vec3[] = []
  for (let k = 0; k <= steps; k++) {
    const p = orbiterPosition(id, d + (k / steps) * lap)
    if (p) points.push(p)
  }
  return points.length > 1 ? points : null
}
