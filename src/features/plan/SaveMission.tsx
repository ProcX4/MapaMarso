import { useEffect, useState, type FormEvent } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useAuth } from '../../hooks/useAuth'
import { createMission, isMissionCodeAvailable, suggestMissionCode, updateMission, type MissionVisibility } from '../../services/missions'
import { formatCode, sanitizeCode } from '../../lib/missionCode'
import { CodeInput } from '../../components/CodeInput'
import { Button } from '../../components/Button'
import { LIMITS } from '../../config/assumptions'
import { toOpenMission } from './useMissionFromCode'
import { missionMapPath, planPath } from '../../lib/missionPaths'

/** How long after the last keystroke the code is checked with Supabase */
const CHECK_DELAY_MS = 400

type CodeCheck = { code: string; status: 'checking' | 'available' | 'taken' | 'error' }

/**
 * Save the route as a mission with a code: the one place missions are created and edited (the + button, the
 * Missions page's New and Edit all open this planner). The author can update their mission; anyone else saves
 * their own copy under a new code. The code is checked as it's typed, so a taken one shows before saving.
 */
export function SaveMission() {
  const { state, dispatch } = useMarswalk()
  const { available, user, loading } = useAuth()
  const open = state.mission
  const mine = !!open && !!user && open.ownerId === user.id
  const [name, setName] = useState(open?.name ?? '')
  const [code, setCode] = useState(mine && open?.code ? sanitizeCode(open.code) : '')
  const [objective, setObjective] = useState(open?.objective ?? '')
  const [date, setDate] = useState(open?.date ?? '')
  const [visibility, setVisibility] = useState<MissionVisibility>(open?.visibility ?? 'unlisted')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState<string | null>(null)
  const [check, setCheck] = useState<CodeCheck | null>(null)
  const full = formatCode(code)
  // Keeping your own mission's code needs no check
  const ownCode = mine && full === open?.code

  useEffect(() => {
    if (code.length !== 6 || ownCode || !available || !user) return
    let alive = true
    const id = setTimeout(() => {
      setCheck({ code: full, status: 'checking' })
      isMissionCodeAvailable(full, mine ? open?.id : undefined)
        .then((ok) => alive && setCheck({ code: full, status: ok ? 'available' : 'taken' }))
        .catch(() => alive && setCheck({ code: full, status: 'error' }))
    }, CHECK_DELAY_MS)
    return () => {
      alive = false
      clearTimeout(id)
    }
  }, [code, full, ownCode, available, user, mine, open?.id])
  const codeStatus = code.length !== 6 || ownCode ? null : check?.code === full ? check.status : 'checking'

  if (!available) {
    return (
      <div className="mission-save">
        <h2 className="kicker">Save mission</h2>
        <p className="muted plan-note">Saving needs Supabase: add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (see README).</p>
      </div>
    )
  }
  if (loading) return null
  if (!user) {
    return (
      <div className="mission-save signin-prompt">
        <h2 className="kicker">Save mission</h2>
        <p>Sign in to save this route with a mission code your crew can open.</p>
        <a className="button" href="#/account">Sign in</a>
      </div>
    )
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    setSaved(null)
    try {
      const fields = { code: formatCode(code), name, objective, date, visibility, stops: state.stops, roundTrip: state.roundTrip }
      const m = mine && open ? await updateMission(open.id, fields) : await createMission(fields)
      dispatch({ type: 'setMission', mission: toOpenMission(m) })
      setSaved(m.code)
      if (m.code) window.history.replaceState(null, '', planPath(m.code))
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const suggest = async () => {
    setError(null)
    try {
      setCode(sanitizeCode(await suggestMissionCode()))
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <form className="mission-save mission-form" onSubmit={submit}>
      <div className="plan-section-head">
        <h2 className="kicker">{mine ? 'Update mission' : open ? 'Save your own copy' : 'Save mission'}</h2>
        {open?.code && mine && <span className="mono-code muted">{open.code}</span>}
      </div>
      <label>
        <span>Mission name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} maxLength={LIMITS.nameLength} required placeholder="e.g. Delta front survey" />
      </label>
      <div className="code-field">
        <span className="code-field-label">
          Mission code
          {!mine && (
            <button type="button" className="link-button" onClick={suggest}>
              Suggest one
            </button>
          )}
        </span>
        <CodeInput value={code} onChange={setCode} label="Mission code, three letters then three digits" />
        {codeStatus && (
          <p className={`code-status is-${codeStatus}`} role="status">
            {codeStatus === 'checking' && 'Checking…'}
            {codeStatus === 'available' && `${full} is free`}
            {codeStatus === 'taken' && `${full} is taken: pick another, or Suggest one`}
            {codeStatus === 'error' && "Couldn't check the code; it's checked again when you save"}
          </p>
        )}
      </div>
      <div className="choice">
        <div className="segmented" role="radiogroup" aria-label="Who can find it">
          {(['unlisted', 'public'] as const).map((v) => (
            <button key={v} type="button" role="radio" aria-checked={visibility === v} className={visibility === v ? 'is-on' : ''} onClick={() => setVisibility(v)}>
              {v === 'public' ? 'Public' : 'Code only'}
            </button>
          ))}
        </div>
        <p className="muted choice-hint">
          {visibility === 'public' ? 'Listed for everyone to browse.' : 'Only people with the code can open it.'} Only you can change it.
        </p>
      </div>
      <label>
        <span>EVA date (optional)</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </label>
      <label>
        <span>Objective (optional)</span>
        <textarea value={objective} onChange={(e) => setObjective(e.target.value)} maxLength={LIMITS.noteLength} placeholder="What the crew should achieve" />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      {saved && (
        <p className="form-ok" role="status">
          Saved as <span className="mono-code">{saved}</span>. Share the link: <span className="mono-code">{planPath(saved)}</span>{' '}
          <a href={missionMapPath(saved)}>Open mission page</a>
        </p>
      )}
      <Button type="submit" disabled={busy || code.length !== 6 || codeStatus === 'taken' || !name.trim() || state.stops.length < 2}>
        {busy ? 'Saving…' : mine ? 'Update mission' : 'Save mission'}
      </Button>
    </form>
  )
}
