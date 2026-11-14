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
