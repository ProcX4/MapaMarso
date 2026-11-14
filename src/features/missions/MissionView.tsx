import { useEffect, useState } from 'react'
import { CodeInput } from '../../components/CodeInput'
import { Icon } from '../../components/Icon'
import { formatDuration, formatKm, formatSlope } from '../../lib/format'
import { useAuth } from '../../hooks/useAuth'
import { useHash } from '../../hooks/useHash'
import { useNow } from '../../hooks/useNow'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useRoute } from '../../hooks/useDerived'
import { fitTo } from '../../map/mapControl'
import { GROUPS, LAYERS } from '../../map/layers/registry'
import { formatCode, MISSION_CODE_PATTERN } from '../../lib/missionCode'
import type { OpenMission, Stop } from '../../state/types'
import { deleteMission, fetchCrew, fetchMissionByCode, fetchMissionById, joinMission, removeCrewMember, setMissionStatus, type CrewMember, type Mission } from '../../services/missions'
import { MissionLogPanel } from './MissionLogPanel'
import { go, MAP_EVA, MAP_MISSION, missionPath, planPath, timeAgo } from '../../lib/missionPaths'
import './missions.css'

/*
 * One saved mission on the shared 2D map (#/globe/2d/mission/CODE, or /m/<id> from the browse list): its route is
 * loaded onto the map like the planner's, so the layers, safe path, site card and elevation profile all work, and
 * this panel on the left sums it up, with its crew, its log, and buttons to walk it in EVA or edit it.
 */

type Tab = 'summary' | 'layers' | 'crew' | 'log'
type Lookup = { key: string; status: 'found' | 'missing' | 'error'; mission?: Mission; error?: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** The mission an address names: by code, or by id (#/globe/2d/mission/m/<id>) */
function parse(hash: string): { key: string; code?: string; id?: string } | null {
  const [first, second] = hash.slice(MAP_MISSION.length + 1).split('/')
  if (first === 'm' && second && UUID.test(second)) return { key: `id:${second}`, id: second }
  const code = decodeURIComponent(first ?? '').toUpperCase()
  return MISSION_CODE_PATTERN.test(code) ? { key: `code:${code}`, code } : null
}

const toOpenMission = (m: Mission): OpenMission => ({
  id: m.id,
  code: m.code,
  ownerId: m.ownerId,
  commander: m.commander,
  name: m.name,
  objective: m.objective,
  date: m.date,
  visibility: m.visibility,
})

export function MissionPanel() {
  const { user, available } = useAuth()
  const target = parse(useHash())
  const { state, dispatch } = useMarswalk()
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const key = target?.key ?? null
  const code = target?.code
  const id = target?.id

  // Load the mission whenever the address changes, and again after signing in or out (which changes whether
  // you may see its code)
  const userId = user?.id
  useEffect(() => {
    if (!key || !available) return
    const controller = new AbortController()
    const load = code ? fetchMissionByCode(code, controller.signal) : fetchMissionById(id!, controller.signal)
    load
      .then((mission) => setLookup(mission ? { key, status: 'found', mission: { ...mission, code: mission.code ?? code ?? null } } : { key, status: 'missing' }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setLookup({ key, status: 'error', error: err.message })
      })
    return () => controller.abort()
  }, [key, code, id, userId, available])

  const current = lookup && lookup.key === key ? lookup : null
  const mission = current?.mission ?? null

  // Put its route on the map, as the planner would, and bring it into view
  const shown = !!mission && state.mission?.id === mission.id
  useEffect(() => {
    if (!mission || shown) return
    dispatch({ type: 'loadRoute', stops: mission.stops, roundTrip: mission.roundTrip, mission: toOpenMission(mission) })
    fitTo(mission.stops.map((s) => s.at))
  }, [mission, shown, dispatch])

  const note = (text: string, alert = false) => (
    <section className="planner-panel mission-panel" aria-label="Mission">
      <a className="back-link" href={missionPath()}>
        ← All missions
      </a>
      <p className={alert ? 'form-error' : 'muted plan-note'} role={alert ? 'alert' : 'status'}>
        {text}
      </p>
    </section>
  )

  if (!available) return note('Missions need Supabase, which isn’t set up in this build.')
  if (!target) return note('That isn’t a mission code.', true)
  if (!current) return note(`Opening mission${code ? ` ${code}` : ''}…`)
  if (current.status === 'missing') return note(code ? `No mission found with code ${code}.` : 'That mission doesn’t exist or isn’t public.', true)
  if (current.status === 'error' || !mission) return note(current.error ?? 'Could not open that mission.', true)

  return (
    <MissionSummary
      key={mission.id}
      mission={mission}
      knownCode={code ?? mission.code}
      shown={shown}
      onChanged={(m) => setLookup({ key: current.key, status: 'found', mission: { ...m, code: m.code ?? mission.code } })}
      onDeleted={(m) => {
        dispatch({ type: 'newRoute' })
        go(missionPath())
        setLookup({ key: current.key, status: 'missing', error: `Mission ${m.code ?? m.name} was deleted.` })
      }}
    />
  )
}

type Props = {
  mission: Mission
  /** The code, when the viewer reached this mission through it (or is allowed to see it). */
  knownCode: string | null
  /** Whether its route is the one on the map yet */
  shown: boolean
  onChanged: (m: Mission) => void
  onDeleted: (m: Mission) => void
}

function MissionSummary({ mission, knownCode, shown, onChanged, onDeleted }: Props) {
  const { user } = useAuth()
  const { state, dispatch } = useMarswalk()
  const now = useNow(30_000)
  const route = useRoute()
  const [tab, setTab] = useState<Tab>('summary')
  const [confirmDelete, setConfirmDelete] = useState(false)
  // Which action is in progress: 'status', 'delete', 'join', or the user id being removed
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)
  const [crew, setCrew] = useState<CrewMember[] | null>(null)
  const [crewError, setCrewError] = useState<string | null>(null)
  const [crewVersion, setCrewVersion] = useState(0)
  const [joinRaw, setJoinRaw] = useState('')

  const complete = mission.status === 'complete'
  const isOwner = !!user && mission.ownerId === user.id
  const isMember = !!user && !!crew?.some((c) => c.userId === user.id)
  const canManage = !!user && (isOwner || user.isAdmin)
  const code = mission.code ?? knownCode
  const round = mission.roundTrip
  const hasRoute = shown && route.order.length > 1
  const crewCount = (crew?.length ?? mission.crewCount) + 1

  useEffect(() => {
    const controller = new AbortController()
    fetchCrew(mission.id, knownCode, controller.signal)
      .then(setCrew)
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setCrewError(err.message)
      })
    return () => controller.abort()
  }, [mission.id, knownCode, crewVersion])

  const act = async (kind: string, work: () => Promise<void>) => {
    setBusy(kind)
    setError(null)
    try {
      await work()
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(null)
    }
  }

  // After joining or leaving, reload the mission (joining reveals its code) and the crew list
  const refresh = async () => {
    const fresh = await fetchMissionById(mission.id)
    // Leaving an unlisted mission you reached without its code means you can no longer see it
    if (!fresh && !knownCode) {
      go(missionPath())
      return
    }
    if (fresh) onChanged({ ...fresh, code: fresh.code ?? knownCode })
    setCrewVersion((v) => v + 1)
  }

  const join = (withCode: string) =>
    act('join', async () => {
      const joinedId = await joinMission(withCode)
      if (joinedId !== mission.id) throw new Error('That code belongs to a different mission.')
      setJoinRaw('')
      await refresh()
    })

  const removeMember = (memberId: string) =>
    act(memberId, async () => {
      await removeCrewMember(mission.id, memberId)
      await refresh()
    })

  const toggleStatus = () =>
    act('status', async () => {
      onChanged(await setMissionStatus(mission.id, complete ? 'open' : 'complete'))
    })

  const remove = () =>
    act('delete', async () => {
      await deleteMission(mission.id)
      onDeleted(mission)
    })

  const copyCode = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard blocked: the code is on screen to copy by hand
    }
  }

  const joinArea = () => {
    if (!user)
      return complete ? null : (
        <p className="muted">
          Have this mission’s code? <a href="#/account">Sign in</a> to join the crew.
        </p>
      )
    if (isOwner) return <p className="muted">You lead this mission. Share its code to invite crew.</p>
    if (isMember) {
      return (
        <div className="form-actions">
          <span className="muted">You’re on this crew.</span>
          <button type="button" className="link-button" onClick={() => removeMember(user.id)} disabled={busy === user.id}>
            {busy === user.id ? 'Leaving…' : 'Leave mission'}
          </button>
        </div>
      )
    }
    if (complete) return <p className="muted">This mission is complete, so it can’t take new crew.</p>
    if (knownCode) {
      return (
        <button type="button" className="button" onClick={() => join(knownCode)} disabled={busy === 'join'}>
          {busy === 'join' ? 'Joining…' : 'Join this mission'}
        </button>
      )
    }
    return (
      <div className="join-with-code">
        <p className="muted">Enter the mission code to join the crew.</p>
        <CodeInput value={joinRaw} onChange={setJoinRaw} onComplete={join} label="Mission code to join: three letters, then three numbers" />
        <button type="button" className="button" onClick={() => join(formatCode(joinRaw))} disabled={joinRaw.length < 6 || busy === 'join'}>
          {busy === 'join' ? 'Joining…' : 'Join'}
        </button>
      </div>
    )
  }

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'summary', label: 'Summary' },
    { id: 'layers', label: 'Layers', count: state.layers.filter((l) => l.visible).length },
    { id: 'crew', label: 'Crew', count: crewCount },
    { id: 'log', label: 'Log' },
  ]

  return (
    <section className="planner-panel mission-panel" aria-label={`Mission ${mission.name}`}>
      <div>
        <a className="back-link" href={missionPath()}>
          ← All missions
        </a>
        <div className="planner-head">
          <div>
            <p className="info-card-kicker">Mission · led by {mission.commander}</p>
            <h1>{mission.name}</h1>
          </div>
          {code && (
            <button type="button" className="mono-code planner-code mission-copy" onClick={copyCode} title="Copy the code to share this mission">
              {copied ? 'Copied' : code}
            </button>
          )}
        </div>
        <div className="mission-badges">
          <span className={`status-badge is-${mission.status}`}>{complete ? 'Complete' : 'Open'}</span>
          {mission.visibility === 'unlisted' && <span className="status-badge is-open">Unlisted</span>}
          <span className="status-badge is-open">{round ? '↺ Round trip' : 'One way'}</span>
        </div>
      </div>

      {/* The two things to do with a mission: walk it, or (as its lead) change it */}
      <div className="mission-go">
        <button type="button" className="button" onClick={() => go(MAP_EVA)} disabled={!hasRoute}>
          <Icon name="eva" /> Walk it in EVA
        </button>
        {canManage && code && (
          <button type="button" className="button-outline" onClick={() => go(planPath(code))}>
            <Icon name="plan" /> Edit route
          </button>
        )}
      </div>

      <div className="mission-tabs toggles" role="tablist" aria-label="Mission details">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'is-on' : ''} onClick={() => setTab(t.id)}>
            {t.label}
            {t.count !== undefined && <span className="mission-tab-count">{t.count}</span>}
          </button>
        ))}
      </div>

      {tab === 'summary' && (
        <div className="planner-stage mission-summary" role="tabpanel">
          <dl className="mission-stats">
            <div>
              <dt>Distance</dt>
              <dd className="num">{hasRoute ? formatKm(route.totalM / 1000) : '…'}</dd>
            </div>
            <div>
              <dt>Walking time</dt>
              <dd className="num">{hasRoute ? formatDuration(route.durationMin) : '…'}</dd>
            </div>
            <div>
              <dt>Steepest</dt>
              <dd className="num">{hasRoute && route.maxSlope !== null ? formatSlope(route.maxSlope) : '—'}</dd>
            </div>
            <div>
              <dt>Stops</dt>
              <dd className="num">{mission.stops.length}</dd>
            </div>
          </dl>
          {mission.objective && <p className="planner-objective">{mission.objective}</p>}

          <ol className="mission-stops" aria-label="Route in walking order">
            {(shown ? route.order : mission.stops).map((stop, i, all) => {
              const back = round && i === all.length - 1 && i > 0
              return (
                <li key={`${stop.id}-${i}`}>
                  <span className={`stop-pick is-${back ? 'base' : stop.kind}`} aria-hidden>
                    {badge(stop, i, all, back)}
                  </span>
                  <span className="mission-stop-name">
                    {stop.name}
                    {back && <span className="muted"> (back to start)</span>}
                  </span>
                  {shown && i > 0 && route.legs[i - 1] && <span className="muted num mission-stop-leg">+{formatKm(route.legs[i - 1].m / 1000)}</span>}
                </li>
              )
            })}
          </ol>

          <dl className="kv mission-dates">
            <dt>Crew</dt>
            <dd>
              <button type="button" className="link-button mission-crew-link" onClick={() => setTab('crew')}>
                {[`${mission.commander} (lead)`, ...(crew ?? []).map((c) => c.username)].join(', ')}
              </button>
            </dd>
            {mission.date && (
              <>
                <dt>Planned</dt>
                <dd>{mission.date}</dd>
              </>
            )}
            <dt>Logged</dt>
            <dd>{timeAgo(mission.createdAt, now)}</dd>
            {mission.completedAt && (
              <>
                <dt>Completed</dt>
                <dd>{timeAgo(mission.completedAt, now)}</dd>
              </>
            )}
          </dl>
          <p className="muted plan-note">Click the map for the terrain, hazards and pictures at any point. The layers are in the top right.</p>
        </div>
      )}

      {/* The NASA layers over the route, switched on and off here (the full list, with opacity and sources,
          is behind the Layers button in the top right) */}
      {tab === 'layers' && (
        <div className="planner-stage mission-layers" role="tabpanel">
          {GROUPS.map((g) => (
            <fieldset key={g.id}>
              <legend>{g.label}</legend>
              {LAYERS.filter((l) => l.group === g.id).map((def) => {
                const on = !!state.layers.find((l) => l.id === def.id)?.visible
                return (
                  <label key={def.id} className={on ? 'is-on' : ''}>
                    <input type="checkbox" checked={on} onChange={() => dispatch({ type: 'toggleLayer', id: def.id })} />
                    <span>{def.name}</span>
                  </label>
                )
              })}
            </fieldset>
          ))}
        </div>
      )}

      {tab === 'crew' && (
        <div className="planner-stage crew" role="tabpanel">
          <ul>
            <li>
              <span className="plain">{mission.commander}</span>
              <span className="crew-role">Lead</span>
            </li>
            {crew?.map((c) => (
              <li key={c.userId}>
                <span className="plain">{c.username}</span>
                <span className="muted crew-joined">joined {timeAgo(c.joinedAt, now)}</span>
                {canManage && c.userId !== user?.id && (
                  <button type="button" className="link-button" onClick={() => removeMember(c.userId)} disabled={busy === c.userId}>
                    {busy === c.userId ? 'Removing…' : 'Remove'}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {crewError && <p className="form-error">{crewError}</p>}
          <div className="join-box">{joinArea()}</div>
        </div>
      )}

      {tab === 'log' && (
        <div className="planner-stage" role="tabpanel">
          <MissionLogPanel missionId={mission.id} knownCode={knownCode} isParticipant={isOwner || isMember} missionOpen={!complete} signedIn={!!user} />
        </div>
      )}

      {canManage && (
        <div className="detail-actions mission-lead">
          {confirmDelete ? (
            <>
              <span>Delete this mission and its crew list for everyone?</span>
              <div className="form-actions">
                <button type="button" className="button" onClick={remove} disabled={busy === 'delete'}>
                  {busy === 'delete' ? 'Deleting…' : 'Delete'}
                </button>
                <button type="button" className="button-outline" onClick={() => setConfirmDelete(false)} disabled={busy === 'delete'}>
                  Keep
                </button>
              </div>
            </>
          ) : (
            <>
              <p className="muted plan-note">
                {complete ? 'Everyone can see this mission. Reopening lets new crew join again.' : 'Completing a mission makes it visible to everyone and closes it to new crew.'}
              </p>
              <div className="form-actions">
                <button type="button" className="button-outline" onClick={toggleStatus} disabled={busy === 'status'}>
                  {busy === 'status' ? 'Saving…' : complete ? 'Reopen mission' : 'Mark complete'}
                </button>
                <button type="button" className="link-button" onClick={() => setConfirmDelete(true)}>
                  Delete
                </button>
              </div>
            </>
          )}
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </section>
  )
}

/** A stop's badge, as in the planner: A for the start (and the return to it), B for the end, numbers between */
function badge(stop: Stop, i: number, all: Stop[], back: boolean) {
  if (i === 0 || back) return 'A'
  if (stop.kind === 'destination') return 'B'
  if (stop.kind === 'science') return ''
  return String(all.slice(1, i + 1).filter((s) => s.kind === 'waypoint').length)
}
