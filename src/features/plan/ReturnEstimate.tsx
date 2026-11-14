import { useRoute } from '../../hooks/useDerived'
import { useMarswalk } from '../../hooks/useMarswalk'
import { Stat } from '../../components/Stat'
import { ProvenanceTag } from '../../components/ProvenanceTag'
import { formatDuration } from '../../lib/format'
import { walkingAssumption } from '../../config/assumptions'

/** Whole-walk time against the planned EVA length: is there margin to get home? */
export function ReturnEstimate() {
  const route = useRoute()
  const { state } = useMarswalk()
  const limitMin = state.maxEvaHours * 60
  const marginMin = limitMin - route.durationMin
  const over = marginMin < 0
  const note = `${walkingAssumption()}. EVA limit ${state.maxEvaHours} h (assumption).`

  return (
    <div className="plan-return">
      <dl className="stats">
        <Stat label="EVA limit" value={formatDuration(limitMin)} tag={<ProvenanceTag category="estimated" note={note} />} />
        <Stat label={over ? 'Over limit by' : 'Margin'} value={formatDuration(Math.abs(marginMin))} tag={<ProvenanceTag category="estimated" note={note} />} />
      </dl>
      {!state.roundTrip && <p className="muted plan-return-note">One-way route: the return walk is not included.</p>}
      {over && <p className="plan-return-warning" role="alert">Route is longer than the planned EVA. Shorten it or remove stops.</p>}
    </div>
  )
}
