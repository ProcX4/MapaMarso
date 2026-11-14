import type { Category } from '../../state/types'
import { ESRI_LAYERS, TREK_LAYERS, type EsriLayerId, type TrekLayerId } from '../../config/trekLayers'
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
    producer?: string // who made the product, and who hosts the tiles
    dates?: string // when the images were taken / the product made
    credit?: string // attribution the producer asks for; also the map's attribution
    licence?: string
    url?: string // upstream service
  }
  defaultVisible: boolean
  defaultOpacity: number
  minZoom?: number // e.g. HiRISE only when zoomed in (exclusive: shows from minZoom + 1)
  maxZoom?: number // deepest zoom the source has tiles for; deeper is upscaled
  /** A layer that covers only part of Mars: the panel says where, and the map asks for no tiles outside bbox */
  coverage?: { note: string; bbox?: [west: number, south: number, east: number, north: number] }
  /** Walking-scale imagery: drawn above the other imagery, which it only replaces once zoomed in past minZoom */
  walkScale?: boolean
  legend?: { label: string; color: string }[]
  /** A continuous colour scale: a bar from `low` to `high` through `stops`, with a plain-words label at each end (no invented numbers) */
  ramp?: { stops: string[]; low: string; high: string }
  /** Set while the layer's data is a stand-in; shown as a PLACEHOLDER tag. See placeholders.md. */
  placeholder?: string
}

export const GROUPS: { id: LayerDef['group']; label: string; note: string }[] = [
  { id: 'topographic', label: 'Topographic', note: 'Height and shape of the ground, and the A* safe path round steep and deep terrain' },
  { id: 'optical', label: 'Optical', note: 'The surface in visible light' },
  { id: 'spectral', label: 'Spectral', note: 'Infrared, mineral, dust and albedo maps' },
]

/** The colour scale Trek paints its TES maps with, sampled from the tiles (violet = lowest, red = highest) */
const RAINBOW = ['#560ad9', '#154ce7', '#1acadb', '#1fd01b', '#e1e200', '#f96d07', '#ff0d0d']
const GREYS = ['#000000', '#ffffff']

const trek = (id: TrekLayerId) => ({ kind: 'xyz' as const, source: id, maxZoom: TREK_LAYERS[id].maxZoom })
const esri = (id: EsriLayerId) => ({ kind: 'xyz' as const, source: id, maxZoom: ESRI_LAYERS[id].maxZoom })

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
  // Walking scale: on by default, but each only appears once zoomed in past where the colour mosaics blur
  {
    id: 'ctx',
    name: 'MRO CTX mosaic (~5 m/px)',
    group: 'optical',
    ...esri('OnMars_CTX'),
    category: 'observed',
    provenance: {
      instrument: 'Context Camera (CTX)',
      mission: 'Mars Reconnaissance Orbiter',
      product: 'CTX global mosaic beta01, uncontrolled (Mars Trek: CTX_beta01_uncontrolled_5m_Caltech)',
      resolution: '5 m/px',
      producer: 'The Murray Lab, Caltech; tiles hosted by Esri (Astro OnMars/CTX)',
      dates: 'CTX images from 2006 on; beta01 mosaic 2020',
      credit: 'NASA/JPL/MSSS/The Caltech Murray Lab/Esri',
      licence: 'Free use for all purposes, with credit (The Murray Lab)',
      url: 'https://astro.arcgis.com/arcgis/rest/services/OnMars/CTX/MapServer',
    },
    defaultVisible: true,
    defaultOpacity: 1,
    // Shows from zoom 10 (~40 m/px), where the 232 m/px Viking mosaic is already blurred
    minZoom: 9,
    coverage: { note: 'Whole planet bar the poles; uncontrolled, so it can sit a little off the other layers. Shows from zoom 10.' },
    walkScale: true,
  },
  {
    id: 'hirise',
    name: 'MRO HiRISE (25 cm/px, Jezero only)',
    group: 'optical',
    ...trek('JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd'),
    category: 'observed',
    provenance: {
      instrument: 'HiRISE',
      mission: 'Mars Reconnaissance Orbiter',
      product: 'JEZ_hirise_soc_006_orthoMosaic_25cm (Mars Trek: MRO HiRISE, Jezero Mosaic, Controlled)',
      resolution: '25 cm/px',
      producer: 'USGS Astrogeology, for Mars 2020 Terrain-Relative Navigation; tiles by NASA Mars Trek',
      dates: 'HiRISE images up to 2020; mosaic 2020',
      credit: 'NASA/JPL/University of Arizona/USGS',
      licence: 'Public domain (NASA / USGS), credit requested',
      url: 'https://trek.nasa.gov/tiles/Mars/EQ/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/1.0.0/WMTSCapabilities.xml',
    },
    defaultVisible: true,
    defaultOpacity: 1,
    // Shows from zoom 12 (~10 m/px), above CTX
    minZoom: 11,
    coverage: {
      note: 'Jezero landing area only (77.22–77.58°E, 18.31–18.67°N); elsewhere CTX shows. Shows from zoom 12.',
      bbox: [77.2229331, 18.3067994, 77.583964, 18.669315],
    },
    walkScale: true,
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
  tes('tes-thermal-inertia', 'Thermal inertia (TES)', 'TES_Thermal_Inertia', RAINBOW, 'Low: dust and fine sand', 'High: rock and bedrock'),
  tes('tes-pyroxene', 'High-calcium pyroxene (TES)', 'TES_Clinopyroxene', RAINBOW, 'Little or none', 'Most: Syrtis Major'),
  tes('tes-plagioclase', 'Plagioclase (TES)', 'TES_Plagioclase', RAINBOW, 'Little or none', 'Most: Syrtis Major region'),
  tes('tes-sheet-silicates', 'Sheet silicates and glass (TES)', 'TES_Glass_Clay', RAINBOW, 'Little or none', 'Most'),
  tes('tes-dust', 'Dust cover index (TES)', 'TES_Dust', RAINBOW, 'Less dust', 'More dust', '3.5 km/px'),
  tes('tes-dust-relief', 'Dust cover index over relief (TES)', 'tes_ruffdust', RAINBOW, 'Less dust', 'More dust', '3.5 km/px'),
  tes('tes-albedo', 'Surface albedo (TES)', 'Mars_MGS_TES_Albedo_mosaic_global_7410m', GREYS, 'Dark', 'Bright', '7.4 km/px'),
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

/** A global TES map: coarse (Trek serves it to zoom 1, or 2 for the dust-over-relief map), so it's laid over the others half see-through */
function tes(id: string, name: string, product: TrekLayerId, stops: string[], low: string, high: string, resolution?: string): LayerDef {
  return {
    id,
    name,
    group: 'spectral',
    ...trek(product),
    category: 'observed',
    provenance: { instrument: 'TES', mission: 'Mars Global Surveyor', product: `${product} (Mars Trek)`, resolution },
    defaultVisible: false,
    defaultOpacity: 0.7,
    ramp: { stops, low, high },
  }
}

/** A data source shown on the provenance page: every layer, plus the sources that aren't map layers */
export type DataSource = Pick<LayerDef, 'id' | 'name' | 'group' | 'category' | 'provenance' | 'placeholder' | 'coverage'>

/** Sources used outside the map layers, in the same provenance format */
export const OTHER_SOURCES: DataSource[] = [
  {
    id: 'rover-photos',
    name: 'Rover photos at waypoints (Perseverance)',
    group: 'optical',
    category: 'observed',
    provenance: {
      instrument: 'Mastcam-Z, Navcam, front Hazcam (left eye, full frames only)',
      mission: 'Mars 2020 Perseverance',
      product: 'Raw images feed (mars.nasa.gov), matched to the rover stop nearest the point (MMGIS M20_waypoints.json)',
      producer: 'NASA/JPL-Caltech; Mastcam-Z by Arizona State University',
      dates: 'Sol 0 (18 Feb 2021) to the latest downlink',
      credit: 'NASA/JPL-Caltech; Mastcam-Z: NASA/JPL-Caltech/ASU',
      licence: 'NASA images: not copyrighted; credit requested',
      url: 'https://mars.nasa.gov/mars2020/multimedia/raw-images/',
    },
    coverage: { note: 'Only near where Perseverance has stopped, within 250 m' },
  },
]

export const layerDef = (id: string) => LAYERS.find((l) => l.id === id)

/** Short provenance line, e.g. "MOLA · Mars Global Surveyor · 463 m/px". */
export function provenanceLine(def: LayerDef) {
  const p = def.provenance
  return [p.instrument, p.mission, p.resolution, p.derivedFrom].filter(Boolean).join(' · ')
}
