// Builds public/data/science-targets.geojson: where Perseverance took its rock and regolith samples.
//
//   npm run build-science-targets
//
// Each target is one of NASA's sealed sample cores. The sample facts (name, target, sol, area, rock type)
// are copied by hand from NASA's Mars Rock Samples page, listed below. The position is the rover's own
// position, read from NASA's published stop list (M20_waypoints.json): the last stop on or before the sol the core
// was sealed. The rover's next stop is never more than 263 m from it (worst case, sample 19), so every position is
// within about 300 m of the real hole and most are within 100 m. It is not the exact hole.
//
// Left out: Roubion (an atmospheric sample, no rock) and Bell Island and Gallants (sol "TBD" on NASA's page).
// Needs Node 18+ (global fetch).

import { writeFileSync } from 'node:fs'

const PAGE = 'https://science.nasa.gov/mission/mars-2020-perseverance/mars-rock-samples/'
const WAYPOINTS = 'https://mars.nasa.gov/mmgis-maps/M20/Layers/json/M20_waypoints.json'
const OUT = new URL('../public/data/science-targets.geojson', import.meta.url)

// [sample no., sample name, target, sol sealed, area, rock type] as on the NASA page (checked 2026-11-15)
const SAMPLES = [
  [2, 'Montdenier', 'Rochette', 194, 'Artuby Ridge', 'Igneous'],
  [3, 'Montagnac', 'Rochette', 196, 'Artuby Ridge', 'Igneous'],
  [4, 'Salette', 'Brac', 262, 'South Séítah', 'Igneous'],
  [5, 'Coulettes', 'Brac', 271, 'South Séítah', 'Igneous'],
  [6, 'Robine', 'Issole', 298, 'South Séítah', 'Igneous'],
  [7, 'Malay', 'Issole', 337, 'South Séítah', 'Igneous'],
  [8, "Ha'ahóni", 'Sid', 371, 'Octavia E. Butler Landing / Ch’ał outcrop', 'Igneous'],
  [9, 'Atsá', 'Sid', 377, 'Octavia E. Butler Landing / Ch’ał outcrop', 'Igneous'],
  [10, 'Swift Run', 'Skinner Ridge', 490, 'Delta Front', 'Sedimentary'],
  [11, 'Skyland', 'Skinner Ridge', 495, 'Delta Front', 'Sedimentary'],
  [12, 'Hazeltop', 'Wildcat Ridge', 509, 'Delta Front', 'Sedimentary'],
  [13, 'Bearwallow', 'Wildcat Ridge', 516, 'Delta Front', 'Sedimentary'],
  [14, 'Shuyak', 'Amalik', 575, 'Delta Front', 'Sedimentary'],
  [15, 'Mageik', 'Amalik', 619, 'Delta Front', 'Sedimentary'],
  [16, 'Kukaklek', 'Hidden Harbor', 631, 'Delta Front', 'Sedimentary'],
  [17, 'Atmo Mountain', 'Observation Mountain', 634, 'Delta Front', 'Regolith, likely mixed sedimentary and igneous grains'],
  [18, 'Crosswind Lake', 'Observation Mountain', 639, 'Delta Front', 'Regolith, likely mixed sedimentary and igneous grains'],
  [19, 'Melyn', 'Berea', 749, 'Upper Fan', 'Sedimentary'],
  [20, 'Otis Peak', 'Emerald Lake', 832, 'Upper Fan', 'Sedimentary'],
  [21, 'Pilot Mountain', 'Dream Lake', 913, 'Upper Fan', 'Sedimentary'],
  [22, 'Pelican Point', 'Hans Amundsen Memorial Workspace', 923, 'Margin Unit', 'Sedimentary'],
  [23, 'Lefroy Bay', 'Turquoise Bay', 949, 'Margin Unit', 'Sedimentary'],
  [24, 'Comet Geyser', 'Bunsen Peak', 1088, 'Margin Unit', 'Silica-cemented carbonate'],
  [25, 'Sapphire Canyon', 'Cheyava Falls', 1215, 'Neretva Vallis', 'Sedimentary'],
  [26, 'Silver Mountain', 'Shallow Bay', 1401, 'Crater rim (Witch Hazel Hill)', 'Igneous or impactite'],
  [27, 'Green Gardens', 'Tablelands', 1433, 'Crater rim (Witch Hazel Hill)', 'Serpentinite'],
  [28, 'Main River', 'Broom Point', 1441, 'Crater rim (Witch Hazel Hill)', 'Igneous or impactite'],
]

const res = await fetch(WAYPOINTS, { signal: AbortSignal.timeout(60_000) })
if (!res.ok) throw new Error(`${WAYPOINTS}: HTTP ${res.status}`)
const stops = (await res.json()).features
  .map((f) => f.properties)
  .filter((p) => Number.isFinite(p.sol) && Number.isFinite(p.lon) && Number.isFinite(p.lat))
  .sort((a, b) => a.sol - b.sol || a.drive - b.drive)

const features = SAMPLES.map(([no, name, target, sol, area, rock]) => {
  // The rover's last stop on or before the sol the core was sealed
  const stop = stops.filter((p) => p.sol <= sol).at(-1)
  if (!stop) throw new Error(`No rover stop on or before sol ${sol} (${name})`)
  return {
    type: 'Feature',
    id: `m20-sample-${no}`,
    properties: {
      name: `${name} (${target})`,
      reason: `Perseverance's sample ${no}, sealed on sol ${sol} at ${target}, ${area}. NASA lists the rock as: ${rock.toLowerCase()}. A core worth reaching if you want the rock the rover chose to keep.`,
      source: `NASA Mars Rock Samples (${PAGE}); position from NASA's Mars 2020 stop list, site ${stop.site} drive ${stop.drive}, sol ${stop.sol}`,
    },
    geometry: { type: 'Point', coordinates: [round(stop.lon), round(stop.lat)] },
  }
})

const out = {
  type: 'FeatureCollection',
  name: "Perseverance sample sites: sealed cores from NASA's Mars Rock Samples page, placed at the rover's last stop before sealing (within about 300 m)",
  features,
}
writeFileSync(OUT, JSON.stringify(out, null, 2) + '\n')
console.log(`Wrote ${features.length} targets to public/data/science-targets.geojson`)

function round(x) {
  return Math.round(x * 1e5) / 1e5
}
