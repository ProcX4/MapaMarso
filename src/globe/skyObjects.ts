import * as THREE from 'three'
import type { Vec3 } from '../data/marsSky'
import { starDirection } from '../data/marsSky'

/**
 * The real sky, shared by the globe and the landing-site close-up (from MapaMars).
 *
 * Stars: the Yale Bright Star Catalogue (5th ed., Hoffleit & Warren 1991): every star to about magnitude
 * 6.5, the ones the eye can see; packed as [right ascension°, declination°, V magnitude, colour
 * temperature K], brightest first. From Mars the stars sit where they do from Earth: they are far enough
 * away that the 0.5 AU or so between the planets doesn't move them.
 */
export const SKY_CREDIT = 'Stars: Yale Bright Star Catalogue'
const STARS_URL = '/resources/stars.json'

export type Star = [ra: number, dec: number, mag: number, kelvin: number]

let pending: Promise<Star[]> | null = null

/** The star catalogue, downloaded once and shared. */
export function loadStars() {
  pending ??= fetch(STARS_URL).then((r) => {
    if (!r.ok) throw new Error(`stars: ${r.status}`)
    return r.json() as Promise<Star[]>
  })
  pending.catch(() => {
    pending = null
  })
  return pending
}

/** A star's colour from its temperature: cool stars orange, the Sun's kind white, hot ones blue-white. */
function starColor(kelvin: number, out: THREE.Color) {
  const t = THREE.MathUtils.clamp((kelvin - 3000) / 9000, 0, 1)
  return t < 0.35
    ? out.set('#ffb36b').lerp(new THREE.Color('#fff4e6'), t / 0.35)
    : out.set('#fff4e6').lerp(new THREE.Color('#aecbff'), (t - 0.35) / 0.65)
}

/** How big (px) and bright (0–1) a point looks for a visual magnitude: Sirius large and full, the faintest a speck. */
export function pointLook(mag: number) {
  return { size: THREE.MathUtils.clamp(4.4 - mag * 0.55, 1.2, 6), alpha: THREE.MathUtils.clamp(1.1 - mag * 0.13, 0.22, 1) }
}

/**
 * Round, soft points, each with its own colour, size (px) and brightness; one overall opacity fades the lot
 * (stars coming out at dusk). Shared by the stars and the planets.
 */
export function pointsMaterial(pixelRatio: number) {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    uniforms: { opacity: { value: 1 }, pixelRatio: { value: pixelRatio } },
    vertexShader: `
      attribute vec3 color;
      attribute float size;
      attribute float alpha;
      uniform float pixelRatio;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = color;
        vAlpha = alpha;
        gl_PointSize = size * pixelRatio;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform float opacity;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        float d = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, d) * vAlpha * opacity;
        gl_FragColor = vec4(vColor * a, a);
      }`,
  })
}

/** Points for every star at their true directions, on a sphere of `radius`, in ICRF (turn the object into place). */
export function buildStars(stars: Star[], radius: number, pixelRatio: number) {
  const positions = new Float32Array(stars.length * 3)
  const colors = new Float32Array(stars.length * 3)
  const sizes = new Float32Array(stars.length)
  const alphas = new Float32Array(stars.length)
  const c = new THREE.Color()
  stars.forEach(([ra, dec, mag, kelvin], i) => {
    const [x, y, z] = starDirection(ra, dec)
    positions.set([x * radius, y * radius, z * radius], i * 3)
    starColor(kelvin, c).toArray(colors, i * 3)
    const look = pointLook(mag)
    sizes[i] = look.size
    alphas[i] = look.alpha
  })
  const geometry = new THREE.BufferGeometry()
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3))
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1))
  geometry.setAttribute('alpha', new THREE.BufferAttribute(alphas, 1))
  const points = new THREE.Points(geometry, pointsMaterial(pixelRatio))
  points.frustumCulled = false
  return points
}

/** Turn an object built in ICRF into a scene, given where the ICRF x, y and z axes land there. */
export function placeInSky(object: THREE.Object3D, toScene: (v: Vec3) => THREE.Vector3) {
  const basis = new THREE.Matrix4().makeBasis(toScene([1, 0, 0]), toScene([0, 1, 0]), toScene([0, 0, 1]))
  object.quaternion.setFromRotationMatrix(basis)
}
