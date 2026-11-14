// Builds public/data/site-obstacles.bin: how rocky the ground is, for the A* route finder (Topographic).
//
//   node scripts/build-obstacles.mjs
//
// There's no published rock-abundance map for the demo site, so this derives one from USGS's 1 m HiRISE DTMs of
// Jezero (Mars 2020 terrain-relative navigation set). At 1 m, boulders and blocky outcrops show up as patches of
// very steep ground. For every 20 m cell of the site DTM (public/data/site-dtm.tif) it records the share of the
// 1 m ground inside it that is steeper than STEEP_DEG: 0–100 (%), or 255 where no HiRISE DTM covers the cell.
// The output is one byte per cell, row by row from the north, the same grid as the site DTM.
//
// Downloads about 750 MB from the USGS bucket into a cache folder (MAPA_HIRISE_CACHE, or the system temp folder),
// resuming and retrying if the connection drops, then works from the local files. Re-run after changing the site.

import { fromFile } from 'geotiff'
import { mkdir, rename, stat, writeFile } from 'node:fs/promises'
import { createWriteStream } from 'node:fs'
import { tmpdir } from 'node:os'
import { Readable } from 'node:stream'
import { pipeline } from 'node:stream/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const BASE = 'https://asc-pds-services.s3.us-west-2.amazonaws.com/mosaic/mars2020_trn/HiRISE/DTM_MOLAtopography_DeltaGeoid_Jezero_'
const TILES = ['C', 'CR_NORTH', 'CR_SOUTH', 'DL', 'E', 'N', 'W']
/** 1 m ground at least this steep counts as rock or blocky outcrop rather than walkable surface */
const STEEP_DEG = 30
const BLOCK_ROWS = 512
const NO_DATA = 255

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const cache = process.env.MAPA_HIRISE_CACHE || join(tmpdir(), 'mapa-hirise')

/** The file at url, downloaded once into the cache; a partial download resumes, and a failed one is retried. */
async function cached(url) {
  const file = join(cache, url.split('/').pop())
  if (await stat(file).catch(() => null)) return file
  await mkdir(cache, { recursive: true })
  const part = file + '.part'
  for (let attempt = 1; ; attempt++) {
    const have = (await stat(part).catch(() => null))?.size ?? 0
    try {
      const res = await fetch(url, { headers: have ? { range: `bytes=${have}-` } : {} })
      if (!(res.ok || res.status === 206)) throw new Error(`HTTP ${res.status}`)
      await pipeline(Readable.fromWeb(res.body), createWriteStream(part, { flags: have && res.status === 206 ? 'a' : 'w' }))
      await rename(part, file)
      return file
    } catch (err) {
      if (attempt >= 8) throw err
      console.log(`  download interrupted (${err.message}), retrying…`)
      await new Promise((r) => setTimeout(r, 2000 * attempt))
    }
  }
}
const toDeg = (r) => 180 / (Math.PI * r)

// The output grid: the site DTM's
const site = await (await fromFile(join(root, 'public/data/site-dtm.tif'))).getImage()
const siteR = site.getGeoKeys().GeogSemiMajorAxisGeoKey || 3396190
const [sw, ss, se, sn] = site.getBoundingBox().map((v) => v * toDeg(siteR))
const W = site.getWidth(), H = site.getHeight()
const steep = new Uint32Array(W * H)
const total = new Uint32Array(W * H)
const tan = Math.tan((STEEP_DEG * Math.PI) / 180)

// All the downloads at once: each connection to the bucket is slow, together they're much faster
const url = (name) => `${BASE}${name}_Edited_affine_1m_Eqc_latTs0_lon0.tif`
const files = Object.fromEntries(await Promise.all(TILES.map(async (n) => [n, await cached(url(n))])))
console.log('downloads done')

for (const name of TILES) {
  const t0 = Date.now()
  const img = await (await fromFile(files[name])).getImage()
  const r = img.getGeoKeys().GeogSemiMajorAxisGeoKey || 3396190
  const [ox, oy] = img.getOrigin()
  const [rx, ry] = img.getResolution() // metres per pixel; ry negative (rows go south)
  const w = img.getWidth(), h = img.getHeight()
  const noData = img.getGDALNoData()
  const k = toDeg(r)
  const dyM = Math.abs(ry)
  for (let y0 = 0; y0 < h; y0 += BLOCK_ROWS) {
    // One row of overlap each side for the 3×3 slope window
    const a = Math.max(0, y0 - 1), b = Math.min(h, y0 + BLOCK_ROWS + 1)
    const [z] = await img.readRasters({ window: [0, a, w, b], samples: [0] })
    const rows = b - a
    const bad = (v) => !Number.isFinite(v) || v < -1e5 || (noData !== null && v === noData)
    for (let yy = Math.max(1, y0 - a); yy < Math.min(rows - 1, y0 + BLOCK_ROWS - a); yy++) {
      const lat = (oy + (a + yy + 0.5) * ry) * k
      const dxM = Math.abs(rx) * Math.cos((lat * Math.PI) / 180)
      const outY = Math.floor((sn - lat) / ((sn - ss) / H))
      if (outY < 0 || outY >= H) continue
      for (let x = 1; x < w - 1; x++) {
        const i = yy * w + x
        const c = z[i]
        if (bad(c)) continue
        const n = z[i - w], s = z[i + w], e = z[i + 1], wv = z[i - 1]
        const ne = z[i - w + 1], nw = z[i - w - 1], se_ = z[i + w + 1], sw_ = z[i + w - 1]
        if (bad(n) || bad(s) || bad(e) || bad(wv) || bad(ne) || bad(nw) || bad(se_) || bad(sw_)) continue
        const dzdx = (ne + 2 * e + se_ - (nw + 2 * wv + sw_)) / (8 * dxM)
        const dzdy = (sw_ + 2 * s + se_ - (nw + 2 * n + ne)) / (8 * dyM)
        const lon = (ox + (x + 0.5) * rx) * k
        const outX = Math.floor((lon - sw) / ((se - sw) / W))
        if (outX < 0 || outX >= W) continue
        const o = outY * W + outX
        total[o]++
        if (dzdx * dzdx + dzdy * dzdy >= tan * tan) steep[o]++
      }
    }
  }
  console.log(`${name}: ${w}×${h} in ${Math.round((Date.now() - t0) / 1000)} s`)
}

// A cell needs most of its 20 m × 20 m covered (about 400 one-metre samples) to count
const out = new Uint8Array(W * H).fill(NO_DATA)
let covered = 0
for (let i = 0; i < out.length; i++) {
  if (total[i] < 200) continue
  out[i] = Math.round((100 * steep[i]) / total[i])
  covered++
}
await writeFile(join(root, 'public/data/site-obstacles.bin'), out)
console.log(`site-obstacles.bin: ${W}×${H}, ${covered} cells covered (${((100 * covered) / out.length).toFixed(1)}%)`)
