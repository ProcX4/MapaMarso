import type { Category } from '../../state/types'
import { TREK_LAYERS, type TrekLayerId } from '../../config/trekLayers'
import { SLOPE_BANDS } from '../../config/assumptions'

/** Map colours for deep ground (the slope bands use the caution / hazard / alert tokens) */
export const DEEP_COLOURS = { soft: '#7aa7ff', deep: '#3b5bdb' }
/** Map colours for rocky ground (boulders, blocky outcrop) */
export const ROCK_COLOURS = { soft: '#d9b38c', rocky: '#9c6b3c' }

export type LayerDef = {
  id: string
  name: string // "Slope"
  group: 'topographic' | 'optical' | 'spectral'
  kind: 'wmts' | 'xyz' | 'cog' | 'vector'
  source: string // Trek layer ID, or a path under public/
  category: Category
  provenance: {
    instrument?: string // "MOLA"
    mission?: string // "Mars Global Surveyor"
    product?: string // dataset / product ID
    resolution?: string // "463 m/px"
    derivedFrom?: string // "Calculated from HiRISE DTM"
  }
  defaultVisible: boolean
  defaultOpacity: number
  minZoom?: number // e.g. HiRISE only when zoomed in
  maxZoom?: number // deepest zoom the source has tiles for; deeper is upscaled
  legend?: { label: string; color: string }[]
  /** Set while the layer's data is a stand-in; shown as a PLACEHOLDER tag. See placeholders.md. */
  placeholder?: string
}

export const GROUPS: { id: LayerDef['group']; label: string; note: string }[] = [
  { id: 'topographic', label: 'Topographic', note: 'Height and shape of the ground, and the A* safe path round steep and deep terrain' },
  { id: 'optical', label: 'Optical', note: 'The surface in visible light' },
  { id: 'spectral', label: 'Spectral', note: 'Infrared and mineral maps' },
]

const trek = (id: TrekLayerId) => ({ kind: 'xyz' as const, source: id, maxZoom: TREK_LAYERS[id].maxZoom })

/** Every layer MAPA knows about, all covering the whole planet. The layer panel, provenance page and map all read this list. */
export const LAYERS: LayerDef[] = [
  // ---------- Topographic ----------
  {
    id: 'elevation-color',
    name: 'Elevation (MOLA + HRSC colour hillshade)',
    group: 'topographic',
    ...trek('Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw'),
    category: 'observed',
    provenance: {
      instrument: 'MOLA + HRSC',
      mission: 'Mars Global Surveyor + Mars Express',
      product: 'Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw (Mars Trek)',
      resolution: '200 m/px',
    },
    defaultVisible: false,
    defaultOpacity: 0.7,
  },
  {
    id: 'slope',
    name: 'Steep, deep and rocky ground',
    group: 'topographic',
    kind: 'cog',
    source: 'route',
    category: 'derived',
    provenance: {
      derivedFrom: 'Calculated by MAPA around your route: slope (Horn method), depth below the surrounding ground, and at Jezero rocky ground from the 1 m HiRISE DTMs',
      resolution: '20 m/px on the Jezero CTX DTM, 463 m/px on MOLA elsewhere',
    },
    defaultVisible: true,
    defaultOpacity: 0.8,
    legend: [
      ...SLOPE_BANDS.filter((b) => b.token).map((b) => ({
        label: `${b.min}–${b.max === 90 ? '90' : b.max}° ${b.label}`,
        color: `var(--${b.token})`,
      })),
      { label: 'Deep: steered round', color: DEEP_COLOURS.soft },
      { label: 'Deep: never entered', color: DEEP_COLOURS.deep },
      { label: 'Rocky: steered round', color: ROCK_COLOURS.soft },
      { label: 'Rocky: never entered', color: ROCK_COLOURS.rocky },
    ],
  },
  {
    id: 'reach',
    name: 'Safety envelope',
    group: 'topographic',
    kind: 'cog',
    source: 'route',
    category: 'estimated',
    provenance: {
      derivedFrom: 'Ground the habitat can be walked to and back from within the EVA, at the assumed walking speed, round steep and deep ground (A* costs)',
      resolution: 'Same as the elevation used',
    },
    defaultVisible: false,
    defaultOpacity: 0.6,
    legend: [{ label: 'There and back within the EVA', color: 'var(--ok)' }],
  },
  {
    id: 'mola-roughness',
    name: 'Surface roughness (MOLA)',
    group: 'topographic',
    ...trek('mola_roughness'),
    category: 'observed',
    provenance: {
      instrument: 'MOLA',
      mission: 'Mars Global Surveyor',
      product: 'mola_roughness (Mars Trek)',
    },
    defaultVisible: false,
    defaultOpacity: 0.7,
  },
  {
    id: 'route',
    name: 'Safe path (A*)',
    group: 'topographic',
    kind: 'vector',
    source: 'state',
    category: 'derived',
    provenance: {
      derivedFrom: 'A* between your stops, round steep and deep ground; distances on a 3,389.5 km Mars sphere',
    },
    defaultVisible: true,
    defaultOpacity: 1,
  },
  // ---------- Optical ----------
  {
    id: 'viking-color',
    name: 'Colour mosaic (Viking MDIM 2.1)',
    group: 'optical',
    ...trek('Mars_Viking_MDIM21_ClrMosaic_global_232m'),
    category: 'observed',
    provenance: {
      instrument: 'Viking Orbiter cameras',
      mission: 'Viking 1 & 2',
      product: 'Mars_Viking_MDIM21_ClrMosaic_global_232m (Mars Trek)',
      resolution: '232 m/px',
    },
    defaultVisible: false,
    defaultOpacity: 1,
  },
  {
    id: 'moc-color',
    name: 'Colour atlas (MGS MOC)',
    group: 'optical',
    ...trek('msss_atlas_simp_clon'),
    category: 'observed',
    provenance: {
      instrument: 'MOC wide angle',
      mission: 'Mars Global Surveyor',
      product: 'msss_atlas_simp_clon (Mars Trek)',
    },
    defaultVisible: false,
    defaultOpacity: 1,
  },
  // ---------- Spectral ----------
  {
    id: 'themis-day-ir',
    name: 'Daytime infrared (THEMIS)',
    group: 'spectral',
    ...trek('THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018'),
    category: 'observed',
    provenance: {
      instrument: 'THEMIS',
      mission: 'Mars Odyssey',
      product: 'THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018 (Mars Trek)',
      resolution: '100 m/px',
    },
    defaultVisible: true,
    defaultOpacity: 1,
    // Site-scale imagery: zoomed out to the whole planet, the colour backdrop shows instead
    minZoom: 5,
  },
  {
    id: 'themis-night-ir',
    name: 'Night-time infrared (THEMIS)',
    group: 'spectral',
    ...trek('THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018'),
    category: 'observed',
    provenance: {
      instrument: 'THEMIS',
      mission: 'Mars Odyssey',
      product: 'THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018 (Mars Trek)',
      resolution: '100 m/px',
    },
    defaultVisible: false,
    defaultOpacity: 1,
    minZoom: 5,
  },
  tes('tes-thermal-inertia', 'Thermal inertia (TES)', 'TES_Thermal_Inertia'),
  tes('tes-pyroxene', 'High-calcium pyroxene (TES)', 'TES_Clinopyroxene'),
  tes('tes-plagioclase', 'Plagioclase (TES)', 'TES_Plagioclase'),
  tes('tes-sheet-silicates', 'Sheet silicates and glass (TES)', 'TES_Glass_Clay'),
  {
    id: 'science-targets',
    name: 'Science targets',
    group: 'spectral',
    kind: 'vector',
    source: '/data/science-targets.geojson',
    category: 'observed',
    provenance: {
      instrument: 'CRISM',
      mission: 'Mars Reconnaissance Orbiter',
      product: 'TBD: CRISM mineral detections for the site',
    },
    defaultVisible: true,
    defaultOpacity: 1,
    legend: [{ label: 'Science target', color: 'var(--ok)' }],
    placeholder: 'Empty file: add targets with a reason each',
  },
]

/** A global TES map: coarse (Trek serves it to zoom 1 only), so it's laid over the others half see-through */
function tes(id: string, name: string, product: TrekLayerId): LayerDef {
  return {
    id,
    name,
    group: 'spectral',
    ...trek(product),
    category: 'observed',
    provenance: { instrument: 'TES', mission: 'Mars Global Surveyor', product: `${product} (Mars Trek)` },
    defaultVisible: false,
    defaultOpacity: 0.7,
  }
}

export const layerDef = (id: string) => LAYERS.find((l) => l.id === id)

/** Short provenance line, e.g. "MOLA · Mars Global Surveyor · 463 m/px". */
export function provenanceLine(def: LayerDef) {
  const p = def.provenance
  return [p.instrument, p.mission, p.resolution, p.derivedFrom].filter(Boolean).join(' · ')
}
