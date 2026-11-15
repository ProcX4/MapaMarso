import { useCallback, useEffect, useState, type MouseEvent } from 'react'
import { Hyperspace } from '../../globe/Hyperspace'
import { loadStars } from '../../globe/skyObjects'
import { loadMarsModel } from '../../globe/marsModel'
import { getMarsTextures } from '../../globe/marsTexture'
import { loadMoonGeometry } from '../../globe/moonModel'
import { AU_LIGHT_MIN, earthMarsDistanceAU, landingSites, marsClock } from '../../data/mars'
import { formatHours } from '../../lib/format'
import { useNow } from '../../hooks/useNow'
import { markWarpArrival } from '../../lib/warp'
import { openMapAt } from '../../map/mapControl'
import { SITE } from '../../config/site'
import { GLOBE_2D, GLOBE_3D } from '../../lib/missionPaths'
import './home.css'

/* The home page (from MapaMars pages/HomePage.tsx), kept identical to it. */

const features = [
  {
    title: 'Explore Mars in 3D',
    text: 'Drag to spin the planet and scroll to zoom. Hover anywhere on the surface to read its latitude and longitude.',
  },
  {
    title: 'Visit landing sites',
    text: `${landingSites.length} NASA landers and rovers, from Viking 1 to Perseverance, placed at their published coordinates. Pick one to fly the camera there.`,
  },
  {
    title: 'Read Mars time',
    text: 'See the local solar time at every site, the current sol, and how long a signal takes to travel from Mars to Earth.',
  },
  {
    title: 'Log a mission',
    text: 'Plan a mission, pick a target on the globe, and give it a code like MRS-204. Browse other missions and their crews, and join one with its code.',
  },
]

// Matches the text-recede animation in home.css.
const LEAVE_MS = 900
// The Jezero showcase opens on the whole crater, close enough for the CTX photos (they start at zoom 10)
const JEZERO_ZOOM = 10

/** Where the jump lands: the 3D planet, or the demo site on the 2D map, where every tool is to hand */
type Destination = 'globe' | 'jezero'

export function HomePage() {
  const now = useNow()
  const { msd, mtc } = marsClock(now)
  const lightMinutes = earthMarsDistanceAU(now) * AU_LIGHT_MIN
  const [phase, setPhase] = useState<'idle' | 'leaving' | 'warping'>('idle')
  const [destination, setDestination] = useState<Destination>('globe')

  useEffect(() => {
    if (phase !== 'leaving') return
    const id = setTimeout(() => setPhase('warping'), LEAVE_MS)
    return () => clearTimeout(id)
  }, [phase])

  // Build the globe texture and moon shapes ahead of time so the globe can appear the instant the jump
  // ends. One piece per idle moment, so no single task holds up a click.
  useEffect(() => {
    // NASA's Mars model starts downloading first; it decodes in the background while the rest are built
    const jobs = [
      () => void loadMarsModel().catch(() => {}),
      getMarsTextures,
      () => void loadMoonGeometry('phobos').catch(() => {}),
      () => void loadMoonGeometry('deimos').catch(() => {}),
      // The real sky's star catalogue
      () => void loadStars().catch(() => {}),
    ]
    // On a data-saver or slow (2G/3G) connection nothing is fetched ahead: the globe loads when it's opened
    const net = (navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection
    if (net?.saveData || /(^|-)(2g|3g)$/.test(net?.effectiveType ?? '')) return
    // Safari has no requestIdleCallback; a short timeout does the same job there
    const hasIdle = 'requestIdleCallback' in window
    const idle = (cb: () => void) => (hasIdle ? window.requestIdleCallback(cb, { timeout: 1000 }) : window.setTimeout(cb, 50))
    const cancelIdle = (id: number) => (hasIdle ? window.cancelIdleCallback(id) : window.clearTimeout(id))
    let idleId = 0
    const next = () => {
      const job = jobs.shift()
      if (!job) return
      job()
      idleId = idle(next)
    }
    const startId = window.setTimeout(() => {
      idleId = idle(next)
    }, 300)
    return () => {
      clearTimeout(startId)
      cancelIdle(idleId)
    }
  }, [])

  const jump = (to: Destination) => (e: MouseEvent<HTMLAnchorElement>) => {
    if (to === 'jezero') openMapAt(SITE.center, JEZERO_ZOOM)
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
    e.preventDefault()
    setDestination(to)
    setPhase('leaving')
  }

  const arrive = useCallback(() => {
    // The globe glides in after the jump; the 2D map has no glide, so it opens straight onto the crater
    if (destination === 'globe') {
      markWarpArrival()
      window.location.hash = GLOBE_3D
    } else window.location.hash = GLOBE_2D
  }, [destination])

  return (
    <main className={`home${phase !== 'idle' ? ' is-leaving' : ''}`}>
      <section className="hero">
        <div className="hero-copy">
          <h1>Mars, up close.</h1>
          <p>An interactive 3D globe of the red planet. Find where every NASA lander touched down and see what time it is there right now.</p>
          <div className="hero-actions">
            <a className="button" href={GLOBE_3D} onClick={jump('globe')}>
              Explore Mars →
            </a>
            <a className="button-outline" href={GLOBE_2D} onClick={jump('jezero')}>
              Explore {SITE.name}
            </a>
          </div>
          <p className="hero-hint">{SITE.name} is where every tool comes together: NASA layers, safe routes, rover photos and EVA.</p>
        </div>
      </section>
      {phase === 'warping' && <Hyperspace onDone={arrive} />}

      <section className="features" aria-label="What you can do">
        {features.map((f, i) => (
          <article key={f.title} className="feature">
            <span className="feature-num">0{i + 1}</span>
            <h2>{f.title}</h2>
            <p>{f.text}</p>
          </article>
        ))}
      </section>

      <section className="now" aria-label="Right now on Mars">
        <h2>Right now on Mars</h2>
        <dl className="stats">
          <div>
            <dt>Sol</dt>
            <dd>{Math.floor(msd).toLocaleString('en-US')}</dd>
          </div>
          <div>
            <dt>Mars time</dt>
            <dd>{formatHours(mtc)}</dd>
          </div>
          <div>
            <dt>Signal delay</dt>
            <dd>~{lightMinutes.toFixed(1)} min</dd>
          </div>
        </dl>
        <p className="note">Mars time is Coordinated Mars Time, the Martian equivalent of UTC. Signal delay is an estimate.</p>
      </section>
    </main>
  )
}
