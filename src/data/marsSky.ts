// Sky geometry around Mars: the planet's rotation, the Sun, the planets, Phobos and Deimos (from MapaMars).
// Vectors are in km in the Mars equatorial inertial frame (MEI): z is Mars's north pole and
// x the ascending node of Mars's equator on the ICRF equator (the IAU prime-meridian reference).
// Body-fixed coordinates are MEI turned by the rotation angle W, so east longitude = MEI longitude - W.
// Self-contained on purpose: no imports, so the math can be checked outside the app.

export type Vec3 = [number, number, number]

const RAD = Math.PI / 180
const MS_PER_DAY = 86_400_000
const J2000_JD = 2451545.0

export const MARS_RADIUS_KM = 3389.5
export const MARS_EQUATOR_RADIUS_KM = 3396.19
const SUN_RADIUS_KM = 695_700
const AU_KM = 149_597_870.7

/** IAU (2009) Mars rotation rate, degrees per day; one turn is the sidereal day. */
export const MARS_ROTATION_DEG_PER_DAY = 350.89198226
export const SOL_S = 88775.244
/** Days since J2000.0 in Terrestrial Time (close enough to TDB here). */
export function daysSinceJ2000(ms: number) {
  return ms / MS_PER_DAY + 2440587.5 + 69.184 / 86400 - J2000_JD
}

// Vector helpers
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2]
const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const scale = (a: Vec3, k: number): Vec3 => [a[0] * k, a[1] * k, a[2] * k]
const len = (a: Vec3) => Math.hypot(a[0], a[1], a[2])
const norm = (a: Vec3) => scale(a, 1 / len(a))

// Passive rotations (they re-express a vector in a turned frame); negate the angle for the inverse.
function rotX(v: Vec3, deg: number): Vec3 {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD)
  return [v[0], c * v[1] + s * v[2], -s * v[1] + c * v[2]]
}
function rotZ(v: Vec3, deg: number): Vec3 {
  const c = Math.cos(deg * RAD), s = Math.sin(deg * RAD)
  return [c * v[0] + s * v[1], -s * v[0] + c * v[1], v[2]]
}

/** ICRF into the frame of a plane whose pole is at (ra, dec), x along its ascending node on the ICRF equator. */
const icrfToPlane = (v: Vec3, ra: number, dec: number) => rotX(rotZ(v, 90 + ra), 90 - dec)
const planeToIcrf = (v: Vec3, ra: number, dec: number) => rotZ(rotX(v, -(90 - dec)), -(90 + ra))

/** Mars pole and prime meridian (IAU 2009 report). */
function marsPole(d: number) {
  const T = d / 36525
  return { ra: 317.68143 - 0.1061 * T, dec: 52.8865 - 0.0609 * T }
}

/** Rotation angle W of Mars's prime meridian, degrees, 0..360. */
export function marsRotationDeg(d: number) {
  return (((176.63 + MARS_ROTATION_DEG_PER_DAY * d) % 360) + 360) % 360
}

export const icrfToMei = (v: Vec3, d: number) => {
  const p = marsPole(d)
  return icrfToPlane(v, p.ra, p.dec)
}

/** MEI vector to body-fixed (x toward 0°E, z north). */
export const meiToBodyFixed = (v: Vec3, d: number) => rotZ(v, marsRotationDeg(d))

export function toLatLon(v: Vec3) {
  const n = norm(v)
  return { lat: Math.asin(n[2]) / RAD, lon: Math.atan2(n[1], n[0]) / RAD }
}

function solveKepler(M: number, e: number) {
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}

/** Position in a plane frame from classical elements (angles in degrees, M in degrees). */
function orbitPosition(a: number, e: number, i: number, node: number, peri: number, M: number): Vec3 {
  const E = solveKepler(M * RAD, e)
  const x = a * (Math.cos(E) - e)
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E)
  // Active rotation perifocal -> plane: Rz(node) Rx(i) Rz(peri)
  return rotZ(rotX(rotZ([x, y, 0], -peri), -i), -node)
}

/**
 * JPL's approximate planetary elements (Standish, "Keplerian Elements for Approximate Positions of the Major
 * Planets", table 1, valid 1800–2050): each a value at J2000 and its change per Julian century, for
 * a (AU), e, I, L (mean longitude), long. perihelion and long. ascending node (degrees).
 */
type PlanetElements = [number, number, number, number, number, number, number, number, number, number, number, number]
export type PlanetId = 'mercury' | 'venus' | 'earth' | 'jupiter' | 'saturn'
const ELEMENTS: Record<PlanetId | 'mars', PlanetElements> = {
  mercury: [0.38709927, 0.00000037, 0.20563593, 0.00001906, 7.00497902, -0.00594749, 252.2503235, 149472.67411175, 77.45779628, 0.16047689, 48.33076593, -0.12534081],
  venus: [0.72333566, 0.0000039, 0.00677672, -0.00004107, 3.39467605, -0.0007889, 181.9790995, 58517.81538729, 131.60246718, 0.00268329, 76.67984255, -0.27769418],
  // The Earth–Moon barycentre: within 5,000 km of Earth, far below what shows from Mars
  earth: [1.00000261, 0.00000562, 0.01671123, -0.00004392, -0.00001531, -0.01294668, 100.46457166, 35999.37244981, 102.93768193, 0.32327364, 0, 0],
  mars: [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343],
  jupiter: [5.202887, -0.00011607, 0.04838624, -0.00013253, 1.30439695, -0.00183714, 34.39644051, 3034.74612775, 14.72847983, 0.21252668, 100.47390909, 0.20469106],
  saturn: [9.53667594, -0.0012506, 0.05386179, -0.00050991, 2.48599187, 0.00193609, 49.95424423, 1222.49362201, 92.59887831, -0.41897216, 113.66242448, -0.28867794],
}
const OBLIQUITY = 23.43928

/** Heliocentric position, AU, ICRF (ecliptic elements turned onto the equator). */
function heliocentric(id: PlanetId | 'mars', d: number): Vec3 {
  const T = d / 36525
  const el = ELEMENTS[id]
  const [a, e, I, L, peri, node] = [0, 2, 4, 6, 8, 10].map((k) => el[k] + el[k + 1] * T)
  return rotX(orbitPosition(a, e, I, node, peri - node, L - peri), -OBLIQUITY)
}

/** Direction of the Sun from Mars (unit, MEI) and the Sun–Mars distance in AU. */
export function sunFromMars(d: number) {
  const icrf = heliocentric('mars', d)
  const au = len(icrf)
  return { dir: norm(icrfToMei(scale(icrf, -1), d)), au }
}

/** Absolute magnitudes (brightness at 1 AU from both Sun and observer, fully lit). */
const ABSOLUTE_MAG: Record<PlanetId, number> = { mercury: -0.42, venus: -4.4, earth: -3.86, jupiter: -9.4, saturn: -8.88 }

/**
 * A planet seen from Mars: its direction (unit vector, ICRF), distance (AU) and approximate brightness
 * (visual magnitude, from distance and phase; Saturn's rings and the finer phase laws are left out).
 */
export function planetFromMars(id: PlanetId, d: number) {
  const mars = heliocentric('mars', d)
  const planet = heliocentric(id, d)
  const rel = sub(planet, mars)
  const distance = len(rel), fromSun = len(planet)
  // Phase angle: Sun–planet–Mars, 0 when fully lit as seen from Mars
  const phase = Math.acos(Math.max(-1, Math.min(1, dot(scale(planet, -1 / fromSun), scale(rel, -1 / distance))))) / RAD
  const mag = ABSOLUTE_MAG[id] + 5 * Math.log10(fromSun * distance) + 0.02 * phase
  return { dir: norm(rel), au: distance, mag }
}

/** A star's direction (unit vector, ICRF) from its right ascension and declination in degrees. */
export function starDirection(raDeg: number, decDeg: number): Vec3 {
  const ra = raDeg * RAD, dec = decDeg * RAD
  return [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)]
}

/**
 * The sky over a place on Mars at a moment: a 3×3 matrix (row-major) turning an ICRF direction into its
 * east, north and up components there, so stars and planets can be set in that site's sky.
 */
export function siteSkyMatrix(lat: number, lon: number, ms: number) {
  const d = daysSinceJ2000(ms)
  const la = lat * RAD, lo = lon * RAD
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
  const east: Vec3 = [-Math.sin(lo), Math.cos(lo), 0]
  const north: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)]
  const toBf = (v: Vec3) => meiToBodyFixed(icrfToMei(v, d), d)
  const columns = [toBf([1, 0, 0]), toBf([0, 1, 0]), toBf([0, 0, 1])]
  return [east, north, up].flatMap((axis) => columns.map((c) => dot(c, axis)))
}

/** Apparent angular radius of the Sun seen from Mars, degrees. */
export const sunAngularRadiusDeg = (au: number) => Math.asin(SUN_RADIUS_KM / (au * AU_KM)) / RAD

// Moons

export type MoonId = 'phobos' | 'deimos'

type MoonElements = {
  a: number; e: number; i: number
  node0: number; peri0: number; M0: number
  /** Mean motion, deg/day */
  n: number
  /** Apsidal and nodal precession periods, years (node regresses) */
  pPeri: number; pNode: number
  /** Laplace plane pole, ICRF degrees */
  lapRa: number; lapDec: number
}

/**
 * JPL SSD mean orbital elements (ephemeris MAR099), epoch J2000, referred to each moon's Laplace plane;
 * node is measured from the Laplace plane's node on the ICRF equator. The published table is rounded to
 * 0.1°, so predicted transits land on the right day or within a few days of rover observations (2004–2022).
 */
export const MOON_ELEMENTS: Record<MoonId, MoonElements> = {
  phobos: { a: 9375, e: 0.015, i: 1.1, node0: 169.2, peri0: 216.3, M0: 189.7, n: 1128.8445566, pPeri: 1.1, pNode: 2.3, lapRa: 317.7, lapDec: 52.9 },
  deimos: { a: 23457, e: 0, i: 1.8, node0: 54.3, peri0: 0, M0: 205.0, n: 285.1618875, pPeri: 0, pNode: 56.2, lapRa: 316.6, lapDec: 53.5 },
}

/** Tri-axial radii in km: long (toward Mars), middle (along the orbit), short (toward the pole). */
export const MOON_RADII: Record<MoonId, Vec3> = {
  phobos: [13.0, 11.4, 9.1],
  deimos: [7.8, 6.0, 5.1],
}

/** Moon position relative to Mars's centre, km, MEI. */
export function moonPosition(id: MoonId, d: number): Vec3 {
  const el = MOON_ELEMENTS[id]
  const years = d / 365.25
  const node = el.node0 - (el.pNode ? (360 * years) / el.pNode : 0)
  const peri = el.peri0 + (el.pPeri ? (360 * years) / el.pPeri : 0)
  const M = el.M0 + el.n * d
  const lap = orbitPosition(el.a, el.e, el.i, node, peri, M)
  return icrfToMei(planeToIcrf(lap, el.lapRa, el.lapDec), d)
}

/** Sampled orbit path (MEI, km) for drawing: one lap from time d, positions from `at`. */
export function moonOrbitPath(id: MoonId, d: number, steps = 256, at = moonPosition): Vec3[] {
  const el = MOON_ELEMENTS[id]
  const period = 360 / el.n
  return Array.from({ length: steps + 1 }, (_, k) => at(id, d + (k / steps) * period))
}

export const moonPeriodDays = (id: MoonId) => 360 / MOON_ELEMENTS[id].n

/**
 * Share of the Sun's disk a moon can see past Mars: 1 in full sunlight, 0 in Mars's umbra, and in between
 * in the penumbra, so an eclipse fades in and out instead of switching.
 */
export function sunVisibleFromMoon(pos: Vec3, sunDir: Vec3, sunAu: number) {
  const dist = len(pos)
  const marsRadius = Math.asin(Math.min(1, MARS_RADIUS_KM / dist)) / RAD
  const sunRadius = sunAngularRadiusDeg(sunAu)
  const sep = Math.acos(Math.max(-1, Math.min(1, dot(scale(pos, -1 / dist), sunDir)))) / RAD
  return 1 - overlapArea(sunRadius, marsRadius, sep) / (Math.PI * sunRadius * sunRadius)
}

/** Direction of the Sun seen from a place on Mars, as east, north and up components of a unit vector. */
export function sunLocalDirection(lat: number, lon: number, ms: number) {
  const d = daysSinceJ2000(ms)
  const s = meiToBodyFixed(sunFromMars(d).dir, d)
  const la = lat * RAD, lo = lon * RAD
  const up: Vec3 = [Math.cos(la) * Math.cos(lo), Math.cos(la) * Math.sin(lo), Math.sin(la)]
  const east: Vec3 = [-Math.sin(lo), Math.cos(lo), 0]
  const north: Vec3 = [-Math.sin(la) * Math.cos(lo), -Math.sin(la) * Math.sin(lo), Math.cos(la)]
  return { east: dot(s, east), north: dot(s, north), up: dot(s, up) }
}

/** Area where two circles overlap (radii r1, r2, centres dist apart). */
function overlapArea(r1: number, r2: number, dist: number) {
  if (dist >= r1 + r2) return 0
  if (dist <= Math.abs(r1 - r2)) return Math.PI * Math.min(r1, r2) ** 2
  const a = r1 * r1 * Math.acos((dist * dist + r1 * r1 - r2 * r2) / (2 * dist * r1))
  const b = r2 * r2 * Math.acos((dist * dist + r2 * r2 - r1 * r1) / (2 * dist * r2))
  const c = 0.5 * Math.sqrt((-dist + r1 + r2) * (dist + r1 - r2) * (dist - r1 + r2) * (dist + r1 + r2))
  return a + b - c
}

/** Sub-solar point on Mars (planetocentric, east longitude). */
export function subsolarPoint(ms: number) {
  const d = daysSinceJ2000(ms)
  return toLatLon(meiToBodyFixed(sunFromMars(d).dir, d))
}
