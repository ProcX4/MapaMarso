import { useEffect, useRef, useState, type CSSProperties } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js'
import { buildStandIn, fitModel, loadOrbiterModel } from '../../globe/orbiterModel'
import { formatLat, formatLon } from '../../lib/format'
import { APPROXIMATE_MODEL_NOTE, orbitFacts, orbiterById, type OrbiterId } from '../../data/orbiters'
import { Icon } from '../../components/Icon'

/**
 * One 3D view shared by every orbiter card, made once and kept (from MapaMars). Browsers allow only a handful
 * of 3D views at a time (about 16), and each card opening a fresh one ran them out when orbiters were clicked
 * quickly: the browser then dropped the globe's own view and the page went white. Each card borrows this one.
 */
let viewer: {
  renderer: THREE.WebGLRenderer
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  controls: OrbitControls
  /** The model on show (one at a time), and the card currently using the view */
  shown: THREE.Object3D | null
  owner: symbol | null
} | null = null

function getViewer() {
  if (viewer) return viewer
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.ACESFilmicToneMapping
  const scene = new THREE.Scene()
  // Soft studio reflections: spacecraft are mostly foil and metal, which look black with lights alone
  scene.environment = new THREE.PMREMGenerator(renderer).fromScene(new RoomEnvironment(), 0.04).texture
  scene.add(new THREE.HemisphereLight('#ffffff', '#3a2a22', 1.6))
  const sun = new THREE.DirectionalLight('#fff4e6', 3)
  sun.position.set(4, 3, 5)
  scene.add(sun)
  const camera = new THREE.PerspectiveCamera(32, 1, 0.01, 100)
  camera.position.set(2.2, 1.2, 2.6)
  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableDamping = true
  controls.autoRotate = true
  controls.autoRotateSpeed = 1.6
  viewer = { renderer, scene, camera, controls, shown: null, owner: null }
  return viewer
}

/** A small view of the spacecraft's 3D model: turns slowly, and can be dragged round. */
function OrbiterModel({ url, standIn, name }: { url?: string; standIn?: 'mex' | 'emm'; name: string }) {
  const hostRef = useRef<HTMLDivElement>(null)
  const [state, setState] = useState<'loading' | 'ready' | 'failed'>('loading')

  useEffect(() => {
    const host = hostRef.current!
    const v = getViewer()
    const me = Symbol(name)
    v.owner = me
    host.appendChild(v.renderer.domElement)
    if (v.shown) {
      v.scene.remove(v.shown)
      v.shown = null
    }
    v.renderer.clear()

    const resize = () => {
      const w = host.clientWidth, h = host.clientHeight
      if (!w || !h) return
      v.renderer.setSize(w, h, false)
      v.camera.aspect = w / h
      v.camera.updateProjectionMatrix()
    }
    const ro = new ResizeObserver(resize)
    ro.observe(host)
    resize()

    let frame = 0
    ;(url ? loadOrbiterModel(url) : Promise.resolve(buildStandIn(standIn!)))
      .then((source) => {
        // Another card took the view over meanwhile (orbiters clicked in quick succession): leave it be
        if (v.owner !== me) return
        // Centred and scaled to fit the view
        v.shown = fitModel(source, 2.4)
        v.scene.add(v.shown)
        setState('ready')
      })
      .catch(() => {
        if (v.owner === me) setState('failed')
      })

    const tick = () => {
      frame = requestAnimationFrame(tick)
      v.controls.update()
      v.renderer.render(v.scene, v.camera)
    }
    tick()
    return () => {
      cancelAnimationFrame(frame)
      ro.disconnect()
      // Hand the view back; the next card (or this one again) will use it
      if (v.owner === me) {
        v.owner = null
        if (v.shown) v.scene.remove(v.shown)
        v.shown = null
        v.renderer.domElement.remove()
      }
    }
  }, [url, standIn, name])

  return (
    <div className="orbiter-model" ref={hostRef} role="img" aria-label={`3D model of ${name}`}>
      {state !== 'ready' && <span className="orbiter-model-note">{state === 'loading' ? 'Loading 3D model…' : 'The 3D model could not be loaded.'}</span>}
    </div>
  )
}

const km = (v: number) => `${Math.round(v).toLocaleString('en-US')} km`

/** Background and the live state of a spacecraft orbiting Mars, with its real 3D model where NASA has one. */
export function OrbiterCard({ id, at, onClose }: { id: OrbiterId; at: number; onClose: () => void }) {
  const o = orbiterById(id)
  const f = orbitFacts(id, at)
  return (
    <aside className="info-card orbiter-card" aria-label={o.name} style={{ '--orbiter-color': o.color } as CSSProperties}>
      <button type="button" className="info-card-close" onClick={onClose} aria-label="Close">
        <Icon name="close" />
      </button>
      <p className="info-card-kicker">Orbiter · {o.agency}</p>
      <h2>{o.name}</h2>
      <p className="muted">
        Launched {o.launched} · at Mars since {o.arrived}
      </p>
      {o.model ? (
        <OrbiterModel url={o.model.url} name={o.name} />
      ) : (
        <>
          <OrbiterModel standIn={o.id as 'mex' | 'emm'} name={o.name} />
          <p className="orbiter-model-none">
            <span className="model-warn" aria-hidden="true">!</span>
            {APPROXIMATE_MODEL_NOTE}.
          </p>
        </>
      )}
      {f ? (
        <dl className="info-card-facts">
          <dt>Height now</dt>
          <dd>{km(f.altitude)}</dd>
          <dt>Speed</dt>
          <dd>{f.speed.toFixed(2)} km/s</dd>
          <dt>Over</dt>
          <dd>
            {formatLat(f.lat)} {formatLon(f.lon)}
          </dd>
          <dt>Goes round every</dt>
          <dd>{f.periodH < 3 ? `${Math.round(f.periodH * 60)} min` : `${f.periodH.toFixed(1)} h`}</dd>
          <dt>Orbit</dt>
          <dd>
            {km(Math.max(0, f.periapsis))} to {km(f.apoapsis)} up
          </dd>
          <dt>Tilt to equator</dt>
          <dd>
            {f.inclination.toFixed(1)}°{f.inclination > 80 && f.inclination < 100 ? ' (over the poles)' : ''}
          </dd>
        </dl>
      ) : (
        <p className="info-card-status">Waiting for its position from NASA JPL Horizons…</p>
      )}
      <p className="info-card-text">{o.about}</p>
      <p className="muted info-card-credit">
        Position: NASA JPL Horizons, live{o.model ? ` · Model: ${o.model.credit}` : ''} · OBSERVED (orbit figures DERIVED)
      </p>
    </aside>
  )
}
