# MAPA · To-do list (from the specs)

**Scope: three layers only: Topographic, Optical and Spectral.** Every other layer the specs mention (geologic units, historical rover traverse) is out of scope (§7).
**Team:** Jim (Topographic, in progress) · Shin (Optical, Security, leads the demo) · Daril (Spectral) · Jastini (Decisions and docs) · everyone (App-wide). §1–§3 are the three layers; §10 is the Todo list from `docs/Todo (1–3).png`.

Tasks come from the four spec documents and are ticked where the current build (v0.5.1) meets them.
Sources: **GS** = [Gen Spec.md](Gen%20Spec.md) · **PS** = [docs/MAPA_Marswalk_Product_Specification.md](docs/MAPA_Marswalk_Product_Specification.md) · **FS** = [Frontend Spec.md](Frontend%20Spec.md) · **SS** = [Security Spec.md](Security%20Spec.md).
Details of each stand-in are in [placeholders.md](placeholders.md); what changed is in [changes.md](changes.md).

Last updated: 2026-11-15
## 1. Topographic · Jim (in progress)

Height and shape of the ground, and the A* safe path round steep and deep terrain.

### Done
- [x] Elevation shown as Trek's MOLA + HRSC colour hillshade, 200 m/px, whole planet (GS Layer 1, PS §4.1)
- [x] Elevation values: Jezero CTX DTM (20 m/px) at the site, MOLA (463 m/px) anywhere else via `api/elevation.ts` (GS Data)
- [x] Slope derived by MAPA (Horn method, Web Worker), coloured by slope band (GS Layer 2, FS §6.2)
- [x] Deep ground (pits, channels, small craters) found and shaded (PS §4.2 craters / obstacles)
- [x] Terrain-aware routing: A* round steep and deep ground, for planned routes and picked missions (GS "if time allows", PS §16)
- [x] Hazard warnings along the route, on the map and the profile (GS, PS §2.2)
- [x] Route stats from the terrain: distance, gain/loss, max slope, duration, difficulty (GS MVP)
- [x] Elevation profile along the safe path, linked to the map on hover (GS MVP, PS §6)
- [x] Site card: elevation and slope anywhere on Mars, with the source model (PS §5)
- [x] Provenance for every Topographic layer; data recorded in `docs/data-sources.md`
- [x] **Slope spot-check** (FS §6.2, P2): GDAL's Horn formula, re-implemented in NumPy, matches MAPA's slope exactly on all 2.4 M interior cells of the Jezero DTM. Plain `gdaldem slope` on the file would read about 0.14° low on average (18% fewer cells at 25° or more), because it takes the 20 m pixels as ground metres while at 18.4°N they are 18.9 m east–west; use `-s` or a reprojected file when comparing with GDAL itself
- [x] **Average slope** in the route stats (PS §2.2)
- [x] **Terrain roughness:** Trek's global MOLA roughness layer, plus a derived roughness (spread of slope within 100 m) along the route in the stats (PS §3, §4.2)
- [x] **Nearby hazard on the site card:** "Steep ground (16.2°) about 500 m north", within 1 km, anywhere on Mars (PS §5)
- [x] **Return route follows the A* path:** EVA's back-to-base distance and time go back along the path (or on round the loop if shorter), climb included (PS §2.3, A10)
- [x] **Traverse safety envelope:** Topographic layer *Safety envelope*, the ground the habitat can be walked to and back from within the EVA (GS, PS §8)
- [x] **Alternative routes:** *Safest* vs *Most direct*, compared side by side in the planner; the other is drawn dashed on the map (PS §2.2, §16)
- [x] **Error states:** with `/api/elevation` blocked, the planner says the elevation couldn't be loaded and legs are straight; the site card and stats show "No data"; nothing spins (SS §8)
- [x] **Keyboard and colour check:** map takes focus, + zooms, arrows pan; route options reached by Tab and switched by Space; new shading and envelope have text legends (FS §8)
- [x] **A* on a saved mission:** tested with a stand-in mission served to the browser in place of Supabase's mission list (Habitat → Delta top → Western rim): it appears in the list, picking it draws the A* path round steep and deep ground, the card reads "13.9 km on foot, round steep and deep ground · Jezero CTX DTM", and the shading follows the mission. Nothing was written to the database; re-check once the team has a real mission

### To do
- [ ] **Agree the A* limits** in `src/config/assumptions.ts` → `PATHFINDING` (25° impassable, deep past 60 m never entered…); tuned by eye, not validated
- [x] **Rock and boulder hazards** (Todo #4): `scripts/build-obstacles.mjs` built `public/data/site-obstacles.bin` (2.4 MB) from USGS's 1 m HiRISE DTMs of Jezero: the share of each 20 m cell steeper than 30° at 1 m, covering 31.5 % of the site (habitat, delta, most of the crater floor). Thresholds set from its distribution: A* steers round from 5 % and never enters 25 % or more (about the rockiest 4 % and 0.6 % of ground). Delta top → western rim no longer crosses a 32 % cell (now 7 % max, +40 m); smooth-floor routes unchanged. Outside Jezero there is no rock data.
- [ ] **Hazard shading beyond the route:** it now covers the habitat's surroundings before any stop is added, then the ground round the route or picked mission; decide whether it should follow the view anywhere on Mars instead

## 2. Optical · Shin

The surface in visible light.

### Done
- [x] Viking MDIM 2.1 colour mosaic, 232 m/px, whole planet (also the backdrop under every layer)
- [x] MGS MOC colour atlas, whole planet
- [x] Provenance for both

### To do
- [ ] **Walking-scale imagery:** a HiRISE or CTX layer (GS Data, PS §11, P3). Trek's global CTX (Caltech) and HiRISE mosaics are listed in its catalogue but serve no tiles; find a source that does, allow-list it in `api/tiles.ts`, add it to the registry
- [ ] **Rover point-of-view photos at waypoints**: "what you'll see when you arrive" (GS; only a raw-image link today, `SITE.rawImagesUrl`)

## 3. Spectral · Daril

Infrared and mineral maps.

### Done
- [x] THEMIS daytime and night-time infrared, 100 m/px (GS Data "Thermal")
- [x] TES thermal inertia, high-calcium pyroxene, plagioclase, sheet silicates and glass (PS §4.2 thermal properties, §4.3 composition)
- [x] Provenance for each

### To do
- [ ] **CRISM mineralogy layer** (GS Layer 3, GS Data "Mineralogy"). Trek's CRISM/OMEGA hydrous-mineral map serves no tiles; needs another source
- [ ] **Science targets:** fill `public/data/science-targets.geojson` with real CRISM targets, each with a citable reason (P5); then replace the `TBD` product in the registry and in `docs/data-sources.md`
- [ ] **Science opportunity cards** come alive once targets exist (built: `ScienceOpportunity.tsx`, detour time, reason) (GS, PS §7)
- [ ] **Site card mineral / hydration rows**, shown only where the data supports them (PS §5)
- [ ] **Legends for the TES maps:** they have none yet, so the colours can't be read

## 4. App-wide (not a layer) · Everyone

### Planner and EVA
- [x] Start, destination, waypoints, science stops, end or round trip; review before EVA
- [x] EVA: simulated position, next waypoint (distance, bearing, elevation change), distance to base, return estimate, one hazard alert at a time, Next / Science / Route / Return to base
- [ ] Estimated return as a clock time, e.g. "16:42 LMST" (PS §3 example)
- [ ] Route-deviation warning in EVA (PS §2.3)
- [ ] Route export to a file (PS §16; saving to Supabase works)
- [ ] Site comparison (PS §16)
- [ ] Search: replace the 2 hand-typed place names with the IAU gazetteer (P6)

### Frontend rules (FS §8, §10, definition of done)
- [x] Every value tagged OBSERVED / DERIVED / ESTIMATED; estimates show their assumption; "No data" instead of a guess
- [x] Numbers through `lib/format.ts` in mono; panels collapse below 720 px; reduced motion honoured
- [x] One map instance; heavy maths in workers; About and EVA lazy-loaded; offline demo tiles
- [ ] Keyboard pass over every control (map: arrows pan, + / − zoom)
- [ ] Lint and build before every push (passing now)
- [ ] Branch per feature + PR into `main` with one reviewer (work has gone straight to `main`)
- [ ] Each feature shown to one teammate who didn't build it

## 5. Decisions and docs (GS) · Jastini

- [ ] Demo site: Jezero or Gale (D1)
- [ ] Habitat location: a real spot, renamed from "Habitat (placeholder)" (D2)
- [ ] Gen Spec tech-stack line says OpenLayers (D3)
- [ ] Team table: names and roles (D5; also "Team: TBD" on the About page)
- [ ] Licence: add `LICENSE`, update Gen Spec (D6)
- [ ] Record the spec deviations in the specs or `changes.md`:
  - [ ] layers are Topographic / Optical / Spectral (GS Layer 3 and FS §5.4 list geology and Base / Safety / Science / Route)
  - [ ] whole-planet scope (GS asked for one site)
  - [ ] routes live under `#/globe/2d` (FS §2)
  - [ ] email confirmation off (SS §4)

## 6. Demo story (GS, PS §15), rehearse end to end · led by Shin, everyone

- [ ] **Explore:** open the site; turn on imagery (Optical), elevation and slope (Topographic) and a Spectral layer
- [ ] **Choose:** click an outcrop; the site card shows its terrain and source data
- [ ] **Plan:** route from the habitat to the outcrop; distance, profile, max slope, safe path
- [ ] **Adjust:** MAPA flags a steep section or a nearby science target; add a waypoint (targets need data, §3)
- [ ] **EVA:** switch to the simplified view and walk the route
- [ ] **Return:** the return-to-base estimate stays visible the whole time
- [ ] The eight questions (GS, PS §18) can all be answered on one screen

## 7. Out of scope (not one of the three layers)

Listed so nobody builds them by accident. Bring one back only if the scope changes.

- Geologic units layer (GS Layer 3 option, GS Data "Geology", PS §4.3) and the site card's geology row (GS MVP, PS §5)
- Geological contacts as science opportunities (PS §7, second example)
- Historical rover traverse layer (GS, PS §10)
- Communications line-of-sight, detailed thermal modelling, 3D terrain, AR, ML target detection (PS §16 stretch)

---

## 8. Security (SS) · Shin

### Secrets and repo (§2, §6)
- [x] `.env.local` git-ignored; `.env.example` blank; no `service_role` key in a `VITE_` variable; server secrets only via `process.env` (none needed)
- [x] `.gitignore` covers `node_modules/`, `dist/`, `.env*.local`, `.vercel/`
- [x] Large data files are public NASA/USGS data only (`site-dtm.tif`, 9.6 MB)
- [x] No new packages added without need
- [ ] No keys in screenshots, slides, chats, issues or the demo video (keep checking)
- [ ] GitHub secret scanning and push protection on `ProcX4/MapaMarso`
- [ ] Dependabot alerts on
- [ ] Branch protection on `main`: PR required, one review, no force-push
- [ ] Vercel installs with `npm ci` (lock file is committed)
- [ ] `npm audit`: no high / critical runtime issues

### Proxies (§3)
- [x] `api/tiles.ts`: fixed host, allow-listed layers, validated z/row/col, jpg/png, GET only, 10 s timeout + one retry, image type and 2 MB checks, nothing forwarded, week-long cache, plain error messages
- [x] `api/elevation.ts` follows the same rules
- [ ] Rate limiting only if abuse shows up (Vercel Firewall rule)

### Supabase (§4)
- [x] RLS on all 5 tables in `supabase/schema.sql`
- [x] Ownership by `auth.uid()`; insert `with check (owner_id = auth.uid())`; `security definer` functions set `search_path = ''`; `is_admin` dashboard-only; text length limits; a code alone grants no edit rights; codes sanitised; sign-out clears the session
- [ ] Explicit select / insert / update / delete policies on every table, or note that `profiles`, `mission_members`, `mission_entries` and `login_attempts` rely on deny-by-default plus RPCs by design
- [ ] `join_mission` RPC rate-limited, with a join log
- [ ] Email confirmation: spec says **on**, team chose **off**; record it (§5) or switch it back
- [ ] Minimum password length 8+ set in Supabase → Authentication → Policies
- [ ] Redirect URLs: production domain + `http://localhost:5173/**` only
- [ ] Sign-up / sign-in rate limits at defaults or tighter; CAPTCHA if spam appears
- [ ] Confirm RLS in the dashboard (no "RLS disabled" warning)

### Frontend and privacy (§5, §7)
- [x] No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, `new Function` or string `setTimeout`; user text drawn as text; data-built links are internal; external links `noopener noreferrer`
- [x] Input limits (coordinates, 12 stops, 80 / 500 chars, speed, EVA hours); CSP and security headers; storage reads in `try/catch`
- [x] Email + username only; usernames shown, emails never; simulated EVA position; `geolocation=()`
- [ ] About page explains **how to delete an account** (it says what's stored, and how to delete missions)

### Availability (§8)
- [x] Pre-fetched demo tiles with fallback; DTM served from our own deployment; map and planning work signed out
- [ ] Every network call has a visible error state (elevation / A* done, see §1; check the rest)

### Pre-demo checks (§9), run before judging
- [ ] `git log -p | grep -iE "service_role|secret|password|api[_-]?key"` finds nothing that matters
- [ ] RLS on for every table
- [ ] `/api/tiles/../../etc` and `/api/tiles/UnknownLayer/0/0/0.jpg` both return 400
- [ ] A mission named `<img src=x onerror=alert(1)>` shows as plain text everywhere
- [ ] Security headers present on the live site
- [ ] `npm audit` clean of high / critical runtime issues
- [ ] App works offline after first load (cached demo tiles)

---

## 9. Every to-do box and TBD written in the docs

Each unticked `- [ ]` box and each "TBD" in the spec documents, in the order it appears, ticked where the build meets it, with its layer. Items outside the three layers are marked *out of scope*.

### Gen Spec.md · MVP checklist
- [x] Map of the demo site with NASA orbital imagery as the base layer · *Optical*
- [x] Layer 1 — Elevation (HiRISE or CTX elevation model for the site; MOLA as a coarse fallback) · *Topographic*
- [x] Layer 2 — Slope (derived by MAPA from the elevation model) · *Topographic*
- [ ] Layer 3 — Science (geologic units or CRISM mineralogy) · *Spectral: CRISM still to add; geologic units out of scope*
- [x] Layer toggles and opacity control
- [x] Site card on click: coordinates, elevation, slope, source dataset · *geology row out of scope*
- [x] Route: start, waypoints, science stops, end / round trip
- [x] Route stats: distance, elevation gain/loss, max slope, estimated duration · *Topographic*
- [x] Elevation profile under the map, linked to the route on hover · *Topographic*
- [x] Data provenance panel for every layer

### Gen Spec.md · If time allows
- [x] Hazard warnings (slope above a threshold along the route) · *Topographic*
- [x] Terrain-aware routing (avoid steep cells instead of drawing straight lines) · *Topographic*
- [ ] Science opportunity cards ("hydrated minerals 420 m off route, +11 min detour") · *Spectral: needs target data*
- [x] Traverse safety envelope (how far you can go and still return in time) · *Topographic*
- [x] EVA mode
- [ ] Rover point-of-view photos at waypoints · *Optical*
- [ ] Space weather / radiation panel · *app-wide*

### Gen Spec.md · TBD
- [ ] Demo site decision: Jezero or Gale
- [ ] Data table status column: tick each in-scope layer as it lands (all still ☐ in the spec)
- [ ] Tech stack: map rendering "_TBD_" → OpenLayers
- [ ] Team table: names and roles (and "Team: TBD" on the About page)

### Frontend Spec.md · Definition of done (per feature)
- [x] Works on the demo site at walking-scale zoom
- [x] Every displayed value has a category tag and a source
- [ ] Usable by keyboard; readable at 720 px wide (720 px done; keyboard pass to do)
- [x] Lint and build pass
- [ ] Shown to one teammate who didn't build it

### Security Spec.md
All boxes from §2–§9 are in §8 above, with the same ticks.

### docs/data-sources.md · TBD
- [ ] Science targets (`science-targets`): product ID, source URL and licence TBD (CRISM detections); the file is empty · *Spectral*
- [ ] Same TBD in `src/map/layers/registry.ts` → `science-targets` → `product: 'TBD: CRISM mineral detections for the site'` · *Spectral*

---

## 10. Todo list from `docs/Todo (1–3).png`

The 17 tasks in the three Todo images, with the owner from the section headings above and today's status.

### Must-do for the challenge
- [ ] **1. Fill the science targets** · Daril. `public/data/science-targets.geojson` is empty; it needs real points with `name`, `reason` (e.g. "CRISM hydrated signature") and `source`. Makes the science opportunity cards and the site card's nearby targets work (§3).
- [ ] **2. Add a radiation / space-weather panel** · everyone (§4). A minimal panel with a cited source, labelled Estimated.
- [ ] **3. Add point-of-view photos at waypoints and destinations** · Shin (§2). Perseverance raw images near each stop; only the unused `SITE.rawImagesUrl` exists today.
- [x] **4. Add rock and boulder hazards** · Jim. Done 2026-11-15: HiRISE-derived rocky-ground map (`public/data/site-obstacles.bin`, built by `scripts/build-obstacles.mjs`) with A* costs; Jezero only, where the 1 m DTMs exist
- [ ] **5. Get sharper imagery at walking scale** · Shin (§2). THEMIS 100 m/px is the sharpest; needs a CTX or HiRISE source that serves tiles, or a local tile set (P3).
- [ ] **6. Source the mobility and safety assumptions** · everyone, with Jim for the A* costs. Walking speed 2 km/h, climb penalty, slope bands, 6 h EVA and the A* costs need citations or a team decision (A1–A4).

### Decisions the team still has to make
- [ ] **7. Confirm the demo site** · Jastini (§5). Jezero is a placeholder; Gale and its boxwork is the alternative (D1).
- [ ] **8. Pick a real habitat location** · Jastini (§5). Today it's the Perseverance landing point, "Habitat (placeholder)" (D2).
- [ ] **9. Fill in the team names and roles** on the About page and in Gen Spec · Jastini (§5) (D5).
- [ ] **10. Add a licence file** · Jastini (§5) (D6).
- [ ] **11. Decide whether space sound defaults to on** · Jastini (§5). It plays by default today (D7).

### Data and content to finish
- [ ] **12. Restore a geology or science layer** · *out of scope as a geology layer* (§7: the layers are Topographic, Optical and Spectral). The science side is covered by Spectral (#1 and the CRISM layer in §3).
- [ ] **13. Add a rover traverse layer** · *out of scope* (§7; stretch goal P8).
- [ ] **14. Replace the hand-typed place names with verified IAU gazetteer names** · everyone (§4). Two entries today (P6).
- [ ] **15. Complete `docs/data-sources.md`** · Jastini (§5). Product ID, URL and licence for every layer; the science-targets row is still TBD (P9). Check the terms and load of `api/elevation.ts`, which reads a 2 GB USGS file (byte ranges only, cached a week).
- [ ] **16. Add landing-site close-ups for other sites** if the demo needs them · everyone (§4). Only Viking 1 has one (P11).
- [x] **17. Spot-check the slope maths against `gdaldem slope`** · Jim. Done 2026-11-15 by re-implementing GDAL's Horn formula: exact match. Note: plain `gdaldem` on this file reads ~0.14° low unless given the true pixel spacing (see §1).
