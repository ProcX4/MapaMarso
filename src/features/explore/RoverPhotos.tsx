import { useEffect, useRef, useState } from 'react'
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
        What you'll see <ProvenanceTag category="observed" note="Perseverance raw images, NASA/JPL-Caltech" />
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

/** A larger view of one photo, with the next and previous ones a click or an arrow key away. */
function PhotoViewer({ photos, index, onIndex, onClose }: { photos: RoverPhoto[]; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null)
  const p = photos[index]
  const step = (d: number) => onIndex((index + d + photos.length) % photos.length)

  // No close() on unmount: that fires the dialog's close event (and so onClose) in React's development
  // double run; taking an open dialog out of the page ends it anyway
  useEffect(() => {
    if (ref.current && !ref.current.open) ref.current.showModal()
  }, [])

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
        // Esc closes only the photo, not the site card behind it (the page closes cards on Esc too)
        else if (e.key === 'Escape') e.stopPropagation()
      }}
    >
      <button type="button" className="info-card-close" aria-label="Close photo" onClick={onClose}>
        <Icon name="close" size={16} />
      </button>
      <img src={p.largeUrl} alt={caption(p)} referrerPolicy="no-referrer" />
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
