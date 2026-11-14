# MAPA · Remaining work

Handoff list, written 2026-11-15 after PR #3 merged (build v0.5.7). It is the unticked part of [CHECKLIST.md](../CHECKLIST.md), grouped by who it falls to and ordered by importance inside each group. The checklist has the detail and the evidence for everything that is already done.

Nothing here is broken: lint, build, `npm run check-upstreams`, `npm run check-api-abuse` and `npm audit` all pass on `main`. These are the things left to decide, confirm or build.

**Team:** Jim (Topographic) · Shin (Optical, Security, leads the demo) · Daril (Spectral) · Jastini (Decisions and docs) · everyone (App-wide).

---

## Before judging (do these first)

| # | What | Who | Why it matters |
|---|---|---|---|
| 1 | **Rehearse the demo end to end**: Explore, Choose, Plan, Adjust, EVA, Return, and answer the eight questions on one screen (CHECKLIST §6) | Shin, everyone | The one thing that decides how the project lands |
| 2 | **Check the deployed site by hand**: CTX and HiRISE tiles, rover photos, the new Search, Pin to compare, Radiation and Export panels, on https://mapamarso.vercel.app (CHECKLIST §2) | Shin | Everything was tested locally; the live copy was only checked by request |
| 3 | **Decide the demo site** (Jezero or Gale) and **a real habitat location** (D1, D2) | Jastini | Today the habitat is the Perseverance landing point, still named "Habitat (placeholder)" |
| 4 | **Fill in the team names and roles** (About page and Gen Spec, D5) and **add a licence file** (D6) | Jastini | The About page still says "Team: TBD" |
| 5 | **Settle the slope limit**: NASA's exploration-EVA document lists 20° as the suit's capability, while MAPA treats 25° and over as impassable and 20–25° as "avoid". Confirm the 20° in the PDF, then lower the limit or write down why 25° stays (`docs/assumptions-sources.md`) | Jim, everyone | Safety numbers should not contradict the one NASA figure we have |
| 6 | **Open and confirm two figures** seen only in search summaries: the Apollo walking speed (A1) and the 20° (A4) | Daril or Jim | They could not be read here; do not cite them until checked |
| 7 | **Name a real contact for account deletion** on the About page, or add a self-service delete (a `security definer` function plus a button) | Shin | The page says there is no button and to "ask the team", with nobody named |
| 8 | **Show each feature to one teammate who didn't build it** (Frontend Spec definition of done) | everyone | |

## Jastini · decisions and docs
- Demo site, habitat, team table, licence (rows 3 and 4 above).
- **Decide whether space sound defaults to on** (D7). It plays by default now.
- **Complete `docs/data-sources.md`** (P9): every layer needs a product ID, URL and licence. Science targets, TES, gazetteer and radiation rows are filled. Still to check: the terms and load of `api/elevation.ts`, which reads a 2 GB USGS file (byte ranges only, cached a week).
- Replace the "Team: TBD" text on the About page.

## Jim · Topographic
- **Agree the A\* limits** in `src/config/assumptions.ts` → `PATHFINDING` (25° impassable, deep past 60 m never entered). They were tuned by eye, not validated. Depends on row 5.
- **Hazard shading beyond the route:** today it covers the habitat's surroundings, then the ground round the route or picked mission. Decide whether it should follow the view anywhere on Mars.
- **Source the climb penalty** (A2, +1 min per 10 m climbed): no source was found, so either cite one or keep it labelled as the team's estimate.

## Shin · Optical, Security, demo
**Optical**
- Deployed-preview check (row 2), including that CTX lines up with the other layers at Jezero.
- **Offline demo:** decide whether to pre-fetch a small walking area. Sizing is in CHECKLIST §2: CTX for the base area is cheap, HiRISE is the costly one. Suggested: CTX for the base area, HiRISE only to zoom 15 within 1 km. Then extend `scripts/prefetch-tiles.mjs`.
- **Esri terms:** the CTX service says `accessInformation: None` and credits "NASA/JPL/MSSS/Caltech Murray Lab/Esri", and the Murray Lab allows free use with credit, but no separate Esri terms were found. Someone should read Esri's terms of use or ask. The service is the preliminary beta01 mosaic; the Murray Lab has a later V01.

**Security (CHECKLIST §8)**
- GitHub settings for `ProcX4/MapaMarso`: secret scanning and push protection, Dependabot alerts, branch protection on `main` (PR required, one review, no force-push).
- Supabase dashboard: minimum password length 8+, redirect URLs (production domain and `http://localhost:5173/**` only), sign-up and sign-in rate limits, confirm RLS shows no warning on all tables.
- Supabase SQL: explicit select / insert / update / delete policies on every table (or note that `profiles`, `mission_members`, `mission_entries` and `login_attempts` rely on deny-by-default plus RPCs), and rate-limit `join_mission` with a join log.
- **Email confirmation:** the spec says on, the team chose off. It is recorded as a deviation in Gen Spec; switch it back or accept it.
- Pre-demo: a mission named `<img src=x onerror=alert(1)>` shows as plain text everywhere (needs Supabase); the app works offline after first load; keep checking for keys in screenshots, chats and the demo video.
- **Every network call has a visible error state:** elevation and the A* path are done; check the rest (rover photos, tiles, search, saving).
- Rate limiting only if abuse shows up (a Vercel Firewall rule).

## Daril · Spectral
- **CRISM mineralogy layer.** Trek's CRISM/OMEGA hydrous-mineral map serves no tiles. A candidate source is JHU/APL's CRISM map (per-image summary products, not a tile service), or processing PDS data. Needs research first; see the notes in the session's `spectral-data-sources.md`.
- **Site card mineral and hydration rows**, shown only where the data supports them (depends on the CRISM item).
- **Orbital detections as science targets.** The 27 targets are Perseverance cores. Adding real CRISM detections (each with a citable reason) would match the original spec better.

## Everyone · app-wide
- **Landing-site close-ups for other sites** (P11), if the demo needs them. Only Viking 1 has one.
- **A human keyboard and screen-reader tab-through.** A script audit passed on five pages, but a person should try it.
- **Working habits:** lint and build before every push, one branch per feature and a PR with one reviewer (work has often gone straight to `main`).

---

## Out of scope on purpose
Geologic units layer, historical rover traverse layer, geological contacts as science opportunities, communications line of sight, detailed thermal modelling, 3D terrain, AR and machine-learning target detection (CHECKLIST §7). Bring one back only if the scope changes.

## Useful commands
```bash
npm run lint && npm run build        # must pass before every push
npm run check-upstreams              # CTX, HiRISE and rover photos reachable
npm run check-api-abuse              # the API handlers refuse bad requests
npm run build-science-targets        # rebuild the science targets from NASA's data
npm run build-gazetteer              # rebuild the IAU place names (needs `unzip`)
npm run dev                          # http://localhost:5173
```
What was done in the last sweep, and how each part works: [todo-sweep.md](todo-sweep.md).
