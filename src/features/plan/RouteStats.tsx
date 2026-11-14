import { useDatasets, useRoute } from '../../hooks/useDerived'
import { TERRAIN_NOTE } from '../../data/terrain'
import { useMarswalk } from '../../hooks/useMarswalk'
import { Stat } from '../../components/Stat'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { formatDuration, formatKm, formatM, formatSlope } from '../../lib/format'
import { slopeBand } from '../../data/slope'
import { walkingAssumption } from '../../config/assumptions'

/** Difficulty from the steepest point on the route. ESTIMATED: thresholds are assumptions. */
function difficulty(maxSlope: number | null) {
  if (maxSlope === null) return null
  const band = slopeBand(maxSlope)
  return band.token === null ? 'Easy' : band.token === 'caution' ? 'Moderate' : band.token === 'hazard' ? 'Hard' : 'Impassable section'
}

export function RouteStats() {
  const route = useRoute()
  const terrain = useDatasets().dtm.value
  const from = terrain ? `From the ${TERRAIN_NOTE[terrain.source]}` : 'No elevation data yet'
  const { state } = useMarswalk()
  const science = state.stops.filter((s) => s.kind === 'science').length
  const climbNote = route.gainM === null ? ' (no elevation data: climb not included)' : ''

  return (
    <dl className="stats plan-stats">
      <Stat label="Distance" value={formatKm(route.totalM / 1000)} tag={<ProvenanceTag category="derived" note={route.routing === 'safe' ? 'Along the A* safe path, on a 3,389.5 km Mars sphere' : 'Straight legs where no safe path is in yet, on a 3,389.5 km Mars sphere'} />} />
      <Stat label="Duration" value={formatDuration(route.durationMin)} tag={<ProvenanceTag category="estimated" note={walkingAssumption() + climbNote} />} />
      <Stat label="Gain" value={route.gainM === null ? null : formatM(route.gainM)} tag={<ProvenanceTag category="derived" note={from} />} />
      <Stat label="Loss" value={route.lossM === null ? null : formatM(route.lossM)} tag={<ProvenanceTag category="derived" note={from} />} />
      <Stat label="Max slope" value={route.maxSlope === null ? null : formatSlope(route.maxSlope)} tag={<ProvenanceTag category="derived" note={terrain ? `Horn method on the ${TERRAIN_NOTE[terrain.source]}` : 'Horn method'} />} />
      <Stat label="Science stops" value={String(science)} />
      <Stat label="Difficulty" value={difficulty(route.maxSlope)} tag={<ProvenanceTag category="estimated" note="Based on max slope and assumed slope thresholds" />} />
    </dl>
  )
}
