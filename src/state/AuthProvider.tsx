import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { fetchProfile, setUsername, signIn, signInAsGuest, signOut, signUp, type User } from '../services/auth'
import { AuthContext, type AuthState } from './authContext'

/**
 * The current account. Nobody has to sign up: a visitor with no session gets an invisible (anonymous) account
 * straight away, so saving, joining a crew and writing in a log all work for anyone with the link. Team members
 * can still sign in with a password (for admin rights), which replaces the invisible account.
 * If anonymous sign-ins are off in Supabase, the app falls back to asking people to sign in.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(supabaseConfigured)

  useEffect(() => {
    if (!supabaseConfigured) return
    let cancelled = false
    let latest = 0
    let guestTried = false

    const load = async (userId: string | null, isGuest: boolean) => {
      const request = ++latest
      let next: User | null = null
      if (userId) {
        try {
          next = await fetchProfile(userId, isGuest)
        } catch {
          next = null
        }
      } else if (!guestTried) {
        // No session: make the invisible account. Its SIGNED_IN event loads the profile.
        guestTried = true
        try {
          await signInAsGuest()
          return
        } catch {
          // Anonymous sign-ins switched off, or offline: carry on signed out
        }
      }
      if (!cancelled && request === latest) {
        setUser(next)
        setLoading(false)
      }
    }

    // Fires once with the stored session, then on every sign-in, sign-out and token refresh.
    // Supabase advises against awaiting other Supabase calls inside this callback, so defer the work.
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'TOKEN_REFRESHED') return
      // After a sign-out, a fresh invisible account takes over
      if (event === 'SIGNED_OUT') guestTried = false
      setTimeout(() => load(session?.user.id ?? null, !!session?.user.is_anonymous), 0)
    })

    return () => {
      cancelled = true
      data.subscription.unsubscribe()
    }
  }, [])

  const value = useMemo<AuthState>(() => {
    const reload = async () => {
      const { data } = await supabase.auth.getUser()
      if (data.user) setUser(await fetchProfile(data.user.id, !!data.user.is_anonymous))
    }
    return {
      available: supabaseConfigured,
      user,
      loading,
      // Load the profile before resolving so pages see the signed-in user straight away
      signIn: async (email, password) => {
        await signIn(email, password)
        await reload()
      },
      signUp: async (email, username, password) => {
        const result = await signUp(email, username, password)
        if (!result.needsConfirmation) await reload()
        return result
      },
      signOut: async () => {
        await signOut()
        setUser(null)
      },
      rename: async (username) => {
        await setUsername(username)
        await reload()
      },
    }
  }, [user, loading])

  return <AuthContext value={value}>{children}</AuthContext>
}
