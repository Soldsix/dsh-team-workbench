// 30-fish — underwater seaweed clumps and a few small pale blue-gold fish.
// Owns only this file. Everything stays inside the water footprint
// x[-1.7,6], z[-6,2.4], below the water top; no duplicate water/seabed slab.
// Source-only first pass: no imports, no renderer, no UI, no other file writes.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '30-fish-underwater'

  // ------------------------------------------------------------ seaweed clumps
  // thin teal blades rooted on the seabed at y = -1.48, gently swaying
  const bladeColors = ['#3d7d77', '#4f9184', '#69aa93', '#2f6a6b']

  const growBlade = (cluster, length, width, color) => {
    const facing = rand() * Math.PI * 2
    const reach = 0.02 + rand() * 0.16
    const pivot = new THREE.Group()
    pivot.position.set(Math.cos(facing) * reach, 0, Math.sin(facing) * reach)
    const baseX = (rand() - 0.5) * 0.3
    const baseZ = (rand() - 0.5) * 0.5
    pivot.rotation.set(baseX, facing, baseZ)
    cluster.add(pivot)

    // two flattened tapering sections give each blade a soft bend
    const lowerHeight = length * 0.56
    const lower = cylinder(pivot, width * 0.5, width, lowerHeight, [0, lowerHeight / 2, 0], color, 5)
    lower.scale.z = 0.42

    const knee = new THREE.Group()
    knee.position.y = lowerHeight
    knee.rotation.z = 0.16 + (rand() - 0.5) * 0.44
    pivot.add(knee)

    const upperHeight = length * 0.44
    const upper = cylinder(knee, width * 0.24, width * 0.52, upperHeight, [0, upperHeight / 2, 0], color, 5)
    upper.scale.z = 0.42

    return { pivot, baseX, baseZ, phase: rand() * Math.PI * 2, swing: 0.045 + rand() * 0.035 }
  }

  const layout = [
    [2.35, -2.15, 5, 1.15],
    [4.55, 0.45, 4, 0.95],
    [1.05, -0.65, 4, 0.85],
    [3.65, -3.35, 5, 1.3],
    [5.15, -2.35, 3, 0.9],
    [0.25, -4.6, 4, 1.05],
  ]

  const beds = []
  for (let b = 0; b < layout.length; b++) {
    const x = layout[b][0]
    const z = layout[b][1]
    const count = layout[b][2]
    const scale = layout[b][3]
    const cluster = new THREE.Group()
    cluster.name = '30-fish-kelp'
    cluster.position.set(x, -1.48, z)
    cluster.rotation.y = rand() * Math.PI * 2
    group.add(cluster)

    // low holdfast stones so each clump reads as one settled plant
    for (let s = 0; s < 2; s++) {
      const stone = sphere(cluster, (0.032 + rand() * 0.03) * scale,
        [(rand() - 0.5) * 0.18, 0.014, (rand() - 0.5) * 0.18],
        s ? p.concreteDark : '#7c9b93', 6)
      stone.scale.set(1.15, 0.45, 0.9)
    }

    const strands = []
    for (let i = 0; i < count; i++) {
      const length = (0.24 + rand() * 0.32) * scale
      const width = 0.011 + rand() * 0.009
      strands.push(growBlade(cluster, length, width, bladeColors[i % bladeColors.length]))
    }
    beds.push({ cluster, strands, phase: rand() * Math.PI * 2 })
  }

  for (let b = 0; b < beds.length; b++) {
    const bed = beds[b]
    // one update per clump; every blade is driven from its stored base rotation
    animate(bed.cluster, (t) => {
      bed.cluster.rotation.z = Math.sin(t * 0.42 + bed.phase) * 0.013
      bed.cluster.rotation.x = Math.cos(t * 0.35 + bed.phase) * 0.01
      for (let i = 0; i < bed.strands.length; i++) {
        const strand = bed.strands[i]
        strand.pivot.rotation.x = strand.baseX + Math.cos(t * 0.72 + strand.phase) * strand.swing * 0.7
        strand.pivot.rotation.z = strand.baseZ + Math.sin(t * 0.88 + strand.phase) * strand.swing
      }
    })
  }

  // ------------------------------------------------------------ small fishes
  const bodyGeo = new THREE.SphereGeometry(0.045, 9, 7)
  const tailGeo = new THREE.ConeGeometry(0.06, 0.115, 4)
  const glintGeo = new THREE.SphereGeometry(0.011, 6, 5)
  const glintMat = new THREE.MeshBasicMaterial({ color: p.gold })
  const bodyColors = ['#b9d6d8', '#aaccd3', '#ded5aa', '#c7d8cf']
  const finColors = ['#ecd9a4', '#e5d3a2', '#f4e8c2', '#e0e8d4']

  // closed elliptical swim loops, all corners kept well inside the water box
  const schools = [
    { cx: 1.65, cz: -0.35, rx: 0.72, rz: 0.58, y: -0.55, bob: 0.035, speed: 0.62, phase: 0.2, size: 0.95 },
    { cx: 3.05, cz: 0.85, rx: 0.62, rz: 0.5, y: -0.66, bob: 0.03, speed: 0.5, phase: 1.45, size: 1.12 },
    { cx: 4.3, cz: -0.9, rx: 0.58, rz: 0.66, y: -0.47, bob: 0.03, speed: 0.72, phase: 2.5, size: 0.88 },
    { cx: 2.6, cz: -2.55, rx: 0.85, rz: 0.7, y: -0.84, bob: 0.04, speed: 0.46, phase: 3.7, size: 1.05 },
    { cx: 1.15, cz: -3.4, rx: 0.6, rz: 0.78, y: -0.73, bob: 0.035, speed: 0.58, phase: 4.4, size: 0.93 },
    { cx: 3.9, cz: -3.7, rx: 0.75, rz: 0.6, y: -0.99, bob: 0.04, speed: 0.4, phase: 5.25, size: 1.18 },
    { cx: 5.0, cz: -2.0, rx: 0.45, rz: 0.85, y: -0.89, bob: 0.035, speed: 0.54, phase: 0.9, size: 0.9 },
    { cx: 1.9, cz: -1.25, rx: 1.1, rz: 0.8, y: -0.45, bob: 0.03, speed: 0.38, phase: 2.05, size: 1.0 },
    { cx: 2.85, cz: -4.6, rx: 0.95, rz: 0.48, y: -0.98, bob: 0.04, speed: 0.44, phase: 3.15, size: 0.86 },
    { cx: 0.35, cz: -1.8, rx: 0.85, rz: 0.6, y: -0.79, bob: 0.035, speed: 0.5, phase: 5.9, size: 1.08 },
  ]

  const buildFish = (spec, index) => {
    const fish = new THREE.Group()
    fish.position.set(spec.cx, spec.y, spec.cz)
    fish.scale.setScalar(spec.size)
    group.add(fish)

    const rig = new THREE.Group()
    fish.add(rig)

    const bodyColor = bodyColors[index % bodyColors.length]
    const finColor = finColors[index % finColors.length]

    // slender body: stretched low-poly sphere reads as a tiny fish at this scale
    const body = mesh(rig, bodyGeo, bodyColor, [0, 0, 0], [0, 0, 0], false)
    body.scale.set(2.45, 1, 0.8)

    // tail fin on its own pivot so it can swish left and right
    const tailPivot = new THREE.Group()
    tailPivot.position.set(-0.104, 0, 0)
    rig.add(tailPivot)
    const tail = mesh(tailPivot, tailGeo, finColor, [-0.05, 0, 0], [0, 0, Math.PI / 2], false)
    tail.scale.z = 0.2

    box(rig, [0.05, 0.026, 0.005], [-0.014, 0.046, 0], finColor, [0, 0, -0.34], false)
    box(rig, [0.016, 0.014, 0.004], [0.02, -0.014, 0.033], finColor, [0, 0.6, 0], false)
    box(rig, [0.016, 0.014, 0.004], [0.02, -0.014, -0.033], finColor, [0, -0.6, 0], false)

    sphere(rig, 0.0095, [0.08, 0.012, 0.028], '#2f4b4f', 6)
    sphere(rig, 0.0095, [0.08, 0.012, -0.028], '#2f4b4f', 6)

    // sparse sun glints on a few fish only
    const glint = index % 3 === 0 ? mesh(rig, glintGeo, glintMat, [0.032, 0.02, 0.022], [0, 0, 0], false) : null

    const tailSpeed = 4.6 + spec.speed * 3
    animate(fish, (t) => {
      const a = t * spec.speed + spec.phase
      const dx = -spec.rx * Math.sin(a)
      const dz = spec.rz * Math.cos(a)
      fish.position.x = spec.cx + spec.rx * Math.cos(a)
      fish.position.z = spec.cz + spec.rz * Math.sin(a)
      fish.position.y = spec.y + Math.sin(t * 1.05 + spec.phase * 2.1) * spec.bob
      fish.rotation.y = Math.atan2(-dz, dx)
      rig.rotation.x = Math.sin(a * 2 + 0.6) * 0.2
      rig.rotation.z = Math.cos(t * 1.05 + spec.phase * 2.1) * 0.09
      tailPivot.rotation.y = Math.sin(t * tailSpeed + spec.phase) * 0.52
      if (glint) {
        const flash = Math.max(0, Math.sin(t * 0.9 + spec.phase * 3.3))
        glint.scale.setScalar(flash * flash * flash * 1.7)
      }
    })
  }

  schools.forEach(buildFish)

  return group
}
