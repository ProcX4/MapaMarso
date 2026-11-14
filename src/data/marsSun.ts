/*
 * Where the Sun stands over Mars, from MapaMars src/data/marsSky.ts (only the Sun part).
 * Vectors are in the Mars equatorial inertial frame (MEI): z is Mars's north pole and x the
 * ascending node of Mars's equator on the ICRF equator (the IAU prime-meridian reference).
 * Body-fixed coordinates are MEI turned by the rotation angle W.
 * Self-contained on purpose: no imports, so the maths can be checked outside the app.
 */

type Vec3 = [number, number, number]

const RAD = Math.PI / 180
const MS_PER_DAY = 86_400_000
const J2000_JD = 2451545.0

/** IAU (2009) Mars rotation rate, degrees per day. */
const MARS_ROTATION_DEG_PER_DAY = 350.89198226
/** One Mars solar day, in seconds. */
export const SOL_S = 88775.244

/** Days since J2000.0 in Terrestrial Time (close enough to TDB here). */
function daysSinceJ2000(ms: number) {
  return ms / MS_PER_DAY + 2440587.5 + 69.184 / 86400 - J2000_JD
}

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

/** Mars pole (IAU 2009 report). */
function marsPole(d: number) {
  const T = d / 36525
  return { ra: 317.68143 - 0.1061 * T, dec: 52.8865 - 0.0609 * T }
}

/** Rotation angle W of Mars's prime meridian, degrees, 0..360. */
function marsRotationDeg(d: number) {
  return (((176.63 + MARS_ROTATION_DEG_PER_DAY * d) % 360) + 360) % 360
}

/** ICRF into Mars's equatorial frame: pole at (ra, dec), x along its ascending node. */
function icrfToMei(v: Vec3, d: number) {
  const p = marsPole(d)
  return rotX(rotZ(v, 90 + p.ra), 90 - p.dec)
}

const meiToBodyFixed = (v: Vec3, d: number) => rotZ(v, marsRotationDeg(d))

function toLatLon(v: Vec3) {
  const n = norm(v)
  return { lat: Math.asin(n[2]) / RAD, lon: Math.atan2(n[1], n[0]) / RAD }
}

function solveKepler(M: number, e: number) {
  let E = M + e * Math.sin(M)
  for (let i = 0; i < 6; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E))
  return E
}

/** Position in a plane frame from classical elements (angles in degrees). */
function orbitPosition(a: number, e: number, i: number, node: number, peri: number, M: number): Vec3 {
  const E = solveKepler(M * RAD, e)
  const x = a * (Math.cos(E) - e)
  const y = a * Math.sqrt(1 - e * e) * Math.sin(E)
  return rotZ(rotX(rotZ([x, y, 0], -peri), -i), -node)
}

/**
 * Mars's approximate orbital elements (Standish, JPL, table 1, valid 1800–2050): value at J2000 and
 * change per Julian century, for a (AU), e, I, L, long. perihelion, long. ascending node.
 */
const MARS = [1.52371034, 0.00001847, 0.0933941, 0.00007882, 1.84969142, -0.00813131, -4.55343205, 19140.30268499, -23.94362959, 0.44441088, 49.55953891, -0.29257343]
const OBLIQUITY = 23.43928

/** Heliocentric position of Mars, AU, ICRF. */
function marsHeliocentric(d: number): Vec3 {
  const T = d / 36525
  const [a, e, I, L, peri, node] = [0, 2, 4, 6, 8, 10].map((k) => MARS[k] + MARS[k + 1] * T)
  return rotX(orbitPosition(a, e, I, node, peri - node, L - peri), -OBLIQUITY)
}

/** The point on Mars where the Sun is directly overhead at this moment. */
export function subsolarPoint(ms: number) {
  const d = daysSinceJ2000(ms)
  const sunDir = norm(icrfToMei(scale(marsHeliocentric(d), -1), d))
  return toLatLon(meiToBodyFixed(sunDir, d))
}
