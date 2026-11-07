// 24-hill.js — 远角绿坡瓦顶民家 (first-pass source module)
// Owned module only; no imports, no default export. A compact green hillside in the
// back-left land corner (x[-5.9,-2.1], z[-5.9,-3.1], apex y=2.2) with three small
// tiled-roof houses on stone terraces, a narrow stepping-stone path, rounded trees,
// bushes and wet rocks. Static source: no renderer was run for this first pass.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = '24-hill'

  // ---- rounded hill body: one squashed dome seated on the concrete land top y=.8 ----
  const hill = { cx: -4.0, cz: -4.5, rx: 1.9, rz: 1.4, ry: 1.4, base: 0.8 }
  const hillY = (x, z) => {
    const dx = (x - hill.cx) / hill.rx
    const dz = (z - hill.cz) / hill.rz
    return hill.base + hill.ry * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz))
  }
  const slopeTilt = (x, z) => {
    const dx = (x - hill.cx) / hill.rx
    const dz = (z - hill.cz) / hill.rz
    const s = Math.sqrt(Math.max(0.04, 1 - dx * dx - dz * dz))
    const tiltX = Math.atan(hill.ry * dz / (hill.rz * s)) * 0.8
    const tiltZ = -Math.atan(hill.ry * dx / (hill.rx * s)) * 0.8
    return [Math.max(-0.6, Math.min(0.6, tiltX)), 0, Math.max(-0.6, Math.min(0.6, tiltZ))]
  }
  const mound = mesh(group, new THREE.SphereGeometry(1, 32, 16), '#7a9f83', [hill.cx, hill.base - 0.02, hill.cz])
  mound.scale.set(hill.rx, hill.ry + 0.02, hill.rz)
  mound.name = 'hill-mound'

  const stone = '#a9b3a7'
  const stoneSeam = '#95a69c'
  const stoneCap = '#c9d0c4'
  const timber = '#625c4c'
  const ridgeColor = '#4c5b5c'
  const gutterColor = '#8d9a94'
  const paneMat = mat('#efe0ae', { emissive: '#a58b4e', emissiveIntensity: 0.45 })

  // ---- small Japanese house on a deep stone terrace (downhill walls never float) ----
  const buildHouse = (spec) => {
    const { x, z, w, d, bodyH, rise, yaw, wall, roof } = spec
    const baseY = hillY(x, z)
    const h = new THREE.Group()
    h.position.set(x, baseY, z)
    h.rotation.y = yaw
    h.name = 'hill-house'
    group.add(h)

    const deep = 0.7 - baseY
    box(h, [w + 0.26, 0.08 - deep, d + 0.26], [0, (0.08 + deep) / 2, 0], stone)
    box(h, [w + 0.27, 0.025, d + 0.27], [0, -0.28, 0], stoneSeam)
    box(h, [w + 0.27, 0.025, d + 0.27], [0, -0.55, 0], stoneSeam)
    box(h, [w + 0.34, 0.05, d + 0.34], [0, 0.105, 0], stoneCap)

    const base = 0.13
    box(h, [w, bodyH, d], [0, base + bodyH / 2, 0], wall)
    const px = w / 2 - 0.028
    const pz = d / 2 - 0.028
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(h, [0.055, bodyH, 0.055], [sx * px, base + bodyH / 2, sz * pz], timber)
      }
    }
    box(h, [w + 0.02, 0.045, 0.03], [0, base + bodyH * 0.8, d / 2 + 0.012], timber)

    // dark sliding door (+z) and four tiny framed windows with warm panes
    box(h, [0.2, bodyH * 0.62, 0.028], [w * 0.26, base + bodyH * 0.31, d / 2 + 0.014], '#4f4a3c')
    box(h, [0.26, 0.05, 0.05], [w * 0.26, base + bodyH * 0.62 + 0.02, d / 2 + 0.02], timber)
    box(h, [0.26, bodyH * 0.38, 0.02], [-w * 0.21, base + bodyH * 0.55, d / 2 + 0.008], timber)
    box(h, [0.2, bodyH * 0.32, 0.026], [-w * 0.21, base + bodyH * 0.55, d / 2 + 0.02], paneMat)
    box(h, [0.014, bodyH * 0.32, 0.03], [-w * 0.21, base + bodyH * 0.55, d / 2 + 0.023], timber)
    box(h, [0.24, bodyH * 0.34, 0.02], [w * 0.2, base + bodyH * 0.55, -d / 2 - 0.008], timber)
    box(h, [0.18, bodyH * 0.28, 0.026], [w * 0.2, base + bodyH * 0.55, -d / 2 - 0.02], paneMat)
    box(h, [0.022, bodyH * 0.32, 0.18], [w / 2 + 0.004, base + bodyH * 0.58, -d * 0.13], timber)
    box(h, [0.026, bodyH * 0.26, 0.13], [w / 2 + 0.012, base + bodyH * 0.58, -d * 0.13], paneMat)
    box(h, [0.022, bodyH * 0.3, 0.15], [-w / 2 - 0.004, base + bodyH * 0.56, d * 0.1], timber)
    box(h, [0.026, bodyH * 0.24, 0.1], [-w / 2 - 0.012, base + bodyH * 0.56, d * 0.1], paneMat)

    // stone doorstep on the terrace cap
    box(h, [0.26, 0.07, 0.16], [w * 0.26, 0.095, d / 2 + 0.1], stoneCap)

    // gabled tiled roof: two slopes, tile bands, ridge cap and gutter/downspout
    const eaveY = base + bodyH + 0.02
    const D = d / 2 + 0.13
    const L = w + 0.28
    const angle = Math.atan2(rise, D)
    const slope = Math.sqrt(D * D + rise * rise)
    const ridgeY = eaveY + rise
    box(h, [L, 0.055, slope], [0, (eaveY + ridgeY) / 2, D / 2], roof, [angle, 0, 0])
    box(h, [L, 0.055, slope], [0, (eaveY + ridgeY) / 2, -D / 2], roof, [-angle, 0, 0])
    for (const f of [0.34, 0.68]) {
      const bandY = eaveY + rise * (1 - f) + 0.032
      box(h, [L, 0.016, 0.045], [0, bandY, D * f], ridgeColor, [angle, 0, 0])
      box(h, [L, 0.016, 0.045], [0, bandY, -D * f], ridgeColor, [-angle, 0, 0])
    }
    box(h, [L + 0.02, 0.07, 0.1], [0, ridgeY + 0.015, 0], ridgeColor)
    box(h, [0.09, 0.11, 0.13], [L / 2 - 0.02, ridgeY + 0.025, 0], ridgeColor)
    box(h, [0.09, 0.11, 0.13], [-L / 2 + 0.02, ridgeY + 0.025, 0], ridgeColor)
    box(h, [L, 0.035, 0.05], [0, eaveY - 0.01, D], gutterColor)
    box(h, [L, 0.035, 0.05], [0, eaveY - 0.01, -D], gutterColor)
    box(h, [0.045, eaveY - 0.02, 0.045], [w / 2 + 0.03, (eaveY + 0.02) / 2, d / 2 + 0.03], gutterColor)
    beam(h, [w / 2 + 0.03, eaveY - 0.02, D - 0.03], [w / 2 + 0.03, eaveY - 0.02, d / 2 + 0.04], 0.03, gutterColor)

    // triangular gable ends tucked under the roof
    const tri = new THREE.Shape()
    tri.moveTo(-d / 2 - 0.01, 0)
    tri.lineTo(d / 2 + 0.01, 0)
    tri.lineTo(0, rise + 0.02)
    tri.closePath()
    const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.045, bevelEnabled: false })
    mesh(h, gableGeo, wall, [-w / 2 - 0.025, base + bodyH, 0], [0, Math.PI / 2, 0])
    mesh(h, gableGeo, wall, [w / 2 - 0.02, base + bodyH, 0], [0, Math.PI / 2, 0])
    return h
  }

  // main house front-left, small house front-right, back house tucked behind
  buildHouse({ x: -4.55, z: -4.0, w: 1.0, d: 0.8, bodyH: 0.44, rise: 0.3, yaw: 0.04, wall: '#e5e0cb', roof: '#5f6f70' })
  buildHouse({ x: -3.05, z: -4.3, w: 0.9, d: 0.75, bodyH: 0.38, rise: 0.25, yaw: -0.04, wall: '#ded9c2', roof: '#586a6b' })
  buildHouse({ x: -4.35, z: -5.15, w: 0.8, d: 0.7, bodyH: 0.36, rise: 0.23, yaw: Math.PI + 0.08, wall: '#e2ddc7', roof: '#627273' })

  // ---- narrow stepped path between the two front houses, climbing to the back house ----
  const pathZ = [-3.6, -3.75, -3.9, -4.05, -4.2, -4.35, -4.5]
  for (let i = 0; i < pathZ.length; i++) {
    const z = pathZ[i]
    box(group, [0.18, 0.05, 0.2], [-3.75, hillY(-3.75, z) + 0.02, z], i % 2 ? '#cfd2c2' : '#c4c9bb', slopeTilt(-3.75, z))
  }

  // ---- rounded layered trees (two of them sway very slightly in the sea wind) ----
  const plantTree = (x, z, s, tint, lightTint) => {
    const t = new THREE.Group()
    t.position.set(x, hillY(x, z) - 0.03, z)
    t.rotation.y = rand() * Math.PI * 2
    group.add(t)
    cylinder(t, 0.035 * s, 0.06 * s, 0.42 * s, [0, 0.21 * s, 0], '#8b7458', 7)
    sphere(t, 0.27 * s, [0, 0.5 * s, 0], tint, 12)
    sphere(t, 0.2 * s, [0.16 * s, 0.4 * s, 0.05 * s], tint, 10)
    sphere(t, 0.19 * s, [-0.15 * s, 0.39 * s, -0.04 * s], tint, 10)
    sphere(t, 0.15 * s, [0.01 * s, 0.62 * s, -0.02 * s], lightTint, 10)
    return t
  }
  plantTree(-5.2, -5.35, 0.68, '#679277', '#7ea98a')
  const swayTrees = [
    plantTree(-5.55, -4.35, 0.78, '#6f9b7f', '#84ae8d'),
    plantTree(-5.6, -3.95, 0.62, '#6f9b7f', '#8fb094')
  ]
  for (let i = 0; i < swayTrees.length; i++) {
    const tree = swayTrees[i]
    animate(tree, (time) => {
      tree.rotation.z = Math.sin(time * 0.6 + i * 1.9) * 0.012
    })
  }

  // ---- rounded bushes on the slope and wet mossy rocks at the hill foot ----
  const bush = (x, z, r, tint) => {
    const b = new THREE.Group()
    b.position.set(x, hillY(x, z) - 0.04, z)
    group.add(b)
    sphere(b, r, [0, r * 0.62, 0], tint, 10)
    sphere(b, r * 0.66, [r * 0.55, r * 0.45, r * 0.12], tint, 9)
    sphere(b, r * 0.6, [-r * 0.5, r * 0.44, -r * 0.1], tint, 9)
    sphere(b, r * 0.44, [r * 0.1, r * 0.9, 0], '#8fb094', 8)
    return b
  }
  bush(-4.95, -3.35, 0.13, '#7aa387')
  bush(-3.35, -3.42, 0.13, '#679277')
  bush(-2.28, -4.2, 0.13, '#7aa387')
  bush(-2.28, -4.85, 0.12, '#8fb094')

  const rock = (x, z, r, tint) => {
    const rk = mesh(group, new THREE.SphereGeometry(1, 10, 7), tint, [x, hillY(x, z) + 0.02, z], [0, 0, 0], false)
    rk.scale.set(r, r * 0.62, r * 0.85)
    return rk
  }
  rock(-3.45, -3.3, 0.17, '#a9b6ab')
  rock(-2.75, -3.55, 0.15, '#9faea4')
  rock(-5.55, -3.85, 0.15, '#a9b6ab')

  return group
}
