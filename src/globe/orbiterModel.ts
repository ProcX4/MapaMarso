import * as THREE from 'three'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

// NASA's spacecraft models (see public/resources/README.md); loader from MapaMars. Two are Draco-compressed;
// three.js's decoder is served from public/resources/draco.
let loader: GLTFLoader | null = null
const models = new Map<string, Promise<THREE.Object3D>>()

/** A model, downloaded once and kept; each view shows its own copy (clone it). */
export function loadOrbiterModel(url: string) {
  if (!loader) loader = new GLTFLoader().setDRACOLoader(new DRACOLoader().setDecoderPath('/resources/draco/'))
  let model = models.get(url)
  if (!model) {
    model = loader.loadAsync(url).then((gltf) => gltf.scene)
    model.catch(() => models.delete(url))
    models.set(url, model)
  }
  return model
}

/**
 * A copy of the model centred on the origin and scaled so its longest side is `span` (in whatever units the
 * caller uses), whatever units it was made in.
 */
export function fitModel(source: THREE.Object3D, span: number) {
  const model = source.clone(true)
  const box = new THREE.Box3().setFromObject(model)
  const dims = box.getSize(new THREE.Vector3())
  model.position.sub(box.getCenter(new THREE.Vector3()))
  const holder = new THREE.Group()
  holder.add(model)
  holder.scale.setScalar(span / (Math.max(dims.x, dims.y, dims.z) || 1))
  return holder
}

/**
 * A simple stand-in for a spacecraft with no published 3D model, built from its real dimensions (metres):
 * a foil-wrapped body, its solar wings and its high-gain dish. Not a likeness in detail; the card says so.
 */
export function buildStandIn(kind: 'mex' | 'emm') {
  const craft = new THREE.Group()
  const foil = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.75, roughness: 0.35 })
  const panel = new THREE.MeshStandardMaterial({ color: '#1d2a4d', metalness: 0.4, roughness: 0.45 })
  const white = new THREE.MeshStandardMaterial({ color: '#e8e6e0', metalness: 0.2, roughness: 0.5, side: THREE.DoubleSide })
  const add = (mesh: THREE.Mesh, x = 0, y = 0, z = 0) => {
    mesh.position.set(x, y, z)
    craft.add(mesh)
    return mesh
  }
  if (kind === 'mex') {
    // Mars Express: a 1.5 × 1.8 × 1.4 m box, two wings 12 m tip to tip, a 1.6 m dish
    add(new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.4, 1.8), foil))
    for (const side of [-1, 1]) {
      add(new THREE.Mesh(new THREE.BoxGeometry(5, 0.04, 1.4), panel), side * 3.5)
      add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.8, 6).rotateZ(Math.PI / 2), white), side * 1.15)
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.8, 0.12, 0.25, 32, 1, true), white), 0, 0.85, 0)
  } else {
    // Hope: a hexagonal body 2.37 m across and 2.9 m tall, three solar panels, a 1.85 m dish
    add(new THREE.Mesh(new THREE.CylinderGeometry(1.18, 1.18, 2.9, 6), foil))
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2
      const wing = add(new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.04, 1.4), panel), Math.cos(a) * 2.5, -0.9, Math.sin(a) * 2.5)
      wing.rotation.y = -a
    }
    add(new THREE.Mesh(new THREE.CylinderGeometry(0.92, 0.14, 0.3, 32, 1, true), white), 0, 1.6, 0)
  }
  return craft
}
