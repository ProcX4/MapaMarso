import { useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react'
import type { LngLat } from '../../state/types'
import { useRoverPhotos } from '../../hooks/useRoverPhotos'
import { lookingToward, ROVER_PHOTO_RADIUS_M, type RoverPhoto } from '../../services/roverPhotos'
import { formatDistance } from '../../lib/format'
import { SITE } from '../../config/site'
import { Icon } from '../../components/Icon'
import { ProvenanceTag } from '../../components/ProvenanceTag'

/** "3 Mar 2021" from the feed's UTC time, which has no zone marker */
const formatDay = (utc: string) => {
  const d = new Date(/Z$/.test(utc) ? utc : `${utc}Z`)
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' })
}

const caption = (p: RoverPhoto) => [p.camera, `sol ${p.sol}`, formatDay(p.takenAt), p.azimuth !== undefined && lookingToward(p.azimuth)].filter(Boolean).join(' · ')

function SeeAll() {
  return (
    <a className="rover-photos-all" href={SITE.rawImagesUrl} target="_blank" rel="noreferrer">
      See all raw images
    </a>
  )
}

/**
 * "What you'll see when you arrive": real Perseverance photos from the rover stop nearest the point, when it
 * stopped within ROVER_PHOTO_RADIUS_M. Elsewhere it says so, and points to the orbital imagery instead.
 */
export function RoverPhotos({ at }: { at: LngLat }) {
  const result = useRoverPhotos(at)
  const [open, setOpen] = useState<number | null>(null)
  const v = result.value

  return (
    <section className="rover-photos" aria-label="Rover photos near this point">
      <h3 className="info-card-kicker site-card-group">
        Pictures <ProvenanceTag category="observed" note="Perseverance raw images, NASA/JPL-Caltech" />
      </h3>
      {result.status === 'loading' && <p className="muted rover-photos-note">Looking for Perseverance photos…</p>}
      {result.status === 'error' && <p className="muted rover-photos-note">Rover photos can't be loaded right now.</p>}
      {result.status === 'ready' && v && !v.stop && (
        <p className="muted rover-photos-note">
          Perseverance hasn't stopped within {formatDistance(ROVER_PHOTO_RADIUS_M)} of here. Zoom in for the CTX and HiRISE
          imagery of the ground instead.
        </p>
      )}
      {result.status === 'ready' && v?.stop && (
        <>
          <p className="muted rover-photos-note">
            {v.match === 'site-drive' ? 'Taken' : 'No photos at the stop itself; these are from the same sol,'} where Perseverance stopped{' '}
            {v.stop.distanceM < 5 ? 'right here' : `${formatDistance(v.stop.distanceM)} away`} (sol {v.stop.sol}, site {v.stop.site} drive {v.stop.drive}).
          </p>
          {v.photos.length ? (
            <ul className="rover-photos-strip">
              {v.photos.map((p, i) => (
                <li key={p.id}>
                  <button type="button" className="rover-photo" onClick={() => setOpen(i)} title={caption(p)} aria-label={`Open photo: ${caption(p)}`}>
                    <img src={p.thumbUrl} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" width={160} height={120} />
                    <span className="rover-photo-caption num">
                      {p.camera}
                      <br />
                      sol {p.sol}{p.azimuth !== undefined && ` · ${lookingToward(p.azimuth).replace('looking ', '')}`}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted rover-photos-note">No full-frame context photos were found for that stop.</p>
          )}
          {v.photos.length > 0 && <p className="provenance-line">Credit: {[...new Set(v.photos.map((p) => p.credit))].join('; ')}</p>}
        </>
      )}
      <SeeAll />
      {open !== null && v?.photos[open] && (
        <PhotoViewer photos={v.photos} index={open} onIndex={setOpen} onClose={() => setOpen(null)} />
      )}
    </section>
  )
}

/** Zoom stops at twice the photo's own detail (past that it only gets blockier), within these bounds */
const MAX_ZOOM = 6
const MIN_MAX_ZOOM = 2
const DOUBLE_CLICK_ZOOM = 2.5

/** Zoom and pan of the photo: scale, and the offset of its top-left corner in screen pixels */
type View = { s: number; x: number; y: number }
const FIT: View = { s: 1, x: 0, y: 0 }

/**
 * A larger view of one photo, with the next and previous ones a click or an arrow key away. Zoom in with the
 * wheel, a pinch, a double-click, the buttons or the + and − keys; drag to look round a zoomed photo.
 */
function PhotoViewer({ photos, index, onIndex, onClose }: { photos: RoverPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const p = photos[index]
  const [view, setView] = useState<View>(FIT)
  // Twice the photo's own detail, worked out once it has loaded (and again when the original arrives)
  const [maxZoom, setMaxZoom] = useState(MAX_ZOOM)
  // The full-resolution original, once it has downloaded (it's asked for the first time the photo is zoomed)
  const [fullReady, setFullReady] = useState<string | null>(null)
  // Each new photo opens fitted, on its large copy
  const [shown, setShown] = useState(index)
  if (shown !== index) {
    setShown(index)
    setView(FIT)
    setMaxZoom(MAX_ZOOM)
  }
  const zoomed = view.s > 1
  useEffect(() => {
    if (!zoomed || p.fullUrl === p.largeUrl || fullReady === p.fullUrl) return
    const img = new Image()
    img.referrerPolicy = 'no-referrer'
    img.onload = () => setFullReady(p.fullUrl)
    img.src = p.fullUrl
    return () => {
      img.onload = null
    }
  }, [zoomed, p.fullUrl, p.largeUrl, fullReady])
  const src = fullReady === p.fullUrl ? p.fullUrl : p.largeUrl
  const step = (d: number) => onIndex((index + d + photos.length) % photos.length)

  // No close() on unmount: that fires the dialog's close event (and so onClose) in React's development
  // double run; taking an open dialog out of the page ends it anyway
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

  const zoomBy = (factor: number) => {
    const box = stage.current?.getBoundingClientRect()
    if (box) setView((v) => zoomAt(v, v.s * factor, box.width / 2, box.height / 2, box, maxZoom))
  }

  // The wheel needs a non-passive listener so the page behind doesn't scroll
  useEffect(() => {
    const el = stage.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const box = el.getBoundingClientRect()
      const factor = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0018))
      setView((v) => zoomAt(v, v.s * factor, e.clientX - box.left, e.clientY - box.top, box, maxZoom))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
  }, [maxZoom])

  // Dragging with one pointer pans; two pointers pinch-zoom
  const pointers = useRef(new Map<number, { x: number; y: number }>())
  const onPointerDown = (e: ReactPointerEvent) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerMove = (e: ReactPointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    const box = stage.current?.getBoundingClientRect()
    if (!prev || !box) return
    const all = [...pointers.current.entries()]
    if (all.length === 2) {
      const other = all.find(([id]) => id !== e.pointerId)![1]
      const before = Math.hypot(prev.x - other.x, prev.y - other.y)
      const after = Math.hypot(e.clientX - other.x, e.clientY - other.y)
      const mid = { x: (e.clientX + other.x) / 2 - box.left, y: (e.clientY + other.y) / 2 - box.top }
      if (before > 0) setView((v) => zoomAt(v, (v.s * after) / before, mid.x, mid.y, box, maxZoom))
    } else {
      setView((v) => (v.s > 1 ? clampView({ ...v, x: v.x + e.clientX - prev.x, y: v.y + e.clientY - prev.y }, box) : v))
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }
  const onPointerUp = (e: ReactPointerEvent) => pointers.current.delete(e.pointerId)

  return (
    <dialog
      ref={ref}
      className="rover-viewer"
      aria-label={caption(p)}
      onClose={onClose}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      onKeyDown={(e) => {
        if (e.key === 'ArrowRight') step(1)
        else if (e.key === 'ArrowLeft') step(-1)
        else if (e.key === '+' || e.key === '=') zoomBy(1.5)
        else if (e.key === '-' || e.key === '_') zoomBy(1 / 1.5)
        else if (e.key === '0') setView(FIT)
        // Esc closes only the photo, not the site card behind it (the page closes cards on Esc too)
        else if (e.key === 'Escape') e.stopPropagation()
      }}
    >
      <button type="button" className="info-card-close" aria-label="Close photo" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
      <div
        ref={stage}
        className={`rover-viewer-stage${view.s > 1 ? ' is-zoomed' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onDoubleClick={(e) => {
          const box = e.currentTarget.getBoundingClientRect()
          setView((v) => (v.s > 1 ? FIT : zoomAt(v, Math.min(DOUBLE_CLICK_ZOOM, maxZoom), e.clientX - box.left, e.clientY - box.top, box, maxZoom)))
        }}
      >
        <img
          src={src}
          alt={caption(p)}
          referrerPolicy="no-referrer"
          draggable={false}
          onLoad={(e) => {
            const img = e.currentTarget
            if (img.width) setMaxZoom(Math.min(MAX_ZOOM, Math.max(MIN_MAX_ZOOM, (2 * img.naturalWidth) / img.width)))
          }}
          style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.s})` }}
        />
      </div>
      <div className="rover-viewer-zoom" role="group" aria-label="Zoom">
        <button type="button" onClick={() => zoomBy(1 / 1.5)} disabled={view.s <= 1} aria-label="Zoom out">−</button>
        <span className="num" aria-live="polite">{Math.round(view.s * 100)}%</span>
        <button type="button" onClick={() => zoomBy(1.5)} disabled={view.s >= maxZoom - 0.01} aria-label="Zoom in">+</button>
        <button type="button" className="rover-viewer-fit" onClick={() => setView(FIT)} disabled={view.s <= 1}>Fit</button>
        <span className="muted rover-viewer-help">Scroll or pinch to zoom · drag to look around · double-click to zoom in or out</span>
      </div>
      <div className="rover-viewer-bar">
        {photos.length > 1 && <button type="button" aria-label="Previous photo" onClick={() => step(-1)}>‹</button>}
        <p>
          <span className="num">{caption(p)}</span>
          <span className="muted">
            {p.credit} ·{' '}
            <a href={p.pageUrl} target="_blank" rel="noreferrer">
              View on NASA
            </a>
          </span>
        </p>
        {photos.length > 1 && <button type="button" aria-label="Next photo" onClick={() => step(1)}>›</button>}
      </div>
    </dialog>
  )
}

type Box = { width: number; height: number }

/** The view zoomed to `s`, keeping the photo point under (px, py) in place; back to fitted at 1× */
function zoomAt(v: View, s: number, px: number, py: number, box: Box, max: number): View {
  const ns = Math.min(max, Math.max(1, s))
  if (ns === 1) return FIT
  return clampView({ s: ns, x: px - ((px - v.x) * ns) / v.s, y: py - ((py - v.y) * ns) / v.s }, box)
}

/** Keeps a zoomed photo covering its frame: no dragging it off to one side */
function clampView(v: View, box: Box): View {
  return { s: v.s, x: Math.min(0, Math.max(box.width - box.width * v.s, v.x)), y: Math.min(0, Math.max(box.height - box.height * v.s, v.y)) }
}
