import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createHelpers } from './helpers.js'
import { modules } from './components/index.js'

const scene = new THREE.Scene()
scene.background = new THREE.Color('#e8f4f1')
scene.fog = new THREE.Fog('#e8f4f1', 31, 70)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.32
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.append(renderer.domElement)
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120)
camera.position.set(15, 12.5, 17)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, .5, 0); controls.enableDamping = true; controls.dampingFactor = .055
controls.minDistance = 7; controls.maxDistance = 43; controls.maxPolarAngle = Math.PI * .48; controls.update()
scene.add(new THREE.HemisphereLight('#f5fbef', '#83a8a0', 2.1))
const sun = new THREE.DirectionalLight('#fff0c4', 2.8)
sun.position.set(-6, 15, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .5, far: 40 })
sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; sun.shadow.radius = 3; scene.add(sun)
const world = new THREE.Group(); world.name = 'sunshower-harbor'; scene.add(world)
const ctx = createHelpers(scene)
const report = { loaded: [], failures: [], frame: 0, revision: 'oneshot', moduleCount: modules.length }
for (const [name, create] of modules) {
  try {
    if (typeof create !== 'function') throw new Error('Missing exported create(ctx)')
    const group = create(ctx)
    if (!group?.isObject3D) throw new Error('create(ctx) must return a THREE.Group')
    group.name = name; world.add(group); report.loaded.push(name)
  } catch (error) { report.failures.push({ name, error: String(error) }); console.error(name, error) }
}
let last = 0
renderer.setAnimationLoop(ms => {
  const t = ms / 1000, dt = Math.min(.05, t - last); last = t
  for (const update of ctx.updates) update(t, dt)
  controls.update(); renderer.render(scene, camera); report.frame++
})
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
window.__sceneQA = { report, camera, controls, scene, renderer, world,
  stats: () => ({ ...report, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures, animatedGroups: ctx.updates.length,
    bounds: new THREE.Box3().setFromObject(world).getSize(new THREE.Vector3()).toArray() }) }
