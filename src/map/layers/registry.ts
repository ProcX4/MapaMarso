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
  /** What it shows and how to use it, in a sentence or two of plain words (the layer panel's first line) */
  howTo: string
  group: 'topographic' | 'optical' | 'spectral'
  /** A smaller group inside the group, its own button in the layer panel (Spectral's heat, mineral and dust maps) */
  subgroup?: Subgroup
  /** Switched on every time the app opens, whatever it was left at last time */
  onAtStart?: boolean
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
  coverage?: {
    note: string
    bbox?: [west: number, south: number, east: number, north: number]
    /** A button that flies there, for a layer that only covers one place */
    goTo?: { label: string; at: [lon: number, lat: number]; zoom: number }
  }
  /** Walking-scale imagery: drawn above the other imagery, which it only replaces once zoomed in past minZoom */
  walkScale?: boolean
  legend?: { label: string; color: string }[]
  /** A continuous colour scale: a bar from `low` to `high` through `stops`, with a plain-words label at each end (no invented numbers) */
  ramp?: { stops: string[]; low: string; high: string }
  /** Set while the layer's data is a stand-in; shown as a PLACEHOLDER tag. See placeholders.md. */
  placeholder?: string
}

export type Subgroup = 'thermal' | 'minerals' | 'dust'

/** The smaller groups inside Spectral, each a button of its own in the layer panel, in this order */
export const SUBGROUPS: { id: Subgroup; label: string; note: string }[] = [
  { id: 'thermal', label: 'Heat and brightness', note: 'Daytime and night-time infrared, thermal inertia and surface albedo' },
  { id: 'minerals', label: 'Mineral spectroscopy', note: 'Minerals picked out from the infrared light the ground gives off' },
  { id: 'dust', label: 'Dust indexes', note: 'How much dust covers the ground' },
]

export const GROUPS: { id: LayerDef['group']; label: string; note: string }[] = [
  { id: 'topographic', label: 'Topographic', note: 'The shape of the ground: how high, how steep, and the safest way across it' },
  { id: 'optical', label: 'Optical', note: 'Photos of the surface. Zoom in and sharper photos take over by themselves' },
  { id: 'spectral', label: 'Spectral', note: 'What the ground is made of and how warm it is: heat, mineral and dust maps' },
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
    howTo: 'Colours show height: blue is low ground, then green, yellow and red, up to white on the highest. Lower the opacity to see the surface through it.',
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
    howTo: 'Shows where walking gets hard around your route. Yellow and orange are steep, red is too steep to cross, blue is low-lying ground, tan and brown are rocky. Add stops in Plan Marswalk to see it along your walk.',
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
    id: 'route',
    name: 'Safe path (A*)',
    howTo: 'The path MAPA plans between your stops, going round steep, deep and rocky ground. Add stops from the site card (click the map) or in Plan Marswalk, then choose Safest or Most direct there.',
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
    howTo: 'A colour photo of the whole planet. Best when zoomed out; as you zoom in to a site it blurs and the sharper CTX and HiRISE photos take over.',
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
    howTo: 'Another colour photo of the whole planet, from a later orbiter. Best when zoomed out; it blurs as you zoom in.',
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
    howTo: 'Black-and-white photos sharp enough to see small craters, dunes and channels. It appears by itself once you zoom in to about the size of a single crater. A few small patches have no photo yet; the layer underneath shows there.',
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
    howTo: 'The sharpest photos MAPA has: ripples, cracks and boulders a metre across. Only over the Jezero landing area: go there and keep zooming in.',
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
      goTo: { label: 'Go to Jezero', at: [77.4508, 18.4447], zoom: 14 },
    },
    walkScale: true,
  },
  // ---------- Spectral ----------
  {
    id: 'science-targets',
    name: 'Science targets',
    howTo: 'Green dots mark places worth visiting. Click near one to see why it matters and Perseverance’s photos from there. To add one to a route, pick Science stop in the planner and click it.',
    group: 'spectral',
    kind: 'vector',
    source: '/data/science-targets.geojson',
    category: 'observed',
    provenance: {
      instrument: 'Perseverance rock cores',
      mission: 'Mars 2020',
      product: "Sealed sample cores, NASA Mars Rock Samples page; position from NASA's stop list (within about 300 m)",
    },
    defaultVisible: true,
    // The science goal of every walk: always on when the app opens
    onAtStart: true,
    defaultOpacity: 1,
    legend: [{ label: 'Perseverance sample site', color: 'var(--ok)' }],
  },
  {
    id: 'themis-day-ir',
    name: 'Daytime infrared (THEMIS)',
    howTo: 'A daytime heat picture: bright ground is warmer, dark ground cooler, which brings out slopes and textures. Appears once you zoom in a little.',
    group: 'spectral',
    subgroup: 'thermal',
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
    howTo: 'A night-time heat picture: bright ground holds its heat after dark, which usually means rock; dark ground is dust or sand. Appears once you zoom in a little.',
    group: 'spectral',
    subgroup: 'thermal',
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
  { ...tes('tes-thermal-inertia', 'Thermal inertia (TES)', 'TES_Thermal_Inertia', 'How fast the ground heats up and cools down: high means rock and bedrock, low means loose dust.', RAINBOW, 'Low: dust and fine sand', 'High: rock and bedrock'), subgroup: 'thermal' },
  { ...tes('tes-pyroxene', 'High-calcium pyroxene (TES)', 'TES_Clinopyroxene', 'Where pyroxene, a mineral of volcanic rock, is common.', RAINBOW, 'Little or none', 'Most: Syrtis Major'), subgroup: 'minerals' },
  { ...tes('tes-plagioclase', 'Plagioclase (TES)', 'TES_Plagioclase', 'Where plagioclase feldspar, a common mineral in volcanic rock, is common.', RAINBOW, 'Little or none', 'Most: Syrtis Major region'), subgroup: 'minerals' },
  { ...tes('tes-sheet-silicates', 'Sheet silicates and glass (TES)', 'TES_Glass_Clay', 'Where clay-like minerals and volcanic glass show up; clays can point to water in the past.', RAINBOW, 'Little or none', 'Most'), subgroup: 'minerals' },
  { ...tes('tes-dust', 'Dust cover index (TES)', 'TES_Dust', 'Where dust blankets the surface and hides the rock underneath.', RAINBOW, 'Less dust', 'More dust', '3.5 km/px'), subgroup: 'dust' },
  { ...tes('tes-dust-relief', 'Dust cover index over relief (TES)', 'tes_ruffdust', 'The dust map laid over shaded relief, so you can see which landforms are dusty.', RAINBOW, 'Less dust', 'More dust', '3.5 km/px'), subgroup: 'dust' },
  { ...tes('tes-albedo', 'Surface albedo (TES)', 'Mars_MGS_TES_Albedo_mosaic_global_7410m', 'How bright the ground is: bright areas are usually dusty, dark areas sand or bare rock.', GREYS, 'Dark', 'Bright', '7.4 km/px'), subgroup: 'thermal' },
]

/** A global TES map: coarse (Trek serves it to zoom 1, or 2 for the dust-over-relief map), so it's laid over the others half see-through */
function tes(id: string, name: string, product: TrekLayerId, howTo: string, stops: string[], low: string, high: string, resolution?: string): LayerDef {
  return {
    id,
    name,
    howTo: `${howTo} A whole-planet map: zoom out to read it, it is very blurry close up.`,
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
