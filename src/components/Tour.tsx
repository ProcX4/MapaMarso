import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TourStep = {
  /** CSS selector of the control to point at. None: a centred card. */
  target?: string
  title: string
  text: string
}

/** Space kept between the highlighted control and its ring, and between the ring and the card. */
const RING_PAD = 6
const CARD_GAP = 14
/** How long the ring takes to slide over to the next step's control. */
const JUMP_MS = 300

/** On screen and not faded out. */
function isShowing(el: HTMLElement) {
  const r = el.getBoundingClientRect()
  const style = getComputedStyle(el)
  return r.width > 0 && r.height > 0 && style.visibility !== 'hidden' && Number(style.opacity) > 0.05
    && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth
}

/** Of the showing elements matching the selector, the one nearest the middle of the screen. */
function pick(selector: string) {
  let best: HTMLElement | null = null
  let bestDistance = Infinity
  for (const el of document.querySelectorAll<HTMLElement>(selector)) {
    if (!isShowing(el)) continue
    const r = el.getBoundingClientRect()
    const d = Math.hypot(r.left + r.width / 2 - innerWidth / 2, r.top + r.height / 2 - innerHeight / 2)
    if (d < bestDistance) {
      bestDistance = d
      best = el
    }
  }
  return best
}

/**
 * A step-by-step tour (from MapaMars): each step rings one control on screen and shows a card beside it
 * saying what it does, with Back / Next / Skip. Steps whose control isn't on screen are left out.
 *
 * The ring and card are moved directly, not through React, so following a control costs next to
 * nothing. Clicks pass through to the page, so the highlighted control can be tried right away.
 */
export function Tour({ steps, onClose }: { steps: TourStep[]; onClose: () => void }) {
  // Only the steps that can be shown here and now (worked out once, when the tour opens)
  const [shown] = useState(() => steps.filter((s) => !s.target || pick(s.target)))
  const [index, setIndex] = useState(0)
  const ringRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const step = shown[index]
  const last = index === shown.length - 1

  // Follow this step's element every frame and place the ring around it and the card beside it (set up
  // before the first paint, so the card never shows for a frame in the corner before being placed)
  useLayoutEffect(() => {
    const ring = ringRef.current
    const card = cardRef.current
    if (!step || !ring || !card) return
    let locked = step.target ? pick(step.target) : null
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    ring.style.transition = reduced ? 'none' : `left ${JUMP_MS}ms ease, top ${JUMP_MS}ms ease, width ${JUMP_MS}ms ease, height ${JUMP_MS}ms ease`
    const settle = setTimeout(() => {
      ring.style.transition = 'none'
    }, JUMP_MS)
    let frame = 0
    let prev = ''
    const follow = () => {
      frame = requestAnimationFrame(follow)
      if (step.target && (!locked || !locked.isConnected || !isShowing(locked))) locked = pick(step.target)
      const r = locked?.getBoundingClientRect()
      const vw = innerWidth, vh = innerHeight
      const w = card.offsetWidth, h = card.offsetHeight
      const key = r ? `${r.left | 0},${r.top | 0},${r.width | 0},${r.height | 0},${vw},${vh},${w},${h}` : `none,${vw},${vh},${w},${h}`
      if (key === prev) return
      prev = key
      if (!r) {
        ring.style.display = 'none'
        card.style.left = `${(vw - w) / 2}px`
        card.style.top = `${(vh - h) / 2}px`
        return
      }
      const box = { left: r.left - RING_PAD, top: r.top - RING_PAD, width: r.width + RING_PAD * 2, height: r.height + RING_PAD * 2 }
      Object.assign(ring.style, { display: 'block', left: `${box.left}px`, top: `${box.top}px`, width: `${box.width}px`, height: `${box.height}px` })
      // The card goes where there is room: below the ring, above it, to its right, then to its left
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2
      let left: number, top: number
      if (box.top + box.height + CARD_GAP + h < vh - 12) [left, top] = [clamp(cx - w / 2, 12, vw - w - 12), box.top + box.height + CARD_GAP]
      else if (box.top - CARD_GAP - h > 12) [left, top] = [clamp(cx - w / 2, 12, vw - w - 12), box.top - CARD_GAP - h]
      else if (box.left + box.width + CARD_GAP + w < vw - 12) [left, top] = [box.left + box.width + CARD_GAP, clamp(cy - h / 2, 12, vh - h - 12)]
      else [left, top] = [clamp(box.left - CARD_GAP - w, 12, vw - w - 12), clamp(cy - h / 2, 12, vh - h - 12)]
      card.style.left = `${left}px`
      card.style.top = `${top}px`
    }
    follow()
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [step])

  // Arrow keys step through; Esc closes
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(i + 1, shown.length - 1))
      else if (e.key === 'ArrowLeft') setIndex((i) => Math.max(i - 1, 0))
      else if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [shown.length, onClose])

  if (!step) return null

  return (
    <div className="tour" role="dialog" aria-modal="false" aria-labelledby="tour-title">
      <div ref={ringRef} className="tour-ring" style={{ display: 'none' }} />
      <div ref={cardRef} className={`tour-card${step.target ? '' : ' is-centred'}`}>
        <div key={index} className="tour-card-body">
          <p className="tour-count">{index + 1} / {shown.length}</p>
          <h2 id="tour-title">{step.title}</h2>
          <p className="tour-text">{step.text}</p>
        </div>
        <div className="tour-actions">
          {!last && <button type="button" className="tour-skip" onClick={onClose}>Skip</button>}
          {index > 0 && <button type="button" className="tour-back" onClick={() => setIndex(index - 1)}>Back</button>}
          <button type="button" className="tour-next" onClick={() => (last ? onClose() : setIndex(index + 1))} autoFocus>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
