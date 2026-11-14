# MAPA · Placeholders

Everything in the baseline that is a **stand-in** for a real decision, dataset or value.
Each item says where it lives and what "done" looks like. In the app, stand-in layers carry a dashed **PLACEHOLDER** tag.

When you replace one, tick it here **and** add an entry to [changes.md](changes.md).

Last updated: 2026-11-14 (baseline v0.1.0)

---

## 1. Decisions the team still has to make

| # | Placeholder | Current value | Where | Done when |
|---|---|---|---|---|
| D1 | **Demo site** | Jezero Crater (Mars 2020) | `src/config/site.ts` → `SITE` | Team confirms Jezero or Gale. If Gale: update `SITE`, `GAZETTEER`, `SITE_BBOX` in `scripts/prefetch-tiles.mjs`, re-run `npm run prefetch-tiles`, replace `public/data/*` |
| D2 | **Habitat (base) location** | `77.4508°E, 18.4447°N` (Perseverance landing point), named "Habitat (placeholder)" | `src/config/site.ts` → `SITE.base`, `SITE.baseName` | A real, defensible habitat spot is picked (flat, near science) and renamed |
| D3 | **Map rendering library** | OpenLayers (as Frontend Spec §1) | `package.json` | Gen Spec still says "_TBD_"; update Gen Spec tech-stack line to match |
| D4 | **Saved missions / Supabase** | Not wired. `#/plan/:code` shows a "not enabled" notice | `src/features/plan/PlanPanel.tsx`, `.env.example` | Decide in/out of scope. If in: follow Security Spec §4 (RLS, policies, rate-limited join RPC) |
| D5 | **Team names & roles** | "Team: TBD" | About page (`src/features/provenance/AboutPage.tsx`), Gen Spec "Team" table | Filled in |
| D6 | **Code licence** | none | repo root | `LICENSE` file added, Gen Spec "Licence" updated |

## 2. Data

| # | Placeholder | Current state | Where | Done when |
|---|---|---|---|---|
| P1 | **Site elevation model (DTM)** | **File missing.** App shows "No data" for elevation, gain/loss, max slope, difficulty | `public/data/site-dtm.tif`; provenance in `src/map/layers/registry.ts` (`site-dtm`: product/resolution `TBD`) | A HiRISE or CTX DTM for the site is added as a **single-band Cloud-Optimized GeoTIFF, metres, in plain lon/lat degrees** (Mars 2000 geographic, e.g. `gdalwarp -t_srs "+proj=longlat +a=3396190 +b=3376200 +no_defs" -of COG`), cropped to the walking area. Registry `product`/`resolution` filled, `placeholder` removed |
| P2 | **Slope layer** | Code done (Horn method in a Web Worker) but has nothing to compute until P1 lands | `src/data/slope.ts`, `slope.worker.ts` | After P1: spot-check MAPA slope against `gdaldem slope` on the same file, then remove `placeholder` from the `slope` registry entry |
| P3 | **Surface imagery** | THEMIS Day IR 100 m/px global mosaic from Mars Trek (regional, not walking scale) | `src/map/layers/registry.ts` → `themis-day-ir` | A HiRISE or CTX mosaic of the site is added (Trek layer if one exists for the site and is allow-listed in `src/config/trekLayers.ts`, otherwise a local tile set or COG) |
| P4 | **Geologic units** | `public/data/geology.geojson` is an **empty FeatureCollection** | `public/data/geology.geojson`; registry `geology` (`product: TBD`) | Polygons for the site with properties `unit`, `name`, `description` (crop of USGS SIM 3292 or a published local Jezero map) |
| P5 | **Science targets** | `public/data/science-targets.geojson` is an **empty FeatureCollection** | `public/data/science-targets.geojson`; registry `science-targets` | Points with properties `name`, `reason` (e.g. "CRISM hydrated signature"), `source`. Every target needs a real, citable reason |
| P6 | **Place names (gazetteer)** | 2 hand-typed entries: "Jezero" (77.58°E, 18.38°N) and "Octavia E. Butler Landing" | `src/config/site.ts` → `GAZETTEER` | Replaced with verified IAU gazetteer names inside the site |
| P7 | **Thermal (THEMIS) / mineralogy (CRISM) map layers** | Not in the layer registry yet (only CRISM-sourced *targets* are planned) | `src/map/layers/registry.ts` | Added if they help the demo story, with full provenance |
| P8 | **Rover traverse layer** | Not started (stretch goal) | — | Perseverance traverse from PDS added as a `route`-group vector layer |
| P9 | **Data sources record** | Only the three Trek layers are recorded | `docs/data-sources.md` | Every layer in use has product ID, resolution, URL and licence |
| P10 | **Elevation layer styling** | Plain grey ramp (low = dark, high = white) from the in-memory grid | `src/map/MapView.tsx` (site-dtm effect) | Decide on a hillshade or colour ramp once real data is in |

## 3. Assumptions (all ESTIMATED, none validated)

All in `src/config/assumptions.ts` unless noted. Shown in the UI on hover of every ESTIMATED tag and on the About page.

| # | Assumption | Value | Done when |
|---|---|---|---|
| A1 | Walking speed (flat) | 2 km/h | Sourced or agreed by the team |
| A2 | Climb penalty | +1 min per 10 m climbed | Sourced or agreed |
| A3 | Planned EVA length | 6 h | Sourced or agreed |
| A4 | Slope bands | < 10° walkable · 10–15° caution · 15–25° avoid · > 25° impassable | Sourced or agreed |
| A5 | Limits | 25 stops, names 80 chars, notes 500 chars, speed 0.5–5 km/h, EVA 1–8 h | Confirmed |
| A6 | Science opportunity search radius | 1 km from the route | `src/data/route.ts` → `scienceOpportunities(…, withinM = 1000)` |
| A7 | Site-card "nearby targets" radius | 500 m | `src/features/explore/SiteCard.tsx` → `NEARBY_M` |
| A8 | EVA hazard look-ahead | 200 m | `src/features/eva/EvaView.tsx` |
| A9 | EVA low-margin warning | under 30 min spare before turning back | `src/features/eva/HazardAlert.tsx` |
| A10 | Return-to-base estimate | straight line to base, no climb | `src/features/eva/EvaView.tsx` — replace with route-back distance once terrain routing exists |
| A11 | Profile sample step | 10 m (coarsened to keep ≤ 5,000 samples) | `PROFILE_STEP_M` |

## 4. Deployment items not yet verified

| # | Item | Where | Done when |
|---|---|---|---|
| V1 | Vercel routes `/api/tiles/{layer}/{z}/{y}/{x}.{ext}` to `api/tiles.ts` via a rewrite | `vercel.json` | First deploy: request a tile through the deployed URL and get an image |
| ~~V2~~ | ~~`api/tiles.ts` imports `src/config/trekLayers.ts`~~ **Resolved v0.1.2:** the import crashed the function on Vercel; the allow-list now lives in `api/tiles.ts` | `api/tiles.ts` | Done |
| V3 | CSP in `vercel.json` | `vercel.json` | Headers confirmed present on mapamarso.vercel.app (v0.1.2). Still to check in a browser: no "Refused to load" in the console, map renders |
| V4 | Fonts from Google Fonts | `src/styles/tokens.css` | Keep, or self-host and drop the Google entries from the CSP |
| V5 | Repo settings: secret scanning, push protection, Dependabot, branch protection on `main` | GitHub | Pushed to https://github.com/S-Urchin/MapaMarso. Still to do: turn these on in the repo settings (Security Spec §2, §6) |
