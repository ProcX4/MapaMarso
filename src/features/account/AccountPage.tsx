import { useState, type FormEvent } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { PasswordInput } from '../../components/PasswordInput'
import { PASSWORD_MAX_LENGTH, PASSWORD_RULES, passwordIsStrong } from '../../services/auth'
import './account.css'

/**
 * Your account. Visitors already have an invisible one (see AuthProvider), so this page shows the name their
 * missions carry and lets them change it. The team can still sign in with a password, tucked away below.
 */
export function AccountPage() {
  const { available, user, loading, signIn, signUp, signOut, rename } = useAuth()
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [confirmSentTo, setConfirmSentTo] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [renameNote, setRenameNote] = useState<string | null>(null)

  const submitRename = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setRenameNote(null)
    try {
      await rename(newName)
      setNewName('')
      setRenameNote('Saved.')
    } catch (err) {
      setRenameNote((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError(null)
    try {
      if (mode === 'signin') {
        await signIn(email.trim(), password)
        window.location.hash = '#/missions'
      } else {
        const { needsConfirmation } = await signUp(email.trim(), username.trim(), password)
        if (needsConfirmation) setConfirmSentTo(email.trim())
        else window.location.hash = '#/missions'
      }
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

  const passwordForm = (
    <>
      <p className="muted">{mode === 'signin' ? 'Sign in to log missions and manage the ones you created.' : 'Your username is shown on every mission you log. Your email stays private.'}</p>
      <form className="mission-form" onSubmit={submit}>
        {mode === 'signin' ? (
          <label>
            <span>Email or username</span>
            <input
              type="text"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearError()
              }}
              autoComplete="username"
              autoCapitalize="off"
              spellCheck={false}
              required
            />
          </label>
        ) : (
          <label>
            <span>Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value)
                clearError()
              }}
              autoComplete="email"
              required
            />
          </label>
        )}
        {mode === 'signup' && (
          <label>
            <span>Username</span>
            <input
              value={username}
              onChange={(e) => {
                setUsername(e.target.value)
                clearError()
              }}
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
            onChange={(value) => {
              setPassword(value)
              clearError()
            }}
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
                  <span className="rule-mark" aria-hidden="true">
                    {met ? '✓' : '○'}
                  </span>
                  {rule.label}
                  <span className="visually-hidden">{met ? ' (done)' : ' (not yet)'}</span>
                </li>
              )
            })}
          </ul>
        )}
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button className="button" type="submit" disabled={busy || !email.trim() || !password || (mode === 'signup' && (!username.trim() || !passwordIsStrong(password)))}>
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
      </form>
      <p className="muted switch-mode">
        {mode === 'signin' ? 'New here?' : 'Already have an account?'}{' '}
        <button type="button" className="link-button" onClick={switchMode}>
          {mode === 'signin' ? 'Create an account' : 'Sign in'}
        </button>
      </p>
    </>
  )

  let body
  if (!available) {
    // Only without Supabase keys (a local build without .env.local)
    body = (
      <>
        <h1>Accounts are off</h1>
        <p className="muted">This build isn't connected to Supabase, so accounts and missions are unavailable. Everything else works without them.</p>
      </>
    )
  } else if (loading) {
    body = <p className="muted">Loading…</p>
  } else if (confirmSentTo) {
    body = (
      <>
        <h1>Check your email</h1>
        <p className="muted">
          We sent a confirmation link to <strong className="plain">{confirmSentTo}</strong>. Open it to activate your account, then sign in.
        </p>
        <button
          type="button"
          className="button-outline"
          onClick={() => {
            setConfirmSentTo(null)
            setMode('signin')
            setPassword('')
          }}
        >
          Back to sign in
        </button>
      </>
    )
  } else if (user) {
    const renameForm = (
      <form className="mission-form account-rename" onSubmit={submitRename}>
        <label>
          <span>Change your name</span>
          <input
            value={newName}
            onChange={(e) => {
              setNewName(e.target.value)
              setRenameNote(null)
            }}
            placeholder={user.username}
            autoComplete="nickname"
            minLength={3}
            maxLength={24}
            pattern="[A-Za-z0-9_-]{3,24}"
            title="3–24 letters, numbers, - or _"
            required
          />
          <em className="muted">3–24 letters, numbers, - or _</em>
        </label>
        {renameNote && (
          <p className={renameNote === 'Saved.' ? 'muted' : 'form-error'} role="status">
            {renameNote}
          </p>
        )}
        <button className="button-outline" type="submit" disabled={busy || !newName.trim()}>
          {busy ? 'Please wait…' : 'Save name'}
        </button>
      </form>
    )
    body = user.isGuest ? (
      <>
        <h1>You're {user.username}</h1>
        <p className="muted">
          No sign-up needed: this browser has its own account, so you can save missions, join a crew with its code and write in mission logs.
          Your name is shown on what you save. Clearing this browser's data, or using another device, loses the right to edit what you saved here.
        </p>
        {renameForm}
        <div className="account-actions">
          <a className="button" href="#/missions">
            Go to missions
          </a>
        </div>
        <details className="account-team">
          <summary>Team sign-in</summary>
          {passwordForm}
        </details>
      </>
    ) : (
      <>
        <h1>Signed in</h1>
        <p className="muted">
          You're signed in as <strong className="plain">{user.username}</strong>
          {user.isAdmin && ' (admin)'}.
        </p>
        {renameForm}
        <div className="account-actions">
          <a className="button" href="#/missions">
            Go to missions
          </a>
          <button type="button" className="button-outline" onClick={() => signOut()}>
            Sign out
          </button>
        </div>
      </>
    )
  } else {
    body = (
      <>
        <h1>{mode === 'signin' ? 'Sign in' : 'Create an account'}</h1>
        {passwordForm}
      </>
    )
  }

  return (
    <main className="account-page">
      <div className="account-inner">{body}</div>
    </main>
  )
}
