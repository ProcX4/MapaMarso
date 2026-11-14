// Checks that the walking-scale imagery and rover photos still work upstream, through MAPA's own API
// handlers (so the allow-list and URL building are tested too). Run when the map or the photo strip goes
// blank, or before a demo:
//
//   npm run check-upstreams
//
// Needs Node 22.18+ (it imports the TypeScript handlers in api/ directly). Exits 1 if anything fails.
// Sample upstream responses are in scripts/fixtures/.

import { GET as tiles } from '../api/tiles.ts'
import { GET as roverPhotos } from '../api/rover-photos.ts'

// Octavia E. Butler Landing, Jezero: inside both the HiRISE mosaic and Perseverance's first stop (site 3, drive 0)
const JEZERO = { lon: 77.4508, lat: 18.4447 }

/** z/row/col of the tile holding a point (equirectangular, 2 × 1 tiles at zoom 0, as in src/map/projection.ts) */
const tileAt = (z, { lon, lat }) => {
  const deg = 180 / 2 ** z
  return `${z}/${Math.floor((90 - lat) / deg)}/${Math.floor((lon + 180) / deg)}`
}

const checks = [
  {
    name: 'CTX tile over Jezero (Esri Astro OnMars/CTX, level 12, 5 m/px)',
    run: () => tiles(new Request(`http://local/api/tiles/OnMars_CTX/${tileAt(12, JEZERO)}.png`)),
    ok: async (r) => r.status === 200 && r.headers.get('content-type') === 'image/png' && (await r.arrayBuffer()).byteLength > 10_000,
  },
  {
    name: 'HiRISE tile at the landing site (Mars Trek JEZ_hirise_soc_006, zoom 16)',
    run: () => tiles(new Request(`http://local/api/tiles/JEZ_hirise_soc_006_orthoMosaic_25cm_Eqc_latTs0_lon0_first_dd/${tileAt(16, JEZERO)}.png`)),
    ok: async (r) => r.status === 200 && r.headers.get('content-type') === 'image/png' && (await r.arrayBuffer()).byteLength > 5_000,
  },
  {
    name: 'Rover photos at the landing site (waypoints + raw-image feed)',
    run: () => roverPhotos(new Request(`http://local/api/rover-photos?lon=${JEZERO.lon}&lat=${JEZERO.lat}`)),
    ok: async (r) => {
      if (r.status !== 200) return false
      const body = await r.json()
      console.log(`    stop ${body.stop?.rmc} (${body.stop?.distanceM} m), match ${body.match}, ${body.photos.length} photos: ${[...new Set(body.photos.map((p) => p.camera))].join(', ')}`)
      return body.stop?.rmc === '3_0' && body.match === 'site-drive' && body.photos.length > 0
        && body.photos.every((p) => p.thumbUrl.startsWith('https://mars.nasa.gov/mars2020-raw-images/'))
    },
  },
  {
    name: 'Rover photos far from any stop come back empty',
    run: () => roverPhotos(new Request('http://local/api/rover-photos?lon=0&lat=0')),
    ok: async (r) => r.status === 200 && (await r.json()).stop === null,
  },
]

let failed = 0
for (const c of checks) {
  const t = Date.now()
  let pass = false
  let status = ''
  try {
    const r = await c.run()
    status = `HTTP ${r.status}`
    pass = await c.ok(r)
  } catch (err) {
    status = String(err)
  }
  if (!pass) failed++
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${c.name}  (${status}, ${Date.now() - t} ms)`)
}
console.log(failed ? `\n${failed} check(s) failed: see the upstream notes in api/tiles.ts and api/rover-photos.ts` : '\nAll upstreams OK')
process.exit(failed ? 1 : 0)
