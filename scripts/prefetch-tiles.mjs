// Downloads the demo site's Mars Trek tiles into public/tiles/ so the map still works
// when the proxy or the network fails during judging. Re-run after changing the site.
//
//   npm run prefetch-tiles
//
// Keep SITE_BBOX and LAYERS in step with src/config/site.ts and src/config/trekLayers.ts.

import { mkdir, writeFile, access } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const UPSTREAM = 'https://trek.nasa.gov/tiles/Mars/EQ'
const LAYERS = {
  Mars_MGS_MOLA_ClrShade_merge_global_463m: { ext: 'jpg', maxZoom: 7 },
  Mars_Viking_MDIM21_ClrMosaic_global_232m: { ext: 'jpg', maxZoom: 7 },
  THEMIS_DayIR_ControlledMosaics_100m_v2_oct2018: { ext: 'png', maxZoom: 9 },
}
// [minLon, minLat, maxLon, maxLat] around Jezero (PLACEHOLDER site)
const SITE_BBOX = [76.0, 17.4, 79.0, 19.5]

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public', 'tiles')
const exists = (p) => access(p).then(() => true, () => false)

let fetched = 0, skipped = 0, missing = 0
for (const [layer, { ext, maxZoom }] of Object.entries(LAYERS)) {
  for (let z = 0; z <= maxZoom; z++) {
    const deg = 180 / 2 ** z
    const [c0, c1] = [Math.floor((SITE_BBOX[0] + 180) / deg), Math.floor((SITE_BBOX[2] + 180) / deg)]
    const [r0, r1] = [Math.floor((90 - SITE_BBOX[3]) / deg), Math.floor((90 - SITE_BBOX[1]) / deg)]
    for (let row = r0; row <= r1; row++) {
      for (let col = c0; col <= c1; col++) {
        const out = join(root, layer, String(z), String(row), `${col}.${ext}`)
        if (await exists(out)) { skipped++; continue }
        const res = await fetch(`${UPSTREAM}/${layer}/1.0.0/default/default028mm/${z}/${row}/${col}.${ext}`, { signal: AbortSignal.timeout(20_000) })
        if (!res.ok || !(res.headers.get('content-type') ?? '').startsWith('image/')) { missing++; continue }
        await mkdir(dirname(out), { recursive: true })
        await writeFile(out, Buffer.from(await res.arrayBuffer()))
        fetched++
      }
    }
  }
}
console.log(`Tiles: ${fetched} fetched, ${skipped} already present, ${missing} unavailable upstream`)
