# MAPA — Marswalk Analysis & Planning Assistant

**NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map**

MAPA turns NASA's separate Mars datasets into one layered map that helps an astronaut plan a safe, scientifically useful Marswalk, and then follow it on foot.

> MAPA doesn't just answer *"What does Mars look like?"*
> It answers ***"How should we explore this part of Mars?"***

---

## The challenge in one paragraph

Tools like JPL's Mars Trek and the USGS geologic maps work at regional and global scale. Astronauts on a surface walk need a **hyperlocal** view instead: a few kilometres around the habitat, with at least three kinds of NASA data layered together, a route that avoids hazards, and science targets along the way. Astronaut safety comes first.

## What MAPA must answer

A finished demo lets a user answer these eight questions on one screen:

1. Where am I going?
2. How far is it?
3. What terrain will I cross?
4. How steep is the route?
5. What hazards should I know about?
6. What science targets are nearby?
7. Which NASA datasets support this information?
8. How do I get back to base?

---

## Scope

### Demo site

> **Decided: Jezero Crater (Perseverance).** Everything at walking scale is built for it: the 20 m CTX elevation model, HiRISE imagery, the rocky-ground map and the 27 sample-site science targets.
>
> | Candidate | Why | Ground-level images |
> |---|---|---|
> | **Jezero Crater (Perseverance)** ✔ | Delta deposits, clays and carbonates; strong astrobiology story | Mars 2020 raw images |
> | Gale Crater / Mount Sharp (Curiosity) | Boxwork formations (named in the challenge), layered sediments | MSL raw images |
>
> One site means one high-resolution elevation tile instead of global data, and a demo story judges can follow.

### Three modes

| Mode | Purpose |
|---|---|
| **Explore** | Pan and zoom the site, toggle NASA layers, click any point for a site card |
| **Plan Marswalk** | Start → waypoints → science stops → end or return; distance, elevation profile, slope, hazards |
| **EVA** | Simplified high-contrast view: next waypoint, distance to base, return estimate, hazard alerts |

### Out of scope

A colony simulator, landing or trajectory planner, rover control, life-support simulation, or a generic 3D globe. These can add context but must not take build time from the core.

---

## MVP checklist

Build in this order. Each item should work end to end before starting the next.

- [x] Map of the demo site with NASA orbital imagery as the base layer (CTX, and HiRISE at Jezero)
- [x] **Layer 1 — Elevation** (CTX elevation model of Jezero at 20 m/px; MOLA elsewhere)
- [x] **Layer 2 — Slope** (derived by MAPA from the elevation model, plus rocky ground from 1 m HiRISE elevation models)
- [x] **Layer 3 — Science**: met by the Spectral group instead (TES minerals and dust, THEMIS, Perseverance sample sites); geologic units and CRISM are not in (see Deviations)
- [x] Layer toggles and opacity control
- [x] Site card on click: coordinates, elevation, slope, nearby science targets, rover photos, source dataset (no geology row; see Deviations)
- [x] Route: start, waypoints, science stops, end / round trip
- [x] Route stats: distance, elevation gain/loss, max slope, estimated duration
- [x] Elevation profile under the map, linked to the route on hover
- [x] Data provenance panel for every layer

### If time allows

- [x] Hazard warnings (slope above a threshold along the route)
- [x] Terrain-aware routing (A* round steep, deep and rocky ground)
- [x] Science opportunity cards ("hydrated minerals 420 m off route, +11 min detour")
- [x] Traverse safety envelope (how far you can go and still return in time)
- [x] EVA mode
- [ ] Historical rover traverse layer (out of scope; see Deviations)
- [x] Rover point-of-view photos at waypoints ("what you'll see when you arrive")
- [x] Space weather / radiation panel (an estimate from Curiosity's RAD, not a live feed)

---

## Data

| Layer | Instrument / mission | Type | Status |
|---|---|---|---|
| Surface imagery | HiRISE or CTX, Mars Reconnaissance Orbiter | Observed | ☑ CTX (whole planet) and HiRISE (Jezero) |
| Elevation | HiRISE/CTX elevation model (site); MOLA, Mars Global Surveyor (context) | Observed | ☑ |
| Slope | Calculated from elevation | Derived | ☑ |
| Geology | USGS Geologic Map of Mars (SIM 3292) or a local map | Observed | Out of scope (see Deviations) |
| Mineralogy | CRISM, Mars Reconnaissance Orbiter | Observed | ◐ TES mineral maps and Perseverance sample sites are in; CRISM is still to add |
| Thermal | THEMIS, Mars Odyssey | Observed | ☑ |
| Rover traverse | Perseverance / Curiosity (PDS) | Observed | Out of scope (see Deviations) |
| Walk duration, return time | Distance + slope + assumed walking speed | Estimated | ☑ |

For each layer, record the **product ID, resolution, source URL, and licence** in `docs/data-sources.md` once it is in use.

### Labelling rule

Every value in the UI carries one of three labels:

- **Observed**: straight from a NASA dataset (e.g. elevation)
- **Derived**: calculated by MAPA from NASA data (e.g. slope)
- **Estimated**: based on assumptions (e.g. walking time). Always show the assumption.

MAPA never presents a physiological or life-support figure as precise.

### Practical notes

- Prefer **downloading and cropping** site data (Mars Trek, PDS) into `public/data/` over live tile services. It avoids CORS problems and works offline during judging.
- Check every source loads in a browser before building on it.

### Resources

- NASA Mars Trek: https://trek.nasa.gov/mars/
- USGS Astrogeology interactive Mars maps: https://astrogeology-usgs.hub.arcgis.com/pages/interactive-maps-mars
- NASA Worldview: https://worldview.earthdata.nasa.gov/
- Mars 2020 raw images: https://mars.nasa.gov/mars2020/multimedia/raw-images/

---

## Demo story (target: about 3 minutes)

1. **Explore**: open the demo site and turn on imagery, elevation, slope and a science layer.
2. **Choose**: click an interesting outcrop; the site card shows geology and source data.
3. **Plan**: route from habitat to the outcrop; show distance, profile, max slope.
4. **Adjust**: MAPA flags a steep section or a nearby science target; add a waypoint.
5. **EVA**: switch to the simplified view and walk the route.
6. **Return**: the return-to-base estimate stays visible the whole time.

---

## Carried over from the idea bank

From [S-Urchin/MapaMars](https://github.com/S-Urchin/MapaMars) (pre-hackathon prototype):

| Reuse | From |
|---|---|
| Product spec | `MAPA_Marswalk_Product_Specification.md` |
| Route model (start / phases / end, round trip, legs) | `src/lib/route.ts` |
| 2D map component | `src/components/MarsMap2D.tsx` |
| NASA data-source config pattern | `src/config/nasaData.ts` |
| Mars distance and time helpers | `src/data/mars.ts`, `src/lib/daylight.ts` |
| Mission codes and logs (Supabase), optional | `src/services/`, `supabase/schema.sql` |

Left behind unless time allows: 3D globe, orbiters, moon ephemeris, hyperspace transition, landing-site 3D scenes.

---

## UI & design

The new app uses the same look as the MapaMars prototype: **black background, white type, thin translucent lines, rounded floating panels, monospace numbers.** It looks like a mission console, not a consumer app. Start by copying `src/index.css` from MapaMars as is, then follow the rules below.

### Design tokens

```css
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

:root {
  /* Base */
  --black:  #000;
  --white:  #fff;
  --gray-1: rgba(255, 255, 255, 0.72);  /* body text, secondary */
  --gray-2: rgba(255, 255, 255, 0.5);   /* labels, hints, units */
  --line:   rgba(255, 255, 255, 0.16);  /* every border and divider */
  --panel:  rgba(8, 8, 8, 0.94);        /* floating cards and panels */

  /* Type */
  --sans: 'Space Grotesk', system-ui, sans-serif;
  --mono: 'IBM Plex Mono', ui-monospace, Consolas, monospace;

  /* Status accents: used sparingly, only to carry meaning */
  --ok:      #8be3a8;  /* done, active, finish, safe */
  --caution: #ffc861;  /* sun, sunrise, moderate terrain */
  --hazard:  #ff8a5c;  /* sunset, steep terrain */
  --alert:   #ff5a4f;  /* live indicator, critical warning */
  --info:    #a9cdff;  /* Earth, links to external context */

  color-scheme: dark;
}
```

Colour is never decorative. The interface is black and white, and an accent appears only when it *means* something.

### Typography

| Use | Style |
|---|---|
| Brand / nav | Sans 600, 14px, `letter-spacing: 0.2em` |
| Section labels, card kickers | Sans 11–13px, UPPERCASE, `letter-spacing: 0.14em`, `--gray-2` |
| Body text | Sans 13.5–14px, `line-height: 1.55–1.6`, `--gray-1` |
| **Every number** (coordinates, distance, elevation, slope, time) | Mono, `font-variant-numeric: tabular-nums` |
| Large stats | Mono, `clamp(26px, 4vw, 36px)` |

### Components to reuse

| Component | Look | MapaMars class |
|---|---|---|
| Top nav | Sticky, `rgba(0,0,0,0.85)` + `backdrop-filter: blur(8px)`, bottom `--line` border | `.nav` |
| Primary button | White pill (`border-radius: 999px`), black text, hover → `--gray-1` | `.button` |
| Toggle / chip | Transparent pill, `--line` border, `--gray-2` text → white on hover/active | `.toggles button`, `.hud-chips` |
| Floating panel | `--panel` background, `--line` border, `border-radius: 14px` | `.missions-panel`, `.info-card` |
| Info card | 340px wide, top right, uppercase kicker → title → divider → facts grid | `.info-card` |
| Facts grid | Two columns: grey label / mono value | `.info-card-facts`, `.kv` |
| Tag | Tiny uppercase pill, `--line` border; active = `--ok` | `.catalog-tag` |
| Live indicator | 7px red dot with pulse + uppercase label | `.live-dot`, `.live-clock-badge` |
| Switch | 36×20 pill, green when on | `.nav-switch` |
| Guided tour | Ring highlight + small card with step count | `.tour-*` |
| Scrollbars | 4px pale thumb, no track | `index.css` |

### Mapping the new features onto this style

| New feature | How it should look |
|---|---|
| **Layer panel** | Floating panel (left side); each layer is a row with a switch, an opacity slider, and an `OBSERVED` / `DERIVED` / `ESTIMATED` tag |
| **Site card** | Reuse `.info-card`: kicker `SITE ANALYSIS`, mono coordinates as title, facts grid grouped under `TERRAIN` / `SCIENCE` / `HAZARDS`, white pill buttons for *Add waypoint* / *Route here* |
| **Route stats** | `.stats` style: big mono numbers with small uppercase labels (distance, gain, max slope, duration) |
| **Elevation profile** | Thin white line on black, `--line` gridlines, mono axis labels; steep sections stroked `--hazard`, science stops as `--ok` dots |
| **Slope layer** | Transparent below the safe threshold, then `--caution` → `--hazard` → `--alert` as slope increases |
| **Provenance** | Small mono line at the bottom of every card and layer row, e.g. `MOLA · MGS · 463 m/px` |
| **EVA mode** | Same tokens, bigger: numbers at 36px+, maximum three facts on screen, one warning at a time in `--alert`, large pill buttons at the bottom |

### Rules

- Black and white first; accents only for status.
- One border style everywhere: `1px solid var(--line)`.
- Pills for actions and toggles, 14px-radius panels for content, circles for icon buttons.
- Numbers are always mono.
- Honour `prefers-reduced-motion`. MapaMars already does this; keep it.
- Panels collapse below 720px wide (the MapaMars breakpoint).

---

## Tech stack

React + TypeScript + Vite · map rendering: OpenLayers (the 2D map; the 3D globe is three.js) · optional Supabase for saved missions · deploy on Vercel.

```bash
npm install
npm run dev      # http://localhost:5173
npm run build
```

## Deviations from this spec

What the build does differently, and why (also recorded in `changes.md`):

- **Three layer groups, not geology.** The layers are Topographic, Optical and Spectral. The team narrowed the scope to these three, so the geologic units layer, the site card's geology row and the historical rover traverse layer are out of scope. Layer 3 (Science) is met by Spectral instead: TES mineral and dust maps, THEMIS, and science targets from Perseverance's sample sites. CRISM mineralogy is still to add.
- **Whole planet, not one site.** The spec asked for a few kilometres round one habitat. The map covers all of Mars; walking-scale imagery (CTX, HiRISE) and the 20 m elevation model cover Jezero only, and the route finder uses MOLA (463 m/px) elsewhere.
- **Routes live under `#/globe/2d`.** The planner and EVA are `#/globe/2d/plan` and `#/globe/2d/eva`, part of the globe's 2D map, not separate top-level pages as the Frontend Spec §2 lays out.
- **Email confirmation is off** for sign-up (Security Spec §4 asks for it on), so a new account signs in straight away.

## Team

| Name | Role |
|---|---|
| Jim | Topographic: elevation, slope, steep, deep and rocky ground, A* safe-path routing |
| Shin | Optical, security, and leads the demo |
| Daril | Spectral: TES, THEMIS and the science targets |
| Jastini | Decisions and docs |

## Licence

Code: MIT (see `LICENSE`). NASA data is used under NASA's media and data guidelines; see `docs/data-sources.md` for per-dataset credits.
