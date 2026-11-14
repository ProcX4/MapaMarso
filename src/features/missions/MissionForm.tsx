import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { CodeInput } from '../../components/CodeInput'
import { MarsMap2D, type LatLon } from '../../globe/MarsMap2D'
import { formatDistanceKm, formatLat, formatLon } from '../../lib/format'
import { formatCode, sanitizeCode } from '../../lib/missionCode'
import { readFlag, writeFlag } from '../../lib/storage'
import { routeLegs, routeMarkers, routeStops, type RouteStop } from '../../globe/missionRoute'
import type { User } from '../../services/auth'
import { createMission, isMissionCodeAvailable, MAX_PHASES, suggestMissionCode, updateMission, type Mission, type MissionVisibility, type TripType } from '../../services/missions'
import { Icon } from '../../components/Icon'
import { Tour } from '../../components/Tour'
import { plannerTourSteps } from '../../config/tourSteps'
import { presets } from '../../lib/missionPaths'
import './missionForm.css'
import type { Stop, StopKind } from '../../state/types'

/*
 * Planning a mission anywhere on Mars on the flat map, in three steps (from MapaMars). Saves through the same
 * mission service as MAPA's route planner, so a walk planned here opens there too (#/globe/2d/plan/<code>).
 */

type Props = {
  user: User | null
  authLoading: boolean
  /** Present when editing an existing mission. */
  mission?: Mission
  onSaved: (m: Mission) => void
  onCancel: () => void
  /** 'fullscreen': the map fills the screen and the form floats over it in a scrolling panel (the globe's planner) */
  layout?: 'page' | 'fullscreen'
  /** Shade the map's night side as it is at this moment (ms) */
  sunAt?: number | null
}

type CodeStatus = 'incomplete' | 'checking' | 'available' | 'taken' | 'error'
/** Which point a map click places: the start, a phase (by index), or the end. */
type Slot = 'start' | 'end' | number
/** A stop as typed; `kind` keeps a MAPA stop type (e.g. science) through an edit */
type PointDraft = { name: string; lat: string; lon: string; kind?: StopKind }

const emptyPoint = (): PointDraft => ({ name: '', lat: '', lon: '' })
const draftOf = (name: string, lat: number, lon: number, kind?: StopKind): PointDraft => ({ name, lat: String(lat), lon: String(lon), kind })

function initialForm(m?: Mission) {
  return {
    name: m?.name ?? '',
    start: m ? draftOf(m.startName, m.startLat, m.startLon) : emptyPoint(),
    phases: m ? m.phases.map((p) => draftOf(p.name, p.lat, p.lon, p.kind)) : ([] as PointDraft[]),
    tripType: (m?.tripType ?? 'linear') as TripType,
    // A round trip has no separate end point in the form
    end: m && m.tripType !== 'round' ? draftOf(m.target, m.lat, m.lon) : emptyPoint(),
    date: m?.date ?? '',
    objective: m?.objective ?? '',
    visibility: (m?.visibility ?? 'public') as MissionVisibility,
  }
}

type Form = ReturnType<typeof initialForm>

function parsePoint(d: PointDraft): LatLon | null {
  if (d.lat.trim() === '' || d.lon.trim() === '') return null
  const p = { lat: Number(d.lat), lon: Number(d.lon) }
  return Number.isFinite(p.lat) && Number.isFinite(p.lon) && Math.abs(p.lat) <= 90 && Math.abs(p.lon) <= 180 ? p : null
}

const coordName = (p: LatLon) => `${formatLat(p.lat, 3)} ${formatLon(p.lon, 3)}`

/** The point with its display name, or null when its coordinates aren't set. */
function stopOf(d: PointDraft, fallback: string): RouteStop | null {
  const p = parsePoint(d)
  return p ? { ...p, name: d.name.trim() || fallback } : null
}

const slotLabel = (slot: Slot) => (slot === 'start' ? 'A · start' : slot === 'end' ? 'B · finish' : `stop ${slot + 1}`)

// The form in three steps, one showing at a time; any step can be opened from the step bar
type Stage = 'route' | 'mission' | 'details'
const STAGES: { id: Stage; label: string }[] = [
  { id: 'route', label: 'Route' },
  { id: 'mission', label: 'Name & code' },
  { id: 'details', label: 'Details' },
]

// The planner's tour opens by itself the first time someone plans a walk
const TOUR_SEEN_KEY = 'mapa.planner.tourSeen'

export function MissionForm({ user, authLoading, mission, onSaved, onCancel, layout = 'page', sunAt = null }: Props) {
  const fullscreen = layout === 'fullscreen'
  const editing = !!mission
  const [form, setForm] = useState(() => initialForm(mission))
  const [placing, setPlacing] = useState<Slot>(mission && mission.tripType !== 'round' ? 'end' : 'start')
  const [raw, setRaw] = useState(() => sanitizeCode(mission?.code ?? ''))
  const [checked, setChecked] = useState<{ raw: string; status: CodeStatus } | null>(null)
  const [suggesting, setSuggesting] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [focus, setFocus] = useState<(LatLon & { span?: number }) | null>(null)
  const [stage, setStage] = useState<Stage>('route')
  const [tourOpen, setTourOpen] = useState(false)
  // Which stop's latitude and longitude are open for typing (one at a time)
  const [coordsOpen, setCoordsOpen] = useState<Slot | null>(null)

  // First visit to the planner (signed in, so the form is there to show): run the tour once
  const signedIn = !!user
  useEffect(() => {
    if (!fullscreen || !signedIn || readFlag(TOUR_SEEN_KEY, false)) return
    // After the panel has slid in, so the tour can find its controls
    const id = setTimeout(() => {
      writeFlag(TOUR_SEEN_KEY, true)
      setTourOpen(true)
    }, 600)
    return () => clearTimeout(id)
  }, [fullscreen, signedIn])

  const code = formatCode(raw)
  const keepsOwnCode = !!mission && code === mission.code

  // Check the code with Supabase shortly after the last keystroke
  useEffect(() => {
    if (raw.length < 6 || keepsOwnCode) return
    const controller = new AbortController()
    const timer = setTimeout(() => {
      isMissionCodeAvailable(code, mission?.id, controller.signal)
        .then((ok) => setChecked({ raw, status: ok ? 'available' : 'taken' }))
        .catch((err: Error) => {
          if (err.name !== 'AbortError') setChecked({ raw, status: 'error' })
        })
    }, 350)
    return () => {
      clearTimeout(timer)
      controller.abort()
    }
  }, [raw, code, keepsOwnCode, mission?.id])

  const codeStatus: CodeStatus = raw.length < 6 ? 'incomplete' : keepsOwnCode ? 'available' : checked?.raw === raw ? checked.status : 'checking'

  const start = useMemo(() => stopOf(form.start, 'Start'), [form.start])
  const end = useMemo(() => stopOf(form.end, 'End'), [form.end])
  const phases = useMemo(() => form.phases.map((p, i) => stopOf(p, `Phase ${i + 1}`)), [form.phases])
  const round = form.tripType === 'round'
  const markers = useMemo(() => routeMarkers(start, phases, end, round), [start, phases, end, round])
  const phasesComplete = phases.every(Boolean)
  // A round trip ends back at A, so it needs no B but at least one phase to walk to
  const routeReady = !!start && phasesComplete && (round ? phases.length > 0 : !!end)
  const route = routeReady ? routeLegs(routeStops(start!, phases as RouteStop[], (end ?? start)!, round)) : null

  const set = (patch: Partial<Form>) => {
    setForm((f) => ({ ...f, ...patch }))
    setFormError(null)
  }

  const draftAt = (slot: Slot) => (slot === 'start' ? form.start : slot === 'end' ? form.end : form.phases[slot])
  const setDraft = (slot: Slot, patch: Partial<PointDraft>) => {
    setForm((f) => {
      if (slot === 'start') return { ...f, start: { ...f.start, ...patch } }
      if (slot === 'end') return { ...f, end: { ...f.end, ...patch } }
      return { ...f, phases: f.phases.map((p, i) => (i === slot ? { ...p, ...patch } : p)) }
    })
    setFormError(null)
  }

  // Clicking the map places the selected point, then moves on to the next point that's still empty
  // (from another step, it brings the route back into view first)
  const pick = (p: LatLon) => {
    setStage('route')
    setDraft(placing, { lat: p.lat.toFixed(4), lon: p.lon.toFixed(4) })
    const order: Slot[] = ['start', ...form.phases.map((_, i) => i), ...(round ? [] : ['end' as const])]
    const next = order.slice(order.indexOf(placing) + 1).find((slot) => !parsePoint(draftAt(slot)))
    if (next !== undefined) setPlacing(next)
  }

  const addPhase = () => {
    if (form.phases.length >= MAX_PHASES) return
    set({ phases: [...form.phases, emptyPoint()] })
    setPlacing(form.phases.length)
    setCoordsOpen(null)
  }

  const removePhase = (i: number) => {
    set({ phases: form.phases.filter((_, j) => j !== i) })
    if (placing === i) setPlacing(round ? 'start' : 'end')
    else if (typeof placing === 'number' && placing > i) setPlacing(placing - 1)
  }

  const movePhase = (i: number, dir: -1 | 1) => {
    const j = i + dir
    if (j < 0 || j >= form.phases.length) return
    const next = [...form.phases]
    ;[next[i], next[j]] = [next[j], next[i]]
    set({ phases: next })
    if (placing === i) setPlacing(j)
    else if (placing === j) setPlacing(i)
  }

  const jumpTo = (value: string) => {
    const p = presets.find((x) => x.value === value)
    if (p) setFocus({ lat: p.lat, lon: p.lon, span: 2 })
  }

  const suggest = async () => {
    setSuggesting(true)
    setFormError(null)
    try {
      const next = sanitizeCode(await suggestMissionCode())
      setRaw(next)
      setChecked({ raw: next, status: 'available' })
    } catch (err) {
      setFormError((err as Error).message)
    } finally {
      setSuggesting(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    // Each problem opens the step it's on
    const problem = (stageId: Stage, message: string) => {
      setStage(stageId)
      setFormError(message)
    }
    if (!start) return problem('route', 'Place the start (A): click the map or type its coordinates.')
    const missingPhase = phases.findIndex((p) => !p)
    if (missingPhase >= 0) return problem('route', `Place stop ${missingPhase + 1}, or remove it.`)
    if (round && phases.length === 0) return problem('route', 'A round trip needs at least one stop to walk to before coming back.')
    if (!round && !end) return problem('route', 'Place the finish (B): click the map or type its coordinates.')
    if (!form.name.trim()) return problem('mission', 'Give the Marswalk a name.')
    if (codeStatus !== 'available') return problem('mission', 'Choose an available mission code.')
    setSaving(true)
    setFormError(null)
    // The route as MAPA stops: the start is the base, then the stops, then the finish (none on a round trip)
    const stops: Stop[] = [
      { id: 'base', kind: 'base', name: form.start.name.trim() || coordName(start), at: [start.lon, start.lat] },
      ...(phases as RouteStop[]).map((p, i): Stop => ({ id: `p${i}`, kind: form.phases[i].kind ?? 'waypoint', name: p.name, at: [p.lon, p.lat] })),
      ...(round || !end ? [] : [{ id: 'end', kind: 'destination' as const, name: form.end.name.trim() || coordName(end), at: [end.lon, end.lat] as [number, number] }]),
    ]
    const fields = { code, name: form.name, objective: form.objective, date: form.date, visibility: form.visibility, stops, roundTrip: round }
    try {
      onSaved(mission ? await updateMission(mission.id, fields) : await createMission(fields))
    } catch (err) {
      setFormError((err as Error).message)
      setSaving(false)
    }
  }

  const statusText: Record<CodeStatus, string> = {
    incomplete: 'Three letters, then three numbers. It’s the invite people use to join your crew.',
    checking: 'Checking if this code is free…',
    available: keepsOwnCode ? 'This is the mission’s current code.' : `${code} is available.`,
    taken: `${code} is already taken. Try another one.`,
    error: 'Could not check this code right now.',
  }

  // Each stop is one row: its letter (click to place it on the map), its name, and where it is
  // (click to type the coordinates). Stops between start and end can move up, down or out.
  const stopRow = (slot: Slot, legKm: number | undefined) => {
    const draft = draftAt(slot)
    const isPhase = typeof slot === 'number'
    const badge = slot === 'start' ? 'A' : slot === 'end' ? 'B' : String(slot + 1)
    const title = slot === 'start' ? 'Start' : slot === 'end' ? 'Finish' : `Stop ${slot + 1}`
    const isPlacing = placing === slot
    const point = parsePoint(draft)
    const open = coordsOpen === slot
    return (
      <li key={String(slot)} className={`stop-row${isPlacing ? ' is-placing' : ''}${point ? ' is-set' : ''}`}>
        <button
          type="button"
          className={`stop-pick point-letter is-${isPhase ? 'phase' : slot}`}
          onClick={() => setPlacing(slot)}
          aria-pressed={isPlacing}
          aria-label={`Place ${title.toLowerCase()} on the map`}
          title={isPlacing ? 'Click the map to place it' : 'Place this stop on the map'}
        >
          {badge}
        </button>
        <div className="stop-body">
          <input
            className="stop-name"
            value={draft.name}
            onChange={(e) => setDraft(slot, { name: e.target.value })}
            onFocus={() => setPlacing(slot)}
            maxLength={80}
            placeholder={`${title} name (optional)`}
            aria-label={`${title} name`}
          />
          <button
            type="button"
            className="stop-coords"
            onClick={() => {
              setPlacing(slot)
              setCoordsOpen(open ? null : slot)
            }}
            aria-expanded={open}
          >
            {point ? coordName(point) : isPlacing ? 'Click the map to place' : 'Not placed yet'}
            {legKm !== undefined && <span className="stop-leg"> · {formatDistanceKm(legKm)}</span>}
          </button>
          {open && (
            <div className="stop-coord-inputs">
              <label>
                <span>Latitude</span>
                <input value={draft.lat} onChange={(e) => setDraft(slot, { lat: e.target.value })} inputMode="decimal" placeholder="-90 to 90" autoFocus />
              </label>
              <label>
                <span>Longitude (east)</span>
                <input value={draft.lon} onChange={(e) => setDraft(slot, { lon: e.target.value })} inputMode="decimal" placeholder="-180 to 180" />
              </label>
            </div>
          )}
        </div>
        {isPhase && (
          <span className="stop-actions">
            <button type="button" onClick={() => movePhase(slot, -1)} disabled={slot === 0} aria-label={`Move stop ${slot + 1} earlier`} title="Earlier">↑</button>
            <button type="button" onClick={() => movePhase(slot, 1)} disabled={slot === form.phases.length - 1} aria-label={`Move stop ${slot + 1} later`} title="Later">↓</button>
            <button type="button" onClick={() => removePhase(slot)} aria-label={`Remove stop ${slot + 1}`} title="Remove">✕</button>
          </span>
        )}
      </li>
    )
  }

  const slots: Slot[] = ['start', ...form.phases.map((_, i) => i), ...(round ? [] : ['end' as const])]

  const setTripType = (tripType: TripType) => {
    set({ tripType })
    if (tripType === 'round' && placing === 'end') setPlacing('start')
  }

  const stageIndex = STAGES.findIndex((s) => s.id === stage)
  const lastStage = stageIndex === STAGES.length - 1
  const stageDone: Record<Stage, boolean> = {
    route: routeReady,
    mission: codeStatus === 'available' && !!form.name.trim(),
    details: !!(form.date || form.objective.trim()),
  }

  const formSection = (
    <section className={`mission-form-wrap planner-form${fullscreen ? ' planner-panel' : ''}`} aria-label="Mission details">
      <header className="planner-head">
        <h1>{editing ? 'Edit Marswalk' : 'New Marswalk'}</h1>
        {user && (
          <button type="button" className="planner-icon planner-help" onClick={() => setTourOpen((o) => !o)} aria-label="How planning works" title="How planning works">
            <Icon name="help" />
          </button>
        )}
        <button type="button" className="planner-icon" onClick={onCancel} aria-label="Cancel" title="Cancel">
          <Icon name="close" />
        </button>
      </header>

      {authLoading ? null : !user ? (
        <div className="signin-prompt">
          <p>Sign in to plan a Marswalk. You can edit or delete it later.</p>
          <a className="button" href="#/account">Sign in or create an account</a>
        </div>
      ) : (
        <form className="mission-form walk-form" onSubmit={submit} noValidate>
          <ol className="planner-steps" aria-label="Steps">
            {STAGES.map((s, i) => (
              <li key={s.id}>
                <button
                  type="button"
                  className={`${stage === s.id ? 'is-on' : ''}${stageDone[s.id] ? ' is-done' : ''}`}
                  aria-current={stage === s.id ? 'step' : undefined}
                  onClick={() => setStage(s.id)}
                >
                  <span className="planner-step-mark">{stageDone[s.id] && stage !== s.id ? '✓' : i + 1}</span>
                  {s.label}
                </button>
              </li>
            ))}
          </ol>

          {stage === 'route' && (
            <div className="planner-stage">
              <div className="segmented trip-switch" role="radiogroup" aria-label="Trip type">
                {([['linear', 'A → B'], ['round', 'Round trip ↺']] as const).map(([value, label]) => (
                  <button key={value} type="button" role="radio" aria-checked={form.tripType === value} className={form.tripType === value ? 'is-on' : ''} onClick={() => setTripType(value)}>
                    {label}
                  </button>
                ))}
              </div>
              <ol className="stops" aria-label="Stops in walking order">
                {slots.map((slot, i) => stopRow(slot, i > 0 ? route?.legs[i - 1]?.km : undefined))}
              </ol>
              <button type="button" className="add-stop" onClick={addPhase} disabled={form.phases.length >= MAX_PHASES}>
                + Add a stop{' '}
                <span className="muted">
                  {form.phases.length}/{MAX_PHASES}
                </span>
              </button>
              {round && (
                <p className="muted planner-note">
                  ↺ Back to A{route ? ` · ${formatDistanceKm(route.legs[route.legs.length - 1].km)}` : ''}
                  {form.phases.length === 0 && ' · add at least one stop to walk to'}
                </p>
              )}
            </div>
          )}

          {stage === 'mission' && (
            <div className="planner-stage">
              <label>
                <span>Mission name</span>
                <input value={form.name} onChange={(e) => set({ name: e.target.value })} maxLength={80} required placeholder="e.g. Delta Survey I" autoFocus={!editing} />
              </label>
              <div className="code-field">
                <span className="field-label">Mission code</span>
                <CodeInput
                  value={raw}
                  onChange={(next) => {
                    setRaw(next)
                    setFormError(null)
                  }}
                  label="Mission code: three letters, then three numbers"
                  invalid={codeStatus === 'taken'}
                  describedBy="code-status"
                />
                <p id="code-status" className={`code-status is-${codeStatus}`} aria-live="polite">
                  {codeStatus === 'available' && <span aria-hidden="true">✓ </span>}
                  {statusText[codeStatus]}
                </p>
                <button type="button" className="link-button" onClick={suggest} disabled={suggesting}>
                  {suggesting ? 'Finding a free code…' : 'Suggest a random code'}
                </button>
              </div>
            </div>
          )}

          {stage === 'details' && (
            <div className="planner-stage">
              <label>
                <span>
                  Planned date <em className="muted">optional</em>
                </span>
                <input type="date" value={form.date} onChange={(e) => set({ date: e.target.value })} />
              </label>
              <label>
                <span>
                  Objective <em className="muted">optional</em>
                </span>
                <textarea value={form.objective} onChange={(e) => set({ objective: e.target.value })} maxLength={500} rows={3} placeholder="What will this Marswalk do?" />
              </label>
              <div className="choice">
                <span className="field-label">Who can find it</span>
                <div className="segmented" role="radiogroup" aria-label="Who can find it">
                  {([['public', 'Public'], ['unlisted', 'Unlisted']] as const).map(([value, label]) => (
                    <button key={value} type="button" role="radio" aria-checked={form.visibility === value} className={form.visibility === value ? 'is-on' : ''} onClick={() => set({ visibility: value })}>
                      {label}
                    </button>
                  ))}
                </div>
                <p className="muted choice-hint">
                  {form.visibility === 'public' ? 'Anyone can see it and its crew when browsing. Joining still needs the code.' : 'Only people with the code can open it, until it’s completed.'}
                </p>
              </div>
            </div>
          )}

          <div className="form-footer">
            <p className="form-footer-summary planner-summary" aria-live="polite">
              {route ? (
                <>
                  <strong className="plain">{formatDistanceKm(route.totalKm)}</strong>
                  <span className="muted">
                    {' '}
                    straight line · {slots.length} stops{round ? ' · round trip' : ''}
                  </span>
                </>
              ) : (
                <span className="muted">Place every stop to see the distance.</span>
              )}
            </p>
            {formError && (
              <p className="form-error" role="alert">
                {formError}
              </p>
            )}
            <div className="form-actions">
              {stageIndex > 0 && (
                <button type="button" className="button-outline" onClick={() => setStage(STAGES[stageIndex - 1].id)}>
                  Back
                </button>
              )}
              {!lastStage && (
                <button type="button" className={`${editing ? 'button-outline' : 'button'} planner-next`} onClick={() => setStage(STAGES[stageIndex + 1].id)}>
                  Next
                </button>
              )}
              {(lastStage || editing) && (
                <button className="button" type="submit" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Save changes' : 'Create Marswalk'}
                </button>
              )}
            </div>
          </div>
        </form>
      )}
    </section>
  )

  const mapSection = (
    <section className={fullscreen ? 'planner-map' : 'mission-map'}>
      {user && (
        <div className="map-toolbar">
          <label className="jump-to">
            <span className="visually-hidden">Jump to a place</span>
            <select
              defaultValue=""
              onChange={(e) => {
                jumpTo(e.target.value)
                e.target.value = ''
              }}
            >
              <option value="" disabled>
                Jump to…
              </option>
              {['Landmarks', 'Landing sites'].map((group) => (
                <optgroup key={group} label={group}>
                  {presets
                    .filter((p) => p.group === group)
                    .map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.name}
                      </option>
                    ))}
                </optgroup>
              ))}
            </select>
          </label>
        </div>
      )}
      <MarsMap2D points={markers} closed={round} onPick={user ? pick : undefined} focus={focus} label="Marswalk planning map" fill={fullscreen} sunAt={sunAt} />
      {user && (
        <p className="muted map-hint">
          Click the map to place <strong className="plain">{slotLabel(placing)}</strong>
        </p>
      )}
    </section>
  )

  const tour = tourOpen && <Tour steps={plannerTourSteps} onClose={() => setTourOpen(false)} />

  // Full screen, the map goes first so the panel sits on top of it
  return fullscreen ? (
    <div className="planner">
      {mapSection}
      {formSection}
      {tour}
    </div>
  ) : (
    <main className="missions-page">
      {formSection}
      {mapSection}
      {tour}
    </main>
  )
}
