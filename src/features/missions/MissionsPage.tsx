import { useEffect, useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useHash } from '../../hooks/useHash'
import { Icon } from '../../components/Icon'
import { fetchMissionByCode, fetchMissionById, type Mission } from '../../services/missions'
import { MISSION_CODE_PATTERN } from '../../lib/missionCode'
import { FindMission } from './FindMission'
import { GLOBE_PLAN, missionMapIdPath, missionMapPath, planPath } from '../../lib/missionPaths'
import './missions.css'

/* The missions pages (from MapaMars pages/missions/MissionsPage.tsx). */

type Screen = { kind: 'find' } | { kind: 'new' } | { kind: 'view'; key: string; code?: string; id?: string } | { kind: 'edit'; key: string; code: string }

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// #/missions                   browse + enter a code
// #/missions/new               create
// #/missions/ABC-123           open by code (can join): on the 2D map, #/globe/2d/mission/ABC-123
// #/missions/ABC-123/edit      edit (author): in the planner, #/globe/2d/plan/ABC-123
// #/missions/m/<id>            open from the browse list (no code needed to look): #/globe/2d/mission/m/<id>
function parse(hash: string): Screen {
  const [, segment, action] = hash.replace(/^#\/missions\/?/, '#/').split('/')
  if (!segment) return { kind: 'find' }
  if (segment === 'new') return { kind: 'new' }
  if (segment === 'm' && action && UUID.test(action)) return { kind: 'view', key: `id:${action}`, id: action }
  const code = decodeURIComponent(segment).toUpperCase()
  if (!MISSION_CODE_PATTERN.test(code)) return { kind: 'find' }
  return action === 'edit' ? { kind: 'edit', key: `code:${code}`, code } : { kind: 'view', key: `code:${code}`, code }
}

type Lookup = { key: string; status: 'found' | 'missing' | 'error'; mission?: Mission; error?: string }

export function MissionsPage() {
  const { available } = useAuth()
  return (
    <div className="missions-shell">
      <div className="back-bar">
        <a className="site-back" href="#/globe">
          <Icon name="back" /> Back to globe
        </a>
      </div>
      {available ? (
        <MissionsScreen />
      ) : (
        <main className="mission-center">
          <h1>Missions</h1>
          <p className="muted">Missions need Supabase, which isn't set up in this build. Everything else works without it.</p>
        </main>
      )}
    </div>
  )
}

function MissionsScreen() {
  const { user } = useAuth()
  const screen = parse(useHash())
  const key = screen.kind === 'view' || screen.kind === 'edit' ? screen.key : null
  const code = screen.kind === 'view' || screen.kind === 'edit' ? screen.code : undefined
  const id = screen.kind === 'view' ? screen.id : undefined
  const [lookup, setLookup] = useState<Lookup | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  // Load the mission whenever the address changes (and again after signing in or out,
  // since that changes whether you may see its code).
  // Until the result for this address arrives, `current` below is null, which shows the loading state.
  const userId = user?.id
  useEffect(() => {
    if (!key) return
    const controller = new AbortController()
    const load = code ? fetchMissionByCode(code, controller.signal) : fetchMissionById(id!, controller.signal)
    load
      .then((mission) => setLookup(mission ? { key, status: 'found', mission } : { key, status: 'missing' }))
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setLookup({ key, status: 'error', error: err.message })
      })
    return () => controller.abort()
  }, [key, code, id, userId])

  const current = lookup && lookup.key === key ? lookup : null
  const canManage = (m: Mission) => !!user && (m.ownerId === user.id || user.isAdmin)

  // New and edit both open the one mission planner on the 2D map (Plan Marswalk), so a mission is planned
  // with the same map, layers, safe paths, stats and profile wherever you start from
  if (screen.kind === 'new') return <Redirect to={GLOBE_PLAN} />
  // A mission is viewed on the same 2D map as it was planned on, with its layers, safe path and profile
  if (screen.kind === 'view') return <Redirect to={screen.code ? missionMapPath(screen.code) : missionMapIdPath(screen.id!)} />

  if (key && !current) {
    return (
      <main className="mission-center">
        <p className="muted">Opening mission{code ? ` ${code}` : ''}…</p>
      </main>
    )
  }

  if (key && current?.status === 'found' && current.mission) {
    const mission = current.mission
    return <Redirect to={canManage(mission) && mission.code ? planPath(mission.code) : missionMapPath(mission.code ?? code!)} />
  }

  const problem =
    current?.status === 'missing'
      ? code
        ? `No mission found with code ${code}.`
        : 'That mission doesn’t exist or isn’t public.'
      : current?.status === 'error'
        ? (current.error ?? 'Could not open that mission.')
        : null

  return <FindMission user={user} initialCode={code ?? ''} problem={problem} notice={notice} onDismissNotice={() => setNotice(null)} />
}

/** Swaps the address for another (no extra history entry), for old links to a screen that moved */
function Redirect({ to }: { to: string }) {
  useEffect(() => window.location.replace(to), [to])
  return null
}

