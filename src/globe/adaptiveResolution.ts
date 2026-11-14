import type * as THREE from 'three'

/** Below this smoothed frame rate the picture is drawn at a lower resolution; above the upper one it climbs back. */
const SLOW_FPS = 45
const FAST_FPS = 57
/** Seconds of frames judged before each step, so one hiccup (a tab switch, a download) doesn't count. */
const WINDOW_S = 2
const STEP = 0.25
const LOWEST = 0.75

/**
 * Keeps a 3D view smooth on slower PCs (from MapaMars): if frames come too slowly, draw fewer pixels (the
 * page's text and labels stay sharp; only the 3D picture softens), and go back up once there is room again.
 * On a PC that keeps up, nothing changes. Call `frame(now)` once per drawn frame.
 */
export function adaptiveResolution(renderer: THREE.WebGLRenderer, onChange?: () => void) {
  const best = Math.min(window.devicePixelRatio, 2)
  let ratio = best
  let windowStart = -1
  let frames = 0
  let last = -1
  let calm = 0
  renderer.setPixelRatio(ratio)
  return {
    frame(now: number) {
      // A long gap means the tab was hidden or the page was busy elsewhere: start counting afresh
      if (last >= 0 && now - last > 250) windowStart = -1
      last = now
      if (windowStart < 0) {
        windowStart = now
        frames = 0
        return
      }
      frames++
      const elapsed = now - windowStart
      if (elapsed < WINDOW_S * 1000) return
      const fps = (frames * 1000) / elapsed
      windowStart = now
      frames = 0
      let next = ratio
      if (fps < SLOW_FPS && ratio > LOWEST) {
        next = Math.max(LOWEST, ratio - STEP)
        calm = 0
      } else if (fps > FAST_FPS && ratio < best) {
        // Climb back only after a few calm windows in a row, so it doesn't see-saw
        if (++calm >= 3) {
          next = Math.min(best, ratio + STEP)
          calm = 0
        }
      } else calm = 0
      if (next !== ratio) {
        ratio = next
        renderer.setPixelRatio(ratio)
        onChange?.()
      }
    },
  }
}
