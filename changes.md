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

## 2026-11-15 · v0.5.7 · Place-name search from the IAU gazetteer, and comparing two points

**Added**
- **Search** now covers all 2,055 Mars names adopted by the IAU, from the USGS Gazetteer of Planetary Nomenclature (`public/data/gazetteer.json`, rebuilt by `npm run build-gazetteer`). The names load when you start typing, accents are ignored ("seitah" finds "Séítah" if it is an IAU name), and the zoom fits the feature's size. NASA's own name for the landing site stays, marked as not an IAU name. The old hand-typed "Jezero" point was wrong (77.58°E; the IAU centre is 77.687°E, 18.408°N).
- **Site comparison:** *Pin to compare* on the site card. Click another point (or search a name) and the card shows both: place, elevation, slope, terrain band, distance and bearing apart, and the height difference.
- Notes: the Esri CTX terms researched but not settled, and the size of an offline CTX and HiRISE tile set (CHECKLIST §2).

**Verified**
- Type check, lint and build pass. A keyboard and screen-reader audit of the explore, plan, EVA, About and account pages found every control named and keyboard reachable, no clickable non-controls, and alt text on every image.
- In the browser: search for Jezero, Gale, Nili and an absent name; pinning Jezero then searching Neretva Vallis gave 28.6 km apart at bearing 287° and +698 m in height, matching a hand calculation.

---

## 2026-11-15 · v0.5.6 · To-do sweep: science targets, EVA return time and off-route warning, route export, radiation estimate, security checks

**Added**
- **Science targets:** 27 Perseverance sample sites (sealed cores) in `public/data/science-targets.geojson`, each with a reason and source, rebuilt by `npm run build-science-targets` from NASA's Mars Rock Samples page and stop list (positions within about 300 m). Science opportunity cards and the site card's nearby targets now have data. The layer is labelled as rover cores, not CRISM.
- **EVA:** "Back at base about 16:42 LMST" under *Back to base*; an OFF ROUTE alert past 30 m (new assumption A14) and a *Simulated drift off the route* slider to try it.
- **Planner:** *Export route* (GeoJSON, on this device only) and a *Radiation* panel (0.67 mSv/day from Curiosity's RAD at Gale crater × the walk's duration, Estimated, not a live feed; A15).
- `docs/assumptions-sources.md`: sources and how well each was checked for A1–A4, and the 20° vs 25° slope conflict.
- `npm run check-api-abuse`: 20 bad requests to the three API handlers.
- `docs/todo-sweep.md`: what was done in this sweep, how each part works, and what was not done.

**Changed**
- `Gen Spec.md`: tech stack says OpenLayers; data table status filled in; new *Deviations from this spec* section.
- About page: says there is no delete-account button yet and what deleting an account removes.
- `vercel.json`: `installCommand` is `npm ci`.

**Fixed**
- `/api/rover-photos` with no parameters answered 200 as if the point were 0°, 0°; it now answers 400.

**Spec deviations**
- Recorded in `Gen Spec.md` (three layer groups, whole planet, routes under `#/globe/2d`, email confirmation off).

**Verified**
- Type check, lint and build pass; `npm run check-upstreams` and `npm run check-api-abuse` pass; `npm audit` finds 0 vulnerabilities; history holds no keys; the live site sends the security headers.
- In the browser: science opportunities, the LMST line, the off-route alert, the export file and the radiation figure, with the numbers in `docs/todo-sweep.md`.

---

## 2026-11-15 · v0.5.11 · EVA playback, new layout, and a sun that follows the walk

**Added**
- **Playback:** a Play/Pause button walks the crew along the planned route at the route's pace, at 1, 5 or 15 walking minutes per second. Space plays or pauses; the arrow keys step 50 m. Playback pauses at the destination, and a banner says when the crew reaches each stop.
- **Scrubber:** drag to any point on the route; the clock moves with it. Ticks mark each stop (green for science stops).
- **Sun dynamics:** the EVA has its own simulated clock. The status bar shows LMST, whether the sun is up, and minutes to sunset or sunrise, and the map's night shading follows that clock while EVA is open. Leaving EVA returns the map to the real time.
- **Return to base** now plays the walk home along the route; **Resume route** turns back.

**Changed**
- Layout: status bar and alerts at the top centre, the next-stop and return facts in a column on the left, and the player plus actions in one bar along the bottom, so the crew's position in the middle stays clear. The off-route drift practice is folded into a "Practice" section.

---

## 2026-11-15 · v0.5.10 · Planner picker as icons with info boxes

**Changed**
- The planner's "Click the map to place" picker is five round icon buttons instead of words, each drawn like the stop it places so it matches the stop list and the map: **A** (Start), **1** (Waypoint), a green dot (Science stop), **B** (Destination), and an eye (Just look). The picked one has a white ring.
- Hovering an icon, or reaching it with Tab, shows an **info box** with its name and what a click does ("Each click on the map adds a science stop to the end of the route"). Before the start is placed, the others are dimmed and their box says "Place the start first."
- The boxes open under the row of icons, all in the same spot, and stay inside the panel. The line under the icons still says what the current pick does.

**Verified (headless Chrome on a production build; no page errors)**
- All five boxes show on hover, inside the panel, before and after the start is placed; Tab focus shows the box; clicking the science-stop icon picks it.

---

## 2026-11-15 · v0.5.9 · Mission page on the shared NASA map

**Changed**
- The mission details page (`#/missions/<code>`) shows its route on the same NASA map as the globe page's 2D view (`src/map/MissionMap.tsx`): the colour backdrop, the CTX photos from zoom 10 and HiRISE at Jezero from zoom 12, and the route drawn the same way (green dashes along the A* safe path, start diamond, numbered phases, finish triangle). It opens framed on the whole route. Before, it used the older canvas map, which showed blurry Viking colour imagery zoomed far out with the stops piled together.

**Removed**
- The old canvas map (`src/globe/MarsMap2D.tsx`, `src/globe/map2d.css`), now used nowhere, its marker helper (`routeMarkers`) and the dead style rules for it.

**Verified (headless Chrome on a production build, with a stand-in mission; nothing written to the database)**
- The page shows the new map (900 × 560) with + / − and no old map; the route is framed with CTX imagery under it, along the safe path (14.0 km); the imagery credit sits under the map.

---

## 2026-11-15 · v0.5.8 · Site card on terrain, hazards and pictures; elevation profile as a readable card

**Changed: the site card (right panel)**
- It now reads **Terrain → Hazards → Pictures**. The compare feature (pin a point, compare two) is removed, with its state and styles.
- The science-target list is gone; when a target is within 500 m, the nearest one shows just above the pictures with its reason (kept to three lines, so the photos stay in view) and a count of the others. The photos heading is now **Pictures**.

**Changed: the elevation profile**
- It's a compact card beside the planner (up to 600 × 240 px) instead of a strip across the whole bottom: a long thin chart flattened every hill and covered the map. The chart fills the card.
- Distance marks along the bottom (every 5 km on a 25 km walk), heights on round steps, and a faint fill under the line.
- **"heights ×N"** says how much taller the hills are drawn than they are (×57 on a 25 km walk at Jezero), so a steep-looking stretch isn't mistaken for real steepness; the slope numbers are real. Hover still links the profile and the map.
- The map's tool buttons and the guide card moved up so neither covers the profile.

**Verified (headless Chrome on a production build; no page errors)**
- Site card sections Terrain > Hazards > Pictures, no compare; at the Montdenier target: its reason, "and 5 more", and 8 photos in view.
- Profile card 600 × 240 with height and distance marks, the stretch label and the fill; hover reads distance, height and slope; the guide and tool buttons don't overlap it.

---

## 2026-11-15 · v0.5.7 · Planner in steps; stops placed from the left panel; layers behind group buttons; science-target guide

**Changed: the planner, in three steps (the old mission form's layout)**
- A step bar, **1 Route · 2 Review · 3 Save**, shows one step at a time instead of one long form; any step is a click away, and a **Next** button leads on once there's a route. Nothing was removed: Route has the stops, round trip or one way, the route options and a short summary; Review has the stats, EVA margin, radiation, science opportunities and export; Save has the name, code and details. The elevation profile stays along the bottom.
- **Stops are placed from the left panel.** A "Click the map to place" picker (Start, Waypoint, Science stop, Destination, Just look) decides what a click on the map adds. **There is no placeholder start any more:** a new route is empty, the first click places the start (A), and the picker moves on to Waypoint. Clicking again with Start picked moves the start. "Just look" only opens the site card.
- The **site card** (right) keeps its terrain, science, hazards, comparison and rover photos, but no longer adds stops: Add waypoint, Add science stop, Route here and Set as start are gone from it.
- The start's badge is **A** (it was H, for the habitat) in the stop list, on the map and on the profile.

**Changed: layers behind group buttons**
- The layer panel shows three buttons, **Topographic**, **Optical** and **Spectral**, each saying how many of its layers are on; a button opens to show its layers. Which ones are open is remembered.
- **Topographic:** Elevation; Steep, deep and rocky ground; Safe path (A*). **Removed:** Safety envelope and Surface roughness (MOLA), with the envelope's code in the route finder; the route stats' derived roughness stays.
- **Optical:** unchanged.
- **Spectral:** Science targets, then three groups of their own: **Heat and brightness** (daytime and night-time infrared, thermal inertia, surface albedo), **Mineral spectroscopy** (pyroxene, plagioclase, sheet silicates and glass), **Dust indexes** (dust cover index and its over-relief version).
- **Science targets are always on when the app opens**, even if they were switched off last time (`onAtStart`).

**Added: a guide to the science targets**
- A card on the 2D map, while Science targets are on: click near a green target to see why it matters and Perseverance's photos from there. **Show me one** flies to a target and opens its site card (it never adds a stop); **Got it** hides the guide for good.

**Verified (headless Chrome on a production build; no page errors)**
- Layers: the three buttons show 2/3, 2/4 and 2/10 on; each holds exactly the layers above; Science targets saved as off came back on.
- Planner: steps 1–3 show; the route starts empty with only Start pickable; the first click placed A and switched the picker to Waypoint; the next click added a waypoint; Just look added nothing; Next was off until there was a route; Review showed the stats and EVA margin; Save showed the save form.
- Guide: Show me one opened the site card at the Montdenier and Montagnac targets with 8 Perseverance photos and no stop added; Got it kept it hidden after a reload.

---

## 2026-11-15 · v0.5.6 · One mission planner; Explore Mars and Explore Jezero Crater on the home page

**Changed: one planner for every mission**
- Adding a mission (the **+** on the globe, `#/globe/new`), the Missions page's **New** and **Edit**, and the mission page's **Edit** button now all open the Plan Marswalk planner on the 2D map: the same map, NASA layers, A* safe path, route options, stats, elevation profile and save form. Before, they opened a separate three-step form on the older canvas map (`MissionForm`), which had none of that. `MissionForm.tsx` is removed; old addresses (`#/globe/new`, `#/missions/new`, `#/missions/<code>/edit`) still work and land in the planner.
- To keep what the old form could do: **Set as start** on the site card (a mission can start anywhere on Mars, not only at the habitat), a live **mission code check** in the save form (a taken code shows before saving), and an **Open mission page** link after saving.
- The form styles the old form carried (also used by the save form, the account page and the mission pages) moved to `src/styles/forms.css`, loaded once for the whole app.

**Changed: home page**
- **Open the globe** is now **Explore Mars**: the same hyperspace jump to the 3D planet.
- New **Explore Jezero Crater** button: the same jump, landing on the 2D map over the whole crater (zoom 10, CTX photos showing), where every tool is to hand: NASA layers, safe routes, rover photos and EVA.

**Changed: globe**
- **Orbiters are off by default** on the 3D globe, so the planet is the first thing seen; the Orbiters tool shows them (and their orbit lines).

---

## 2026-11-15 · v0.5.5 · Debug: zoom points

**Added**
- **Debug: zoom points**, a switch in the ☰ menu (off by default, remembered per browser; `src/lib/debugZoom.ts`). With it on, the 2D map shows:
  - a panel at the top centre with the zoom level, about how much ground one screen pixel covers, and which photo layer is drawing now;
  - a ladder of the Optical photo layers with the zoom each starts at and is sharpest at (colour mosaics up to 6–7, CTX from 10, HiRISE from 12 at Jezero), the current one highlighted, and a **Go** button on each that zooms there (or flies to Jezero for HiRISE). The ladder reads the layer registry, so it follows any change to the layers (`src/map/ZoomDebug.tsx`);
  - on the map, a dashed outline of the HiRISE area labelled "zoom 12+", and a pin at the landing site where the rover photos start.

**Verified (headless Chrome)**
- Off by default; on from the menu; remembered after a reload; off hides the panel and marks. No page errors.
- Zoom 2: "≈ 10.4 km per screen pixel", colour backdrop drawing, HiRISE marked not in this area. HiRISE Go: zoom 14 at Jezero, "≈ 3 m per screen pixel", HiRISE drawing. Zoomed out to 11: "≈ 20 m", CTX drawing.

---

## 2026-11-15 · v0.5.4 · Plain-language layer instructions; zoom for rover photos

**Changed: the layer panel explains itself**
- Every layer has a short **how to use** line in plain words under its name: what the colours mean, when it shows, what to do with it (`howTo` in `src/map/layers/registry.ts`). The three group notes are rewritten the same way.
- **Live hints** when a switched-on layer can't be seen from where you are: "Zoomed out too far to show it: zoom in closer", with **Zoom in here** and **Zoom to Jezero Crater** buttons; "Too blurry this close: zoom out to read it"; or, for HiRISE away from Jezero, "Not in this part of Mars" with a **Go to Jezero** button.
- **Merged with v0.5.3's zoom hint (Daril):** the two hints are now one, so a row never shows both. v0.5.3's "Zoom to Jezero Crater" button is kept, joined by "Zoom in here" (CTX and THEMIS cover the whole planet, so zooming in where you are is usually what you want). One view listener in `src/map/mapControl.ts` (`subscribeView`, fired when a pan or zoom ends) replaces `useBelowMinZoom`. The TES colour bars from v0.5.3 are kept as they are, under the new how-to lines.
- The technical details (instrument, mission, resolution, coverage) are folded under a **Source** toggle on each row.

**Added: zoom in the rover photo viewer**
- Scroll or pinch to zoom toward the pointer, drag to look round, double-click to zoom in or back out, − / + / Fit buttons, and the + − 0 keys. Arrows still step between photos.
- The viewer opens on NASA's 1,200 px copy and swaps in the **full-resolution original** the first time you zoom (`fullUrl`, from the feed's `full_res`). Zoom stops at twice the photo's own detail, so it never goes blocky.

**Verified (headless Chrome, real mouse and keys)**
- Optical layers through the proxy at Jezero: Viking (zoom 0–7), MOC (0–6), CTX (6–12), HiRISE (12–17) all serve images; flying in, CTX takes over at zoom 10 and HiRISE at zoom 12+, with no failed tiles.
- CTX has gaps at its sharpest zoom (Esri answers 404 itself, e.g. parts of Valles Marineris and ~70°N); the layer underneath shows there, and its instructions say so.
- Panel zoomed out: CTX says to zoom in; HiRISE says it only covers one area and offers Go to Jezero, which flies there and the hints clear.
- Photo viewer: wheel zoom to the cap, drag, Fit, double-click, + button and 0 key all work; the original (1648 × 1200 for a Mastcam-Z frame) replaces the 1200 px copy and the cap rises from 239 % to 329 %.

---

## 2026-11-15 · v0.5.3 · Legends for the TES maps, and a zoom hint for site-scale layers

**Added**
- A colour bar under each switched-on TES layer in the layer panel, with a plain-words label at each end (for example "Low: dust and fine sand" to "High: rock and bedrock"). The colours were sampled from the Trek tiles themselves: violet is lowest and red highest, and albedo runs black to white. No numbers are given, because Trek publishes no value range for these maps. The labels come from the Trek catalogue descriptions, except the dust ends, which follow the pattern on the map (Amazonis, Alba and Tharsis, the dustiest regions, show red).
- A hint under any switched-on layer that is zoomed out too far to draw (the THEMIS, CTX and HiRISE layers, which draw only when zoomed in), with a **Zoom to Jezero Crater** button. Before, the switch looked as if it did nothing.
- `ramp` on the layer registry (`LayerDef`) for continuous colour scales, and `useBelowMinZoom` in `src/map/mapControl.ts`, which re-renders only when a layer appears or disappears, not on every frame of a zoom.

**Spec deviations**
- None.

**Verified**
- Type check, lint and build pass; no console errors.
- In the browser: bars and end labels show for the thermal inertia, pyroxene, both dust and albedo layers; the hint shows for the THEMIS layer that is on, and goes away after the button zooms to the site. Plagioclase and sheet silicates share the same code and were not switched on.

---

## 2026-11-15 · v0.5.2 · Topographic: route options, safety envelope, roughness, safer return

**Added**
- **Route options:** every route is found two ways, *Safest* (round steep and deep ground, avoiding climbs) and *Most direct* (round impassable ground only), compared side by side in the planner with distance, time, max slope and distance over 10°. Pick one and the map, stats, profile and EVA follow it; the other is drawn dashed on the map.
- **Safety envelope** (Topographic layer): the ground the habitat can be walked to and back from within the planned EVA at the walking speed, on the A* costs (Dijkstra from base).
- **Roughness:** Trek's global MOLA roughness layer, and a derived roughness (spread of slope within 100 m) along the route, shown as an average in the route stats with the worst value on hover.
- **Average slope** in the route stats.
- **Site card "Nearby":** the closest ground of 15° or more within 1 km, with distance and compass direction, anywhere on Mars.
- With only the habitat placed, the terrain round it is mapped straight away (hazard shading and the envelope), before any stop is added.
- **Rocky ground (boulders, blocky outcrop):** `scripts/build-obstacles.mjs` turns USGS's seven 1 m HiRISE DTMs of Jezero (757 MB, downloaded once into a temp cache) into `public/data/site-obstacles.bin` (2.4 MB): for each 20 m cell of the site DTM, the share of ground steeper than 30° at 1 m. It covers 31.5 % of the site DTM: the habitat, the delta and most of the crater floor. A* steers round cells from 5 % and never enters 25 % or more (about the rockiest 4 % and 0.6 % of covered ground); the shading shows it in tan and brown. No published rock-abundance map exists for the site in Trek or the USGS Mars 2020 set, so this is a derived proxy (DERIVED).
  - Checked: delta top → western rim crossed a 32 % rocky cell without it; with it the path tops out at 7 % for 40 m extra. Routes over smooth floor are unchanged.
- **Mission details page follows the safe path too:** its map draws the same A* path as the globe page's 2D view, and its distance, per-leg distances and a "Safe path" line are measured along it (both pages share `useMissionPath` in `src/hooks/useSafePath.ts`). Checked with a stand-in mission: 13.9 km, legs 4.88 + 9.04 km on both pages.

**Changed**
- EVA's back-to-base distance and time follow the A* path (back the way you came, or on round the loop if shorter), climb included, instead of a straight line with no climb.
- Map stacking: opaque base imagery first, see-through imagery (elevation colour, roughness, TES) above it, so turning those on always shows them.
- The planner says plainly when the safe path is still being found, when legs had to stay straight, or when elevation couldn't be loaded.

**Verified**
- `tsc -b`, `oxlint` pass.
- Slope: GDAL's Horn formula re-implemented in NumPy matches MAPA on all 2,406,940 interior cells of the Jezero DTM (max difference 0.00000°). Plain `gdaldem slope` on the file reads 0.14° low on average (p95 0.56°): it takes the 20 m projected pixels as ground metres, while at 18.4°N they are 18.9 m east–west.
- Worker on the full Jezero grid (2.4 M cells, both routes, roughness and envelope): about 0.9 s. Envelope for 6 h at 2 km/h: about 99 km².
- In the app (headless Chrome): route options switch the route; envelope draws round the habitat; site card reads "Steep ground (16.2°) about 500 m north"; with `/api/elevation` blocked the planner, stats and site card show the error and "No data" without spinning.
- Keyboard: map takes focus, + zooms, arrows pan; route options are in the Tab order and switch with Space.

**Not verified**
- A* on a real saved mission (still no missions in the database).

---

## 2026-11-15 · v0.5.1 · Three more TES layers under Spectral

**Added**
- Spectral group: **Dust cover index (TES)**, **Dust cover index over relief (TES)** and **Surface albedo (TES)**, all from Mars Trek, all observed. The two dust layers show the same index (Ruff & Christensen 2002), the first as the raw map and the second over shaded relief. The layer panel now lists 15 layers (it listed 12): 3 Topographic, 2 Optical and 10 Spectral.
- The three layer IDs (`TES_Dust`, `tes_ruffdust`, `Mars_MGS_TES_Albedo_mosaic_global_7410m`) are on the tile proxy's allow-list, and each has a row in `docs/data-sources.md`.

**Changed**
- The Spectral group's one-line description now says "Infrared, mineral, dust and albedo maps".

**Notes**
- All three are global and coarse (about 3.5 and 7.4 km/px; Trek has tiles to zoom 1, or 2 for the dust-over-relief map), like the other TES layers, so they show regional context, not walking-scale detail. They are drawn half see-through over the others.
- Found by checking the layers listed on the USGS PGM data sources page and the Mars Trek catalogue. Layers that serve no tiles, or that cover other regions (CRISM hydrous minerals, the CRISM indicator maps), were left out.

**Spec deviations**
- None.

---

## 2026-11-15 · v0.5.0 · Layers regrouped as Topographic, Optical and Spectral; A* safe paths across all of Mars

**Changed: three layer groups, all covering the whole planet (Mars Trek)**
- **Topographic:** Elevation (MOLA + HRSC colour hillshade, 200 m/px); Steep and deep ground; Safe path (A*).
- **Optical:** Viking MDIM 2.1 colour mosaic; MGS MOC colour atlas.
- **Spectral:** THEMIS daytime and night-time infrared (100 m/px); TES thermal inertia, high-calcium pyroxene, plagioclase, sheet silicates and glass; science targets (CRISM, still empty).
- Each group has a one-line description in the layer panel. Imagery always sits under the overlays drawn from data.

**Added: A* safe paths (Topographic)**
- Every planned route, and any mission picked on the map or globe, is walked by an A* path that goes round steep ground and deep ground instead of a straight line. The map line, distance, time, gain and loss, the elevation profile, hazards and EVA all follow the path.
- Cost of a step: its length × a penalty for harder ground, plus 3.3 m per metre climbed. Never crossed: slopes of 25° or more, ground more than 60 m below the ground within 600 m (pits, channels, small craters). Steered round: the 10–25° slope bands and 15–60 m deep ground. Settings in `src/config/assumptions.ts` → `PATHFINDING`.
- Runs in a Web Worker (`src/data/pathfind.worker.ts`): slope (Horn), depth (summed-area box mean), A* in 8 directions without cutting past blocked cells, then the grid zigzag is pulled straight where the straight line is no harder going. A leg with no safe way through stays straight and says so.
- "Steep and deep ground" shades the ground round the route: slope bands in the caution, hazard and alert colours, deep ground in blue.
- The layer panel and the mission card say how the path was found and on what elevation.

**Added: elevation for the whole planet**
- `api/elevation.ts`: reads a window of the USGS global MOLA DEM (463 m/px, a 2 GB GeoTIFF on the USGS bucket) one byte range per row, thinned to 320 samples a side at most. Fixed upstream file, validated numbers only, no local imports.
- `public/data/site-dtm.tif` is now the real USGS Mars 2020 CTX DTM of Jezero (20 m/px). Routes with every stop on it use it; anywhere else uses MOLA.
- The site card gives elevation and slope anywhere on Mars, and says which model they came from.

**Removed**
- Geology (empty placeholder layer, its file, and the site card row), the grey site-DTM layer, the old MOLA 463 m colour hillshade layer (replaced by the 200 m blend) and the separate slope worker.

**Verified**
- `tsc -b`, `oxlint` and `vite build` pass.
- A* on the Jezero DTM: habitat to the delta top, the straight line crosses 29.8° ground; the safe path tops out at 13.1° for 130 m extra. Delta to the western rim: 30.5° straight, 15.0° safe. Whole 2.4 M-cell grid in about 0.5 s.
- A* on MOLA, Valles Marineris plateau to canyon floor: the straight line crosses impassable cliffs and deep ground; the safe path stays under 22.2°.
- In the app (headless Chrome): a planned route at Jezero and one just off the DTM (MOLA) both draw the safe path, with the hazard shading, profile and stats following it.
- `api/elevation`: Jezero matches the CTX DTM range; Olympus Mons tops out at 21,241 m; bad areas get a 400.

**Not verified**
- Picking a saved mission: the database had no missions to pick, so the mission path ran only through the same code as the planner.

---

## 2026-11-14 · v0.4.0 · Site map merged into the globe's 2D map; its tab removed

The site map (Explore / Plan Marswalk / EVA) was a separate tab with its own map. Its functions now all live on the globe's 2D map, and the tab is gone.

**Changed: the 2D map is MAPA's NASA map**
- `#/globe/2d` now uses the OpenLayers NASA map (Mars Trek tiles, site DTM and slope, geology, science targets) instead of the canvas flat map. It opens on the whole planet and zooms right down to the demo site.
- What the 2D map already did is kept on the new map:
  - every mission's start diamond, and its route when picked (or All routes);
  - a picked landing site's marker;
  - the night side for the time shown, the sunrise/sunset line and where the Sun is overhead;
  - Catalog, Missions, day-and-night playback and the 3D/2D switch.
- Under every layer sits a global colour backdrop, the Viking MDIM mosaic as the old flat map used, so the planet is never blank. The THEMIS layer shows from zoom 5 (site scale) up. The view wraps east–west and stops at the poles.

**Added on the 2D map (from the removed tab)**
- **Layers** button in the missions row, opening the NASA layers list. One of the two lists opens at a time.
- **Search** (site place names) beside Catalog.
- Clicking open ground opens the **site analysis** card, which is where you add waypoints. Clicking a route still picks its mission.
- Tools: **Plan Marswalk** opens the planner (stops, round trip, stats, EVA limit, science opportunities, save, elevation profile) over the same map. The other tools are **EVA**, **Recentre on site**, **Fit route** and **New route**.
- New addresses: `#/globe/2d/plan`, `#/globe/2d/plan/<code>` for saved missions, and `#/globe/2d/eva`. The tour covers the new controls.

**Removed**
- The Explore / Plan Marswalk / EVA pill, and their menu entries. `#/explore`, `#/plan`, `#/plan/<code>` and `#/eva` still work: they open the matching 2D-map address, and the address bar is rewritten.
- The site map mounted under every page in `App.tsx`. It is now mounted only by the 2D view.

**Spec deviations**
- Frontend Spec routes: the site map is no longer a page of its own, and the modes are reached from the 2D map's tools instead of a mode switch.
- Frontend Spec §3: `GlobePage` imports the explore, plan and EVA panels, a feature importing features. It already did this for `MissionForm`.

**Verified**
- Type check, lint and production build pass.
- Screenshots at 1400 × 900:
  - `#/globe/2d`: whole planet, night side, terminator, habitat marker, Layers / Search / Catalog / Missions;
  - `#/globe/2d/plan` and the old `#/plan`: planner panel, NASA layers and elevation profile;
  - `#/globe/2d/eva`: the "No route planned yet" screen.

## 2026-11-14 · v0.3.1 · UI matched 1:1 with the reference site (mapa-mars.vercel.app)

Compared screenshot by screenshot against the reference (its deployed site and its repository build, which are the same) and fixed every difference on the pages they share. MAPA's own screens and functions from the specs are all kept.

**Changed: shared pages now identical to the reference**
- Brand "MAPA MARS". The menu bar shows only the brand and ☰ on Home, Globe, Missions and Account; the Explore / Plan Marswalk / EVA pill appears only on MAPA's site-map screens.
- `#/` is the home page, as on the reference. **Explore moves to `#/explore`**; `#/plan`, `#/plan/<code>`, `#/eva`, `#/about` are unchanged.
- Menu order as the reference (Home, Globe, Missions, then MAPA's Explore, Plan Marswalk, EVA, About & data) with the reference's hints; account entry "Your account" / "Save and share your missions".
- Home: the reference's copy, single "Open the globe →" button, non-link feature cards, and its 1,200 px page width.
- Globe: the reference's two-line clock (PHT + MTC); Catalog and close-up header back at its positions; its tour wording.
- Buttons at the reference's size (12 × 22 px, 16 px text; outline 11 × 21 px; disabled at 35% opacity). MAPA's dense panels (site card, planner save, science list) keep a compact size.
- Menu bar padding and page offsets as the reference (48 px sides on content pages, 24 px over the globe and site map; content starts under the 70 px bar).
- Account page as the reference: sign in goes to Missions; signed in shows "Go to missions" and "Sign out". (Your missions and opening by code are on the Missions page, as in the reference.)
- Missions: "All / Other users" chips left-aligned and the heading spacing as the reference.

**Removed (extra links I had added inside the reference's pages)**
- "Open on the site map" on landing-site cards, "Open in the route planner" on mission cards, "Analyse in the route planner" on mission pages, "Plan on the site map" on the missions hub. MAPA's planner still opens any saved mission at `#/plan/<code>`.

**Fixed**
- The Layers button on the site map was squashed by the tall list under it; it no longer shrinks.

**Still different on purpose**
- The flat map shows NASA's Viking mosaic instead of the reference's generated placeholder texture (real data kept, as asked).

**Spec deviation**
- Frontend Spec §2 puts Explore at `#/`; it is now at `#/explore` so `#/` can be the home page, as on the reference.

**Verified**
- Side-by-side screenshots of Home, Globe, Missions and Account against the reference match (the only remaining difference: a mission count shows when Supabase answers). Explore, Plan and EVA still render. Lint, types and build clean.

## 2026-11-14 · v0.3.0 · Everything from the MapaMars idea bank, merged

The rest of [S-Urchin/MapaMars](https://github.com/S-Urchin/MapaMars) brought in: the 3D globe, moons, orbiters, landing-site close-up, hyperspace jump, flat map, home page and the full missions system. Code was written into MAPA's own structure, not copied in as files; where both apps had the same job, the two were merged into one. Real data from both was kept.

**Added: pages**
- `#/home`: the MapaMars home (hero, hyperspace jump into the globe, numbered features, "Right now on Mars"), with MAPA's planner listed alongside. It preloads the 3D models in idle moments.
- `#/globe`, `#/globe/2d`, `#/globe/new`: the MapaMars globe page. 3D Mars (NASA model), Phobos and Deimos (measured shapes, live positions), five orbiters (live from JPL Horizons, cards with 3D models), landing sites, mission routes, catalog, day/night playback through a sol, the Viking 1 landing-site close-up (descent, lighting, real stars and Earth, night flashlight, points of interest), flat map, tools, tour, clear view.
- `#/missions/...`: find by code, browse (open/completed, all/others/mine), your missions, mission view with crew (join, leave, remove), mission log, mark complete / reopen, edit, delete, and the three-step mission planner.
- Menu: Home, Globe, Explore, Plan Marswalk, EVA, Missions, About & data.

**Added: code** (in `src/globe/` for three.js and the flat map, `src/data/` for science, `src/features/globe|missions|home/` for pages)
- `globe/`: `MarsGlobe`, `SiteTerrain`, `siteSceneBuild`, `siteSky`, `skyObjects`, `marsModel`, `marsTexture`, `moonModel`, `landerModel`, `orbiterModel`, `surfaceDetail`, `adaptiveResolution`, `Hyperspace`, `MarsMap2D`, `mapView`, `missionRoute`.
- `data/`: `marsSky` (full sky model: Sun, planets, moons, transits, seasons), `marsMoons`, `moonEphemeris`, `orbiters`, `siteScenes`; landing sites and landmarks in `data/mars.ts`.
- `api/horizons.ts`: JPL Horizons proxy (fixed bodies, day within a year, GET only, cached a day, no local imports). Served by Vite in dev/preview like the tile proxy.
- `services/missionEntries.ts`, `hooks/useMissions.ts` (live reload on database broadcast, every minute, and on tab return), `lib/missionPaths.ts`, `lib/warp.ts`, `components/SearchBox`, `components/FlagIcon`.
- `public/resources/`: NASA's Mars, Viking lander and orbiter models, the Phobos/Deimos shape files, the Yale Bright Star Catalogue and the Draco decoder (binary data, copied as-is: 22 MB).
- Dependency: `three` (+ `@types/three`).

**Merged (one version instead of two)**
- Missions: one `services/missions.ts`. A `Mission` carries both the MapaMars fields (start, phases, end, crew count, completion) and MAPA `stops`, built from the same row. The flat-map planner, the mission pages and MAPA's route planner all save through the same `toRow`, so a walk planned in one opens in the others (`#/plan/<code>` ↔ `#/missions/<code>`).
- Sky maths: MAPA's cut-down `marsSun.ts` removed; `daylight.ts` uses the full `marsSky.ts`, and now also has the MapaMars terminator, `sunAt`/`sunElevationAt`, `formatAhead`/`formatOffset`.
- Icons and tools dock: one `Icon` set (menu + globe icons) and the MapaMars `ToolDock` (tour, show/hide interface) used by every page.
- Tour steps: all tours (site map, globe, flat-map planner) in `config/tourSteps.ts`.
- Flat map imagery: **real NASA data instead of the MapaMars placeholder**. The whole-planet picture is stitched from the Viking MDIM 2.1 colour mosaic (32 Trek tiles through `api/tiles.ts`, offline copies as fallback); the generated texture shows only until it loads.
- Live clock: the globe uses MAPA's `LiveClock` (PHT, MTC, sol, plus local time and daylight at the demo site).
- Landing-site card has "Open on the site map" (to MAPA's NASA-layer map); mission card and view have "Open in the route planner".

**Changed**
- CSP `script-src` gains `'wasm-unsafe-eval'`: the Draco decoder for two orbiter models compiles WebAssembly. It does not allow JavaScript `eval`.
- `.oxlintrc.json` ignores `public/**` (the minified Draco decoder) and `dist/**`.

**Spec deviations**
- The Gen Spec leaves the 3D globe, moons and orbiters out of scope; they are in at the team's request. The Marswalk core (`#/`, `#/plan`, `#/eva`) is unchanged.
- `features/globe/GlobePage` imports `features/missions/MissionForm` (the full-screen planner), as MapaMars does; this is the one feature-to-feature import. Everything else shared moved to `lib/` and `components/`.
- MapaMars's `config/nasaData.ts` (empty "connect a URL" placeholders) was not brought over: MAPA's layer registry and `api/tiles.ts` already serve the real data it was waiting for.

**Verified**
- `npm run lint` clean, `npm run build` passes, `npm audit` 0 vulnerabilities.
- Horizons proxy on `npm run preview`: Phobos and MRO tables load live (200); unknown body or a day outside ±1 year → 400; POST → 405.
- Screenshots (headless Chrome, software WebGL): the globe with NASA's model, landing sites, live orbiters (Odyssey, TGO, MRO) and orbit lines; the flat map with the Viking mosaic, night side and day/night line; home; missions hub.
- Mission conversion, route, slope, format and Sun tests still pass.

**Not verified**
- Clicking through in a real browser: the landing-site descent, moon fly-to, orbiter model cards, mission create/join/log against Supabase, and the Draco-compressed models under the deployed CSP.

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

- Pushed to GitHub: https://github.com/ProcX4/MapaMarso (`origin`, `main` tracks `origin/main`; first pushed as S-Urchin/MapaMarso, since moved).

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
