import { use } from 'react'
import { MarswalkContext } from '../state/context'

export function useMarswalk() {
  const ctx = use(MarswalkContext)
  if (!ctx) throw new Error('useMarswalk must be used inside <MarswalkProvider>')
  return ctx
}
