import { useRoute } from '../../hooks/useDerived'
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
  const { state } = useMarswalk()
  const science = state.stops.filter((s) => s.kind === 'science').length
  const climbNote = route.gainM === null ? ' (no elevation data: climb not included)' : ''

  return (
    <dl className="stats plan-stats">
      <Stat label="Distance" value={formatKm(route.totalM / 1000)} tag={<ProvenanceTag category="derived" note="Straight legs on a 3,389.5 km Mars sphere" />} />
      <Stat label="Duration" value={formatDuration(route.durationMin)} tag={<ProvenanceTag category="estimated" note={walkingAssumption() + climbNote} />} />
      <Stat label="Gain" value={route.gainM === null ? null : formatM(route.gainM)} tag={<ProvenanceTag category="derived" note="From the site DTM" />} />
      <Stat label="Loss" value={route.lossM === null ? null : formatM(route.lossM)} tag={<ProvenanceTag category="derived" note="From the site DTM" />} />
      <Stat label="Max slope" value={route.maxSlope === null ? null : formatSlope(route.maxSlope)} tag={<ProvenanceTag category="derived" note="Horn method on the site DTM" />} />
      <Stat label="Science stops" value={String(science)} />
      <Stat label="Difficulty" value={difficulty(route.maxSlope)} tag={<ProvenanceTag category="estimated" note="Based on max slope and assumed slope thresholds" />} />
    </dl>
  )
}
