# MAPA Frontend Guide

How the MAPA web app is put together: structure, state, the tiled map, and the rules every screen follows.
Read the main [README](../README.md) first for scope, data sources and design tokens.

---

## 1. Stack

| Part | Choice | Notes |
|---|---|---|
| Framework | **React 19 + TypeScript** | Same as MapaMars |
| Build | **Vite** | `npm run dev` / `build` / `preview` |
| Map | **OpenLayers** (`ol`) | Tiled WMTS/XYZ, custom Mars projection, COG elevation |
| Elevation reading | **geotiff.js** | Reads elevation *values* from the COG for the profile and site card |
| Styling | **Plain CSS + CSS variables** | Tokens from the README; one CSS file per feature folder |
| Routing | **Hash routing** (`useHash`, from MapaMars) | Works on any static host, no server config |
| State | **React context + `useReducer`** | No Redux/Zustand: the app has one main piece of shared state |
| Lint | **Oxlint** | Keep MapaMars's `.oxlintrc.json` |
| Backend (optional) | Supabase | Only if saved / shared missions make it into scope |

Rule of thumb: **don't add a dependency for something one file can do.** Every package is something the whole team must learn during a hackathon.

```bash
npm install ol geotiff
```

---

## 2. Screens and routes

MAPA has three modes, and each one is a route.

| Route | Mode | What's on screen |
|---|---|---|
| `#/` | **Explore** | Full-screen map, layer panel (left), site card on click (right), search |
| `#/plan` | **Plan Marswalk** | Map + route editor (stops list), route stats, elevation profile (bottom) |
| `#/plan/:code` | Plan (saved) | Same, loaded from a mission code |
| `#/eva` | **EVA** | Simplified high-contrast navigation view; no GIS controls |
| `#/about` | About / data | Data provenance for every layer, team credits |

The **map stays mounted** across Explore and Plan. Switching modes changes the panels around it, not the map itself, so the view doesn't reset and tiles aren't loaded again.

```
┌────────────────────────────────────────────────────────────┐
│ MAPA        [EXPLORE] [PLAN MARSWALK] [EVA]          ☰     │  ← top nav
├──────────┬──────────────────────────────────┬──────────────┤
│ LAYERS   │                                  │ SITE CARD    │
│ ☑ Imagery│                                  │ 18.44°N ...  │
│ ☑ Slope  │             MAP                  │ Elev -2418 m │
│ ☐ Geology│                                  │ Slope 7.4°   │
│  ...     │                                  │ [Route here] │
├──────────┴──────────────────────────────────┴──────────────┤
│ ELEVATION PROFILE  (Plan mode only)                        │
└────────────────────────────────────────────────────────────┘
```

---

## 3. Folder structure

```text
src/
  main.tsx
  App.tsx                  Routes, top nav, mode switch
  styles/
    tokens.css             Design tokens (copied from README / MapaMars index.css)
    base.css               Reset, scrollbars, typography
  state/
    MarswalkContext.tsx    Shared state provider
    reducer.ts             All state changes in one place
    types.ts               Stop, Route, LayerState, SelectedPoint …
  map/
    MapView.tsx            Creates the single OpenLayers map
    projection.ts          Mars projection + tile grid
    layers/
      registry.ts          Every layer MAPA knows about (one list)
      createLayer.ts       Turns a registry entry into an OpenLayers layer
    interactions.ts        Click → site card, draw route, drag stops
  data/
    elevation.ts           Read elevation values from the COG
    slope.ts               Slope from elevation (runs in a Web Worker)
    slope.worker.ts
    route.ts               Distance, legs, gain/loss (from MapaMars route.ts)
    mars.ts                Mars radius, time helpers (from MapaMars)
  features/
    explore/               LayerPanel, SiteCard, Search
    plan/                  StopList, RouteStats, ElevationProfile, ScienceOpportunity
    eva/                   EvaView, NextWaypoint, ReturnEstimate, HazardAlert
    provenance/            ProvenanceTag, DataSourceList
  components/              Shared UI: Button, Toggle, Switch, Panel, Card, Stat, Slider
  hooks/                   useHash, useMarswalk, useElevationAt …
  lib/
    format.ts              km, m, °, durations, coordinates (every number goes through here)
api/
  tiles.ts                 Tile proxy (CORS + cache), same pattern as MapaMars api/horizons.ts
public/
  tiles/                   Pre-fetched demo-site tiles (offline fallback)
  data/                    Site COG, geology GeoJSON
```

**Rule:** `features/` may import from `components/`, `state/`, `data/`, `lib/`. Features never import from each other. If two features need the same thing, move it to `components/` or `data/`.

---

## 4. State

All shared state lives in one context. Think of it as the **mission whiteboard in the habitat**: every panel reads from it, and every change is written on it through one person (the reducer), so nothing gets out of sync.

```ts
// state/types.ts
export type LngLat = [lon: number, lat: number]

export type StopKind = 'base' | 'waypoint' | 'science' | 'destination'
export type Stop = { id: string; kind: StopKind; name: string; at: LngLat; note?: string }

export type LayerState = { id: string; visible: boolean; opacity: number }

export type Mode = 'explore' | 'plan' | 'eva'

export type MarswalkState = {
  mode: Mode
  layers: LayerState[]
  selected: LngLat | null      // last clicked point → site card
  stops: Stop[]                // walking order; base first
  roundTrip: boolean           // finish back at base
  walkingSpeedKmh: number      // assumption, shown as ESTIMATED
  maxEvaHours: number          // assumption for the return threshold
  evaPosition: LngLat | null   // simulated position in EVA mode
}
```

```ts
// state/reducer.ts
export type Action =
  | { type: 'setMode'; mode: Mode }
  | { type: 'toggleLayer'; id: string }
  | { type: 'setOpacity'; id: string; opacity: number }
  | { type: 'select'; at: LngLat | null }
  | { type: 'addStop'; stop: Stop; index?: number }
  | { type: 'moveStop'; id: string; at: LngLat }
  | { type: 'removeStop'; id: string }
  | { type: 'reorderStops'; from: number; to: number }
  | { type: 'setRoundTrip'; value: boolean }
  | { type: 'setEvaPosition'; at: LngLat }
```

**Derived values are never stored.** Distance, gain/loss, max slope and duration are calculated from `stops` + elevation whenever `stops` changes (`useMemo` or a hook). If you store them, they *will* drift out of date.

---

## 5. The map

### 5.1 One map, owned outside React

OpenLayers manages its own canvas. React should **create the map once and talk to it**, not re-render it.

Analogy: the map is a TV, and React is the remote control. You don't rebuild the TV to change the channel; you press a button.

```tsx
// map/MapView.tsx (shape, not final code)
export function MapView() {
  const el = useRef<HTMLDivElement>(null)
  const map = useRef<Map | null>(null)
  const { state, dispatch } = useMarswalk()

  // Create once
  useEffect(() => {
    map.current = new Map({ target: el.current!, view: marsView(), layers: buildLayers() })
    map.current.on('singleclick', (e) => dispatch({ type: 'select', at: toLonLat(e.coordinate) }))
    return () => map.current?.setTarget(undefined)
  }, [])

  // Sync layer visibility / opacity when state changes
  useEffect(() => { syncLayers(map.current!, state.layers) }, [state.layers])

  // Redraw the route when stops change
  useEffect(() => { drawRoute(map.current!, state.stops, state.roundTrip) }, [state.stops, state.roundTrip])

  return <div ref={el} className="map" />
}
```

### 5.2 Mars projection and tile grid

Mars Trek `EQ` layers are **equirectangular**: plain longitude/latitude, with zoom 0 = **2 columns × 1 row** of 256 px tiles. That isn't Web Mercator, so the map needs a custom projection and tile grid.

```ts
// map/projection.ts
import Projection from 'ol/proj/Projection'
import TileGrid from 'ol/tilegrid/TileGrid'

export const MARS_EXTENT = [-180, -90, 180, 90]

export const marsProjection = new Projection({
  code: 'IAU2000:49900',        // Mars 2000 geographic
  units: 'degrees',
  extent: MARS_EXTENT,
  global: true,
})

// Zoom 0: 2×1 tiles of 256 px → 180° per tile → 180/256 degrees per pixel
const MAX_ZOOM = 18
export const marsTileGrid = new TileGrid({
  extent: MARS_EXTENT,
  origin: [-180, 90],
  tileSize: 256,
  resolutions: Array.from({ length: MAX_ZOOM + 1 }, (_, z) => 180 / 256 / 2 ** z),
})
```

```ts
// A Trek layer, through our proxy
new TileLayer({
  source: new XYZ({
    projection: marsProjection,
    tileGrid: marsTileGrid,
    url: `/api/tiles/${layerId}/{z}/{y}/{x}.jpg`,   // proxy rebuilds the Trek path (see SECURITY.md §3)
  }),
})
```

> Verify the grid against each layer's `WMTSCapabilities.xml` before relying on it. If a layer uses a different matrix set, build it with `optionsFromCapabilities` from `ol/source/WMTS` instead.

### 5.3 Distances on Mars

Never use Earth's radius by accident. OpenLayers' `getDistance` takes a radius:

```ts
import { getDistance } from 'ol/sphere'
export const MARS_RADIUS_M = 3_389_500
export const distanceM = (a: LngLat, b: LngLat) => getDistance(a, b, MARS_RADIUS_M)
```

### 5.4 Layer registry

Every layer is described once, in `map/layers/registry.ts`. The layer panel, the provenance page and the map all read from this list. Adding a layer means adding one entry here.

```ts
export type LayerDef = {
  id: string
  name: string                                  // "Slope"
  group: 'base' | 'safety' | 'science' | 'route'
  kind: 'wmts' | 'xyz' | 'cog' | 'vector'
  source: string                                // URL or path
  category: 'observed' | 'derived' | 'estimated'
  provenance: {
    instrument?: string                         // "MOLA"
    mission?: string                            // "Mars Global Surveyor"
    product?: string                            // dataset / product ID
    resolution?: string                         // "463 m/px"
    derivedFrom?: string                        // "Calculated from HiRISE DTM"
  }
  defaultVisible: boolean
  defaultOpacity: number
  minZoom?: number                              // e.g. HiRISE only when zoomed in
  legend?: { label: string; color: string }[]
}
```

A layer without `provenance` filled in **does not ship.**

---

## 6. Elevation, slope and the profile

### 6.1 Reading elevation

Picture tiles hold colours. Elevation needs **numbers**, so it comes from a Cloud-Optimized GeoTIFF (COG) of the demo site.

- **Showing** it (hillshade / colour ramp): OpenLayers `ol/source/GeoTIFF` + `WebGLTileLayer`.
- **Querying** it (site card, profile): `geotiff.js` directly, reading only the small window you need.

```ts
// data/elevation.ts (shape)
import { fromUrl } from 'geotiff'

const tiff = fromUrl('/data/site-dtm.tif')       // opens the file; only the header is downloaded

export async function elevationAt(at: LngLat): Promise<number | null> {
  // convert lon/lat → pixel, read a 1×1 window, return metres (or null if no data)
}

export async function elevationAlong(points: LngLat[], stepM = 10): Promise<ProfilePoint[]> {
  // sample every stepM metres along the route; read one window covering the route's bounding box
}
```

### 6.2 Slope

Slope is **derived**: for each pixel, compare its height with its neighbours'. Steep change = steep slope.
Run it in a **Web Worker** so the map doesn't freeze while it computes. Use the Horn method (standard in GIS tools) and test it against slope from QGIS/GDAL on the same file.

Slope colour scale (tokens from the README):

| Slope | Colour | Meaning |
|---|---|---|
| < 10° | transparent | Walkable |
| 10–15° | `--caution` | Slower, take care |
| 15–25° | `--hazard` | Avoid if possible |
| > 25° | `--alert` | Treat as impassable |

> These thresholds are **assumptions** for a suited astronaut. Show them as ESTIMATED and keep them in one config file so the team can tune them.

### 6.3 Elevation profile

- SVG, drawn by hand (no chart library needed): one path, mono axis labels, `--line` gridlines.
- Steep sections stroked in the slope colours; science stops as `--ok` dots; base as `H`.
- **Hover links both ways:** hovering the profile shows a marker on the map, and hovering the route highlights the profile.

---

## 7. Feature components

### Explore
| Component | Responsibility |
|---|---|
| `LayerPanel` | Groups (Base / Safety / Science / Route), switch + opacity slider + category tag per layer, legend when visible |
| `SiteCard` | Opens on map click: coordinates, elevation, slope, geology, minerals, nearby hazards, provenance line; actions *Add waypoint* / *Add science stop* / *Route here* |
| `Search` | Place names (IAU gazetteer subset for the site) → fly to |

### Plan Marswalk
| Component | Responsibility |
|---|---|
| `StopList` | Ordered stops (A, 1…n, B), drag to reorder, round-trip switch |
| `RouteStats` | Distance, duration, gain/loss, max slope, science stops, difficulty; each with a category tag |
| `ElevationProfile` | See 6.3 |
| `ScienceOpportunity` | Targets near the route with distance, detour and a **reason** ("CRISM hydrated signature, 420 m off route") |
| `ReturnEstimate` | Time back to base and the return threshold |

### EVA
| Component | Responsibility |
|---|---|
| `EvaView` | Full-screen, large type, no layer controls |
| `NextWaypoint` | Name, distance, bearing arrow, elevation change |
| `ReturnEstimate` | Distance and time to base vs. EVA time left |
| `HazardAlert` | **One** alert at a time, highest priority first |
| Actions | `NEXT` · `SCIENCE` · `ROUTE` · `RETURN TO BASE` |

EVA position is **simulated** (a slider along the route, or arrow keys) and labelled as a simulation.

---

## 8. Rules every screen follows

### Data honesty
- Every value shows its category: **OBSERVED**, **DERIVED** or **ESTIMATED** (`<ProvenanceTag>`).
- Every estimate states its assumption on hover (e.g. "Walking speed 2 km/h, +1 min per 10 m climb").
- If a dataset has no value at a point, show **"No data"**, never a guess or `0`.

### Numbers
- All numbers go through `lib/format.ts`, rendered in `--mono` with tabular figures.
- Units: km for route distance, m for elevation and short distances, ° for slope, `h min` for duration, `°N/°E` for coordinates (planetocentric, east-positive).

```ts
formatKm(6.4)            // "6.4 km"
formatM(-2418)           // "−2,418 m"
formatSlope(14.73)       // "14.7°"
formatDuration(228)      // "3 h 48 min"
formatLatLon([77.5, 18.44])  // "18.440°N, 77.500°E"
```

### Look
- Tokens and components from the README's **UI & design** section. No new colours without a meaning.
- Panels collapse below **720 px**; EVA mode is designed for a tablet in landscape.
- Respect `prefers-reduced-motion`.

### Accessibility
- Every control is reachable by keyboard; map has `+`/`−` and arrow-key panning.
- Colour is never the only signal: slope bands and alerts also carry a text label.
- Contrast: body text at least `--gray-1` on black.

### Performance
- One map instance; layers toggled, never recreated.
- Heavy maths (slope, route sampling) in a Web Worker.
- Lazy-load EVA mode and the About page (`React.lazy`).
- Pre-fetched demo-site tiles in `public/tiles/` as an offline fallback.

---

## 9. Build order

Each step ends with something you can show.

1. **Shell:** routes, nav, tokens, empty panels.
2. **Tiled map:** Mars projection, one Trek layer through `api/tiles.ts`, zoom to the demo site.
3. **Layer registry + panel:** toggle and opacity for 2–3 layers.
4. **Site card:** click → coordinates + elevation from the COG.
5. **Route:** add/move/remove stops, draw the line, distance.
6. **Profile + stats:** elevation along the route, gain/loss, duration.
7. **Slope:** worker, colour layer, max slope on the route, hazard markers.
8. **Science layer + opportunities.**
9. **EVA mode.**
10. **Polish:** provenance page, demo-path tour, offline tiles.

---

## 10. Conventions

- Components: `PascalCase.tsx`, one component per file, named exports.
- Hooks: `useThing.ts`. Pure helpers: `camelCase.ts`.
- CSS: one file per feature folder, class names prefixed by feature (`.plan-stats`, `.eva-alert`).
- Comments explain **why**, not what.
- `npm run lint` and `npm run build` pass before every push.
- Branch per feature (`feat/site-card`), PR into `main`, one reviewer.

## Definition of done (per feature)

- [ ] Works on the demo site at walking-scale zoom
- [ ] Every displayed value has a category tag and a source
- [ ] Usable by keyboard; readable at 720 px wide
- [ ] Lint and build pass
- [ ] Shown to one teammate who didn't build it
