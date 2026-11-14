// Builds public/data/gazetteer.json: every Mars place name adopted by the IAU, for the Search box.
//
//   npm run build-gazetteer
//
// Source: USGS Gazetteer of Planetary Nomenclature, "MARS nomenclature center points" shapefile
// (https://planetarynames.wr.usgs.gov/), whose attribute table (.dbf) is read here directly. Needs the `unzip`
// command and Node 18+. Each entry is [name, lon, lat, type, diameter in km]: lon is °E in -180..180 (the file
// uses 0..360), lat is °N planetocentric, and the position is the feature's centre as the gazetteer gives it.

import { execFileSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const URL_ZIP = 'https://planetarynames.wr.usgs.gov/shapefiles/MARS_nomenclature_center_pts.zip'
const OUT = new URL('../public/data/gazetteer.json', import.meta.url)

const res = await fetch(URL_ZIP, { signal: AbortSignal.timeout(120_000) })
if (!res.ok) throw new Error(`${URL_ZIP}: HTTP ${res.status}`)
const dir = mkdtempSync(join(tmpdir(), 'mars-gazetteer-'))
writeFileSync(join(dir, 'g.zip'), Buffer.from(await res.arrayBuffer()))
const dbf = execFileSync('unzip', ['-p', join(dir, 'g.zip'), 'MARS_nomenclature_center_pts.dbf'], { maxBuffer: 64 * 1024 * 1024 })

// dBase III table: 32-byte header, 32 bytes per field, then fixed-width records
const count = dbf.readUInt32LE(4), headerLen = dbf.readUInt16LE(8), recordLen = dbf.readUInt16LE(10)
const fields = []
for (let o = 32; dbf[o] !== 0x0d; o += 32) {
  fields.push({ name: dbf.toString('latin1', o, o + 11).replace(/\0.*$/, ''), len: dbf[o + 16] })
}

const entries = []
for (let i = 0; i < count; i++) {
  const at = headerLen + i * recordLen
  if (dbf[at] === 0x2a) continue // deleted record
  let p = at + 1
  const r = {}
  for (const f of fields) {
    r[f.name] = dbf.toString('utf8', p, p + f.len).trim()
    p += f.len
  }
  let lon = Number(r.center_lon)
  const lat = Number(r.center_lat)
  if (!r.clean_name || !Number.isFinite(lon) || !Number.isFinite(lat) || r.approval !== 'Adopted by IAU') continue
  if (lon > 180) lon -= 360
  const diameter = Number(r.diameter)
  entries.push([r.clean_name, round(lon, 4), round(lat, 4), r.type.split(',')[0], Number.isFinite(diameter) ? round(diameter, 1) : 0])
}
entries.sort((a, b) => a[0].localeCompare(b[0]))

writeFileSync(OUT, JSON.stringify(entries) + '\n')
console.log(`Wrote ${entries.length} IAU-adopted names to public/data/gazetteer.json (${Math.round(readFileSync(OUT).length / 1024)} KB)`)

function round(x, d) {
  const k = 10 ** d
  return Math.round(x * k) / k
}
