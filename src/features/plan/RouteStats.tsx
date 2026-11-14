import { useDatasets, useRoute } from '../../hooks/useDerived'
import { TERRAIN_NOTE } from '../../data/terrain'
import { useMarswalk } from '../../hooks/useMarswalk'
import { Stat } from '../../components/Stat'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { formatDuration, formatKm, formatM, formatSlope } from '../../lib/format'
import { slopeBand } from '../../data/slope'
import { PATHFINDING, walkingAssumption } from '../../config/assumptions'

/** Difficulty from the steepest point on the route. ESTIMATED: thresholds are assumptions. */
function difficulty(maxSlope: number | null) {
  if (maxSlope === null) return null
  const band = slopeBand(maxSlope)
  return band.token === null ? 'Easy' : band.token === 'caution' ? 'Moderate' : band.token === 'hazard' ? 'Hard' : 'Impassable section'
}

/** How the route was found, in words; null once the safe path is in */
const ROUTING_NOTE: Record<string, string | null> = {
  none: null,
  safe: null,
  finding: 'Finding a safe path round steep and deep ground…',
  partial: 'Some legs have no safe way through, so they are drawn straight: check them on the map.',
  unavailable: "Elevation data couldn't be loaded, so legs are drawn straight and slope isn't known. Try again in a moment.",
}

export function RouteStats() {
  const route = useRoute()
  const terrain = useDatasets().dtm.value
  const from = terrain ? `From the ${TERRAIN_NOTE[terrain.source]}` : 'No elevation data yet'
  const { state } = useMarswalk()
  const science = state.stops.filter((s) => s.kind === 'science').length
  const climbNote = route.gainM === null ? ' (no elevation data: climb not included)' : ''

  const routingNote = ROUTING_NOTE[route.routing]
  const slopeNote = terrain ? `Horn method on the ${TERRAIN_NOTE[terrain.source]}` : 'Horn method'

  return (
    <>
    {routingNote && (
      <p className={`plan-note plan-routing${route.routing === 'finding' ? ' muted' : ' plan-routing-warn'}`} role={route.routing === 'finding' ? 'status' : 'alert'}>
        {routingNote}
      </p>
    )}
    <dl className="stats plan-stats">
      <Stat label="Distance" value={formatKm(route.totalM / 1000)} tag={<ProvenanceTag category="derived" note={route.routing === 'safe' ? 'Along the A* safe path, on a 3,389.5 km Mars sphere' : 'Straight legs where no safe path is in yet, on a 3,389.5 km Mars sphere'} />} />
      <Stat label="Duration" value={formatDuration(route.durationMin)} tag={<ProvenanceTag category="estimated" note={walkingAssumption() + climbNote} />} />
      <Stat label="Gain" value={route.gainM === null ? null : formatM(route.gainM)} tag={<ProvenanceTag category="derived" note={from} />} />
      <Stat label="Loss" value={route.lossM === null ? null : formatM(route.lossM)} tag={<ProvenanceTag category="derived" note={from} />} />
      <Stat label="Max slope" value={route.maxSlope === null ? null : formatSlope(route.maxSlope)} tag={<ProvenanceTag category="derived" note={slopeNote} />} />
      <Stat label="Avg slope" value={route.avgSlope === null ? null : formatSlope(route.avgSlope)} tag={<ProvenanceTag category="derived" note={`${slopeNote}, averaged over the distance walked`} />} />
      <Stat
        label="Roughness"
        value={route.avgRoughness === null ? null : `${formatSlope(route.avgRoughness)} avg`}
        tag={<ProvenanceTag category="derived" note={`How much the slope varies within ${PATHFINDING.roughnessRadiusM} m (standard deviation of slope); worst on the route ${route.maxRoughness === null ? 'unknown' : formatSlope(route.maxRoughness)}. A steady ramp is smooth, broken ground is rough.`} />}
      />
      <Stat label="Science stops" value={String(science)} />
      <Stat label="Difficulty" value={difficulty(route.maxSlope)} tag={<ProvenanceTag category="estimated" note="Based on max slope and assumed slope thresholds" />} />
    </dl>
    </>
  )
}
