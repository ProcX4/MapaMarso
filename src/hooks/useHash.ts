import { useEffect, useState } from 'react'
import { currentAddress } from '../lib/missionPaths'

/** The current location hash, e.g. "#/missions/ABC-123", kept in sync with navigation. Old addresses read as their new ones. */
export function useHash() {
  const [hash, setHash] = useState(() => window.location.hash)
  useEffect(() => {
    const onChange = () => setHash(window.location.hash)
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return currentAddress(hash)
}
