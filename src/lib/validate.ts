import type { LngLat } from '../state/types'

/*
 * Client-side input checks (Security Spec §5). These are for a good experience;
 * anything that reaches a server (proxy, database) is validated again there.
 */

export const clamp = (n: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, n))

export function isLngLat(v: unknown): v is LngLat {
  return (
    Array.isArray(v) &&
    v.length === 2 &&
    Number.isFinite(v[0]) &&
    Number.isFinite(v[1]) &&
    v[0] >= -180 &&
    v[0] <= 180 &&
    v[1] >= -90 &&
    v[1] <= 90
  )
}

/** Trimmed, single-spaced, length-capped plain text. Rendering stays text-only regardless. */
export function cleanText(input: string, max: number) {
  return input.replace(/\s+/g, ' ').trim().slice(0, max)
}

/** Only https: links (http: for localhost) built from data; everything else is dropped. */
export function safeUrl(input: string): string | null {
  try {
    const url = new URL(input)
    if (url.protocol === 'https:') return url.href
    if (url.protocol === 'http:' && (url.hostname === 'localhost' || url.hostname === '127.0.0.1')) return url.href
  } catch {
    // not a URL
  }
  return null
}
