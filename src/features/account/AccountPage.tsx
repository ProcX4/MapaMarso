import { useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { PasswordInput } from '../../components/PasswordInput'
import { CodeInput } from '../../components/CodeInput'
import { PASSWORD_MAX_LENGTH, PASSWORD_RULES, passwordIsStrong, type User } from '../../services/auth'
import { deleteMission, fetchMyMissions, type Mission } from '../../services/missions'
import { formatCode } from '../../lib/missionCode'
import { formatKm } from '../../lib/format'
import { distanceM } from '../../data/mars'
import './account.css'

/** Open a saved mission by typing its code. */
function OpenByCode() {
  const [code, setCode] = useState('')
  const open = (c: string) => {
    window.location.hash = `#/plan/${c}`
  }
  return (
    <section className="account-section">
      <h2 className="kicker">Open a mission</h2>
      <p className="muted">Type a mission code to open its route in the planner.</p>
      <CodeInput value={code} onChange={setCode} onComplete={open} label="Mission code, three letters then three digits" />
      <button type="button" className="button" disabled={code.length !== 6} onClick={() => open(formatCode(code))}>
        Open mission
      </button>
    </section>
  )
}

const routeKm = (m: Mission) => {
  const order = m.roundTrip ? [...m.stops, m.stops[0]] : m.stops
  return order.slice(1).reduce((sum, s, i) => sum + distanceM(order[i].at, s.at), 0) / 1000
}

/** Missions you lead, with links to open them and a way to delete them. */
function MyMissions({ user }: { user: User }) {
  const [missions, setMissions] = useState<Mission[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const ctrl = new AbortController()
    fetchMyMissions(user.id, ctrl.signal)
      .then(setMissions)
      .catch((err: Error) => err.name !== 'AbortError' && setError(err.message))
    return () => ctrl.abort()
  }, [user.id])

  const remove = async (m: Mission) => {
    if (!window.confirm(`Delete "${m.name}"? This can't be undone.`)) return
    try {
      await deleteMission(m.id)
      setMissions((list) => list?.filter((x) => x.id !== m.id) ?? null)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="account-section">
      <h2 className="kicker">Your missions</h2>
      {error && <p className="form-error" role="alert">{error}</p>}
      {!missions && !error && <p className="muted">Loading…</p>}
      {missions?.length === 0 && <p className="muted">None yet. Plan a route, then save it from the planner.</p>}
      {missions && missions.length > 0 && (
        <ul className="account-missions">
          {missions.map((m) => (
            <li key={m.id}>
              <a href={`#/plan/${m.code}`}>
                <span className="account-mission-name">
                  {m.name}
                  <span className="mono-code muted">{m.code}</span>
                </span>
                <small className="muted num">
                  {m.stops.length} stops · {formatKm(routeKm(m))} · {m.roundTrip ? 'round trip' : 'one way'} · {m.visibility === 'public' ? 'public' : 'code only'}
                </small>
              </a>
              <button type="button" className="link-button" onClick={() => remove(m)} aria-label={`Delete ${m.name}`}>
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
      <a className="button" href="#/plan">Plan a new Marswalk</a>
    </section>
  )
}

/** Sign in, create an account, or see your missions (MapaMars AccountPage, adapted for MAPA). */
export function AccountPage() {
  const { available, user, loading, signIn, signUp, signOut } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
      } else {
        const { needsConfirmation } = await signUp(email.trim(), username.trim(), password)
        if (needsConfirmation) setConfirmSentTo(email.trim())
      }
      setPassword('')
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const switchMode = () => {
    setMode((m) => (m === 'signin' ? 'signup' : 'signin'))
    setError(null)
  }
  const clearError = () => setError(null)

  let body
  if (!available) {
    body = (
      <>
        <h1>Accounts are off</h1>
        <p className="muted">
          This build isn't connected to Supabase, so accounts and saved missions are unavailable. Everything else works without them.
        </p>
      </>
    )
  } else if (loading) {
    body = <p className="muted">Loading…</p>
  } else if (user) {
    body = (
      <>
        <h1>Signed in</h1>
        <p className="muted">
          You're signed in as <strong className="plain">{user.username}</strong>
          {user.isAdmin && ' (admin)'}.
        </p>
        <MyMissions user={user} />
        <OpenByCode />
        <div className="account-actions">
          <button type="button" className="button-outline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </>
    )
  } else if (confirmSentTo) {
    body = (
      <>
        <h1>Check your email</h1>
        <p className="muted">
          We sent a confirmation link to <strong className="plain">{confirmSentTo}</strong>. Open it to activate your account, then sign in.
        </p>
        <button type="button" className="button-outline" onClick={() => { setConfirmSentTo(null); setMode('signin'); setPassword('') }}>
          Back to sign in
        </button>
      </>
    )
  } else {
    body = (
      <>
        <h1>{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
        <p className="muted">
          {mode === 'signin' ? 'Sign in to save Marswalks as missions and share them with a code.' : 'Your username is shown on every mission you save. Your email stays private.'}
        </p>
        <form className="mission-form" onSubmit={submit}>
          {mode === 'signin' ? (
            <label>
              <span>Email or username</span>
              <input type="text" value={email} onChange={(e) => { setEmail(e.target.value); clearError() }} autoComplete="username" autoCapitalize="off" spellCheck={false} required />
            </label>
          ) : (
            <label>
              <span>Email</span>
              <input type="email" value={email} onChange={(e) => { setEmail(e.target.value); clearError() }} autoComplete="email" required />
            </label>
          )}
          {mode === 'signup' && (
            <label>
              <span>Username</span>
              <input
                value={username}
                onChange={(e) => { setUsername(e.target.value); clearError() }}
                autoComplete="username"
                required
                minLength={3}
                maxLength={24}
                pattern="[A-Za-z0-9_\-]{3,24}"
                title="3–24 letters, numbers, - or _"
              />
              <em className="muted">3–24 letters, numbers, - or _</em>
            </label>
          )}
          <label>
            <span>Password</span>
            <PasswordInput
              value={password}
              onChange={(value) => { setPassword(value); clearError() }}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              maxLength={PASSWORD_MAX_LENGTH}
              describedBy={mode === 'signup' ? 'password-rules' : undefined}
            />
          </label>
          {mode === 'signup' && (
            <ul className="password-rules" id="password-rules" aria-label="Password requirements">
              {PASSWORD_RULES.map((rule) => {
                const met = rule.test(password)
                return (
                  <li key={rule.label} className={met ? 'is-met' : ''}>
                    <span className="rule-mark" aria-hidden="true">{met ? '✓' : '○'}</span>
                    {rule.label}
                    <span className="visually-hidden">{met ? ' (done)' : ' (not yet)'}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {error && <p className="form-error" role="alert">{error}</p>}
          <button
            className="button"
            type="submit"
            disabled={busy || !email.trim() || !password || (mode === 'signup' && (!username.trim() || !passwordIsStrong(password)))}
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
          </button>
        </form>
        <p className="muted switch-mode">
          {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
          <button type="button" className="link-button" onClick={switchMode}>
            {mode === 'signin' ? 'Create an account' : 'Sign in'}
          </button>
        </p>
        <OpenByCode />
      </>
    )
  }

  return (
    <main className="account-page">
      <div className="account-inner">{body}</div>
    </main>
  )
}
