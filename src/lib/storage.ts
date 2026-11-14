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
