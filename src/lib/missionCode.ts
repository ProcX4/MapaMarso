/*
 * Mission codes look like ABC-123 (from MapaMars). About 17.5 million combinations, so guessable by a
 * script: a code helps you find a mission, it never grants edit rights (Security Spec §4).
 */

/** Three capital letters, a dash, three digits. */
export const MISSION_CODE_PATTERN = /^[A-Z]{3}-\d{3}$/

/** Keeps only what fits the ABC-123 shape: up to three letters (uppercased), then up to three digits. */
export function sanitizeCode(input: string) {
  let letters = ''
  let digits = ''
  for (const ch of input.toUpperCase()) {
    if (letters.length < 3) {
      if (ch >= 'A' && ch <= 'Z') letters += ch
    } else if (digits.length < 3 && ch >= '0' && ch <= '9') {
      digits += ch
    }
  }
  return letters + digits
}

/** "ABC123" -> "ABC-123" (partial values keep the dash only once a digit follows). */
export const formatCode = (raw: string) => (raw.length > 3 ? `${raw.slice(0, 3)}-${raw.slice(3)}` : raw)

export function randomMissionCode() {
  const letters = Array.from({ length: 3 }, () => String.fromCharCode(65 + Math.floor(Math.random() * 26))).join('')
  return `${letters}-${String(Math.floor(Math.random() * 1000)).padStart(3, '0')}`
}
