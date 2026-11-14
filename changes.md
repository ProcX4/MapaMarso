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

## 2026-11-14 · v0.2.1 · Supabase connected on the live site

**Changed**
- Supabase URL and publishable key moved from `.env.example` into `.env.local` (git-ignored); `.env.example` is blank again (Security Spec §2). Same two values added in Vercel → Environment Variables. The key was never committed.

**Verified on mapamarso.vercel.app**
- The deployed bundle includes the Supabase project URL; `#/account` shows the sign-in form.
- `#/plan/ABC-123` answers "No mission has the code ABC-123", so `get_mission_by_code` exists: the schema is installed.
- Tile proxy unchanged: unknown layer → 400, valid THEMIS tile → 200 image/png.

**Not verified**
- Sign-up, email confirmation, saving and reopening a mission (needs a real account). Supabase redirect URLs (placeholders.md D4 step 3) not confirmed.

## 2026-11-14 · v0.2.0 · Idea bank (MapaMars) merged: design, Mars time, accounts and saved missions

Brought the useful parts of the team's idea bank, [S-Urchin/MapaMars](https://github.com/S-Urchin/MapaMars), into MAPA. Code was rewritten into MAPA's own modules and adapted to its structure (not copied in as separate reference files).

**Changed: design (MapaMars look throughout)**
- The map now fills the whole window and the menu bar floats over it (no bar, no blur), as on the MapaMars globe page.
- Mode switch as a segmented pill; ☰ opens the MapaMars slide-in menu with line icons, page hints, the space-sound switch and sign-in.
- Live clock top left: Philippine time, Mars time (MTC), sol, and local time + daylight at the demo site.
- Layers moved into a slide-out panel opened from a **Layers** button next to the ☰; it makes way for the site card in the same corner.
- Site card restyled as the MapaMars info card (kicker, title, facts, round close button, slide-in).
- Plan mode is the MapaMars full-screen planner: panel on the left, stops in walking order joined by a dashed line, names edited in place, move/remove on hover, Round trip / One way segmented control, pinned summary footer. The elevation profile sits along the bottom to its right.
- Tools dock bottom left (Recentre on site, Fit route, New route) with the **guided tour** and **clear view** (H / Esc) buttons above it.
- Guided tour (ring + card, Back / Next / Skip) with steps for Explore, Plan and EVA, following the Gen Spec demo story.
- About page rebuilt in the MapaMars home layout: hero, four numbered features, "Right now at Jezero Crater" stats, then values legend, assumptions, data sources, privacy and credits.
- Form styles from MapaMars: inputs, segmented choices, password show/hide, `_ _ _ - _ _ _` code boxes, outline and link buttons.

**Added: code from the idea bank**
- Mars time (`data/mars.ts`: `marsClock`, local mean solar time, Earth–Mars light time) and PHT/MTC formatting (`lib/format.ts`).
- Sun position (`data/marsSun.ts`, the Sun part of MapaMars `marsSky.ts`) and daylight (`data/daylight.ts`: Sun elevation, day/twilight/night, new `minutesToSunset`).
- EVA uses daylight: the simulated walk starts at the real current time; new alerts for "Sun is down", "Sunset before you can get back" and "under an hour of daylight to spare". Site card shows daylight at the clicked point.
- Ambient space sound (`lib/spaceSound.ts`, generated in the browser, on by default, remembered) and `readFlag`/`writeFlag` (`lib/storage.ts`), `useNow`.
- Accounts (`services/auth.ts`, `state/AuthProvider.tsx`, `features/account/AccountPage.tsx` at `#/account`): sign up with username + strong password, sign in with email or username, sign out, email confirmation.
- Saved missions (`services/missions.ts`, `features/plan/SaveMission.tsx`, `features/plan/useMissionFromCode.ts`): save a route with an `ABC-123` code (suggested or typed), public or code-only, optional EVA date and objective; open any mission at `#/plan/ABC-123`; the author can update or delete it, anyone else saves their own copy. Account page lists your missions and opens one by code.
- `supabase/schema.sql`: the MapaMars schema unchanged table-for-table (so both apps can share one project), with a MAPA header explaining the mapping. RLS on every table.
- `Launch.ps1` (Windows launcher), `docs/MAPA_Marswalk_Product_Specification.md` (the product spec listed in the Gen Spec's reuse table).
- Reducer actions `renameStop`, `loadRoute`, `setMission`, `newRoute`; `mission` in state.

**Spec deviations**
- Stop limit lowered from 25 to **12** (base + 10 between + end): what a saved mission can hold in the shared schema. Still within Security Spec §5 ("e.g. 25").
- Added `src/services/` (Supabase calls) and `src/state/AuthProvider.tsx`, which the Frontend Spec folder list doesn't have; they follow the MapaMars layout.
- Reducer gained four actions beyond the Frontend Spec §4 list (above).
- The map no longer sits under a separate top bar: the bar floats over it (MapaMars design).

**Left in the idea bank (not brought over)**
- 3D globe, orbiters, moons, landing-site 3D scenes, hyperspace transition: out of scope per the Gen Spec.
- MapaMars 2D map (`MarsMap2D.tsx`), `nasaData.ts`, `mapView.ts`: replaced by the OpenLayers map and layer registry.
- Crew joining, mission log entries, browsing public missions, realtime updates: the schema supports them, but MAPA has no UI for them yet.

**Fixed**
- A round trip whose base had no name would have been rejected by the database (end name ≠ start name); the end now always reuses the start's name.

**Verified**
- `npm run lint` clean, `npm run build` passes, `npm audit` 0 vulnerabilities.
- Sun position: subsolar latitude 0.02° at the 2024-11-12 equinox and 25.19° at the 2025-05-29 solstice (expected 0° and 25.2°); peak Sun at Jezero at 12.4 h LMST.
- Mission conversion: a route survives save → load with stop kinds, names and order; round trips store their start as the end; empty stop names get "Stop n"; more than 10 stops between start and end is refused on a round trip.
- Earlier route, slope, format and GeoTIFF checks still pass.
- Headless Chrome screenshots of Explore, Plan, `#/plan/ABC-123`, EVA, About and Account render in the new design.

**Not verified**
- Anything against a live Supabase project (sign-up, save, open by code). The local build has no `.env.local`, so those features show their "not set up" state. See placeholders.md D4 for the setup steps.

## 2026-11-14 · v0.1.2 · Fix tile proxy crash on Vercel

**Fixed**
- Deployed tile proxy (`https://mapamarso.vercel.app/api/tiles/…`) returned `500 FUNCTION_INVOCATION_FAILED` for every request. Cause: `api/tiles.ts` imported `../src/config/trekLayers.ts`; Vercel compiles each function file on its own and does not rewrite import paths, so the import failed when the function loaded.
- The Trek allow-list now lives in `api/tiles.ts` (no local imports), and `src/config/trekLayers.ts` re-exports it for the app. Still one copy of the list. `tsconfig.node.json` no longer includes `src/config/trekLayers.ts`.

**Verified**
- Lint and build pass; the proxy's handler code is not in the browser bundle (only the layer list is).
- `api/tiles.ts` copied alone into an empty folder and run in Node: unknown layer → 400, `../../etc` → 400, valid THEMIS tile → 200 `image/png`.
- On the live deployment before this fix: page, security headers (CSP, nosniff, Referrer-Policy, Permissions-Policy) and the `public/tiles/` offline fallback all served correctly, so the map still showed imagery.

**Verified after redeploy (mapamarso.vercel.app)**
- Proxy: valid MOLA and THEMIS tiles → 200 image; unknown layer, `../../etc`, out-of-range tile, wrong extension → 400; POST → 405; past a layer's deepest zoom → 404; `cache-control: public, max-age=604800, immutable`, served from Vercel's cache, no `set-cookie`.
- Explore screen renders with live THEMIS imagery, fonts and controls under the CSP (headless Chrome). placeholders.md V1 and V3 resolved.

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
