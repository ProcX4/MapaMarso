import * as THREE from 'three'
import type { Vec3 } from '../data/marsSky'
import { buildStars, loadStars, pointsMaterial, type Star } from './skyObjects'

// Sky over a landing site (from MapaMars). Everything is centred on the camera (the group follows it). The
// dome is drawn first and never touches the depth buffer; the stars and Earth blend in after the ground,
// which hides any of them below the horizon.
const DOME_RADIUS = 500
const STARS_RADIUS = 450
const EARTH_RADIUS = 440

/**
 * The Martian sky's colour. Daytime: dust lit by the Sun gives a butterscotch sky, paler at the horizon.
 * Near sunset: that same dust scatters blue light forwards, so a blue glow gathers around the Sun (the
 * rovers' famous blue sunsets), while the rest of the sky dims. Values are linear RGB, before tone mapping.
 */
const SKY_SHADER = {
  vertex: `
    varying vec3 vDir;
    void main() {
      vDir = position;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragment: `
    uniform vec3 sunDir;
    uniform float light;
    uniform float dusk;
    varying vec3 vDir;
    void main() {
      vec3 d = normalize(vDir);
      float up = max(d.y, 0.0);
      vec3 horizon = vec3(0.60, 0.37, 0.21);
      vec3 zenith = vec3(0.34, 0.20, 0.11);
      vec3 sky = mix(horizon, zenith, sqrt(up));
      float toSun = max(dot(d, sunDir), 0.0);
      // A broad warm brightening toward the Sun by day, and a tighter blue glow round it at dusk
      sky *= 1.0 + 0.6 * pow(toSun, 6.0) * (1.0 - dusk);
      float glow = pow(toSun, 10.0);
      vec3 blue = vec3(0.24, 0.40, 0.75);
      // The glow outlasts the rest of the sky a little after sunset
      vec3 color = sky * light + blue * glow * dusk * min(1.0, light * 4.0 + 0.04 * dusk * step(-0.25, sunDir.y));
      gl_FragColor = vec4(color, 1.0);
      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }`,
}
/** The horizon colour in the shader, so the fog over distant ground can match the sky behind it. */
const HORIZON = new THREE.Color(0.6, 0.37, 0.21)

export function buildSiteSky(pixelRatio: number) {
  const group = new THREE.Group()
  const uniforms = { sunDir: { value: new THREE.Vector3(0, 1, 0) }, light: { value: 1 }, dusk: { value: 0 } }
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(DOME_RADIUS, 48, 24),
    new THREE.ShaderMaterial({ uniforms, vertexShader: SKY_SHADER.vertex, fragmentShader: SKY_SHADER.fragment, side: THREE.BackSide, depthTest: false, depthWrite: false, fog: false }),
  )
  dome.renderOrder = -10
  dome.frustumCulled = false
  group.add(dome)

  // How far the stars have come out: 0 by day, 1 in full darkness (see setSun)
  let starOpacity = 0

  // The night sky: the stars, turned by the site's sky matrix (see setSkyFrame). They are
  // drawn after the ground (they blend), and its depth hides whatever of them is below the horizon
  const celestial = new THREE.Group()
  group.add(celestial)
  let stars: THREE.Points | null = null
  const starsReady = loadStars()
    .then((catalogue: Star[]) => {
      stars = buildStars(catalogue, STARS_RADIUS, pixelRatio)
      stars.renderOrder = -8
      stars.visible = starOpacity > 0
      ;(stars.material as THREE.ShaderMaterial).uniforms.opacity.value = starOpacity
      celestial.add(stars)
    })
    .catch(() => {
      // no stars, the rest of the sky still works
    })

  // Earth: one bright blue point, set in the sky by direction (not turned with the stars' group)
  const earth = new THREE.Points(new THREE.BufferGeometry(), pointsMaterial(pixelRatio))
  earth.geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(3), 3))
  earth.geometry.setAttribute('color', new THREE.BufferAttribute(new Float32Array(new THREE.Color('#9cc6ff').toArray()), 3))
  earth.geometry.setAttribute('size', new THREE.BufferAttribute(new Float32Array([7]), 1))
  earth.geometry.setAttribute('alpha', new THREE.BufferAttribute(new Float32Array([1]), 1))
  earth.renderOrder = -7
  earth.frustumCulled = false
  group.add(earth)
  const earthDir = new THREE.Vector3(0, -1, 0)

  const fogColor = new THREE.Color()
  const fadeNight = () => {
    if (stars) {
      stars.visible = starOpacity > 0
      ;(stars.material as THREE.ShaderMaterial).uniforms.opacity.value = starOpacity
    }
    // Earth only when it is up and the sky is dark enough to see it
    const show = starOpacity * THREE.MathUtils.smoothstep(earthDir.y, -0.01, 0.03)
    earth.visible = show > 0
    ;(earth.material as THREE.ShaderMaterial).uniforms.opacity.value = show
  }

  return {
    group,
    fogColor,
    starsReady,
    /**
     * Where the Sun is (scene axes, unit vector) and how much light the sky gives (0–1, see skyLightShare).
     * Sets the sky's colour, the fog that blends distant ground into it, and how far the stars have come out.
     */
    setSun(dir: THREE.Vector3, light: number) {
      uniforms.sunDir.value.copy(dir).normalize()
      uniforms.light.value = light
      const elevation = THREE.MathUtils.radToDeg(Math.asin(THREE.MathUtils.clamp(uniforms.sunDir.value.y, -1, 1)))
      uniforms.dusk.value = 1 - THREE.MathUtils.smoothstep(elevation, 4, 22)
      fogColor.copy(HORIZON).multiplyScalar(light)
      // Stars come out through twilight as the sky dims
      starOpacity = 1 - THREE.MathUtils.smoothstep(light, 0.0005, 0.02)
      fadeNight()
    },
    /**
     * The sky's orientation over the site right now (a row-major 3×3 matrix from ICRF to east, north, up;
     * see siteSkyMatrix) and Earth's direction (ICRF).
     */
    setSkyFrame(matrix: number[], earthIcrf: Vec3) {
      const local = (v: Vec3) =>
        new THREE.Vector3(
          matrix[0] * v[0] + matrix[1] * v[1] + matrix[2] * v[2],
          matrix[6] * v[0] + matrix[7] * v[1] + matrix[8] * v[2],
          -(matrix[3] * v[0] + matrix[4] * v[1] + matrix[5] * v[2]),
        )
      celestial.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(local([1, 0, 0]), local([0, 1, 0]), local([0, 0, 1])))
      earthDir.copy(local(earthIcrf)).normalize()
      const p = earthDir.clone().multiplyScalar(EARTH_RADIUS)
      ;(earth.geometry.getAttribute('position') as THREE.BufferAttribute).setXYZ(0, p.x, p.y, p.z)
      earth.geometry.getAttribute('position').needsUpdate = true
      fadeNight()
    },
    /** Earth's place in the scene for its label (relative to the camera), or null while it can't be seen. */
    earthLabelAt(cameraPosition: THREE.Vector3, out: THREE.Vector3) {
      return earth.visible ? out.copy(cameraPosition).addScaledVector(earthDir, EARTH_RADIUS) : null
    },
  }
}
