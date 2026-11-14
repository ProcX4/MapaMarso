import { useState, type FormEvent } from 'react'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useAuth } from '../../hooks/useAuth'
import { createMission, suggestMissionCode, updateMission, type MissionVisibility } from '../../services/missions'
import { formatCode, sanitizeCode } from '../../lib/missionCode'
import { CodeInput } from '../../components/CodeInput'
import { Button } from '../../components/Button'
import { LIMITS } from '../../config/assumptions'
import { toOpenMission } from './useMissionFromCode'
import { planPath } from '../../lib/missionPaths'

/**
 * Save the route as a mission with a code (MapaMars mission form, cut down to what MAPA needs).
 * The author can update their mission; anyone else saves their own copy under a new code.
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
          Saved as <span className="mono-code">{saved}</span>. Share the link: <span className="mono-code">{planPath(saved)}</span>
        </p>
      )}
      <Button type="submit" disabled={busy || code.length !== 6 || !name.trim() || state.stops.length < 2}>
        {busy ? 'Saving…' : mine ? 'Update mission' : 'Save mission'}
      </Button>
    </form>
  )
}
