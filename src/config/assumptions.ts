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
}

/** Slope bands for the slope layer, route hazards and alerts (Frontend Spec §6.2). */
export const SLOPE_BANDS = [
  { min: 0, max: 10, label: 'Walkable', token: null },
  { min: 10, max: 15, label: 'Slower, take care', token: 'caution' },
  { min: 15, max: 25, label: 'Avoid if possible', token: 'hazard' },
  { min: 25, max: 90, label: 'Treat as impassable', token: 'alert' },
] as const

export type SlopeBand = (typeof SLOPE_BANDS)[number]

/** Sampling step along the route for the elevation profile. */
export const PROFILE_STEP_M = 10

/** Input limits (Security Spec §5). */
export const LIMITS = {
  maxStops: 25,
  nameLength: 80,
  noteLength: 500,
  speedKmh: [0.5, 5] as const,
  evaHours: [1, 8] as const,
}

export const walkingAssumption = () =>
  `Walking speed ${WALKING.speedKmh} km/h, +1 min per ${Math.round(1 / WALKING.minPerMetreClimb)} m climb`
