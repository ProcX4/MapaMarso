# MAPA — Marswalk Analysis & Planning Assistant

NASA Space Apps Challenge 2026 · Interplanetary Survival Guide: Martian Map.

The specs are the source of truth:

- [Gen Spec.md](Gen%20Spec.md): scope, data, design tokens, demo story
- [Frontend Spec.md](Frontend%20Spec.md): structure, state, map, rules
- [Security Spec.md](Security%20Spec.md): proxy, secrets, headers, checklist

Tracking files:

- [placeholders.md](placeholders.md): every stand-in value or dataset still to replace
- [changes.md](changes.md): history of changes
- [docs/data-sources.md](docs/data-sources.md): per-dataset credits

## Run

```bash
npm install
npm run dev             # http://localhost:5173  (tile proxy runs inside Vite)
npm run lint
npm run build
npm run preview         # test the production build + CSP locally
npm run prefetch-tiles  # refresh offline demo tiles in public/tiles/
```

## Where things are

```text
api/tiles.ts               Mars Trek tile proxy (fixed host, allow-listed layers)
src/config/                Demo site, assumptions, Trek allow-list
src/state/                 Reducer (the one place state changes) + derived contexts
src/map/                   The single OpenLayers map, Mars projection, layer registry
src/data/                  Elevation (COG), slope worker, route maths, vector data
src/features/              explore · plan · eva · provenance
src/components/            Shared UI (Button, Switch, Panel, Stat, ProvenanceTag …)
public/data/               Site DTM + GeoJSON (placeholders for now)
public/tiles/              Pre-fetched demo-site tiles (offline fallback)
```
