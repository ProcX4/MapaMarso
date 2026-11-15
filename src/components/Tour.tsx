import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export type TourStep = {
  /** CSS selector of the control to point at. None (or not on screen): a centred card. */
  target?: string
  /**
   * Parts inside the target to ring, by selector, when the target's own box isn't where it shows: a globe
   * marker's label is moved to a free side with a CSS translate, which its box doesn't follow
   */
  ringParts?: string
  title: string
  text: string
  /** The part of the tour this step belongs to, shown above the title (guided tours) */
  chapter?: string
  /** A short list under the text: what a view or panel can do */
  points?: string[]
  /** Something to try right now, while the control is lit */
  tryIt?: string
  /** Puts the page in place for this step (switch view, open a panel, fly the map); runs on arriving, also going back */
  enter?: () => void
  /** Leave the step out when this says no (e.g. steps inside a view the visitor didn't open) */
  when?: () => boolean
  /** An optional button on the card, e.g. to add a sample route; hidden once `done` says so */
  action?: { label: string; run: () => void; done?: () => boolean }
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

/** Where an element shows on screen: its own box, or the box round its visible parts when `parts` is given. */
function shownRect(el: HTMLElement, parts?: string) {
  if (!parts) return el.getBoundingClientRect()
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const part of el.querySelectorAll<HTMLElement>(parts)) {
    const p = part.getBoundingClientRect()
    if (!p.width || !p.height || Number(getComputedStyle(part).opacity) < 0.05) continue
    l = Math.min(l, p.left); t = Math.min(t, p.top); r = Math.max(r, p.right); b = Math.max(b, p.bottom)
  }
  return l < r ? new DOMRect(l, t, r - l, b - t) : el.getBoundingClientRect()
}

/**
 * Scroll the panel holding an element (the planner's list) so the element shows. Only a scrolling panel,
 * never the page: a panel still sliding in from off screen would otherwise drag the whole page sideways.
 */
function revealInPanel(el: HTMLElement) {
  for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
    if (!/(auto|scroll)/.test(getComputedStyle(a).overflowY) || a.scrollHeight <= a.clientHeight) continue
    const box = a.getBoundingClientRect(), r = el.getBoundingClientRect()
    if (r.bottom > box.bottom) a.scrollTop += r.bottom - box.bottom + 12
    else if (r.top < box.top) a.scrollTop -= box.top - r.top + 12
    return
  }
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

type Props = {
  steps: TourStep[]
  onClose: () => void
  /**
   * A guided tour drives the page itself: each step's `enter` opens what it talks about, and its control is
   * waited for rather than the step being dropped. Without it, steps whose control isn't on screen when the
   * tour opens are left out.
   */
  guided?: boolean
  /** Step to open on (guided tours: the chapter for where the visitor already is) */
  startAt?: number
}

/**
 * A step-by-step tour (from MapaMars): each step rings one control on screen and shows a card beside it
 * saying what it does, with Back / Next / Skip. A guided tour also moves the page along, so one tour can run
 * from the 3D globe through the 2D map, the planner and EVA, in chapters.
 *
 * The ring and card are moved directly, not through React, so following a control costs next to
 * nothing. Clicks pass through to the page, so the highlighted control can be tried right away.
 */
export function Tour({ steps, onClose, guided = false, startAt = 0 }: Props) {
  // A plain tour keeps only the steps that can be shown here and now (worked out once, when it opens)
  const [fixed] = useState(() => (guided ? null : steps.filter((s) => !s.target || pick(s.target))))
  const shown = fixed ?? steps
  const [index, setIndex] = useState(() => Math.min(startAt, shown.length - 1))
  const ringRef = useRef<HTMLDivElement>(null)
  const cardRef = useRef<HTMLDivElement>(null)
  const stepsRef = useRef(shown)
  // A guided tour's steps are rebuilt on every page render; read the latest ones from effects
  useEffect(() => {
    stepsRef.current = shown
  })
  const step = shown[index]

  // The steps that apply right now (a guided step can opt out with `when`)
  const applies = (s: TourStep | undefined) => !!s && (!s.when || s.when())
  const nextFrom = (from: number, dir: 1 | -1) => {
    for (let i = from + dir; i >= 0 && i < shown.length; i += dir) if (applies(shown[i])) return i
    return -1
  }
  const nextIndex = nextFrom(index, 1)
  const prevIndex = nextFrom(index, -1)
  const last = nextIndex < 0

  // Arriving at a step puts the page in place for it
  useEffect(() => {
    stepsRef.current[index]?.enter?.()
  }, [index])

  // Follow this step's element every frame and place the ring around it and the card beside it (set up
  // before the first paint, so the card never shows for a frame in the corner before being placed). A guided
  // step's control may only appear once its view has opened: until then the card waits in the middle.
  const target = step?.target
  const ringParts = step?.ringParts
  useLayoutEffect(() => {
    const ring = ringRef.current
    const card = cardRef.current
    if (!ring || !card) return
    let locked = target ? pick(target) : null
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    ring.style.transition = reduced ? 'none' : `left ${JUMP_MS}ms ease, top ${JUMP_MS}ms ease, width ${JUMP_MS}ms ease, height ${JUMP_MS}ms ease`
    const settle = setTimeout(() => {
      ring.style.transition = 'none'
    }, JUMP_MS)
    let frame = 0
    let prev = ''
    // A control further down a scrolling panel (the planner's Save) is scrolled into view, once per step, after
    // any panel has finished sliding in
    let scrolled = false
    const since = performance.now()
    const follow = () => {
      frame = requestAnimationFrame(follow)
      if (target && (!locked || !locked.isConnected || !isShowing(locked))) locked = pick(target)
      if (target && !locked && !scrolled && performance.now() - since > 700) {
        const hidden = document.querySelector<HTMLElement>(target)
        if (hidden && hidden.getBoundingClientRect().height > 0) {
          scrolled = true
          revealInPanel(hidden)
        }
      }
      const r = locked ? shownRect(locked, ringParts) : undefined
      const vw = innerWidth, vh = innerHeight
      const w = card.offsetWidth, h = card.offsetHeight
      // Set here rather than through React, which would reset it on every page render
      card.classList.toggle('is-centred', !r)
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
      // The card goes where there is room: below the ring, above it, to its right, then to its left; failing
      // all of those (a control as big as the screen, like the map), in the bottom-left corner over it
      const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(v, hi))
      const cx = box.left + box.width / 2, cy = box.top + box.height / 2
      let left: number, top: number
      if (box.top + box.height + CARD_GAP + h < vh - 12) [left, top] = [clamp(cx - w / 2, 12, vw - w - 12), box.top + box.height + CARD_GAP]
      else if (box.top - CARD_GAP - h > 12) [left, top] = [clamp(cx - w / 2, 12, vw - w - 12), box.top - CARD_GAP - h]
      else if (box.left + box.width + CARD_GAP + w < vw - 12) [left, top] = [box.left + box.width + CARD_GAP, clamp(cy - h / 2, 12, vh - h - 12)]
      else if (box.left - CARD_GAP - w > 12) [left, top] = [box.left - CARD_GAP - w, clamp(cy - h / 2, 12, vh - h - 12)]
      else [left, top] = [clamp(vw / 2 - w / 2, 12, vw - w - 12), vh - h - 24]
      card.style.left = `${left}px`
      card.style.top = `${top}px`
    }
    follow()
    return () => {
      cancelAnimationFrame(frame)
      clearTimeout(settle)
    }
  }, [index, target, ringParts])

  // Arrow keys step through (not while typing); Esc closes
  const keys = useRef({ nextIndex, prevIndex, onClose })
  useEffect(() => {
    keys.current = { nextIndex, prevIndex, onClose }
  })
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = e.target instanceof HTMLElement && e.target.closest('input, textarea, select, [contenteditable]')
      const k = keys.current
      if (e.key === 'ArrowRight' && !typing && k.nextIndex >= 0) setIndex(k.nextIndex)
      else if (e.key === 'ArrowLeft' && !typing && k.prevIndex >= 0) setIndex(k.prevIndex)
      else if (e.key === 'Escape') k.onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  if (!step) return null

  // Chapters, in order, for the progress line and the jump dots
  const chapters: { name: string; first: number }[] = []
  shown.forEach((s, i) => {
    if (s.chapter && !chapters.some((c) => c.name === s.chapter) && applies(s)) chapters.push({ name: s.chapter, first: i })
  })
  const counted = shown.filter((s) => applies(s))
  const position = counted.indexOf(step) + 1
  const actionDone = step.action?.done?.() ?? false

  return (
    <div className={`tour${guided ? ' is-guided' : ''}`} role="dialog" aria-modal="false" aria-labelledby="tour-title">
      <div ref={ringRef} className="tour-ring" style={{ display: 'none' }} />
      <div ref={cardRef} className="tour-card">
        {guided && (
          <div className="tour-progress" aria-hidden>
            <span style={{ width: `${(position / counted.length) * 100}%` }} />
          </div>
        )}
        <div key={index} className="tour-card-body">
          <p className="tour-count">
            {step.chapter && <span className="tour-chapter">{step.chapter}</span>}
            <span>{position} / {counted.length}</span>
          </p>
          <h2 id="tour-title">{step.title}</h2>
          <p className="tour-text">{step.text}</p>
          {step.points && (
            <ul className="tour-points">
              {step.points.map((p) => <li key={p}>{p}</li>)}
            </ul>
          )}
          {step.tryIt && (
            <p className="tour-try">
              <span>Try it</span> {step.tryIt}
            </p>
          )}
          {step.action && (
            <button type="button" className="tour-action" disabled={actionDone} onClick={step.action.run}>
              {actionDone ? '✓ Done' : step.action.label}
            </button>
          )}
        </div>
        {chapters.length > 1 && (
          <nav className="tour-chapters" aria-label="Tour chapters">
            {chapters.map((c) => (
              <button
                key={c.name}
                type="button"
                className={c.name === step.chapter ? 'is-on' : ''}
                aria-current={c.name === step.chapter ? 'step' : undefined}
                aria-label={`Jump to ${c.name}`}
                title={c.name}
                onClick={() => setIndex(c.first)}
              />
            ))}
          </nav>
        )}
        <div className="tour-actions">
          {!last && <button type="button" className="tour-skip" onClick={onClose}>{guided ? 'End tour' : 'Skip'}</button>}
          {prevIndex >= 0 && <button type="button" className="tour-back" onClick={() => setIndex(prevIndex)}>Back</button>}
          <button type="button" className="tour-next" onClick={() => (last ? onClose() : setIndex(nextIndex))} autoFocus>
            {last ? 'Done' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  )
}
