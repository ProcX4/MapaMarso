import type { ReactNode } from 'react'
import { useAuth } from '../../hooks/useAuth'
import type { MissionsState } from '../../hooks/useMissions'
import type { Mission, MissionStatus } from '../../services/missions'
import { formatLat, formatLon } from '../../lib/format'
import { FlagIcon } from '../../components/FlagIcon'
import { Icon } from '../../components/Icon'
import { SearchBox } from '../../components/SearchBox'
import { daylightOf, daylightText, sunAt, sunElevationAt } from '../../data/daylight'
import { GLOBE_PLAN, missionIdPath, missionPath, OWNER_FILTERS, type OwnerFilter } from '../../lib/missionPaths'

/* The globe's missions list and mission card (from MapaMars pages/globe/MissionsHud.tsx). */

type HudProps = {
  /** The missions with the chosen status that match the search: these are the ones on the globe and map too */
  missions: MissionsState
  status: MissionStatus
  onStatus: (status: MissionStatus) => void
  /** Whose missions: everyone's, other users' only, or yours */
  owner: OwnerFilter
  onOwner: (owner: OwnerFilter) => void
  signedIn: boolean
  query: string
  onQuery: (query: string) => void
  /** The list slides out from the right edge while open */
  open: boolean
  onToggleOpen: () => void
  showList: boolean
  /** Fly the globe to a mission */
  onSelect: (id: string) => void
  /** More buttons at the start of the row (the 2D map's Layers) */
  before?: ReactNode
}

const STATUSES: { id: MissionStatus; label: string }[] = [
  { id: 'open', label: 'Ongoing' },
  { id: 'complete', label: 'Complete' },
]

/**
 * Top-right of the globe: a quick "+" to start a new mission, and the Mission button, which slides the missions
 * list in from the right edge and back out. The list shows ongoing or completed missions, narrowed by a search.
 */
export function MissionsHud({ missions, status, onStatus, owner, onOwner, signedIn, query, onQuery, open, onToggleOpen, showList, onSelect, before }: HudProps) {
  const { user, available } = useAuth()
  const { list, error } = missions
  const ongoing = status === 'open'

  return (
    <div className="missions-hud">
      <div className="missions-bar">
        {before}
        <a
          className="missions-add"
          href={user ? GLOBE_PLAN : '#/account'}
          aria-label={user ? 'New mission' : 'Sign in to create a mission'}
          title={user ? 'New mission' : 'Sign in to create a mission'}
        >
          <Icon name="plus" />
        </a>
        <button type="button" className={`missions-link${open ? ' is-open' : ''}`} onClick={onToggleOpen} aria-expanded={open} aria-controls="missions-panel">
          Mission
        </button>
      </div>

      {showList && (
        // Stays in place while closed, so it can slide back out of view instead of vanishing
        <section id="missions-panel" className={`missions-panel${open ? ' is-open' : ''}`} aria-label="Missions" inert={!open}>
          <div className="missions-panel-head">
            <span>{ongoing ? 'Ongoing missions' : 'Completed missions'}</span>
            {list && <span className="missions-count">{list.length}</span>}
            <a className="missions-all" href={missionPath()}>
              All missions →
            </a>
          </div>
          <div className="hud-filter">
            <div className="hud-chips" role="group" aria-label="Mission status">
              {STATUSES.map((s) => (
                <button key={s.id} type="button" className={status === s.id ? 'is-on' : ''} aria-pressed={status === s.id} onClick={() => onStatus(s.id)}>
                  {s.label}
                </button>
              ))}
            </div>
            <div className="hud-chips" role="group" aria-label="Whose missions">
              {OWNER_FILTERS.filter((f) => f.id !== 'mine' || signedIn).map((f) => (
                <button
                  key={f.id}
                  type="button"
                  className={owner === f.id ? 'is-on' : ''}
                  aria-pressed={owner === f.id}
                  onClick={() => onOwner(f.id)}
                  title={f.id === 'others' ? 'Missions created by other users' : f.id === 'mine' ? 'Missions you lead or joined' : undefined}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <SearchBox value={query} onChange={onQuery} label="Search missions" />
          </div>
          <div className="missions-panel-body">
            {!available && <p className="muted">Missions need Supabase, which isn't set up in this build.</p>}
            {error && <p className="form-error">{error}</p>}
            {available && !list && !error && <p className="muted">Loading…</p>}
            {available &&
              list?.length === 0 &&
              (query.trim() ? (
                <p className="muted">
                  No {ongoing ? 'ongoing' : 'completed'} missions match “{query.trim()}”.
                </p>
              ) : owner === 'others' ? (
                <p className="muted">No {ongoing ? 'ongoing' : 'completed'} missions from other users right now.</p>
              ) : owner === 'mine' ? (
                <p className="muted">You have no {ongoing ? 'ongoing' : 'completed'} missions.</p>
              ) : ongoing ? (
                <p className="muted">
                  No ongoing missions right now. <a href={user ? GLOBE_PLAN : '#/account'}>{user ? 'Start one' : 'Sign in to start one'}</a>
                </p>
              ) : (
                <p className="muted">No completed missions yet.</p>
              ))}
            {list && list.length > 0 && (
              <ul>
                {list.map((m) => (
                  <li key={m.id}>
                    <button type="button" onClick={() => onSelect(m.id)}>
                      <span className="missions-item-name">
                        {m.name}
                        {m.code && <span className="mono-code">{m.code}</span>}
                      </span>
                      <span className="muted">
                        {m.startName} {m.tripType === 'round' ? '↺ round trip' : `→ ${m.target}`} · {crewText(m)}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}
    </div>
  )
}

const crewText = (m: Mission) => `${m.crewCount + 1} crew`

type CardProps = {
  mission: Mission
  /** The moment the day/night of each stop is shown for (now, or a time picked on the flat map) */
  at: number
  /** Describes `at` when it isn't now, e.g. "in 3 h 15 min" */
  atLabel?: string
  /** How the A* safe path for the route is going, e.g. its length and the elevation it was found on */
  pathNote?: string
  onClose: () => void
}

/** Brief background for a mission picked on the globe or from the list, with day or night at each stop. */
export function MissionCard({ mission: m, at, atLabel, pathNote, onClose }: CardProps) {
  const sun = sunAt(at)
  const round = m.tripType === 'round'
  const stops = [
    { key: 'start', mark: round ? 'A ↺' : 'A', name: m.startName, lat: m.startLat, lon: m.startLon },
    ...m.phases.map((p, i) => ({ key: `p${i}`, mark: String(i + 1), name: p.name, lat: p.lat, lon: p.lon })),
    ...(round ? [] : [{ key: 'end', mark: 'flag', name: m.target, lat: m.lat, lon: m.lon }]),
  ]
  return (
    <aside className="info-card is-mission" aria-label={`${m.name} mission`}>
      <button type="button" className="info-card-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <p className="info-card-kicker">
        {m.status === 'complete' ? 'Completed mission' : 'Ongoing mission'}
        {m.code ? ` · ${m.code}` : ''}
      </p>
      <h2>{m.name}</h2>
      <p className="muted">
        Led by {m.commander} · {crewText(m)}
      </p>
      <p className="stop-light-head">Day and night along the route{atLabel ? ` · ${atLabel}` : ' · now'}</p>
      <ol className="stop-light">
        {stops.map((stop) => {
          const elevation = sunElevationAt(stop, sun)
          return (
            <li key={stop.key} className={`is-${daylightOf(elevation)}`}>
              <span className={`stop-light-mark${stop.mark === 'flag' ? ' is-finish' : ''}`}>{stop.mark === 'flag' ? <FlagIcon /> : stop.mark}</span>
              <span className="stop-light-name">
                {stop.name}
                <span className="muted">
                  {formatLat(stop.lat, 1)} {formatLon(stop.lon, 1)}
                </span>
              </span>
              <span className="stop-light-state">{daylightText(elevation)}</span>
            </li>
          )
        })}
      </ol>
      {(m.date || pathNote) && (
        <dl className="info-card-facts">
          {m.date && (
            <>
              <dt>Planned date</dt>
              <dd>{m.date}</dd>
            </>
          )}
          {pathNote && (
            <>
              <dt>Safe path</dt>
              <dd>{pathNote}</dd>
            </>
          )}
        </dl>
      )}
      {m.objective && <p className="info-card-text">{m.objective}</p>}
      <a className="button info-card-action" href={m.code ? missionPath(m.code) : missionIdPath(m.id)}>
        Open mission
      </a>
    </aside>
  )
}
