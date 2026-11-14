/*
 * localStorage for non-sensitive preferences only (layer toggles, last view).
 * Private mode and blocked storage can throw, so every access is guarded.
 */

export function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // preferences are a convenience; losing them is fine
  }
}

/** An on/off preference remembered between visits (from MapaMars storedFlag.ts). */
export function readFlag(key: string, fallback: boolean) {
  try {
    const v = window.localStorage.getItem(key)
    return v === null ? fallback : v === '1'
  } catch {
    return fallback
  }
}

export function writeFlag(key: string, value: boolean) {
  try {
    window.localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // not remembered
  }
}
