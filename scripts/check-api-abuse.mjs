// Sends bad requests to MAPA's own API handlers (tile proxy, elevation, rover photos) and checks each one is
// refused with the right status: unknown layers, path traversal, bad coordinates, wrong methods. Part of the
// Security Spec §9 pre-demo checks. Run before judging:
//
//   npm run check-api-abuse
//
// Needs Node 22.18+ (it imports the TypeScript handlers in api/ directly). One case fetches a real tile, so it
// needs the network. Exits 1 if anything fails.

import { GET as tiles } from '../api/tiles.ts'
import { GET as roverPhotos } from '../api/rover-photos.ts'
import { GET as elevation } from '../api/elevation.ts'

const VIKING = 'Mars_Viking_MDIM21_ClrMosaic_global_232m'
const cases = [
  ['tiles: unknown layer', tiles, 'GET', '/api/tiles/UnknownLayer/0/0/0.jpg', 400],
  ['tiles: path traversal (encoded)', tiles, 'GET', '/api/tiles/..%2F..%2Fetc/0/0/0.jpg', 400],
  ['tiles: path traversal (raw)', tiles, 'GET', '/api/tiles/../../etc/passwd', 400],
  ['tiles: wrong extension', tiles, 'GET', `/api/tiles/${VIKING}/0/0/0.png`, 400],
  ['tiles: row out of range', tiles, 'GET', `/api/tiles/${VIKING}/1/5/0.jpg`, 400],
  ['tiles: zoom too deep', tiles, 'GET', `/api/tiles/${VIKING}/19/0/0.jpg`, 400],
  ['tiles: object prototype name', tiles, 'GET', '/api/tiles/constructor/0/0/0.jpg', 400],
  ['tiles: POST refused', tiles, 'POST', `/api/tiles/${VIKING}/0/0/0.jpg`, 405],
  ['tiles: a valid tile still works', tiles, 'GET', `/api/tiles/${VIKING}/1/0/1.jpg`, 200],
  ['rover-photos: no parameters', roverPhotos, 'GET', '/api/rover-photos', 400],
  ['rover-photos: text longitude', roverPhotos, 'GET', '/api/rover-photos?lon=abc&lat=1', 400],
  ['rover-photos: latitude out of range', roverPhotos, 'GET', '/api/rover-photos?lon=77&lat=999', 400],
  ['rover-photos: injection in longitude', roverPhotos, 'GET', '/api/rover-photos?lon=77;rm%20-rf&lat=18', 400],
  ['rover-photos: POST refused', roverPhotos, 'POST', '/api/rover-photos?lon=77.45&lat=18.44', 405],
  ['elevation: no parameters', elevation, 'GET', '/api/elevation', 400],
  ['elevation: text coordinates', elevation, 'GET', '/api/elevation?w=a&s=b&e=c&n=d', 400],
  // Large windows are allowed but thinned to at most 320 samples a side (about 100 KB), so they cost little
  ['elevation: whole planet is thinned, not refused', elevation, 'GET', '/api/elevation?w=-180&s=-90&e=180&n=90', 200],
  ['elevation: west not before east', elevation, 'GET', '/api/elevation?w=10&s=0&e=5&n=1', 400],
  ['elevation: latitude out of range', elevation, 'GET', '/api/elevation?w=0&s=0&e=1&n=95', 400],
  ['elevation: POST refused', elevation, 'POST', '/api/elevation?w=77&s=18&e=77.1&n=18.1', 405],
]

let failed = 0
for (const [name, handler, method, path, want] of cases) {
  const status = (await handler(new Request(`http://local${path}`, { method }))).status
  const ok = status === want
  if (!ok) failed++
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}  (HTTP ${status}, wanted ${want})`)
}
console.log(failed ? `\n${failed} check(s) failed` : '\nAll API abuse checks passed')
process.exit(failed ? 1 : 0)
