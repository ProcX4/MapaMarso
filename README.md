# MAPA — Marswalk Analysis & Planning Assistant

NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map · Team Astroboys

MAPA turns NASA's separate Mars datasets into one layered map that helps an astronaut plan a safe, scientifically useful Marswalk, and then follow it on foot.

**Live site:** https://mapamarso.vercel.app

## What it does

- **Explore:** a NASA map of all of Mars, with walking-scale detail at Jezero Crater. Turn layers on and off, and click any point for its elevation, slope, hazards, nearby science targets and rover photos.
- **Plan a Marswalk:** place a start, waypoints and science stops. MAPA finds a safe path round steep, deep and rocky ground and shows distance, time, climb, max slope, an elevation profile and science opportunities near the route.
- **EVA:** a simplified, high-contrast view for walking the route: next stop, distance and time back to base, and one alert at a time.
- **Missions:** save a route with a code, share it with a crew and keep a log.

Every value is labelled **Observed** (straight from a NASA dataset), **Derived** (calculated from NASA data) or **Estimated** (based on stated assumptions).

## Data layers

| Group | Layers | Sources |
|---|---|---|
| Topographic | Elevation, slope, steep, deep and rocky ground, safe path (A*) | MOLA (MGS), HRSC, USGS Mars 2020 CTX DTM of Jezero (20 m), HiRISE DTMs |
| Optical | Colour mosaics, CTX (~5 m/px), HiRISE (25 cm/px at Jezero), rover photos | Viking, MGS MOC, MRO CTX and HiRISE, Perseverance |
| Spectral | Day and night infrared, thermal inertia, minerals, dust | Mars Odyssey THEMIS, MGS TES |

Science targets are Perseverance's sample sites, from NASA's Mars Rock Samples page. Imagery comes through NASA Mars Trek.

## Run it

```bash
npm install
npm run dev             # http://localhost:5173
npm run lint
npm run build
npm run preview         # test the production build locally
```

On Windows, `.\Launch.ps1` installs on first run, starts the dev server and opens the browser.

### Accounts and saved missions (optional)

Everything works without this; saving missions needs Supabase.

1. In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql).
2. Under **Authentication → URL Configuration**, set the Site URL to your domain, and the Redirect URLs to that domain and `http://localhost:5173/**` only.
3. Create `.env.local` (never committed) with the project's URL and **anon / publishable** key, and add the same two in Vercel's environment variables:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

   Never use the `service_role` key here: anything starting with `VITE_` is public.

## Where things are

```text
api/                 Server functions: Mars Trek tile proxy, JPL Horizons proxy, MOLA elevation reader, rover photos
supabase/schema.sql  Accounts and missions tables, with Row Level Security
src/config/          Demo site, assumptions, layer allow-lists, tour steps
src/state/           Reducer, auth and derived-route contexts
src/map/             The OpenLayers NASA map, Mars projection, layer registry
src/globe/           three.js globe, moons, orbiters, landing-site close-up
src/data/            Elevation, slope and A* worker, route maths, Mars time, Sun and daylight
src/services/        Supabase calls: accounts and missions
src/features/        explore · plan · eva · missions · globe · provenance · account · home
src/components/      Shared UI: menu, clock, tools dock, tour, inputs
public/data/         Jezero elevation model, rocky-ground map, science targets, place names
public/resources/    NASA 3D models, moon shapes, star catalogue
```

## Team Astroboys

| Name | Role |
|---|---|
| Jimiel | Frontend, Backend & Topographic: map and planner interfaces; terrain-data processing; elevation, slope, hazards, route analysis, and A* safe-path routing |
| Sean | Frontend, Backend, Optical & Security: UI/UX; imagery and rover-photo integrations; APIs and security; demo preparation and release support |
| Darryl | Backend & Spectral: spectral-data integration and processing; TES, THEMIS, science targets, provenance, and supporting APIs |
| Justine | Backend, Decisions & Documentation: Supabase, authentication, mission services, platform configuration, technical decisions, and project documentation |

## Licence

Code: [MIT](LICENSE). NASA data is used under NASA's media and data guidelines and each source's own terms; it is not covered by the MIT licence.
