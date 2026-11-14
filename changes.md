# MAPA · Changes

History of changes to the MAPA build, newest first.
Add an entry for every change worth knowing about: what changed, why, and anything that deviates from the specs.
Placeholders being replaced should also be ticked off in [placeholders.md](placeholders.md).

Entry template:

```md
## YYYY-MM-DD · vX.Y.Z · short title

**Added** / **Changed** / **Fixed** / **Removed**
- …

**Spec deviations**
- …

**Verified**
- …
```

---

## 2026-11-14 · v0.1.2 · Fix tile proxy crash on Vercel

**Fixed**
- Deployed tile proxy (`https://mapamarso.vercel.app/api/tiles/…`) returned `500 FUNCTION_INVOCATION_FAILED` for every request. Cause: `api/tiles.ts` imported `../src/config/trekLayers.ts`; Vercel compiles each function file on its own and does not rewrite import paths, so the import failed when the function loaded.
- The Trek allow-list now lives in `api/tiles.ts` (no local imports), and `src/config/trekLayers.ts` re-exports it for the app. Still one copy of the list. `tsconfig.node.json` no longer includes `src/config/trekLayers.ts`.

**Verified**
- Lint and build pass; the proxy's handler code is not in the browser bundle (only the layer list is).
- `api/tiles.ts` copied alone into an empty folder and run in Node: unknown layer → 400, `../../etc` → 400, valid THEMIS tile → 200 `image/png`.
- On the live deployment before this fix: page, security headers (CSP, nosniff, Referrer-Policy, Permissions-Policy) and the `public/tiles/` offline fallback all served correctly, so the map still showed imagery.

**Still to do**
- Redeploy, then re-check the proxy on the live URL (placeholders.md V1).

## 2026-11-14 · v0.1.1 · Git repository

**Added**
- Git repository on branch `main`; baseline committed as the first commit.
- `.gitattributes`: LF line endings for every text file, images and TIFFs marked binary.

**Verified**
- `node_modules/`, `dist/` and `.env*` (except `.env.example`) are ignored.
- Secret scan of the committed files found nothing (the only match is the checklist text in `Security Spec.md`).

- Pushed to GitHub: https://github.com/S-Urchin/MapaMarso (`origin`, `main` tracks `origin/main`).

**Still to do**
- Turn on secret scanning, push protection, Dependabot and branch protection on `main` (placeholders.md V5).

## 2026-11-14 · v0.1.0 · Baseline from the three specs

First working build of MAPA, scaffolded from `Gen Spec.md`, `Frontend Spec.md` and `Security Spec.md`. Covers Frontend Spec build-order steps 1–9 in baseline form, running on real NASA Mars Trek imagery; site-specific data is still placeholder (see `placeholders.md`).

**Added: project setup**
- React 19 + TypeScript + Vite 8, OpenLayers 10, geotiff.js, Oxlint (MapaMars `.oxlintrc.json`), strict TS.
- `.gitignore`, `.env.example` (blank values only), `vercel.json` with the Security Spec headers/CSP and a rewrite for the tile proxy.
- `README.md`, `docs/data-sources.md`, `placeholders.md`, this file.

**Added: tile proxy (`api/tiles.ts`, Security Spec §3)**
- Fixed upstream host; layer allow-list shared with the layer registry (`src/config/trekLayers.ts`); integer `z/row/col` range checks; `jpg|png` only and must match the layer's format; GET only (405 otherwise); 10 s timeout, one retry; `image/*` and 2 MB size checks; nothing from the caller forwarded upstream; `cache-control: public, max-age=604800, immutable`.
- Served in `npm run dev`/`preview` by a Vite middleware (same pattern as MapaMars `horizons`).

**Added: map**
- Single OpenLayers map owned outside React; custom Mars equirectangular projection and tile grid (verified against Trek `WMTSCapabilities.xml`); distances on a 3,389.5 km sphere.
- Layer registry with full provenance: THEMIS Day IR (base), Viking MDIM 2.1 colour, MOLA colour shade, site DTM, slope, geology, science targets, planned route.
- Tiles load through the proxy and fall back to `public/tiles/`. `scripts/prefetch-tiles.mjs` downloaded 131 demo-site tiles (6.9 MB).
- Keyboard pan/zoom on the focused map; stops draggable in Plan mode.

**Added: data**
- `data/elevation.ts`: exact pixel reads from the site COG, plus an in-memory downsampled grid (≤ 2048 px) for profile/slope.
- `data/slope.worker.ts`: Horn-method slope in a Web Worker; edges and no-data come out as "No data", never 0.
- `data/route.ts`: walking order (round trip), legs, 10 m profile sampling, gain/loss, max slope, hazard sections, ESTIMATED duration, science opportunities with detour time.
- `lib/format.ts` with the exact formats from Frontend Spec §8; `lib/validate.ts` (coordinate checks, text length caps, https-only links); `lib/storage.ts` (guarded localStorage for layer prefs only).

**Added: screens**
- Explore (`#/`): layer panel (switch, opacity, category tag, legend, provenance line, PLACEHOLDER tag, "No data loaded" status), site card (terrain/science/hazards, Add waypoint / Add science stop / Route here), place search.
- Plan (`#/plan`, `#/plan/:code`): stop list (reorder, remove, round trip), route stats, EVA-limit margin, science opportunities, SVG elevation profile with two-way hover link to the map and keyboard stepping.
- EVA (`#/eva`, lazy-loaded): simulated position slider + arrow keys, next waypoint with bearing arrow, time/distance to base, EVA time left, one prioritised alert, NEXT / SCIENCE / ROUTE / RETURN TO BASE.
- About (`#/about`, lazy-loaded): category legend, assumptions, data sources from the registry, privacy note, credits.
- Design tokens and component styles taken from MapaMars; panels collapse below 720 px; `prefers-reduced-motion` respected.

**Spec deviations (deliberate)**
- `ProvenanceTag` lives in `src/components/`, not `features/provenance/`: every feature uses it, and features may not import each other (Frontend Spec §3).
- Elevation and slope layers are painted from the in-memory grid into an `ImageStatic` canvas rather than `ol/source/GeoTIFF` + `WebGLTileLayer`: one read path for display and queries, no WebGL dependency.
- `LayerDef` gained two optional fields: `maxZoom` (deepest zoom a tile source has) and `placeholder` (drives the PLACEHOLDER tag).
- Route analysis, loaded datasets and the profile↔map hover live in separate React contexts (`state/derivedContexts.ts`), not the reducer. The reducer's action list is exactly the spec's.
- Added `map/mapControl.ts` (fly-to / centre without putting the view in React state) and `map/styles.ts`.
- Proxy passes Trek's 404 through as 404 (not 502) so the map can fall back cleanly past a layer's deepest zoom; upstream timeout returns 504.
- Stops are reordered with ↑/↓ buttons (keyboard-accessible) rather than drag-and-drop in the list; dragging stops on the map works.
- In EVA mode the map stays mounted underneath the EVA view; only the GIS controls are hidden.
- Mission codes / Supabase are out of the baseline (optional in the specs).

**Verified**
- `npm run lint`: 0 warnings, 0 errors. `npm run build`: passes. `npm audit`: 0 vulnerabilities.
- Security Spec §9 proxy checks on `npm run preview`: `/api/tiles/../../etc` → 400, `/api/tiles/UnknownLayer/0/0/0.jpg` → 400, out-of-range tile → 400, wrong extension → 400, POST → 405, valid tile → 200 `image/*` with immutable cache header and no `set-cookie`.
- Headless Chrome screenshots of Explore, Plan, EVA and About render with live THEMIS imagery of Jezero.
- Scripted checks: `format.ts` matches every example in Frontend Spec §8; Horn slope returns 20.00° on a 20° plane; route distance, gain/loss (±2 %), duration and hazard detection correct on a synthetic DTM; no DTM gives `null` ("No data") rather than 0; GeoTIFF reader returns exact pixel values, `null` outside the raster and on no-data pixels.

**Known gaps (next steps)**
- Real site data: DTM, site imagery, geology, science targets (`placeholders.md` §2).
- Not yet clicked through by hand in a real browser (route editing, drag, EVA flow); covered only by the scripted checks and screenshots above.
- Stop names can't be edited yet (default "Waypoint" / "Science stop" / "Destination").
- No terrain-aware routing, traverse safety envelope, rover traverse, rover POV photos or space-weather panel (Gen Spec "If time allows").
- Main JS chunk is ~650 kB (OpenLayers); acceptable for the demo, could be split later.
