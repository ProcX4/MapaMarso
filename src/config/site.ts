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
 * Place names for Search that are NOT IAU names. The IAU names (public/data/gazetteer.json) come from the USGS
 * gazetteer; NASA's own names for where its missions work, like the landing site, are not in it.
 * The coordinates are Perseverance's first stop (site 3, drive 0) in NASA's Mars 2020 stop list.
 */
export const GAZETTEER: { name: string; at: LngLat; note: string }[] = [
  { name: 'Octavia E. Butler Landing', at: [77.4509, 18.4446], note: 'Perseverance landing site (NASA name)' },
]
