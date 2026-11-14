# To-do sweep, 2026-11-15: what was done and how it works

Branch `daril/todo-sweep` (PR #3), one commit per item, most important first. Everything here was tested before it was committed; the test is given with each item. Nothing was pushed or merged.

## What was done

### 1. Science targets (Todo #1)
**What you see:** 27 green dots on the map at Perseverance's rock-sample sites. Click one for its name and reason. In the planner, *Science opportunities* lists the ones within 1 km of your route with a detour time and an *Add as science stop* button. The site card lists targets within 500 m of a clicked point.

**How it works:** `public/data/science-targets.geojson` is built by `npm run build-science-targets` (`scripts/build-science-targets.mjs`). The sample facts (name, target rock, sol, area, rock type) are copied from NASA's Mars Rock Samples page and kept in a table in the script. Each position is the rover's last stop on or before the sol the core was sealed, read from NASA's published stop list (`M20_waypoints.json`). The rover's next stop is never more than 263 m away, so every point is within about 300 m of the real hole and most are within 100 m. Roubion (an air sample) and two samples whose sol NASA lists as "TBD" are left out. The layer's provenance now says "Perseverance rock cores", not CRISM, and the placeholder tag is gone.

**Tested:** the real loader returns 27 targets, each with a reason and a source. A synthetic walk from the habitat past the Sid cores found Ha'ahóni and Atsá 2 m off route and the Brac, Issole and Rochette samples within 1 km, each with a detour time.

**Not done:** orbital CRISM detections (no usable tile source for Jezero). The targets are real, citable and at the right place, but they are rover cores, not orbital mineral detections.

### 2. Sources for the mobility and safety assumptions (Todo #6)
`docs/assumptions-sources.md`. It records, for each of A1–A4, the real figure, the source and **how well it was checked**. No values were changed. The finding that needs a team decision: a NASA document lists **20°** as the suit's slope capability, while MAPA treats 20–25° as "avoid" and only 25° and over as impassable. Two figures (the Apollo walking speed and that 20°) were seen only in search summaries because the PDFs could not be opened here: confirm them before citing.

### 3. EVA: return time as a clock time, and an off-route warning
**What you see (EVA screen):** under *Back to base*, "Back at base about 16:42 LMST". A *Simulated drift off the route* slider; past 30 m a "OFF ROUTE · 89 m from the planned path · head back to it" alert appears.

**How it works:** the arrival moment is the real current time plus the walk back (`simMs + toBaseMin`), turned into local mean solar time at the base's longitude with the same Mars-clock code the rest of the app uses (`lmstAt` in `src/data/mars.ts`). The simulated position is always on the route, so the slider moves it to the right of the heading (`offsetFromHeading`); the off-route distance is to the nearest sampled route point (10 m steps). The 30 m limit is a new ESTIMATED assumption, A14.

**Tested:** a Mars hour is 1.027 Earth hours, and the code advances LMST by 0.9732 Mars hours per Earth hour, as expected. East longitude adds 6 h per 90°. 100 m to the right of a north-facing heading lands 100 m away at bearing 090°, and facing east it lands at 180°. In the running EVA screen: 20 m of drift gives no alert, 100 m gives the OFF ROUTE alert, and back to 0 clears it.

### 4. Route export
**What you see:** *Export route* in the planner, with a *Download route (GeoJSON)* button (disabled until the route has two stops).

**How it works:** `src/data/exportRoute.ts` builds a GeoJSON file in the browser: one line for the walked path (longitude, latitude and elevation in metres) plus one point per stop, with distance, duration, gain, loss, slopes and which legs used the safe path. It says in the file that the coordinates are on Mars, not Earth. Nothing is sent anywhere. The file name is made from the mission name with letters, digits and hyphens only.

**Tested:** the downloaded file has 1,432 path points with elevations, 3 stops and the right distance and slope; hostile names such as `<img src=x onerror=alert(1)>` and `../../etc/passwd` become harmless file names.

### 5. Security checks (the ones that can be run from here)
- `npm audit`: 0 vulnerabilities in runtime dependencies.
- Git history over all branches: no JWTs, `service_role` keys, private keys or tokens; no `.env` file tracked except the blank `.env.example`.
- No `innerHTML`, `eval` or similar anywhere in `src` or `api`.
- Live site: CSP, nosniff, referrer policy, permissions policy and HSTS are all present.
- **New `npm run check-api-abuse`:** sends 20 bad requests to the three API handlers (unknown layer, path traversal, wrong extension, out-of-range coordinates, injection text, wrong method) and a valid one, and checks each answer. It found one real bug, fixed: `/api/rover-photos` with no parameters answered 200 as if the point were 0°, 0° (`Number(null)` is 0); it now answers 400.
- `vercel.json` now sets `installCommand` to `npm ci`.
- The About page now says there is no delete-account button yet, how to ask, and what deletion removes (checked against the `on delete cascade` links in `supabase/schema.sql`).

### 6. Docs
- `Gen Spec.md`: tech stack says OpenLayers, the data table's status column is filled in, and a new *Deviations from this spec* section records the four deviations (three layer groups, whole planet, routes under `#/globe/2d`, email confirmation off).
- `placeholders.md`: P5 done; A1–A4 researched; A14 (off-route distance) and A15 (radiation) added.
- `docs/data-sources.md`: science targets and radiation rows filled in.
- `CHECKLIST.md`: every finished item ticked, with the evidence.

### 7. Radiation panel (Todo #2)
**What you see:** a *Radiation* panel in the planner: "Dose on this walk ≈ 0.20 mSv", tagged ESTIMATED, with the caveats in the tag's tooltip.

**How it works:** 0.67 mSv per day (galactic cosmic rays; Curiosity's RAD at Gale crater, Hassler et al., *Science* 2014; seen in a search summary of the press release) times the walk's duration. The caveats: it was measured at another place (Jezero is about 1.8 km higher, so slightly less air above it), inside a rover, near solar maximum, with no suit shielding and no solar storms. **It is not a live space-weather feed.**

**Tested:** a 7 h 18 min walk shows 0.20 mSv (0.67 × 438 ÷ 1,440 = 0.204); the panel is hidden when there is no route.

## Added after the first pass

### 8. Place-name search (P6)
**What you see:** typing in the search box finds any of Mars's 2,055 IAU names; picking one flies there at a zoom that fits the feature and opens the site card. Typing nonsense says "No place with that name".
**How it works:** `scripts/build-gazetteer.mjs` downloads the USGS Mars nomenclature shapefile, reads its attribute table directly (needs the `unzip` command), and writes `public/data/gazetteer.json` (88 KB: name, longitude, latitude, type, diameter). The file uses 0 to 360 °E; the script converts to -180 to 180. `src/data/gazetteer.ts` loads it on first keystroke, ignores accents, ranks names that start with the query first, and picks a zoom from the diameter (`log2(11083 / km)`, between 2 and 12). NASA's own name for the landing site is kept in `src/config/site.ts` and marked "not an IAU name".
**Tested:** Jezero (77.687°E, 18.408°N), Gale (137.811°E, -5.367°S), Olympus Mons (-133.8°E, 18.65°N) and Valles Marineris all match their published positions. In the app, searching Gale opened the site card at 5.367°S, 137.811°E. It also showed the old hand-typed Jezero point had been 0.1° off.

### 9. Site comparison
**What you see:** *Pin to compare* on the site card. After pinning, click elsewhere or search a name and a table shows the pinned point and this point side by side, with the distance, bearing and height difference. *Show pin*, *Clear pin* and *Pin this point instead* manage it.
**How it works:** the pinned point is app state (`pinned`), compared using the same elevation and slope lookups the site card uses, so the numbers are the same ones you'd see by clicking each point.
**Tested:** Jezero pinned, then Neretva Vallis: 28.6 km apart at bearing 287° and +698 m, which matches a hand calculation (0.487° of longitude at 18.5°N plus 0.142° of latitude).

### 10. Keyboard audit, Esri terms, offline tiles
- **Keyboard:** a script checked every visible control on five pages: all have names, all are reachable, none are fake buttons, all images have alt text. Visible focus comes from a global rule; the daylight bar uses a glow ring on its thumb instead. A human tab-through with a screen reader is still worth doing.
- **Esri terms:** the service says `accessInformation: None` and credits "NASA/JPL/MSSS/Caltech Murray Lab/Esri", and the Murray Lab allows free use with credit. No separate Esri terms turned up, so it stays open (CHECKLIST §2). The service is the preliminary beta01 mosaic.
- **Offline tiles:** sizing in CHECKLIST §2. CTX for the base area is cheap, HiRISE is the costly one. It needs a decision.

## What was not done, and why

| Item | Why |
|---|---|
| GitHub secret scanning, Dependabot, branch protection | These are repository settings an admin changes in GitHub. Changing repo security settings was not asked for, so I left them. Settings → Code security, and Settings → Branches |
| Supabase: password length, redirect URLs, rate limits, confirm RLS, `join_mission` rate limit and join log, explicit policies | Dashboard settings or SQL that has to be run on your Supabase project. I can write the SQL if you want, but cannot apply or test it here |
| Demo site (Jezero or Gale), real habitat spot, team names and roles, licence, sound default | Team decisions. I did not pick for you |
| Agree the A* limits (25° impassable, 60 m deep) | Waits on the 20° decision above |
| CRISM mineralogy tile layer | No source serves tiles for Jezero (checked 2026-11-15) |
| Site card mineral and hydration rows | Need orbital mineral data for the point, which does not exist in the app yet |
| Landing-site close-ups for other sites | Larger; only Viking 1 has one. Not started |
| Esri terms (settled), offline CTX/HiRISE tiles | Researched (section 10), but a legal reading and a design decision remain |
| Demo rehearsal, "show a teammate", a human tab-through, branch-per-feature habits | Need a person |
| Geology layer, rover traverse layer, hazard shading beyond the route | Out of scope or a decision |

## How to check it yourself
```bash
npm run lint && npm run build        # both should pass
npm run check-upstreams              # CTX, HiRISE and rover photos still reachable
npm run check-api-abuse              # the API handlers refuse bad requests
npm run build-science-targets        # rebuilds the target file from NASA's data
npm run dev                          # http://localhost:5173
```
Then in the app: open `#/globe/2d/plan`, click the map, choose *Add waypoint*, and look at the Radiation, Science opportunities and Export route panels; open `#/globe/2d/eva` and move the two sliders.
