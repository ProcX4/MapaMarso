# Data sources

One row per dataset in use (Gen Spec, "Data"). The layer registry (`src/map/layers/registry.ts`) is the source of truth for what the app shows; keep this file in step with it.

NASA data is used under NASA's media and data guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

| Layer (registry id) | Product ID | Instrument / mission | Resolution | Source URL | Licence | Category | Status |
|---|---|---|---|---|---|---|---|
| Surface imagery (`themis-day-ir`) | `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | THEMIS · Mars Odyssey | 100 m/px (tiles to zoom 9) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use (placeholder for site mosaic) |
| Colour context (`viking-color`) | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking Orbiter cameras · Viking 1 & 2 | 232 m/px (tiles to zoom 7) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Elevation context (`mola-shade`) | `Mars_MGS_MOLA_ClrShade_merge_global_463m` | MOLA · Mars Global Surveyor | 463 m/px (tiles to zoom 7) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_MOLA_ClrShade_merge_global_463m/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Elevation (`site-dtm`) | TBD | HiRISE or CTX stereo · MRO | TBD | TBD | TBD | Observed | **Missing** |
| Slope (`slope`) | — | Derived from `site-dtm` (Horn method) | Same as DTM | — | — | Derived | Waiting on DTM |
| Geologic units (`geology`) | TBD (SIM 3292 crop or local map) | USGS | TBD | TBD | TBD | Observed | **Empty file** |
| Science targets (`science-targets`) | TBD (CRISM detections) | CRISM · MRO | — | TBD | TBD | Observed | **Empty file** |

Tile grid for all Trek EQ layers verified against `WMTSCapabilities.xml` on 2026-11-14: TopLeftCorner `-180 90`, 256 px tiles, level 0 = 2 × 1 tiles. Deepest zoom with tiles at Jezero checked by requesting tiles directly.

Offline copies of the Trek tiles around the demo site live in `public/tiles/` (`npm run prefetch-tiles`).

## Globe and flat map (from the MapaMars idea bank)

| Data | Source | Licence / credit | Category |
|---|---|---|---|
| Mars 3D model | NASA/JPL-Caltech, science.nasa.gov/resource/planet-mars-3d-model | NASA, public | Observed |
| Flat-map imagery | Viking MDIM 2.1 colour mosaic via Mars Trek (`Mars_Viking_MDIM21_ClrMosaic_global_232m`, zoom 2) | NASA, public | Observed |
| Phobos and Deimos shapes | Ernst et al. 2023, JHU/APL Small Body Mapping Tool | Cited in public/resources/README.md | Observed |
| Moon and orbiter positions | NASA JPL Horizons (live, via `api/horizons.ts`) | NASA, public | Observed (orbit figures Derived) |
| Moon positions (fallback) | JPL SSD mean orbital elements (MAR099) | NASA, public | Derived |
| Viking lander model | NASA / Michael D. Carbajal (NASA 3D Resources) | NASA, public | Observed |
| MRO, Odyssey, TGO models | NASA 3D Resources; NASA Visualization Technology Applications and Development | NASA, public | Observed |
| Mars Express, Hope | Stand-in shapes of their real size (no published model) | Labelled on their cards | Estimated |
| Stars | Yale Bright Star Catalogue, 5th ed. (Hoffleit & Warren 1991) | Public | Observed |
| Landing sites | Published landing coordinates (`src/data/mars.ts`) | Public | Observed |
| Viking 1 close-up terrain | Procedural ground around the real lander and trench positions | MAPA/MapaMars | Estimated |
