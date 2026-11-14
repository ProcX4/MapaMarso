# Challenge requirements: Interplanetary Survival Guide: Martian Map

Source: the official NASA Space Apps Challenge 2026 page, read on 2026-11-15.

- Details tab: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/
- Resources tab: https://www.spaceappschallenge.org/2026/challenges/interplanetary-survival-guide-martian-map/?tab=resources

Official deployed version: https://mapamarso.vercel.app (the user first gave "mapomarso", which returns `404 DEPLOYMENT_NOT_FOUND`; they then confirmed "mapamarso" is correct). The live check is in the section "Live-site check" at the end of this file.

Difficulty: Intermediate. Subjects: Human Exploration, Mars, Planets & Moons, Software, Space Exploration.

The page text is paraphrased below, with a few short quotes. The page says more resources may be added before the hackathon, so re-check the Resources tab.

**What the page does not contain.** It lists no judging criteria, no formal deliverable list (file formats, video, submission form) and no hard constraints. Almost every line is phrased "may" or "might". Only R-D1 and R-D2 are firm; the rest are strong hints. Judging criteria and submission rules would be in the general Participant FAQs and Guides (https://www.spaceappschallenge.org/resources/participant-faqs/), which were **not** read for this file.

---

## Part 1 · Details tab

### Summary

Create a layered, integrated view of a location or route on Mars. It should combine data from several NASA science missions and help a human explorer plan and carry out a Marswalk while doing new science.

### Objectives

| ID | Requirement | Strength |
|---|---|---|
| R-D1 | Build a map, tool or interface that a Mars astronaut could use during a surface exploration mission, using NASA data and tools. | Must |
| R-D2 | The view must be hyperlocal: the area of one spacewalk or surface excursion. Existing tools (Mars Trek, the USGS-NASA Planetary Geologic Mapping Program) are regional or global, and this gap is the point of the challenge. | Must (the gap to fill) |
| R-D3 | Pick scientific goals for the mission and a location that suits them. Example: boxwork formations, which Curiosity studied in 2025, near Mount Sharp. | Suggested |
| R-D4 | The location may be one a rover has studied heavily (lots of data and imagery), or a less-studied area as an extra challenge. | Suggested |
| R-D5 | Combine at least three kinds of data, layered or merged so they help navigation. The page's examples are optical, thermal, spectral, topographic, geophysical, atmospheric, radiation and chemical. | Strongly suggested ("at least three") |
| R-D6 | Put astronaut safety first: show what helps a crew move safely through unfamiliar ground. | Priority |
| R-D7 | Consider Mars's different radiation environment, for example by including space weather data. | Suggested |
| R-D8 | Consider that suited astronauts, possibly carrying equipment, have limited mobility. | Suggested |
| R-D9 | If possible, include a route map showing where the astronaut travels to reach the science objectives while avoiding significant obstacles such as large rock formations. | Suggested ("if possible") |

### Potential considerations (optional)

| ID | Consideration |
|---|---|
| R-D10 | Format is open: a display inside the spacecraft or habitat, a tablet the astronaut carries, a helmet-visor HUD, or something else. |
| R-D11 | Output may be a static snapshot, an interactive product, or a system that generates maps for different locations or data types. |
| R-D12 | Look at similar maps from NASA missions to the Earth, the Moon, other planets and exoplanets for inspiration. |
| R-D13 | Time frame is open: a past period, a predicted future one, or none (for stable data such as topography and geology). |
| R-D14 | Use imagery from NASA's Mars surface missions to show what the astronaut will see on arrival (point-of-view images at destinations). |
| R-D15 | Consider whether the mission uses rovers or robots to carry the crew and tools, or whether astronauts work in pairs. |

### Background points that shape the design

- Humans can do science that robots cannot: they make connections and apply context in real time.
- Current human exploration focuses on the Moon (Artemis); this challenge looks ahead to Mars.
- Mars data is rich, but it is not layered in the combinations that planning a specific human mission needs.

---

## Part 2 · Resources tab

The tab carries a standard NASA notice: NASA does not endorse non-U.S.-Government sites, and participants must follow each site's own data-use terms (R-R0).

| ID | Resource | What the page says it is | MAPA's use |
|---|---|---|---|
| R-R0 | Data-use terms of every external site | Participants must comply with each site's own data-use parameters. | Per-layer licence column in `docs/data-sources.md` |
| R-R1 | JPL Mars Trek, https://trek.nasa.gov/mars/ | Web portal for exploring Mars, with data from landing sites. | Main tile source (via `api/tiles.ts`) |
| R-R2 | USGS-NASA Planetary Geologic Mapping Program, https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars | Standard, high-quality geologic map of Mars. | Geology layer was **removed** (empty placeholder). USGS DEMs are used for elevation. |
| R-R3 | Curiosity's proposed path up Mount Sharp, https://science.nasa.gov/resource/curiositys-proposed-path-up-mount-sharp/ | Example route-map visual: an animated route with labelled regions of interest and a flyover video. | Inspiration for the route display |
| R-R4 | NASA Worldview, https://worldview.earthdata.nasa.gov/ | Satellite imagery of Earth, past and present (part of NASA Earthdata). | Not applicable to Mars; Earth data only. Not used. |
| R-R5 | Mars Perseverance Raw Images Gallery, https://mars.nasa.gov/mars2020/multimedia/raw-images/ | Over 1 million images from the rover. | Only a link constant in `src/config/site.ts`. No image is shown. |

---

## Part 3 · Gap analysis

Compared against Gen Spec.md, Frontend Spec.md, Security Spec.md, `placeholders.md`, `docs/data-sources.md` and the code at commit `bb6e705`. The live site (https://mapamarso.vercel.app) was checked separately; see "Live-site check" below. Its results match this table.

Status key: **Covered** = in the specs and working in code. **Partial** = in the specs or partly built, but incomplete or placeholder. **Missing** = in neither.

| ID | Requirement | Status | Evidence and gap |
|---|---|---|---|
| R-D1 | Astronaut map or tool from NASA data | Covered | Planner, EVA view and 2D map are built (`changes.md` v0.4.0, v0.5.0). |
| R-D2 | Hyperlocal view | Partial | The map zooms to walking scale, but the sharpest imagery is THEMIS at 100 m/px. The Jezero DTM is 20 m/px. No CTX or HiRISE imagery (`placeholders.md` P3), so the ground looks coarse at walking scale. |
| R-D3 | Scientific goals and a matching location | Partial | Jezero is chosen as a placeholder (D1). The science-targets file is empty (P5), so no stated goal drives the demo. |
| R-D4 | Well-studied or new location | Covered | Jezero, with Perseverance data. |
| R-D5 | At least three data kinds layered | Covered | Topographic (MOLA/HRSC, CTX DTM, slope), optical (Viking, MOC) and spectral/thermal (THEMIS, TES). All but the first group are global at coarse resolution. |
| R-D6 | Safety first | Partial | Slope and depth hazards, A* path, EVA hazard alerts and return margin exist. There is no rock or boulder hazard, and no radiation or dust-storm hazard. |
| R-D7 | Radiation / space weather | **Missing** | Only a checkbox in Gen Spec ("If time allows"). No code or data source. |
| R-D8 | Suited-astronaut mobility | Partial | Walking speed and climb penalty are assumptions (A1, A2) and the slope bands are untested (A4). None are sourced. The planner takes no account of carried equipment or pairs. |
| R-D9 | Route avoiding obstacles such as large rocks | Partial | A* routes round slope and depth. Rocks and boulders are not in any layer, so the route can cross them. |
| R-D10 | Format (habitat display, tablet, HUD) | Partial | Web app; the EVA view targets a landscape tablet (Frontend Spec §8). There is no HUD or visor mode. |
| R-D11 | Static, interactive or generator | Covered | Interactive, and it works for any location through global MOLA and the A* worker. |
| R-D12 | Look at other NASA maps | Missing (low) | Nothing in the specs records this research. |
| R-D13 | Time frame | Covered | Live Mars time, day and night, sunrise and sunset (`src/data/daylight.ts`). No predicted atmospheric data. |
| R-D14 | Point-of-view photos at destinations | **Missing** | Gen Spec lists it under "If time allows". Only a link constant `SITE.rawImagesUrl` exists, and nothing uses it. |
| R-D15 | Rovers or crew in pairs | Missing (low) | Not in the specs. Gen Spec drops rover control as out of scope. |
| R-R0 | Honour each source's data-use terms | Partial | `docs/data-sources.md` lists the licence per layer. The science-targets row is TBD. `api/elevation.ts` reads a 2 GB USGS file; its terms and load are not recorded. |
| R-R1 | Mars Trek | Covered | 9 tile layers via `api/tiles.ts` (see `docs/data-sources.md`). CTX, HiRISE and CRISM mosaics are listed in Trek but serve no EQ tiles. |
| R-R2 | USGS geologic map | Partial | Removed on 2026-11-15 because the layer was empty. Not replaced. |
| R-R3 | Curiosity route-map example | Partial | MAPA draws and profiles a route, but without labelled science regions or a flyover. |
| R-R4 | NASA Worldview | Not applicable | Earth only. |
| R-R5 | Perseverance raw images | **Missing** | Same as R-D14. |

### Top gaps, in suggested order

1. **Science content (R-D3, R-D9 partly, R-R2).** `science-targets.geojson` is empty, so the demo has no science goal. Filling it with real, cited targets (CRISM hydrated minerals, delta, carbonates) also restores a geology or science layer. This is the biggest gap against the challenge's "conducting new and exciting science" theme.
2. **Radiation and space weather (R-D7).** The challenge names it as a safety example, and nothing exists. A minimal option is an estimated, labelled panel with a cited source, which fits the Observed/Derived/Estimated rule.
3. **Point-of-view images (R-D14, R-R5).** Show Perseverance raw images near each waypoint or destination. The link constant is already in `site.ts`.
4. **Rock and boulder hazards (R-D9, R-D6).** Add a rock abundance or obstacle layer, then feed it into the A* cost. Candidates were not looked up for this file.
5. **Walking-scale imagery (R-D2).** Find a CTX or HiRISE source that serves tiles (`placeholders.md` P3).
6. **Sourcing the mobility assumptions (R-D8).** Cite walking speed, slope limits and EVA length (A1–A4) so they stop being guesses.

Housekeeping, not challenge requirements: the specs link to `../README.md`, `FRONTEND.md` and `SECURITY.md`, and the files are named differently. Gen Spec still says the map library is "TBD".

---

## Part 4 · Live-site check

Site: https://mapamarso.vercel.app. Checked on 2026-11-15 in the built-in browser (1400 × 900) and with `curl`.

### What the live site does

| Check | Result |
|---|---|
| Loads | Yes. `#/globe/2d` shows the 2D NASA map with the night side, Catalog, Search, Layers, Mission and the 3D/2D switch. |
| Layers | 12 layers in Topographic, Optical and Spectral, with the same names, categories (Observed or Derived) and resolutions as `src/map/layers/registry.ts` and `docs/data-sources.md`. |
| Science targets | The layer shows "No data loaded" and a PLACEHOLDER tag. `/data/science-targets.geojson` is 167 bytes, the same size as the repo's empty file. |
| Site card | Clicking open ground at Jezero gave coordinates, elevation (−2,679 m, Jezero CTX DTM, 20 m/px), slope (0.9°), "Targets: None within 500 m", a terrain hazard line, and Add waypoint, Add science stop and Route here. |
| Route planning | Route here from the habitat drew a route and gave a 34.4 km round trip, 17 h 58 min (estimated), gain and loss 455 m, max slope 9.8°, difficulty Easy, an elevation profile and "Steep and deep ground" shading. |
| EVA | `#/globe/2d/eva` shows a simulated position, "No alerts", the next stop (17.2 km, bearing 128°), back-to-base time and EVA time left, with NEXT, SCIENCE, ROUTE and RETURN TO BASE actions, all labelled as a simulation. |
| Server side | `/api/tiles/…` returns a JPEG for a valid tile and `400` for `UnknownLayer` (Security Spec pre-demo check). `/api/elevation` returns data for a valid area and a clear `400` message for bad parameters. `/api/horizons` with no parameters returns `400`. `/data/site-dtm.tif` is served (9.66 MB, the same size as the repo file). |
| Security headers | CSP, `X-Content-Type-Options`, `Referrer-Policy` and `Permissions-Policy` are present and identical to `vercel.json`. |
| Radiation, space weather, dust, photos | None of these words appear in the 2D map, planner or EVA text. |

### Requirements the live site meets

Same result as the gap table above: **R-D1, R-D4, R-D5, R-D11, R-D13** are met live. **R-D2, R-D3, R-D6, R-D8, R-D9, R-D10, R-R0, R-R1, R-R3** are partly met, for the reasons already given. **R-D7, R-D14 and R-R5** are not met: no radiation or space-weather panel and no rover photos anywhere on the site. R-R2 (geologic map) is not on the live site either.

### Differences between the live site and the repo

None found in the features checked. The live layer list, A* route, planner, EVA, headers and data files all match the repo at `bb6e705` (v0.5.0).

Limits of this check:
- I did not compare the deployed JavaScript bundle with a local build, so I cannot prove the deployment is exactly commit `bb6e705`. The A* wording and the three layer groups from v0.5.0 are live, so it is at least v0.5.0.
- The saved-mission, sign-in and account flows were not tried (they need an account).
- The 3D globe, the home page and the Missions page were not inspected.
- One small spec drift in the repo, not the live site: the CSP in Security Spec §5 has no `'wasm-unsafe-eval'`, but `vercel.json` (and so the live site) does.
