import type { Category } from '../../state/types'
import { TREK_LAYERS, type TrekLayerId } from '../../config/trekLayers'
import { SLOPE_BANDS } from '../../config/assumptions'

export type LayerDef = {
  id: string
  name: string // "Slope"
  group: 'base' | 'safety' | 'science' | 'route'
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

export const GROUPS: { id: LayerDef['group']; label: string }[] = [
  { id: 'base', label: 'Base' },
  { id: 'safety', label: 'Safety' },
  { id: 'science', label: 'Science' },
  { id: 'route', label: 'Route' },
]

const trek = (id: TrekLayerId) => ({ kind: 'xyz' as const, source: id, maxZoom: TREK_LAYERS[id].maxZoom })

/** Every layer MAPA knows about. The layer panel, provenance page and map all read this list. */
export const LAYERS: LayerDef[] = [
  {
    id: 'themis-day-ir',
    name: 'Surface imagery (THEMIS day IR)',
    group: 'base',
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
    placeholder: 'Regional stand-in until a HiRISE/CTX site mosaic is chosen',
  },
  {
    id: 'viking-color',
    name: 'Colour context (Viking MDIM 2.1)',
    group: 'base',
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
    id: 'mola-shade',
    name: 'Elevation context (MOLA)',
    group: 'base',
    ...trek('Mars_MGS_MOLA_ClrShade_merge_global_463m'),
    category: 'observed',
    provenance: {
      instrument: 'MOLA',
      mission: 'Mars Global Surveyor',
      product: 'Mars_MGS_MOLA_ClrShade_merge_global_463m (Mars Trek)',
      resolution: '463 m/px',
    },
    defaultVisible: false,
    defaultOpacity: 0.6,
  },
  {
    id: 'site-dtm',
    name: 'Elevation (site DTM)',
    group: 'safety',
    kind: 'cog',
    source: '/data/site-dtm.tif',
    category: 'observed',
    provenance: {
      instrument: 'HiRISE or CTX stereo',
      mission: 'Mars Reconnaissance Orbiter',
      product: 'TBD',
      resolution: 'TBD',
    },
    defaultVisible: false,
    defaultOpacity: 0.7,
    legend: [
      { label: 'Low', color: '#1a1a1a' },
      { label: 'High', color: '#ffffff' },
    ],
    placeholder: 'No DTM file yet: add public/data/site-dtm.tif',
  },
  {
    id: 'slope',
    name: 'Slope',
    group: 'safety',
    kind: 'cog',
    source: '/data/site-dtm.tif',
    category: 'derived',
    provenance: {
      derivedFrom: 'Calculated by MAPA from the site DTM (Horn method)',
      resolution: 'Same as site DTM',
    },
    defaultVisible: true,
    defaultOpacity: 0.8,
    legend: SLOPE_BANDS.filter((b) => b.token).map((b) => ({
      label: `${b.min}–${b.max === 90 ? '90' : b.max}° ${b.label}`,
      color: `var(--${b.token})`,
    })),
    placeholder: 'Needs the site DTM',
  },
  {
    id: 'geology',
    name: 'Geologic units',
    group: 'science',
    kind: 'vector',
    source: '/data/geology.geojson',
    category: 'observed',
    provenance: {
      instrument: 'USGS mapping',
      product: 'TBD: SIM 3292 crop or a local Jezero map',
    },
    defaultVisible: false,
    defaultOpacity: 0.5,
    placeholder: 'Empty file: add geologic unit polygons',
  },
  {
    id: 'science-targets',
    name: 'Science targets',
    group: 'science',
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
  {
    id: 'route',
    name: 'Planned route',
    group: 'route',
    kind: 'vector',
    source: 'state',
    category: 'derived',
    provenance: {
      derivedFrom: 'Your stops; great-circle distances on a 3,389.5 km Mars sphere',
    },
    defaultVisible: true,
    defaultOpacity: 1,
  },
]

export const layerDef = (id: string) => LAYERS.find((l) => l.id === id)

/** Short provenance line, e.g. "MOLA · Mars Global Surveyor · 463 m/px". */
export function provenanceLine(def: LayerDef) {
  const p = def.provenance
  return [p.instrument, p.mission, p.resolution, p.derivedFrom].filter(Boolean).join(' · ')
}
