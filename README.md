# MAPA — Marswalk Analysis & Planning Assistant

NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map.

The specs are the source of truth:

- [Gen Spec.md](Gen%20Spec.md): scope, data, design tokens, demo story
- [Frontend Spec.md](Frontend%20Spec.md): structure, state, map, rules
- [Security Spec.md](Security%20Spec.md): proxy, secrets, headers, checklist
- [docs/MAPA_Marswalk_Product_Specification.md](docs/MAPA_Marswalk_Product_Specification.md): the product spec from the MapaMars idea bank

Tracking files:

- [placeholders.md](placeholders.md): every stand-in value or dataset still to replace
- [changes.md](changes.md): history of changes
- [docs/data-sources.md](docs/data-sources.md): per-dataset credits

## Run

```powershell
.\Launch.ps1            # Windows: installs on first run, starts the dev server, opens the browser (-Share for your network)
```

```bash
npm install
npm run dev             # http://localhost:5173  (tile proxy runs inside Vite)
npm run lint
npm run build
npm run preview         # test the production build + CSP locally
npm run prefetch-tiles  # refresh offline demo tiles in public/tiles/
```

## Accounts and saved missions (optional)

Everything works without this; saving and opening missions by code needs Supabase.

1. In the Supabase dashboard, **SQL Editor**: paste [`supabase/schema.sql`](supabase/schema.sql) and run it (skip if the project already runs MapaMars: the tables are the same).
2. **Authentication → URL Configuration**: Site URL = your Vercel domain; Redirect URLs = that domain and `http://localhost:5173/**` only.
3. Create `.env.local` (never committed) with the project's URL and **anon / publishable** key from **Project Settings → API**, and add the same two in **Vercel → Settings → Environment Variables**:

   ```
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-or-publishable-key
   ```

   Never use the `service_role` key here: anything starting with `VITE_` is public.

## Where things are

```text
api/tiles.ts               Mars Trek tile proxy (fixed host, allow-listed layers)
api/horizons.ts            JPL Horizons proxy (moon and orbiter positions)
supabase/schema.sql        Accounts and missions tables, with Row Level Security
src/config/                Demo site, assumptions, Trek allow-list, tour steps
src/state/                 Reducer (the one place state changes), auth and derived contexts
src/map/                   The single OpenLayers site map, Mars projection, layer registry
src/globe/                 three.js globe, moons, orbiters, landing-site close-up, flat map of Mars
src/data/                  Elevation (COG), slope worker, route maths, Mars time, Sun and daylight
src/services/              Supabase calls: accounts and missions
src/features/              explore · plan · eva · provenance · account · home · globe · missions
src/components/            Shared UI: menu, live clock, tools dock, tour, inputs, tags …
public/data/               Site DTM + GeoJSON (placeholders for now)
public/tiles/              Pre-fetched demo-site tiles (offline fallback)
public/resources/          NASA 3D models, moon shapes, star catalogue, Draco decoder
```
