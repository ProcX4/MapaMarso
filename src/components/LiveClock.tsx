import { useNow } from '../hooks/useNow'
import { localMeanSolarTime, marsClock } from '../data/mars'
import { daylightText, sunElevation } from '../data/daylight'
import { formatHours, formatPhTime } from '../lib/format'
import { SITE } from '../config/site'

/**
 * Live time, top left under the brand (MapaMars style): Philippine time, Mars time (MTC), and the local
 * time and daylight at the demo site, which decides whether a Marswalk can start now. `compact` is the globe's
 * two-line clock (Philippine time and MTC only), exactly as in the idea bank.
 */
export function LiveClock({ compact = false }: { compact?: boolean }) {
  const now = useNow()
  const { msd, mtc } = marsClock(now)
  const lmst = localMeanSolarTime(mtc, SITE.center[0])
  const sun = sunElevation(SITE.center, now.getTime())
  return (
    <p className="live-clock">
      <span className="live-clock-badge"><span className="live-dot" aria-hidden="true" />Live</span>
      <span>{formatPhTime(now.getTime())}</span>
      <span className="muted">Mars {formatHours(mtc).slice(0, 5)} MTC{!compact && ` · Sol ${Math.floor(msd).toLocaleString('en-US')}`}</span>
      {!compact && <span className="muted">
        {SITE.name} {formatHours(lmst).slice(0, 5)} LMST · {daylightText(sun)}
      </span>}
    </p>
  )
}
