# MAPA · Placeholders

Everything in the baseline that is a **stand-in** for a real decision, dataset or value.
Each item says where it lives and what "done" looks like. In the app, stand-in layers carry a dashed **PLACEHOLDER** tag.

When you replace one, tick it here **and** add an entry to [changes.md](changes.md).

Last updated: 2026-11-14 (v0.3.0, full idea bank merged)

---

## 1. Decisions the team still has to make

| # | Placeholder | Current value | Where | Done when |
|---|---|---|---|---|
| D1 | **Demo site** | Jezero Crater (Mars 2020) | `src/config/site.ts` → `SITE` | Team confirms Jezero or Gale. If Gale: update `SITE`, `GAZETTEER`, `SITE_BBOX` in `scripts/prefetch-tiles.mjs`, re-run `npm run prefetch-tiles`, replace `public/data/*` |
| D2 | ~~**Habitat (base) location**~~ | Resolved 2026-11-15: there is no placeholder habitat any more. Every route starts empty and its planner places the start (step 1, "Click the map to place"). `SITE.base` is kept only as Perseverance's landing point | `src/config/site.ts` → `SITE.base` | — |
| D3 | **Map rendering library** | OpenLayers (as Frontend Spec §1) | `package.json` | Gen Spec still says "_TBD_"; update Gen Spec tech-stack line to match |
| D4 | **Saved missions / Supabase** | **Live (v0.2.1):** env vars set in Vercel, schema present (mission lookup by code answers). Still to check: steps 3–4. Code wired in v0.2.0: accounts, save/open/delete missions by code (`#/globe/2d/plan/ABC-123`; the old `#/plan/ABC-123` still opens). Without keys the app says so and everything else works | `src/services/`, `src/state/AuthProvider.tsx`, `supabase/schema.sql`, `.env.example` | 1) Run `supabase/schema.sql` in the Supabase SQL Editor (skip if this project already runs MapaMars). 2) Put `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` in `.env.local` and in Vercel → Environment Variables. 3) Supabase → Authentication → URL Configuration: add the Vercel domain and `http://localhost:5173/**` (Security Spec §4). 4) Sign up, save a route, reopen it by code |
| D5 | **Team names & roles** | "Team: TBD" | About page (`src/features/provenance/AboutPage.tsx`), Gen Spec "Team" table | Filled in |
| D7 | **Space sound default** | On by default (as in MapaMars), remembered when turned off | `src/lib/spaceSound.ts` → `readFlag(ENABLED_KEY, true)` | Team decides whether judges should hear it without opting in |
| D6 | **Code licence** | none | repo root | `LICENSE` file added, Gen Spec "Licence" updated |

## 2. Data

| # | Placeholder | Current state | Where | Done when |
|---|---|---|---|---|
| P1 | ~~**Site elevation model (DTM)**~~ | **Done 2026-11-15.** USGS Mars 2020 CTX DTM of Jezero, 20 m/px (`JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif`, 1596×1512, equirectangular metres on the Mars sphere, read as degrees by `src/data/elevation.ts`). Outside it, the global MOLA DEM (463 m/px) through `api/elevation.ts` | `public/data/site-dtm.tif`; `src/data/terrain.ts` | — |
| P2 | ~~**Slope and depth**~~ | Done 2026-11-15: worked out by the A* worker (Horn slope, depth below a 600 m box mean). Spot-checked: GDAL's Horn formula re-implemented in NumPy matches MAPA exactly on the Jezero DTM. Plain `gdaldem slope` on that file reads ~0.14° low because it takes the 20 m projected pixels as ground metres (true east–west spacing at 18.4°N is 18.9 m) | `src/data/pathfind.worker.ts` | — |
| P3 | **Surface imagery at walking scale** | Global Trek layers only (THEMIS 100 m/px is the sharpest). The global CTX (Caltech) and HiRISE mosaics are in the Trek catalogue but serve no tiles from the standard EQ tile endpoint | `src/map/layers/registry.ts` | A CTX or HiRISE layer is found that Trek serves as tiles (or a local tile set), allow-listed in `api/tiles.ts` and added under Optical |
| P4 | ~~**Geologic units**~~ | Removed 2026-11-15: the layers are now Topographic, Optical and Spectral only; the empty `geology.geojson` and the site card's Geology row are gone | — | — |
| P12 | **Rocky ground** | Derived from USGS's 1 m HiRISE DTMs: share of each 20 m cell steeper than 30° at 1 m, covering 31.5 % of the site DTM (`scripts/build-obstacles.mjs`). A proxy, not a rock count | `public/data/site-obstacles.bin`; `PATHFINDING.rockSoftPct` / `rockMaxPct` | A published rock-abundance or rock-count map for the site is found and used instead, or the proxy is checked against HiRISE images of a few boulder fields |
| P5 | ~~**Science targets**~~ | Done 2026-11-15: 27 Perseverance sample sites (sealed cores) from NASA's Mars Rock Samples page, placed at the rover's last stop before sealing (within about 300 m). Built by `npm run build-science-targets`. Orbital CRISM detections are still not in the app (see the Spectral to-do) | `public/data/science-targets.geojson`; registry `science-targets` | — |
| P6 | ~~**Place names for Search**~~ | Done 2026-11-15: all 2,055 Mars names adopted by the IAU, from the USGS Gazetteer of Planetary Nomenclature (`npm run build-gazetteer`), plus NASA's own name for the landing site, marked as not IAU. The old hand-typed "Jezero" point was wrong (77.58°E; the IAU centre is 77.687°E, 18.408°N) | `public/data/gazetteer.json`; `src/data/gazetteer.ts`; `src/config/site.ts` | — |
| P7 | ~~**Thermal / mineralogy map layers**~~ | Done 2026-11-15: Spectral group (THEMIS day and night IR, TES thermal inertia, pyroxene, plagioclase, sheet silicates). CRISM/OMEGA hydrous detections are in the Trek catalogue but serve no tiles | `src/map/layers/registry.ts` | — |
| P8 | **Rover traverse layer** | Not started (stretch goal) | — | Perseverance traverse from PDS added as a `route`-group vector layer |
| P9 | **Data sources record** | Only the three Trek layers are recorded | `docs/data-sources.md` | Every layer in use has product ID, resolution, URL and licence |
| P11 | **Landing-site close-ups** | Only Viking 1 (`vl1`) has a 3D close-up, with procedural terrain around NASA's lander model | `src/data/siteScenes.ts` | Add scenes for other sites (e.g. Perseverance at Jezero) if the demo needs them |
| P10 | ~~**Elevation layer styling**~~ | Done 2026-11-15: elevation is shown as Trek's MOLA + HRSC colour hillshade; the grey DTM layer was removed | — | — |

## 3. Assumptions (all ESTIMATED, none validated)

- **Rocky ground limits:** steered round from 5 %, never entered from 25 % (share of a 20 m cell steeper than 30° at 1 m). Set from the map's own distribution, not validated.
- **Roughness** is the spread (standard deviation) of slope within 100 m (`PATHFINDING.roughnessRadiusM`); a MAPA measure, not MOLA's own roughness product.
- **A* route costs** (`src/config/assumptions.ts` → `PATHFINDING`): impassable at 25°, extra cost in the 10–15° and 15–25° bands, "deep" ground 15–60 m below the ground within 600 m steered round and never entered past 60 m, 3.3 flat metres per metre climbed. Tuned by eye on Jezero and Valles Marineris; not validated for a suited astronaut.

All in `src/config/assumptions.ts` unless noted. Shown in the UI on hover of every ESTIMATED tag and on the About page.

| # | Assumption | Value | Done when |
|---|---|---|---|
| A1 | Walking speed (flat) | 2 km/h | Researched 2026-11-15: in line with Apollo 15 crews' EVA 2 pace, but that figure was seen only in a search summary. See [docs/assumptions-sources.md](docs/assumptions-sources.md). Team to agree |
| A2 | Climb penalty | +1 min per 10 m climbed | No source found. Team to agree (see docs/assumptions-sources.md) |
| A3 | Planned EVA length | 6 h | Researched 2026-11-15: ISS spacewalks run about 5 to 7 h. Earth-orbit, not Mars. Team to agree (see docs/assumptions-sources.md) |
| A4 | Slope bands | < 10° walkable · 10–15° caution · 15–25° avoid · > 25° impassable | Researched 2026-11-15: a NASA test document lists 20° as the suit's slope capability (seen in a search summary only), which conflicts with the 25° limit. Team to decide (see docs/assumptions-sources.md) |
| A5 | Limits | 12 stops (base + 10 between + end, the saved-mission limit), names 80 chars, notes 500 chars, speed 0.5–5 km/h, EVA 1–8 h | Confirmed |
| A6 | Science opportunity search radius | 1 km from the route | `src/data/route.ts` → `scienceOpportunities(…, withinM = 1000)` |
| A7 | Site-card "nearby targets" radius | 500 m | `src/features/explore/SiteCard.tsx` → `NEARBY_M` |
| A8 | EVA hazard look-ahead | 200 m | `src/features/eva/EvaView.tsx` |
| A9 | EVA low-margin warning | under 30 min spare before turning back | `src/features/eva/HazardAlert.tsx` |
| A10 | ~~Return-to-base estimate~~ | Done 2026-11-15: along the A* path (back the way you came, or on round the loop if shorter), climb included | `src/features/eva/EvaView.tsx`, `src/data/route.ts` → `returnAlongRoute` |
| A12 | Daylight | Twilight until the Sun is 10° below the horizon; sunset found in 5-minute steps; the simulated EVA starts at the real current time | `src/data/daylight.ts`, `src/features/eva/EvaView.tsx` |
| A13 | EVA daylight caution | under 1 h of daylight to spare after getting back | `src/features/eva/HazardAlert.tsx` |
| A14 | EVA off-route warning distance | 30 m from the planned path (`EVA.offRouteWarnM`); distance is to the nearest sampled point of the route (10 m steps) | `src/config/assumptions.ts`, `src/features/eva/HazardAlert.tsx` |
| A15 | Radiation dose rate | 0.67 mSv/day (Curiosity RAD at Gale crater) × walk duration; no solar storms, no suit shielding, no live feed | `src/config/assumptions.ts` → `RADIATION`, `src/features/plan/RadiationEstimate.tsx` |
| A11 | Profile sample step | 10 m (coarsened to keep ≤ 5,000 samples) | `PROFILE_STEP_M` |

## 4. Deployment items not yet verified

| # | Item | Where | Done when |
|---|---|---|---|
| ~~V1~~ | ~~Vercel routes `/api/tiles/…` to `api/tiles.ts` via a rewrite~~ **Resolved v0.1.2:** works on mapamarso.vercel.app | `vercel.json` | Done |
| ~~V2~~ | ~~`api/tiles.ts` imports `src/config/trekLayers.ts`~~ **Resolved v0.1.2:** the import crashed the function on Vercel; the allow-list now lives in `api/tiles.ts` | `api/tiles.ts` | Done |
| ~~V3~~ | ~~CSP in `vercel.json`~~ **Resolved v0.1.2:** headers present and the map, imagery and fonts render on mapamarso.vercel.app (headless Chrome) | `vercel.json` | Done. Re-check if a new external host is added |
| V4 | Fonts from Google Fonts | `src/styles/tokens.css` | Keep, or self-host and drop the Google entries from the CSP |
| V6 | Draco-compressed orbiter models under the deployed CSP (`wasm-unsafe-eval`) | `vercel.json` | Open an MRO or TGO card on the live globe and see the model, with no CSP error in the console |
| V7 | JPL Horizons proxy on Vercel | `api/horizons.ts` | `/api/horizons?body=phobos&day=<yesterday>` returns a table on the live site |
| V5 | Repo settings: secret scanning, push protection, Dependabot, branch protection on `main` | GitHub | Pushed to https://github.com/ProcX4/MapaMarso (moved from S-Urchin/MapaMarso). Still to do: turn these on in the repo settings (Security Spec §2, §6) |
