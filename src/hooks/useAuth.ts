import { use } from 'react'
import { AuthContext } from '../state/authContext'

export function useAuth() {
  const auth = use(AuthContext)
  if (!auth) throw new Error('useAuth must be used inside <AuthProvider>')
  return auth
}
