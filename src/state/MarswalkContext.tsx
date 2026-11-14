import { useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { MarswalkContext } from './context'
import { initialState, LAYER_PREFS_KEY, reducer } from './reducer'
import { writeJson } from '../lib/storage'

/** The mission whiteboard: every panel reads from it, every change goes through the reducer. */
export function MarswalkProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)

  useEffect(() => writeJson(LAYER_PREFS_KEY, state.layers), [state.layers])

  const value = useMemo(() => ({ state, dispatch }), [state])
  return <MarswalkContext value={value}>{children}</MarswalkContext>
}
