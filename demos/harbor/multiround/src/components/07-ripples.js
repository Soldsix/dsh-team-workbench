// 07-ripples.js — fine rain rings on the harbour water and a few shallow puddles on the quay.
// Owns only these two effects; never touches the water slab, quay, boats or other artists' modules.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '07-ripples'
  group.userData.part = 'water rings + quay puddles'

  // Shared thin ring for every expanding ripple: 32 water + 8 puddle = 40 ring objects, under the 45 cap.
  const ringGeometry = new THREE.RingGeometry(0.89, 1, 26, 1)
  const discGeometry = new THREE.CircleGeometry(1, 26)
  const rings = []

  const addRing = (x, y, z, maxRadius, duration, active, peak, color) => {
    const material = new THREE.MeshBasicMaterial({
      color, transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide,
    })
    const node = mesh(group, ringGeometry, material, [x, y, z], [-Math.PI / 2, 0, 0], false)
    node.name = 'rain-ring'
    rings.push({ node, material, maxRadius, duration, active, peak, offset: rand() * duration })
    return node
  }

  // --- Water: scattered fine rings in the permitted water footprint x[-1.7,6] z[-6,2.4] ---
  const waterBeds = [
    { xa: -1.45, xb: 0.9, za: -1.6, zb: 2.1, n: 6, r: 0.22, R: 0.38, ring: 2.6 },
    { xa: 0.4, xb: 4.2, za: -0.4, zb: 2.2, n: 8, r: 0.2, R: 0.44, ring: 3.0 },
    { xa: 1.0, xb: 5.7, za: -3.4, zb: -0.4, n: 8, r: 0.24, R: 0.5, ring: 3.4 },
    { xa: 2.4, xb: 5.8, za: -5.6, zb: -3.4, n: 6, r: 0.28, R: 0.58, ring: 4.0 },
    { xa: -1.4, xb: 1.6, za: -4.9, zb: -2.4, n: 4, r: 0.24, R: 0.42, ring: 3.1 },
  ]
  const waterTints = [p.foam, '#c2e5dc', '#a9d8d0', '#eef2da', '#d5eae7', '#b4ddd6']
  const lerp = (a, b, t) => a + (b - a) * t

  for (const bed of waterBeds) {
    for (let i = 0; i < bed.n; i++) {
      const x = Math.min(5.85, Math.max(-1.6, lerp(bed.xa, bed.xb, rand())))
      const z = Math.min(2.25, Math.max(-5.75, lerp(bed.za, bed.zb, rand())))
      const radius = lerp(bed.r, bed.R, rand())
      const gold = rand() < 0.12
      addRing(
        x, 0.165 + rand() * 0.006, z,
        radius,
        lerp(bed.ring, bed.ring + 1.7, rand()),
        lerp(0.55, 0.92, rand()),
        gold ? 0.14 : lerp(0.18, 0.34, rand()),
        gold ? p.gold : waterTints[(i + bed.n) % waterTints.length]
      )
    }
  }

  // --- Quay puddles: low-opacity films on the concrete top y=.8, never giant opaque discs ---
  const puddles = []
  const addPuddle = (x, z, rx, rz, turn) => {
    const rim = mesh(group, discGeometry, mat(p.concreteDark, { transparent: true, opacity: 0.17, depthWrite: false }),
      [x, 0.8115, z], [-Math.PI / 2, 0, turn], false)
    rim.scale.set(rx * 1.24, rz * 1.2, 1)
    rim.name = 'puddle-damp-rim'

    const filmMaterial = new THREE.MeshBasicMaterial({
      color: '#a8d7cf', transparent: true, opacity: 0.3, depthWrite: false, side: THREE.DoubleSide,
    })
    const film = mesh(group, discGeometry, filmMaterial, [x, 0.8135, z], [-Math.PI / 2, 0, turn], false)
    film.scale.set(rx, rz, 1)
    film.name = 'puddle-film'

    const deep = mesh(group, discGeometry, new THREE.MeshBasicMaterial({
      color: p.deep, transparent: true, opacity: 0.16, depthWrite: false,
    }), [x + rx * 0.18, 0.8145, z + rz * 0.22], [-Math.PI / 2, 0, turn], false)
    deep.scale.set(rx * 0.5, rz * 0.42, 1)

    const sheenMaterial = new THREE.MeshBasicMaterial({
      color: '#eaf5e7', transparent: true, opacity: 0.34, depthWrite: false,
    })
    const sheen = mesh(group, discGeometry, sheenMaterial, [x - rx * 0.22, 0.8155, z - rz * 0.18],
      [-Math.PI / 2, 0, turn], false)
    sheen.scale.set(rx * 0.55, rz * 0.45, 1)
    sheen.name = 'puddle-sky-sheen'

    // Posterised reflection chips: ivory hull streak, warm lamp glint, cool gull grey.
    const chipSpecs = [
      [x - rx * 0.1, z + rz * 0.05, rx * 0.58, rz * 0.09, '#e9f2e2', 0.26],
      [x + rx * 0.3, z - rz * 0.2, rx * 0.28, rz * 0.07, p.gold, 0.2],
      [x - rx * 0.42, z - rz * 0.28, rx * 0.17, rz * 0.055, '#b8c9c4', 0.16],
    ]
    const chips = []
    const chipBase = []
    for (let c = 0; c < chipSpecs.length; c++) {
      const spec = chipSpecs[c]
      chips.push(new THREE.MeshBasicMaterial({
        color: spec[4], transparent: true, opacity: spec[5], depthWrite: false,
      }))
      chipBase.push(spec[5])
      box(group, [spec[2], 0.004, spec[3]], [spec[0], 0.8162, spec[1]], chips[c], [0, turn + 0.35 + c * 0.5, 0], false)
    }

    // One or two small rings living inside the puddle film.
    addRing(x + rx * 0.12, 0.819, z - rz * 0.08, Math.min(rx, rz) * 0.78, 1.5 + rand() * 0.7, 0.5 + rand() * 0.3,
      0.3, '#f1f6e6')
    if (rx > 0.45) {
      addRing(x - rx * 0.24, 0.8192, z + rz * 0.16, Math.min(rx, rz) * 0.52, 1.3 + rand() * 0.6,
        0.45 + rand() * 0.3, 0.26, '#d7efe4')
    }

    puddles.push({ film: filmMaterial, sheen: sheenMaterial, chips, chipBase, phase: rand() * Math.PI * 2 })
  }

  addPuddle(-2.75, 3.55, 0.58, 0.34, 0.45)
  addPuddle(-4.45, 4.7, 0.5, 0.39, 1.15)
  addPuddle(-0.85, 4.3, 0.44, 0.3, 0.2)
  addPuddle(0.95, 5.4, 0.4, 0.27, 1.85)
  addPuddle(-3.85, 5.3, 0.46, 0.26, 2.35)

  // --- Single animation registration: rings grow and fade, puddle films breathe. ---
  animate(group, (time) => {
    for (let i = 0; i < rings.length; i++) {
      const r = rings[i]
      const cycle = ((time + r.offset) % r.duration) / r.duration
      if (cycle < r.active) {
        const k = cycle / r.active
        r.node.visible = true
        r.node.scale.setScalar(r.maxRadius * (0.06 + 0.94 * k))
        r.material.opacity = r.peak * Math.pow(1 - k, 1.6)
      } else {
        r.node.visible = false
        r.material.opacity = 0
      }
    }
    for (let q = 0; q < puddles.length; q++) {
      const pud = puddles[q]
      pud.film.opacity = 0.27 + 0.05 * Math.sin(time * 0.85 + pud.phase)
      pud.sheen.opacity = 0.33 + 0.08 * Math.sin(time * 1.15 + pud.phase * 1.6)
      for (let c = 0; c < pud.chips.length; c++) {
        pud.chips[c].opacity = pud.chipBase[c] + 0.045 * Math.sin(time * 0.7 + pud.phase + c * 2.1)
      }
    }
  })

  return group
}
