import type { CSSProperties } from 'react'
import { MOON_SHAPE_CREDIT } from '../../globe/moonModel'
import type { LandingSite } from '../../data/mars'
import { formatLat, formatLon } from '../../lib/format'
import { moonInfo } from '../../data/marsMoons'
import { moonPeriodDays, type MoonId } from '../../data/marsSky'
import { formatAhead, formatOffset } from '../../data/daylight'
import { Icon } from '../../components/Icon'

/* The globe page's small controls and cards (from MapaMars pages/globe/GlobeOverlay.tsx). */

/** Bottom right: switch between the globe and the flat map of the whole planet. */
export function ViewSwitch({ flat, onFlat }: { flat: boolean; onFlat: (flat: boolean) => void }) {
  return (
    <div className="view-switch" role="group" aria-label="View">
      <button type="button" className={flat ? '' : 'is-on'} aria-pressed={!flat} onClick={() => onFlat(false)}>3D</button>
      <button type="button" className={flat ? 'is-on' : ''} aria-pressed={flat} onClick={() => onFlat(true)}>2D</button>
    </div>
  )
}

type TimeBarProps = {
  /** Hours ahead of now being shown (0 = live) */
  aheadH: number
  maxH: number
  onChange: (h: number) => void
  /** Playback speed in hours per second: 0 paused, or playRate */
  rate: number
  playRate: number
  onRate: (rate: number) => void
  onNow: () => void
}

/**
 * Day and night through the next sol, as a simple playback: a bare play or pause mark, a ring on a line to drag
 * ahead (the line is one sol long), and a button back to the present.
 */
export function TimeBar({ aheadH, maxH, onChange, rate, playRate, onRate, onNow }: TimeBarProps) {
  const label = formatAhead(aheadH)
  const offset = formatOffset(aheadH)
  const playing = rate !== 0
  const live = aheadH === 0 && !playing
  return (
    <div className="daylight-bar" role="group" aria-label="Day and night playback">
      <button
        type="button"
        className="daylight-bar-play"
        onClick={() => onRate(playing ? 0 : playRate)}
        aria-pressed={playing}
        aria-label={playing ? 'Pause' : 'Play day and night'}
        title={playing ? 'Pause' : 'Play day and night'}
      >
        <Icon name={playing ? 'pause' : 'play'} />
      </button>
      <div className="daylight-bar-line" style={{ '--at': aheadH / maxH } as CSSProperties}>
        <input
          type="range"
          className="daylight-bar-track"
          min={0}
          max={maxH}
          step={0.25}
          value={aheadH}
          onChange={(e) => onChange(Number(e.target.value))}
          aria-label="Show day and night this many hours from now"
          aria-valuetext={label}
          title={label}
        />
        {/* How far ahead of now, riding above the ring */}
        {offset && (
          <span className={`daylight-bar-offset${playing ? ' is-playing' : ''}`} aria-hidden="true">
            {offset}
          </span>
        )}
      </div>
      <button type="button" className="daylight-bar-now" onClick={onNow} disabled={live} aria-label="Back to the current time" title={live ? 'Showing the current time' : `Showing ${label}: back to now`}>
        <Icon name="live" />
        <span>Now</span>
      </button>
    </div>
  )
}

const statusText = { ACTIVE: 'Active', RETIRED: 'Retired', ENDED: 'Mission ended' }

type SiteCardProps = {
  site: LandingSite
  /** The site has a 3D close-up to fly down to (Viking 1) */
  canExplore: boolean
  diving: boolean
  onExplore: () => void
  onClose: () => void
  /** Open this site in MAPA's Explore map (NASA layers at walking scale) */
  onMap?: () => void
}

/** Brief background for a landing site, shown on the globe only. */
export function LandingSiteCard({ site, canExplore, diving, onExplore, onClose, onMap }: SiteCardProps) {
  return (
    <aside className="info-card" aria-label={`${site.mission} landing site`}>
      <button type="button" className="info-card-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <p className="info-card-kicker">Landing site · {site.landed}</p>
      <h2>{site.mission}</h2>
      <p className="muted">
        {site.location} · {formatLat(site.lat, 1)} {formatLon(site.lon, 1)}
      </p>
      <p className="info-card-text">{site.note}</p>
      <p className="info-card-status">{statusText[site.status]}</p>
      {canExplore && (
        <button type="button" className="button info-card-action" onClick={onExplore} disabled={diving}>
          {diving ? 'Descending…' : 'Explore landing site'}
        </button>
      )}
      {onMap && (
        <button type="button" className="button-outline info-card-action" onClick={onMap}>
          Open on the site map
        </button>
      )}
    </aside>
  )
}

/** Brief background for Phobos or Deimos. */
export function MoonCard({ id, onClose }: { id: MoonId; onClose: () => void }) {
  const info = moonInfo[id]
  const periodH = moonPeriodDays(id) * 24
  return (
    <aside className="info-card" aria-label={info.name}>
      <button type="button" className="info-card-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <p className="info-card-kicker">Moon · {info.designation}</p>
      <h2>{info.name}</h2>
      <p className="muted">{info.meaning}</p>
      <dl className="info-card-facts">
        <dt>Size</dt>
        <dd>{info.size}</dd>
        <dt>Orbits Mars every</dt>
        <dd>
          {Math.floor(periodH)} h {Math.round((periodH % 1) * 60)} min
        </dd>
        <dt>Discovered</dt>
        <dd>{info.discovered}</dd>
      </dl>
      <p className="info-card-text">{info.background[0]}</p>
      <p className="muted info-card-credit">Shape measured from spacecraft images · {MOON_SHAPE_CREDIT}</p>
    </aside>
  )
}
