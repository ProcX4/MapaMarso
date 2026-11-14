import { useEffect, useState } from 'react'
import { useAuth } from './useAuth'
import { supabase, supabaseConfigured } from '../lib/supabase'
import { browseMissions, fetchJoinedMissions, fetchMyMissions, type Mission, type MissionStatus } from '../services/missions'

type Loaded = { key: string; list: Mission[] | null; error: string | null }
export type MissionsState = { list: Mission[] | null; error: string | null }

// Reload this often anyway, in case a live signal was missed (or the database doesn't send them)
const POLL_MS = 60_000
// Several changes in a row (a mission and its crew) bring one reload
const SIGNAL_DELAY_MS = 400

/**
 * Missions with one status (from MapaMars): ongoing ('open', everyone's public ones) or complete (all of them),
 * plus (when signed in) your own and the ones you've joined with that status, which come first and carry their
 * codes. Kept up to date while the page is open: reloads when the database announces a change (see
 * announce_mission_change in supabase/schema.sql), every minute, and on returning to the tab.
 * Without Supabase configured, the list is simply empty.
 */
export function useMissions(status: MissionStatus = 'open'): MissionsState {
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  const key = !supabaseConfigured || loading ? null : `${status}:${userId ? `mine:${userId}` : 'public'}`
  const [state, setState] = useState<Loaded | null>(null)
  const [version, setVersion] = useState(0)

  useEffect(() => {
    if (!supabaseConfigured) return
    let timer: ReturnType<typeof setTimeout> | undefined
    const reload = () => setVersion((v) => v + 1)
    const reloadSoon = () => {
      clearTimeout(timer)
      timer = setTimeout(reload, SIGNAL_DELAY_MS)
    }
    const channel = supabase.channel('missions').on('broadcast', { event: 'changed' }, reloadSoon).subscribe()
    const poll = setInterval(() => {
      if (document.visibilityState === 'visible') reload()
    }, POLL_MS)
    const onVisible = () => {
      if (document.visibilityState === 'visible') reload()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearTimeout(timer)
      clearInterval(poll)
      document.removeEventListener('visibilitychange', onVisible)
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const load = Promise.all([
      userId ? fetchMyMissions(userId, controller.signal) : [],
      userId ? fetchJoinedMissions(userId, controller.signal) : [],
      browseMissions(status, controller.signal),
    ]).then((lists) => {
      // The same mission can turn up in several lists; keep its first (most detailed) copy
      const seen = new Set<string>()
      return lists.flat().filter((m) => !seen.has(m.id) && !!seen.add(m.id))
    })
    load
      .then((list) => setState({ key, list: list.filter((m) => m.status === status), error: null }))
      .catch((err: Error) => {
        if (err.name === 'AbortError') return
        // A failed background reload keeps showing the last list rather than an error
        setState((prev) => (prev?.key === key && prev.list ? prev : { key, list: null, error: err.message }))
      })
    return () => controller.abort()
  }, [key, userId, status, version])

  if (!supabaseConfigured) return { list: [], error: null }
  const current = state && state.key === key ? state : null
  return { list: current?.list ?? null, error: current?.error ?? null }
}
