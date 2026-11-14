import { useDatasets } from '../../hooks/useDerived'
import { bearingDeg } from '../../data/mars'
import { sampleGrid } from '../../data/elevation'
import type { ProfilePoint } from '../../data/route'
import type { Stop } from '../../state/types'
import { formatBearing, formatDistance, formatSignedM } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'

/** Name, distance, bearing arrow and elevation change to the next stop. */
export function NextWaypoint({ from, next }: { from: ProfilePoint; next: { stop: Stop; remainingM: number } | null }) {
  const { dtm } = useDatasets()
  if (!next) {
    return (
      <div className="eva-fact">
        <p className="kicker">Next</p>
        <p className="eva-big">Route complete</p>
      </div>
    )
  }
  const bearing = bearingDeg(from.at, next.stop.at)
  const target = dtm.value ? sampleGrid(dtm.value, dtm.value.values, next.stop.at) : null
  const dz = target !== null && from.elevM !== null ? target - from.elevM : null

  return (
    <div className="eva-fact">
      <p className="kicker">Next · {next.stop.name}</p>
      <p className="eva-big num">
        <span className="eva-arrow" style={{ transform: `rotate(${bearing}deg)` }} aria-hidden>↑</span>
        {formatDistance(next.remainingM)}
      </p>
      <p className="eva-sub num">
        Bearing {formatBearing(bearing)} · {dz === null ? 'Elevation change: No data' : `${formatSignedM(dz)}`}{' '}
        <ProvenanceTag category="derived" />
      </p>
    </div>
  )
}
