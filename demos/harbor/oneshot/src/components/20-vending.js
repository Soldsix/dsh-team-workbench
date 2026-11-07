// 20-vending — softly lit vending machine under a rusty little canopy
// Front quay at x=-5.15, z=4.65, cabinet front faces +z (the camera side).
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, label, animate, rand } = ctx

  const g = new THREE.Group()
  g.name = 'vending-machine'
  g.position.set(-5.15, 0.8, 4.65) // sits on the concrete land top (y=.8)

  const cabinet = '#cfdfe0' // pale blue enamel
  const cabinetDeep = '#aac4c4'
  const rustDark = '#8e6046'
  const glow = mat('#f3eccd', { emissive: '#ffe9a4', emissiveIntensity: 0.34 }) // soft, not a bright face
  const warm = mat(p.gold, { emissive: '#fff1b6', emissiveIntensity: 0.5 })
  const glass = mat(p.glass, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  const wet = mat(p.water, { transparent: true, opacity: 0.4, depthWrite: false })

  // ---- cabinet: plinth, body with rounded verticals, capped top ----
  box(g, [0.60, 0.07, 0.40], [0, 0.035, 0], p.concreteDark)
  box(g, [0.66, 1.24, 0.44], [0, 0.69, 0], cabinet)
  for (const sx of [-1, 1]) for (const sz of [-1, 1])
    cylinder(g, 0.03, 0.03, 1.24, [sx * 0.32, 0.69, sz * 0.196], cabinet, 8)
  box(g, [0.68, 0.05, 0.46], [0, 1.335, 0], p.concreteLight)
  const capEdge = cylinder(g, 0.026, 0.026, 0.66, [0, 1.34, 0.232], p.concreteLight, 10)
  capEdge.rotation.z = Math.PI / 2
  box(g, [0.62, 0.05, 0.02], [0, 0.095, 0.222], p.metal) // kick plate

  // ---- drink window: warm back plate, three shelves of cans, front glass ----
  box(g, [0.37, 0.50, 0.008], [0, 0.90, 0.224], glow, [0, 0, 0], false)
  box(g, [0.44, 0.032, 0.04], [0, 1.18, 0.245], p.concreteLight)
  box(g, [0.44, 0.032, 0.04], [0, 0.62, 0.245], p.concreteLight)
  box(g, [0.035, 0.56, 0.04], [-0.2025, 0.90, 0.245], p.concreteLight)
  box(g, [0.035, 0.56, 0.04], [0.2025, 0.90, 0.245], p.concreteLight)
  const cans = [p.orange, p.blue, p.green, p.yellow, p.rust, p.deep, p.hull]
  const rowsY = [0.70, 0.885, 1.07]
  rowsY.forEach((rowY, row) => {
    box(g, [0.37, 0.014, 0.03], [0, rowY - 0.007, 0.243], cabinetDeep)
    for (let i = 0; i < 5; i++) {
      const x = -0.16 + i * 0.08
      cylinder(g, 0.017, 0.017, 0.05, [x, rowY + 0.025, 0.242], cans[(i + row * 2) % cans.length], 8)
    }
  })
  mesh(g, new THREE.BoxGeometry(0.37, 0.50, 0.006), glass, [0, 0.90, 0.2625])

  // ---- machine header ----
  label(g, 'つめた〜い', 0.34, [0, 1.252, 0.231], [0, 0, 0], '#3d6360', '#f2ecd2')

  // ---- price rows ----
  for (let r = 0; r < 3; r++) {
    const y = 0.575 - r * 0.05
    box(g, [0.30, 0.026, 0.014], [-0.02, y, 0.232], p.concreteLight)
    for (let k = 0; k < 3; k++)
      box(g, [0.034, 0.014, 0.008], [-0.10 + k * 0.10, y, 0.241], p.yellow, [0, 0, 0], false)
  }

  // ---- coin panel ----
  box(g, [0.09, 0.30, 0.012], [0.275, 0.86, 0.226], p.metal)
  box(g, [0.05, 0.05, 0.01], [0.275, 0.945, 0.233], cabinetDeep)
  box(g, [0.034, 0.026, 0.006], [0.275, 0.945, 0.239], warm, [0, 0, 0], false)
  box(g, [0.026, 0.07, 0.008], [0.275, 0.885, 0.235], p.dark)
  box(g, [0.010, 0.05, 0.010], [0.275, 0.885, 0.240], p.deep, [0, 0, 0], false)
  const coinReturn = cylinder(g, 0.016, 0.016, 0.014, [0.275, 0.80, 0.238], p.orange, 10)
  coinReturn.rotation.x = Math.PI / 2
  box(g, [0.05, 0.026, 0.012], [0.275, 0.752, 0.232], p.dark, [0, 0, 0], false)

  // ---- pickup flap ----
  box(g, [0.30, 0.15, 0.012], [0, 0.30, 0.224], p.dark, [0, 0, 0], false)
  box(g, [0.32, 0.03, 0.034], [0, 0.236, 0.233], p.concreteLight, [-0.3, 0, 0])
  box(g, [0.26, 0.02, 0.008], [0, 0.352, 0.226], p.metal)

  // ---- vent grille, lower left of the door ----
  for (let k = 0; k < 4; k++)
    box(g, [0.07, 0.008, 0.006], [-0.255, 0.42 + k * 0.03, 0.226], p.dark, [0, 0, 0], false)

  // ---- tiny rusty rain canopy with warm under-light ----
  box(g, [0.84, 0.04, 0.60], [0, 1.45, 0.04], p.rust, [0.08, 0, 0])
  box(g, [0.84, 0.022, 0.03], [0, 1.416, 0.338], p.metal, [0.08, 0, 0])
  box(g, [0.56, 0.02, 0.05], [0, 1.425, 0.18], warm, [0.08, 0, 0], false)
  beam(g, [-0.30, 1.335, 0.17], [-0.30, 1.412, 0.30], 0.018, p.metal)
  beam(g, [0.30, 1.335, 0.17], [0.30, 1.412, 0.30], 0.018, p.metal)
  box(g, [0.12, 0.006, 0.10], [-0.24, 1.462, 0.16], rustDark, [0.08, 0, 0], false)
  box(g, [0.08, 0.006, 0.07], [0.18, 1.469, 0.05], rustDark, [0.08, 0, 0], false)

  // ---- rust drips down the canopy edge and the cabinet front ----
  for (const dx of [-0.32, -0.13, 0.08, 0.28]) {
    const len = 0.04 + rand() * 0.05
    box(g, [0.012, len, 0.010], [dx, 1.418 - len / 2, 0.338], rustDark, [0, 0, 0], false)
  }
  box(g, [0.014, 0.20, 0.006], [-0.272, 1.20, 0.226], rustDark, [0, 0, 0], false)
  box(g, [0.010, 0.12, 0.006], [0.272, 1.24, 0.226], rustDark, [0, 0, 0], false)
  box(g, [0.10, 0.024, 0.008], [0.19, 0.09, 0.235], rustDark, [0, 0, 0], false)

  // ---- ground: wet puddle and a small drainage grate ----
  cylinder(g, 0.20, 0.22, 0.008, [-0.02, 0.006, 0.44], wet, 18)
  box(g, [0.30, 0.016, 0.20], [0.03, 0.012, 0.47], p.metal)
  box(g, [0.26, 0.010, 0.16], [0.03, 0.021, 0.47], p.dark, [0, 0, 0], false)
  for (let k = 0; k < 6; k++)
    box(g, [0.022, 0.008, 0.16], [-0.095 + k * 0.05, 0.027, 0.47], p.concreteLight, [0, 0, 0], false)

  // ---- beaded rain on the canopy edge, one drop let go ----
  sphere(g, 0.010, [-0.32, 1.399, 0.339], p.gold, 6)
  sphere(g, 0.009, [0.28, 1.400, 0.339], p.gold, 6)
  const drop = sphere(g, 0.013, [-0.13, 1.40, 0.33], p.gold, 8)
  animate(drop, (t) => {
    const span = 3.6
    const k = (t % span) / span
    const fall = Math.min(1, k / 0.8)
    drop.visible = k < 0.84
    drop.position.y = 1.40 - 0.36 * fall * fall
  })

  return g
}
