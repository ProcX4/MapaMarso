# Data sources

One row per dataset in use (Gen Spec, "Data"). The layer registry (`src/map/layers/registry.ts`) is the source of truth for what the app shows; keep this file in step with it.

NASA data is used under NASA's media and data guidelines: https://www.nasa.gov/nasa-brand-center/images-and-media/

| Layer (registry id) | Product ID | Instrument / mission | Resolution | Source URL | Licence | Category | Status |
|---|---|---|---|---|---|---|---|
| **Topographic** | | | | | | | |
| Elevation, colour hillshade (`elevation-color`) | `Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw` | MOLA + HRSC · MGS + Mars Express | 200 m/px (tiles to zoom 8) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_MOLA_blend200ppx_HRSC_ClrShade_clon0dd_200mpp_lzw/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Elevation, Jezero (route finder, profile, site card) | `JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0` | CTX stereo · MRO (USGS Mars 2020 TRN) | 20 m/px | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/CTX/JEZ_ctx_B_soc_008_DTM_MOLAtopography_DeltaGeoid_20m_Eqc_latTs0_lon0.tif | USGS, public domain | Observed | In use (`public/data/site-dtm.tif`) |
| Elevation, global (route finder, profile, site card) | `Mars_MGS_MOLA_DEM_mosaic_global_463m` | MOLA · Mars Global Surveyor | 463 m/px | https://planetarymaps.usgs.gov/mosaic/Mars_MGS_MOLA_DEM_mosaic_global_463m.tif (read by `api/elevation.ts`) | USGS, public domain | Observed | In use |
| Steep, deep and rocky ground (`slope`) | — | Derived from the elevation above (Horn slope, depth below a 600 m box mean) and, at Jezero, rocky ground from the HiRISE DTMs below | Same as the elevation used | — | — | Derived | In use |
| Rocky ground, Jezero (route finder) | `DTM_MOLAtopography_DeltaGeoid_Jezero_{C,CR_NORTH,CR_SOUTH,DL,E,N,W}_Edited_affine_1m_Eqc_latTs0_lon0` | HiRISE stereo · MRO (USGS Mars 2020 TRN) | 1 m/px in, 20 m/px out (`public/data/site-obstacles.bin`) | https://planetarymaps.usgs.gov/mosaic/mars2020_trn/HiRISE/ | USGS, public domain | Derived | In use |
| Safe path (`route`) | — | A* over the same grid (`src/data/pathfind.worker.ts`) | Same as the elevation used | — | — | Derived | In use |
| **Optical** | | | | | | | |
| Colour mosaic (`viking-color`) | `Mars_Viking_MDIM21_ClrMosaic_global_232m` | Viking Orbiter cameras · Viking 1 & 2 | 232 m/px (tiles to zoom 7) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_Viking_MDIM21_ClrMosaic_global_232m/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Colour atlas (`moc-color`) | `msss_atlas_simp_clon` | MOC wide angle · Mars Global Surveyor | tiles to zoom 6 | https://trek.nasa.gov/tiles/Mars/EQ/msss_atlas_simp_clon/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| **Spectral** | | | | | | | |
| Daytime infrared (`themis-day-ir`) | `THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018` | THEMIS · Mars Odyssey | 100 m/px (tiles to zoom 9) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Night-time infrared (`themis-night-ir`) | `THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018` | THEMIS · Mars Odyssey | 100 m/px (tiles to zoom 9) | https://trek.nasa.gov/tiles/Mars/EQ/THEMIS_NightIR_ControlledMosaics_100m_v2_oct2018/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Thermal inertia (`tes-thermal-inertia`) | `TES_Thermal_Inertia` | TES · Mars Global Surveyor | tiles to zoom 1 | https://trek.nasa.gov/tiles/Mars/EQ/TES_Thermal_Inertia/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| High-calcium pyroxene (`tes-pyroxene`) | `TES_Clinopyroxene` | TES · Mars Global Surveyor | tiles to zoom 1 | https://trek.nasa.gov/tiles/Mars/EQ/TES_Clinopyroxene/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Plagioclase (`tes-plagioclase`) | `TES_Plagioclase` | TES · Mars Global Surveyor | tiles to zoom 1 | https://trek.nasa.gov/tiles/Mars/EQ/TES_Plagioclase/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Sheet silicates and glass (`tes-sheet-silicates`) | `TES_Glass_Clay` | TES · Mars Global Surveyor | tiles to zoom 1 | https://trek.nasa.gov/tiles/Mars/EQ/TES_Glass_Clay/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Dust cover index (`tes-dust`) | `TES_Dust` | TES · Mars Global Surveyor (Ruff & Christensen 2002, JGR 107, E12, 5127) | 16 pixels/degree, about 3.5 km/px (tiles to zoom 1) | https://trek.nasa.gov/tiles/Mars/EQ/TES_Dust/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Dust cover index over relief (`tes-dust-relief`) | `tes_ruffdust` | TES · Mars Global Surveyor (same index, shown over shaded relief) | About 3.5 km/px (tiles to zoom 2) | https://trek.nasa.gov/tiles/Mars/EQ/tes_ruffdust/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Surface albedo (`tes-albedo`) | `Mars_MGS_TES_Albedo_mosaic_global_7410m` | TES · Mars Global Surveyor | 7.4 km/px (tiles to zoom 1) | https://trek.nasa.gov/tiles/Mars/EQ/Mars_MGS_TES_Albedo_mosaic_global_7410m/1.0.0/WMTSCapabilities.xml | NASA, public | Observed | In use |
| Science targets (`science-targets`) | Sealed sample cores 2–28 (sample no. as NASA numbers them) | Perseverance rover · Mars 2020 | Within about 300 m of the real hole | https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/ (sample facts); https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json (positions); rebuilt with `npm run build-science-targets` | NASA, public | Observed | In use (`public/data/science-targets.geojson`) |

Layer IDs come from the Mars Trek catalogue (`https://trek.nasa.gov/mars/TrekServices/ws/index/eq/searchItems`, field `productLabel`), checked 2026-11-15. The global CTX and HiRISE mosaics and the CRISM/OMEGA hydrous mineral map are listed there but serve no tiles from the EQ tile endpoint.

Tile grid for all Trek EQ layers verified against `WMTSCapabilities.xml` on 2026-11-14: TopLeftCorner `-180 90`, 256 px tiles, level 0 = 2 × 1 tiles. Deepest zoom with tiles at Jezero checked by requesting tiles directly.

CTX terms (researched 2026-11-15): the Esri service reports `copyrightText` "Source: NASA/JPL/MSSS/Caltech Murray Lab/Esri" and `accessInformation` "None". The Murray Lab's mosaic is described by third-party catalogues as free to use with credit. The service serves the preliminary **beta01** mosaic. No separate Esri terms for the public OnMars service were found: still to confirm (CHECKLIST §2).

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
| Surface radiation (planner's Radiation panel) | MSL RAD at Gale crater: galactic cosmic ray dose equivalent 0.67 mSv/day, Aug 2012 to Jun 2013; Hassler et al., *Science* 2014 ("Mars' Surface Radiation Environment Measured with the Mars Science Laboratory's Curiosity Rover") | Published paper; NASA mission data | Estimated (measured elsewhere, inside a rover, near solar maximum) |
| Place names (Search) | USGS Gazetteer of Planetary Nomenclature, Mars center points (https://planetarynames.wr.usgs.gov/shapefiles/MARS_nomenclature_center_pts.zip): 2,055 names adopted by the IAU, centres as the gazetteer gives them | USGS / IAU, public | Observed |
| Landing sites | Published landing coordinates (`src/data/mars.ts`) | Public | Observed |
| Viking 1 close-up terrain | Procedural ground around the real lander and trench positions | MAPA/MapaMars | Estimated |
