import { formatDistance, formatDuration } from '../../lib/format'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { walkingAssumption } from '../../config/assumptions'

/** Distance and time back to base against the EVA time left. */
export function ReturnEstimate({ toBaseM, toBaseMin, leftMin }: { toBaseM: number; toBaseMin: number; leftMin: number }) {
  const note = `Straight line to base, no climb included. ${walkingAssumption()}`
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
