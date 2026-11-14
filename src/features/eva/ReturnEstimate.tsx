import { formatDistance, formatDuration } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { walkingAssumption } from '../../config/assumptions'

type Props = {
  toBaseM: number
  toBaseMin: number
  leftMin: number
  /** Home back the way you came, or on round the rest of the loop */
  way: 'back' | 'on'
  /** The route is the A* safe path all the way (not straight legs) */
  safe: boolean
}

/** Distance and time back to base along the route, against the EVA time left. */
export function ReturnEstimate({ toBaseM, toBaseMin, leftMin, way, safe }: Props) {
  const along = way === 'back' ? 'back the way you came' : 'on round the rest of the loop'
  const note = `${safe ? 'Along the A* safe path' : 'Along the route (some legs straight, not checked for hazards)'}, ${along}, climb included. ${walkingAssumption()}`
  return (
    <>
      <div className="eva-fact">
        <p className="kicker">Back to base</p>
        <p className="eva-big num">{formatDuration(toBaseMin)}</p>
        <p className="eva-sub num">
          {formatDistance(toBaseM)} <ProvenanceTag category="estimated" note={note} />
        </p>
      </div>
      <div className="eva-fact">
        <p className="kicker">EVA time left</p>
        <p className={`eva-big num ${leftMin <= toBaseMin ? 'text-alert' : ''}`}>{leftMin < 0 ? `−${formatDuration(-leftMin)}` : formatDuration(leftMin)}</p>
        <p className="eva-sub">
          <ProvenanceTag category="estimated" note="Planned EVA length minus estimated walking time so far" />
        </p>
      </div>
    </>
  )
}
