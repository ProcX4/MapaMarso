/*
 * Every ESTIMATED value in MAPA comes from an assumption in this file, so the team can
 * tune them in one place and the UI can always show what an estimate rests on.
 * PLACEHOLDER values: none of these are validated for a suited astronaut.
 */

export const WALKING = {
  /** Flat-ground walking speed. */
  speedKmh: 2,
  /** Extra time per vertical metre climbed: +1 min per 10 m. */
  minPerMetreClimb: 0.1,
}

export const EVA = {
  /** Default planned EVA length. */
  maxHours: 6,
  /** EVA warns that you have left the planned route from this far off it (ESTIMATED: a team choice, not sourced). */
  offRouteWarnM: 30,
}

/**
 * Radiation on the surface, from the one set of measurements made there: the Radiation Assessment Detector (RAD)
 * on Curiosity at Gale crater (Hassler et al., Science 2014). Average galactic cosmic ray dose equivalent
 * 0.67 mSv per day, August 2012 to June 2013 (absorbed dose 0.21 mGy per day). It is a measurement at another
 * place, inside a rover, near solar maximum, so for a suited walk elsewhere it is only an ESTIMATE:
 * - Jezero is about 1.8 km higher than Gale, so slightly less air above it: expect somewhat more.
 * - Suit shielding is different from the rover's. Solar storms are not included.
 */
export const RADIATION = {
  doseEquivMsvPerDay: 0.67,
  source: 'MSL RAD at Gale crater, Hassler et al. 2014 (Science)',
}

/** Slope bands for the slope layer, route hazards and alerts (Frontend Spec §6.2). */
export const SLOPE_BANDS = [
  { min: 0, max: 10, label: 'Walkable', token: null },
  { min: 10, max: 15, label: 'Slower, take care', token: 'caution' },
  { min: 15, max: 25, label: 'Avoid if possible', token: 'hazard' },
  { min: 25, max: 90, label: 'Treat as impassable', token: 'alert' },
] as const

export type SlopeBand = (typeof SLOPE_BANDS)[number]

/**
 * The A* route finder (Topographic layers): how much it dislikes steep and deep ground. A path costs its length
 * in metres, times a penalty on harder ground, plus a cost for every metre climbed.
 */
export const PATHFINDING = {
  /** Ground this steep or steeper is never crossed (the "Treat as impassable" slope band) */
  maxSlopeDeg: 25,
  /** Extra cost per metre walked, on top of 1, in each slope band below the limit */
  slopePenalty: { caution: 1, hazard: 4 },
  /** "Deep" ground sits below the average of the ground around it (pits, channels, small craters), within this radius */
  depthRadiusM: 600,
  /** From this depth the path starts to steer round it... */
  depthSoftM: 15,
  /** ...and from this depth it never goes in */
  depthMaxM: 60,
  /** Extra cost per metre walked at the deepest ground it still enters */
  depthPenalty: 4,
  /** Each metre climbed costs as much as this many metres on the flat (from WALKING: 2 km/h, +1 min per 10 m) */
  climbM: 3.3,
  /**
   * Rocky ground, where the 1 m HiRISE DTMs cover it (public/data/site-obstacles.bin): the share of each 20 m cell
   * that is steeper than 30° at 1 m, i.e. boulders and blocky outcrop. From this share the path steers round it...
   * Set from the map itself (2026-11-15): half of Jezero's covered ground is 0 %, the rockiest 5 % starts at 3 %,
   * the rockiest 1 % at 18 %. So 5 % catches about the rockiest 4 % of ground, 25 % about the rockiest 0.6 %.
   */
  rockSoftPct: 5,
  /** ...and from this share it never goes in */
  rockMaxPct: 25,
  /** Extra cost per metre walked at the rockiest ground it still enters */
  rockPenalty: 4,
  /** Roughness is how much the slope varies within this radius: a steady slope is smooth, a boulder field is rough */
  roughnessRadiusM: 100,
  /** Around each leg, how far beyond the straight line the search may wander, as a share of the leg's length */
  searchMargin: 0.6,
  minSearchMarginM: 1500,
}

/** Sampling step along the route for the elevation profile. */
export const PROFILE_STEP_M = 10

/** Input limits (Security Spec §5). */
export const LIMITS = {
  /** Base + up to 10 stops between + an end: what a saved mission can hold (supabase/schema.sql). */
  maxStops: 12,
  nameLength: 80,
  noteLength: 500,
  speedKmh: [0.5, 5] as const,
  evaHours: [1, 8] as const,
}

export const walkingAssumption = () =>
  `Walking speed ${WALKING.speedKmh} km/h, +1 min per ${Math.round(1 / WALKING.minPerMetreClimb)} m climb`
