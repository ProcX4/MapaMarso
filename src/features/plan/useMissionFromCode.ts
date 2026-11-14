import { useEffect, useState } from 'react'
import { useHash } from '../../hooks/useHash'
import { useMarswalk } from '../../hooks/useMarswalk'
import { useAuth } from '../../hooks/useAuth'
import { fetchMissionByCode, type Mission } from '../../services/missions'
import { MISSION_CODE_PATTERN } from '../../lib/missionCode'
import { fitTo } from '../../map/mapControl'
import type { OpenMission } from '../../state/types'

export const toOpenMission = (m: Mission): OpenMission => ({
  id: m.id,
  code: m.code,
  ownerId: m.ownerId,
  commander: m.commander,
  name: m.name,
  objective: m.objective,
  date: m.date,
  visibility: m.visibility,
})

export type CodeLoad = { code: string | null; status: 'idle' | 'loading' | 'ready' | 'notfound' | 'error' | 'off'; error?: string }

/** Opens the mission named in the address (#/plan/ABC-123) and puts its route on the map. */
export function useMissionFromCode(): CodeLoad {
  const hash = useHash()
  const { state, dispatch } = useMarswalk()
  const { available } = useAuth()
  const raw = hash.match(/^#\/plan\/([A-Za-z0-9-]{1,12})$/)?.[1]?.toUpperCase() ?? null
  const code = raw && MISSION_CODE_PATTERN.test(raw) ? raw : null
  const loaded = state.mission?.code === code
  const [result, setResult] = useState<CodeLoad>({ code: null, status: 'idle' })

  useEffect(() => {
    if (!code || loaded || !available) return
    const ctrl = new AbortController()
    fetchMissionByCode(code, ctrl.signal)
      .then((m) => {
        if (!m) return setResult({ code, status: 'notfound' })
        dispatch({ type: 'loadRoute', stops: m.stops, roundTrip: m.roundTrip, mission: toOpenMission(m) })
        fitTo(m.stops.map((s) => s.at))
        setResult({ code, status: 'ready' })
      })
      .catch((err: Error) => {
        if (err.name !== 'AbortError') setResult({ code, status: 'error', error: err.message })
      })
    return () => ctrl.abort()
  }, [code, loaded, available, dispatch])

  if (raw && !code) return { code: raw, status: 'notfound' }
  if (code && !loaded && !available) return { code, status: 'off' }
  if (result.code === code) return result
  // A fetch for this code is in flight until its result arrives
  return { code, status: loaded || !code ? 'ready' : 'loading' }
}
