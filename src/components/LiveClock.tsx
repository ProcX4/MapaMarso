import { useNow } from '../hooks/useNow'
import { localMeanSolarTime, marsClock } from '../data/mars'
import { daylightText, sunElevation } from '../data/daylight'
import { formatHours, formatPhTime } from '../lib/format'
import { SITE } from '../config/site'

/**
 * Live time, top left under the brand (MapaMars style): Philippine time, Mars time (MTC), and the local
 * time and daylight at the demo site, which decides whether a Marswalk can start now.
 */
export function LiveClock() {
  const now = useNow()
  const { msd, mtc } = marsClock(now)
  const lmst = localMeanSolarTime(mtc, SITE.center[0])
  const sun = sunElevation(SITE.center, now.getTime())
  return (
    <p className="live-clock">
      <span className="live-clock-badge"><span className="live-dot" aria-hidden="true" />Live</span>
      <span>{formatPhTime(now.getTime())}</span>
      <span className="muted">Mars {formatHours(mtc).slice(0, 5)} MTC · Sol {Math.floor(msd).toLocaleString('en-US')}</span>
      <span className="muted">
        {SITE.name} {formatHours(lmst).slice(0, 5)} LMST · {daylightText(sun)}
      </span>
    </p>
  )
}
