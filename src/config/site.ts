import type { LngLat } from '../state/types'

/*
 * The one demo site MAPA is built for (Gen Spec, "Demo site").
 * PLACEHOLDER: Jezero Crater is used until the team makes the final call between
 * Jezero and Gale. Changing site = edit this file + replace the files in public/data/.
 */
export const SITE = {
  id: 'jezero',
  name: 'Jezero Crater',
  mission: 'Mars 2020 · Perseverance',
  /** Map opens here, [lon °E, lat °N] planetocentric. */
  center: [77.45, 18.44] as LngLat,
  zoom: 9,
  /** PLACEHOLDER habitat location: the first stop of every new route. Pick a real one. */
  base: [77.4508, 18.4447] as LngLat,
  baseName: 'Habitat (placeholder)',
  rawImagesUrl: 'https://mars.nasa.gov/mars2020/multimedia/raw-images/',
}

/**
 * Place names for Search. PLACEHOLDER: a hand-typed subset; replace with the IAU
 * gazetteer (planetarynames.wr.usgs.gov) entries inside the site and verify each one.
 */
export const GAZETTEER: { name: string; at: LngLat; note: string }[] = [
  { name: 'Jezero', at: [77.58, 18.38], note: 'Crater, centre' },
  { name: 'Octavia E. Butler Landing', at: [77.4508, 18.4447], note: 'Perseverance landing site' },
]
