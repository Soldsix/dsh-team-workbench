import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'
import { createHelpers } from './helpers.js'
import { modules } from './components/index.js'

// Round 2 render setup. The r1 screenshots read as one very bright ivory field:
// the sunlit concrete, the boat hulls and the water all sat near the top of the
// tone curve, so form and hue barely separated. Exposure and the light rig are
// pulled back and split warm/cool; the palette itself is untouched so every
// module keeps its authored sea-glass / high-key colours.
const scene = new THREE.Scene()
scene.background = new THREE.Color('#e2f0eb')
scene.fog = new THREE.Fog('#e2f0eb', 30, 70)
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5)); renderer.setSize(innerWidth, innerHeight)
renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping
renderer.toneMappingExposure = 1.05
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.append(renderer.domElement)
const camera = new THREE.PerspectiveCamera(34, innerWidth / innerHeight, .1, 120)
camera.position.set(15, 12.5, 17)
const controls = new OrbitControls(camera, renderer.domElement)
controls.target.set(0, .5, 0); controls.enableDamping = true; controls.dampingFactor = .055
controls.minDistance = 7; controls.maxDistance = 43; controls.maxPolarAngle = Math.PI * .48; controls.update()

// Warm key sun, cool sky dome and a cyan counter-fill: sunlit faces stay warm
// ivory, shaded faces read as sea-glass instead of washing toward white.
scene.add(new THREE.HemisphereLight('#f1fbf2', '#4f7d7b', 1.15))
const sun = new THREE.DirectionalLight('#fff0c6', 1.7)
sun.position.set(-6, 15, 8); sun.castShadow = true; sun.shadow.mapSize.set(2048, 2048)
Object.assign(sun.shadow.camera, { left: -10, right: 10, top: 10, bottom: -10, near: .5, far: 40 })
sun.shadow.bias = -.0003; sun.shadow.normalBias = .035; sun.shadow.radius = 3; scene.add(sun)
const sunBaseline = sun.intensity
const fill = new THREE.DirectionalLight('#cbe4ea', .38)
fill.position.set(11, 6, -9); scene.add(fill)

const report = { loaded: [], failures: [], frame: 0, revision: 'round2', moduleCount: modules.length, batch: null }
let active = null
const qa = {
  report, camera, controls, scene, renderer, world: null,
  stats: () => ({ ...report, drawCalls: renderer.info.render.calls, triangles: renderer.info.render.triangles,
    geometries: renderer.info.memory.geometries, textures: renderer.info.memory.textures,
    animatedGroups: active ? active.updates.length : 0,
    bounds: new THREE.Box3().setFromObject(qa.world).getSize(new THREE.Vector3()).toArray() })
}

// Rebuildable world: batching only ever runs after every module has been
// created, and `rebuild({ batching: false })` restores the unbatched scene if a
// future component turns out to animate something the static pass froze.
const build = (options = {}) => {
  if (qa.world) scene.remove(qa.world)
  sun.intensity = sunBaseline
  const world = new THREE.Group(); world.name = 'sunshower-harbor'; scene.add(world); qa.world = world
  const ctx = createHelpers(scene); active = ctx
  report.loaded = []; report.failures = []
  for (const [name, create] of modules) {
    try {
      if (typeof create !== 'function') throw new Error('Missing exported create(ctx)')
      const group = create(ctx)
      if (!group?.isObject3D) throw new Error('create(ctx) must return a THREE.Group')
      group.name = name; world.add(group); report.loaded.push(name)
    } catch (error) { report.failures.push({ name, error: String(error) }); console.error(name, error) }
  }
  report.batch = options.batching === false ? { ok: false, disabled: true } : ctx.batchStatic(world)
  if (!report.batch.ok) console.warn('static batching skipped, authored scene kept as-is:', report.batch)
  return world
}
qa.rebuild = options => build(options)
build()

let last = 0
renderer.setAnimationLoop(ms => {
  const t = ms / 1000, dt = Math.min(.05, t - last); last = t
  for (const update of active.updates) update(t, dt)
  controls.update(); renderer.render(scene, camera); report.frame++
})
addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight) })
window.__sceneQA = qa
