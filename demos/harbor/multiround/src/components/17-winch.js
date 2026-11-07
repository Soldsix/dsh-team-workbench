// 17-winch.js — 手摇绞盘小吊杆 / weathered hand-crank winch with a slim jib.
// Owner: artist-17-winch. Anchor x=-2.8, z=1.2 on the left concrete quay (top y=0.8);
// jib reaches out over the water to world x=-1.10, z=0.80. First-pass source only.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = 'winch-17'
  group.position.set(-2.8, 0.8, 1.2)

  // local builders used by this module only
  const disc = (parent, r, len, position, color, seg = 16) =>
    mesh(parent, new THREE.CylinderGeometry(r, r, len, seg), color, position, [Math.PI / 2, 0, 0])
  const stud = (parent, position, color = p.metal, r = 0.014, h = 0.022) =>
    mesh(parent, new THREE.CylinderGeometry(r, r, h, 6), color, position, [Math.PI / 2, 0, 0])

  // -- worn concrete footing ----------------------------------------------------
  box(group, [0.86, 0.1, 0.8], [0.02, 0.05, 0], p.concrete)
  box(group, [0.7, 0.035, 0.64], [0.0, 0.115, 0], p.concreteLight)
  box(group, [0.22, 0.028, 0.006], [0.2, 0.035, 0.401], p.concreteDark, [0, 0, 0], false)
  for (const sx of [-0.31, 0.31]) for (const sz of [-0.31, 0.31]) {
    cylinder(group, 0.021, 0.024, 0.04, [sx, 0.13, sz], p.metal, 8)
    sphere(group, 0.02, [sx, 0.155, sz], p.rust, 8)
  }

  // -- rusted ochre frame: twin side plates, feet, bolt rows --------------------
  for (const s of [-1, 1]) {
    box(group, [0.6, 0.62, 0.045], [0, 0.45, s * 0.25], p.rust)
    box(group, [0.66, 0.05, 0.1], [0, 0.145, s * 0.25], p.rust)
    box(group, [0.52, 0.045, 0.055], [0, 0.754, s * 0.25], '#9a6c4e')
    for (const bx of [-0.225, 0.225]) for (const by of [0.235, 0.665]) stud(group, [bx, by, s * 0.276])
    for (const bx of [-0.24, 0.24]) stud(group, [bx, 0.145, s * 0.301], p.rust)
    // rain streaks, rust bleed and chipped paint as flat decals (no ink on decals)
    box(group, [0.012, 0.26, 0.004], [-0.17, 0.56, s * 0.2745], p.rust, [0, 0, 0], false)
    box(group, [0.02, 0.15, 0.004], [0.21, 0.6, s * 0.2745], '#8d6647', [0, 0, 0], false)
    box(group, [0.05, 0.03, 0.004], [0.1, 0.31, s * 0.2745], p.orange, [0, 0, 0], false)
  }
  box(group, [0.1, 0.06, 0.56], [0.16, 0.79, 0], p.rust)         // front top crossbar (post seat)
  box(group, [0.13, 0.055, 0.52], [-0.2, 0.785, 0], p.rust)      // rear top bar (stay anchor)
  box(group, [0.42, 0.055, 0.44], [0, 0.18, 0], p.rust)          // lower spreader

  // faded painted serial plate on the near-side plate
  box(group, [0.25, 0.1, 0.008], [0.055, 0.6, 0.2775], p.concreteLight)
  label(group, '手巻 W-17', 0.22, [0.055, 0.6, 0.284])

  // -- winding drum: flanges, layered cable coils, big gear ---------------------
  const drum = new THREE.Group()
  drum.position.set(0, 0.5, 0)
  group.add(drum)
  disc(drum, 0.135, 0.34, [0, 0, 0], p.metal, 18)                // drum body
  disc(drum, 0.034, 0.57, [0, 0, 0], p.metal, 12)                // axle through both plates
  for (const s of [-1, 1]) disc(drum, 0.186, 0.032, [0, 0, s * 0.176], p.rust, 20)
  for (let i = 0; i < 7; i++) disc(drum, 0.149 + (i % 2) * 0.005, 0.032, [0, 0, -0.12 + i * 0.04], '#8a6a48', 20)
  disc(drum, 0.186, 0.036, [0, 0, -0.31], p.metal, 22)           // big gear web
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2
    box(drum, [0.05, 0.052, 0.036], [Math.cos(a) * 0.198, Math.sin(a) * 0.198, -0.31], p.rust, [0, 0, a])
  }
  sphere(drum, 0.03, [0, 0, 0.2], p.gold, 8)                     // grease cap

  // -- gear reduction, crank pinion and wooden handle ---------------------------
  const crank = new THREE.Group()
  crank.position.set(-0.29, 0.39, -0.31)
  group.add(crank)
  disc(crank, 0.085, 0.03, [0, 0, 0], p.metal, 18)               // pinion web
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2
    box(crank, [0.03, 0.036, 0.03], [Math.cos(a) * 0.094, Math.sin(a) * 0.094, 0], p.rust, [0, 0, a])
  }
  disc(crank, 0.022, 0.22, [0, 0, -0.1], p.metal, 10)            // crank axle
  beam(crank, [0, 0, -0.205], [0, -0.19, -0.205], 0.05, p.metal) // crank arm
  mesh(crank, new THREE.CylinderGeometry(0.028, 0.028, 0.15, 10), p.rope, [0, -0.185, -0.275], [Math.PI / 2, 0, 0])
  sphere(crank, 0.026, [0, -0.185, -0.205], p.gold, 8)           // handle ferrule
  box(group, [0.1, 0.1, 0.045], [-0.29, 0.39, -0.272], p.metal)  // bearing boss
  beam(group, [0.285, 0.285, -0.31], [0.195, 0.365, -0.31], 0.028, p.rust) // ratchet pawl
  stud(group, [0.285, 0.285, -0.295], p.gold, 0.016, 0.05)
  curve(group, [[0.285, 0.285, -0.275], [0.24, 0.31, -0.262], [0.21, 0.35, -0.28]], p.gold, 0.006)

  // -- king post, pivot ears and cable guide roller -----------------------------
  box(group, [0.09, 0.32, 0.09], [0.16, 0.95, 0], p.rust)
  box(group, [0.14, 0.05, 0.2], [0.18, 0.815, 0], '#9a6c4e')
  beam(group, [0.16, 0.81, -0.24], [0.16, 1.04, -0.03], 0.032, p.rust)
  beam(group, [0.16, 0.81, 0.24], [0.16, 1.04, 0.03], 0.032, p.rust)
  for (const s of [-1, 1]) box(group, [0.07, 0.13, 0.03], [0.16, 1.16, s * 0.075], p.rust)
  disc(group, 0.018, 0.23, [0.16, 1.16, 0], p.gold, 10)          // pivot pin
  sphere(group, 0.023, [0.16, 1.16, 0.118], p.gold, 8)
  disc(group, 0.032, 0.07, [0.22, 0.955, 0.1], p.metal, 12)      // guide roller (cable sits over it)
  disc(group, 0.013, 0.09, [0.22, 0.955, 0.1], p.gold, 8)
  for (const s of [-1, 1]) box(group, [0.05, 0.075, 0.02], [0.22, 0.955, 0.1 + s * 0.045], p.rust)

  // -- slim lattice jib: pivot (0.16,1.16,0) to tip (1.70,1.475,-0.40) ----------
  const A1 = [0.16, 1.16, 0], B1 = [1.7, 1.46, -0.4]
  const A2 = [0.16, 1.3, 0], B2 = [1.7, 1.49, -0.4]
  beam(group, A1, B1, 0.05, p.rust)                              // lower chord
  beam(group, A2, B2, 0.034, p.rust)                             // upper chord
  const v1 = new THREE.Vector3(...A1), v2 = new THREE.Vector3(...B1)
  const w1 = new THREE.Vector3(...A2), w2 = new THREE.Vector3(...B2)
  const at = (a, b, f) => a.clone().lerp(b, f).toArray()
  for (let i = 1; i <= 4; i++) beam(group, at(v1, v2, i / 5), at(w1, w2, i / 5), 0.016, p.rust)
  for (let i = 0; i <= 3; i++) beam(group, at(v1, v2, i / 5), at(w1, w2, (i + 1) / 5), 0.013, p.rust)
  box(group, [0.16, 0.13, 0.032], [1.66, 1.475, -0.4], p.metal)  // head gusset
  disc(group, 0.07, 0.026, [1.7, 1.475, -0.442], p.metal, 16)     // sheave cheeks
  disc(group, 0.07, 0.026, [1.7, 1.475, -0.358], p.metal, 16)
  disc(group, 0.019, 0.12, [1.7, 1.475, -0.4], p.gold, 10)       // sheave pin
  curve(group, [[-0.22, 0.8, 0.1], [0.1, 0.95, 0.1], [0.35, 1.12, 0.02], [0.5, 1.226, -0.088]], p.metal, 0.008)
  curve(group, [[-0.22, 0.8, -0.1], [0.12, 0.96, -0.1], [0.35, 1.12, -0.02], [0.5, 1.226, -0.088]], p.metal, 0.007)

  // -- hoist cable: off the drum, over the guide roller, under the jib ---------
  curve(group, [[0, 0.665, 0.04], [0.13, 0.925, 0.1], [0.22, 0.998, 0.1],
    [0.58, 1.205, -0.11], [1.1, 1.306, -0.25], [1.52, 1.388, -0.35], [1.64, 1.445, -0.4]], p.metal, 0.011)

  // -- hanging cable + rusty hook block (above the water, far above the seabed) -
  const hook = new THREE.Group()
  hook.position.set(1.7, 1.475, -0.4)
  group.add(hook)
  curve(hook, [[0, 0, 0], [0.014, -0.6, 0.006], [-0.008, -1.2, -0.006], [0, -1.73, 0]], p.metal, 0.011)
  box(hook, [0.09, 0.12, 0.055], [0, -1.8, 0], p.rust)           // hook block
  disc(hook, 0.02, 0.08, [0, -1.745, 0], p.gold, 10)             // shackle pin
  disc(hook, 0.03, 0.05, [0, -1.865, 0], p.metal, 10)            // swivel
  curve(hook, [[0, -1.89, 0], [0, -2.01, 0], [0.05, -2.07, 0], [0.1, -2.03, 0], [0.1, -1.95, 0]], p.metal, 0.017)
  curve(hook, [[0.04, -2.02, 0], [0.1, -1.93, 0.03], [0.07, -1.79, 0.015]], p.orange, 0.014) // frayed rope tail

  // -- gentle idle motion: drum/crank turn slowly, the paid-out hook sways -----
  animate(group, (time) => {
    drum.rotation.z = time * 0.35
    crank.rotation.z = -time * 0.49
    hook.rotation.z = Math.sin(time * 0.8) * 0.035
    hook.rotation.x = Math.sin(time * 0.53 + 0.7) * 0.018
  })

  return group
}
