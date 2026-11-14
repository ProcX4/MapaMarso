# Resources

Data and models used by the globe (from the MapaMars idea bank). Files here are served as-is at `/resources/<file name>`.

## Mars globe model

`mars-nasa.glb` is NASA's 3D model of Mars (credit: NASA/JPL-Caltech), from
https://science.nasa.gov/resource/planet-mars-3d-model/. The globe loads it in `src/globe/marsModel.ts`, turns it to
match the globe's latitude and longitude, and smooths its outline. If it is missing or fails to load, the globe falls
back to a generated surface.

## Phobos and Deimos shapes

`phobos-shape.bin` and `deimos-shape.bin` are the measured shape models of Ernst et al. (2023), "High-resolution
shape models of Phobos and Deimos from stereophotoclinometry" (Earth, Planets and Space 75:103), from the Small Body
Mapping Tool at https://sbmt.jhuapl.edu/shared-files/ (Phobos `phobos_g_148m_spc_obj_0000n00000_v004`, Deimos
`deimos_g_083m_spc_obj_0000n00000_v002`, 196,608 triangles each), packed into a small gzipped binary described in
`src/globe/moonModel.ts`. If a file is missing, the globe shows a plain ellipsoid of the moon's size instead.

## Viking lander

`viking-lander.glb` is NASA's 3D model of the Viking lander (NASA/Michael D. Carbajal), from
https://science.nasa.gov/3d-resources/viking-lander/ (also in https://github.com/nasa/NASA-3D-Resources).
`src/globe/landerModel.ts` scales it to the real lander's ~2.1 m height and stands it on its footpads; the site
close-up turns it so the sampler arm reaches the first trench. If it can't be loaded, a simple stand-in is shown.

## Stars

`stars.json` is the Yale Bright Star Catalogue, 5th edition (Hoffleit & Warren 1991): the 9,096 stars visible to the
eye, as `[right ascension°, declination°, V magnitude, colour temperature K]`, brightest first (converted from
github.com/brettonw/YaleBrightStarCatalog). Drawn by `src/globe/skyObjects.ts` around the globe and in the night sky
over landing sites.

## Orbiters

`orbiters/mro.glb` and `orbiters/odyssey.glb` are NASA's 3D models of the Mars Reconnaissance Orbiter and 2001 Mars
Odyssey (github.com/nasa/NASA-3D-Resources); `orbiters/tgo.glb` is NASA's model of ESA's ExoMars Trace Gas Orbiter
(science.nasa.gov/resource/trace-gas-orbiter-3d-model, NASA Visualization Technology Applications and Development).
Neither NASA nor ESA publishes a downloadable model of Mars Express or Hope, so their cards say so and show a stand-in
of the right size. Positions come live from JPL Horizons (see `src/data/orbiters.ts` and `api/horizons.ts`). Two of the
models are Draco-compressed: `draco/` holds three.js's Draco decoder, from `three/examples/jsm/libs/draco`.
