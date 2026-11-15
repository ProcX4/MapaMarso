import { useEffect, useState } from 'react'
import { readFlag, writeFlag } from './storage'

/*
 * The "Debug: zoom points" setting (☰ menu): when on, the 2D map shows its zoom level, the zoom at which each
 * photo layer starts, and outlines of where the sharpest photos exist. Off by default; remembered per browser.
 */

const KEY = 'mapa.debugZoom'
let on = readFlag(KEY, false)
const listeners = new Set<(on: boolean) => void>()

export function setDebugZoom(value: boolean) {
  on = value
  writeFlag(KEY, value)
  listeners.forEach((l) => l(value))
}

/** The setting, kept in step wherever it's flipped */
export function useDebugZoom() {
  const [value, setValue] = useState(on)
  useEffect(() => {
    listeners.add(setValue)
    return () => {
      listeners.delete(setValue)
    }
  }, [])
  return value
}
