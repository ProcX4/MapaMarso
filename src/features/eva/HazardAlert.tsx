import type { HazardSection } from '../../data/route'
import { formatDistance, formatSlope } from '../../lib/format'

type Props = { returnMin: number; leftMin: number; hazard: HazardSection | null; hazardStartsInM: number | null }

/** One alert at a time, highest priority first. Text always states the problem: colour is never the only signal. */
export function HazardAlert({ returnMin, leftMin, hazard, hazardStartsInM }: Props) {
  let alert: { level: 'alert' | 'hazard' | 'caution' | 'ok'; text: string }

  if (leftMin <= returnMin) {
    alert = { level: 'alert', text: 'RETURN NOW · time to base exceeds EVA time left' }
  } else if (hazard) {
    const where = hazardStartsInM ? `in ${formatDistance(hazardStartsInM)}` : 'here'
    alert = {
      level: hazard.token === 'alert' ? 'alert' : hazard.token === 'hazard' ? 'hazard' : 'caution',
      text: `STEEP TERRAIN ${where} · up to ${formatSlope(hazard.maxSlope)} · ${hazard.label}`,
    }
  } else if (leftMin - returnMin < 30) {
    alert = { level: 'caution', text: 'Under 30 min of margin before you must turn back' }
  } else {
    alert = { level: 'ok', text: 'No alerts' }
  }

  return (
    <p className={`eva-alert is-${alert.level}`} role={alert.level === 'ok' ? 'status' : 'alert'}>
      {alert.text}
    </p>
  )
}
