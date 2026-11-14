import { createContext, type Dispatch } from 'react'
import type { MarswalkState } from './types'
import type { Action } from './reducer'

export const MarswalkContext = createContext<{ state: MarswalkState; dispatch: Dispatch<Action> } | null>(null)
