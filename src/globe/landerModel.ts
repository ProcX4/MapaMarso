import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

/**
 * NASA's 3D model of the Viking lander (NASA/Michael D. Carbajal), from
 * https://science.nasa.gov/3d-resources/viking-lander/ (also github.com/nasa/NASA-3D-Resources); loader
 * from MapaMars. It shows the lander as it stood on Mars: hexagonal body on three legs, the two RTG power
 * units under their wind covers, high-gain dish, cameras, weather boom and the sampler arm reaching out.
 */
export const VIKING_MODEL_URL = '/resources/viking-lander.glb'
export const VIKING_MODEL_CREDIT = 'Viking lander 3D model: NASA'

// Measured from the model (its own units): the body's centre on the ground plane, the underside of the
// footpads, its full height (footpads to the top of the dish), and the angle and distance of each footpad
const MODEL_CENTRE = { x: -0.0389, z: 0.6422 }
const MODEL_FOOT_Y = 0.2074
const MODEL_HEIGHT = 8.9722
/** The real lander stands about 2.1 m from footpads to the top of its high-gain antenna. */
export const VIKING_HEIGHT_M = 2.1
const SCALE = VIKING_HEIGHT_M / MODEL_HEIGHT
const FOOT_ANGLES_DEG = [-85, 25, 155]
const FOOT_RADIUS_M = 7.0 * SCALE
/** Direction the sampler arm reaches, as an angle from +x toward +z. */
const ARM_ANGLE_DEG = -7.81

/** The turn (radians about the vertical) that points the sampler arm at a spot on the ground. */
export const vikingYawToward = (x: number, z: number) => THREE.MathUtils.degToRad(ARM_ANGLE_DEG) - Math.atan2(z, x)

let pending: Promise<THREE.Object3D> | null = null
let loaded: THREE.Object3D | null = null

/**
 * The lander in metres, standing with its footpads at y = 0 and its body centred on the origin, arm along
 * the model's own direction. Loaded once; later calls share it.
 */
export function loadVikingLander() {
  pending ??= new GLTFLoader().loadAsync(VIKING_MODEL_URL).then((gltf) => {
    const model = gltf.scene
    model.position.set(-MODEL_CENTRE.x, -MODEL_FOOT_Y, -MODEL_CENTRE.z)
    model.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      mesh.castShadow = true
      mesh.receiveShadow = true
    })
    const holder = new THREE.Group()
    holder.add(model)
    holder.scale.setScalar(SCALE)
    loaded = holder
    return holder
  })
  return pending
}

/** The loaded lander, or null if it hasn't arrived yet. */
export const loadedVikingLander = () => loaded

/** Where the footpads touch down, in metres from the lander's centre, for a lander turned by `yaw` radians. */
export function vikingFootpads(yaw: number) {
  return FOOT_ANGLES_DEG.map((deg) => {
    // A turn of `yaw` about the vertical axis moves an angle measured from +x toward +z back by `yaw`
    const a = THREE.MathUtils.degToRad(deg) - yaw
    return new THREE.Vector2(Math.cos(a) * FOOT_RADIUS_M, Math.sin(a) * FOOT_RADIUS_M)
  })
}
