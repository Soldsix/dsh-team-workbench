// 24-hill.js — 远角绿坡瓦顶民家 (round 2, revised after reading the real r1 views)
// Owned module only; no imports, no default export.
// Kept from the first pass: the compact back-left green hill, three stepped tiled
// roofs, narrow stone path, rounded trees/bushes/rocks, gentle sway animation.
// Revised after hero.png / reverse.png / interiors.png: smaller, lower house cluster;
// stone bases fitted to the lowest footprint corner so the reverse view no longer
// shows a tall pale plinth wall; softer clear teal-green layered palette. Static
// source only: this revision was not rendered or built here.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = '24-hill'

  // ---- compact rounded hill, footprint x[-5.85,-2.15] z[-5.86,-3.14], apex y=2.10 ----
  const hill = { cx: -4.0, cz: -4.5, rx: 1.85, rz: 1.36, ry: 1.3, base: 0.8 }
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
  const mound = mesh(group, new THREE.SphereGeometry(1, 30, 14), '#8fb5a6', [hill.cx, hill.base - 0.02, hill.cz])
  mound.scale.set(hill.rx, hill.ry + 0.02, hill.rz)
  mound.name = 'hill-mound'

  const stone = '#a6b7ae'
  const stoneSeam = '#8fa49a'
  const stoneCap = '#c3d1c8'
  const timber = '#5e5848'
  const ridgeColor = '#4b5e60'
  const gutterColor = '#8fa099'
  const paneMat = mat('#f0e2b0', { emissive: '#a58b4e', emissiveIntensity: 0.45 })

  // lowest terrain height under the rotated plinth footprint
  const cornerLow = (x, z, yaw, hx, hz) => {
    const cy = Math.cos(yaw)
    const sy = Math.sin(yaw)
    let low = hillY(x, z)
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        low = Math.min(low, hillY(x + sx * hx * cy + sz * hz * sy, z - sx * hx * sy + sz * hz * cy))
      }
    }
    return low
  }

  // ---- small Japanese house on a terrain-fitting stone terrace ----
  const buildHouse = (spec) => {
    const { x, z, w, d, bodyH, rise, yaw, wall, roof } = spec
    const baseY = hillY(x, z) - 0.05
    const hx = w / 2 + 0.07
    const hz = d / 2 + 0.07
    const lowY = cornerLow(x, z, yaw, hx, hz) - 0.05
    const top = 0.06
    const bottom = lowY - baseY
    const h = new THREE.Group()
    h.position.set(x, baseY, z)
    h.rotation.y = yaw
    h.name = 'hill-house'
    group.add(h)

    // stone base reaches exactly the lowest corner: a low retaining edge, not a wall
    box(h, [w + 0.14, top - bottom, d + 0.14], [0, (top + bottom) / 2, 0], stone)
    box(h, [w + 0.15, 0.02, d + 0.15], [0, -0.16, 0], stoneSeam, [0, 0, 0], false)
    box(h, [w + 0.18, 0.022, d + 0.18], [0, top + 0.011, 0], stoneCap, [0, 0, 0], false)

    const base = top + 0.022
    box(h, [w, bodyH, d], [0, base + bodyH / 2, 0], wall)
    const px = w / 2 - 0.024
    const pz = d / 2 - 0.024
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) {
        box(h, [0.045, bodyH, 0.045], [sx * px, base + bodyH / 2, sz * pz], timber, [0, 0, 0], false)
      }
    }

    // dark sliding door on +z, tiny warm windows front/back/sides
    const winY = base + bodyH * 0.55
    box(h, [0.16, bodyH * 0.6, 0.024], [w * 0.25, base + bodyH * 0.3, d / 2 + 0.012], '#4d4840', [0, 0, 0], false)
    box(h, [w + 0.015, 0.032, 0.026], [0, base + bodyH * 0.8, d / 2 + 0.011], timber, [0, 0, 0], false)
    box(h, [0.2, 0.04, 0.1], [w * 0.25, base + 0.02, d / 2 + 0.04], stoneCap, [0, 0, 0], false)
    box(h, [0.22, bodyH * 0.36, 0.018], [-w * 0.2, winY, d / 2 + 0.007], timber, [0, 0, 0], false)
    box(h, [0.17, bodyH * 0.3, 0.022], [-w * 0.2, winY, d / 2 + 0.017], paneMat, [0, 0, 0], false)
    box(h, [0.2, bodyH * 0.32, 0.018], [w * 0.16, winY, -d / 2 - 0.007], timber, [0, 0, 0], false)
    box(h, [0.15, bodyH * 0.26, 0.022], [w * 0.16, winY, -d / 2 - 0.017], paneMat, [0, 0, 0], false)
    box(h, [0.018, bodyH * 0.3, 0.15], [w / 2 + 0.005, winY, -d * 0.1], timber, [0, 0, 0], false)
    box(h, [0.022, bodyH * 0.25, 0.11], [w / 2 + 0.011, winY, -d * 0.1], paneMat, [0, 0, 0], false)
    box(h, [0.018, bodyH * 0.3, 0.15], [-w / 2 - 0.005, winY, d * 0.1], timber, [0, 0, 0], false)
    box(h, [0.022, bodyH * 0.25, 0.11], [-w / 2 - 0.011, winY, d * 0.1], paneMat, [0, 0, 0], false)

    // gabled tiled roof, ridge cap and slim gutters/downspout
    const eaveY = base + bodyH + 0.02
    const D = d / 2 + 0.11
    const L = w + 0.22
    const angle = Math.atan2(rise, D)
    const slope = Math.sqrt(D * D + rise * rise)
    const ridgeY = eaveY + rise
    box(h, [L, 0.045, slope], [0, (eaveY + ridgeY) / 2, D / 2], roof, [angle, 0, 0])
    box(h, [L, 0.045, slope], [0, (eaveY + ridgeY) / 2, -D / 2], roof, [-angle, 0, 0])
    box(h, [L + 0.015, 0.05, 0.08], [0, ridgeY + 0.012, 0], ridgeColor)
    box(h, [0.06, 0.07, 0.09], [L / 2 - 0.015, ridgeY + 0.02, 0], ridgeColor, [0, 0, 0], false)
    box(h, [0.06, 0.07, 0.09], [-L / 2 + 0.015, ridgeY + 0.02, 0], ridgeColor, [0, 0, 0], false)
    box(h, [L, 0.028, 0.04], [0, eaveY - 0.008, D], gutterColor, [0, 0, 0], false)
    box(h, [L, 0.028, 0.04], [0, eaveY - 0.008, -D], gutterColor, [0, 0, 0], false)
    box(h, [0.035, eaveY - 0.085, 0.035], [w / 2 + 0.025, (eaveY + 0.085) / 2, d / 2 + 0.025], gutterColor, [0, 0, 0], false)

    // triangular gable ends tucked under the roof
    const tri = new THREE.Shape()
    tri.moveTo(-d / 2 - 0.008, 0)
    tri.lineTo(d / 2 + 0.008, 0)
    tri.lineTo(0, rise + 0.015)
    tri.closePath()
    const gableGeo = new THREE.ExtrudeGeometry(tri, { depth: 0.04, bevelEnabled: false })
    mesh(h, gableGeo, wall, [-w / 2 - 0.02, base + bodyH, 0], [0, Math.PI / 2, 0])
    mesh(h, gableGeo, wall, [w / 2 - 0.02, base + bodyH, 0], [0, Math.PI / 2, 0])
    return h
  }

  // small stepped cluster kept around the summit (tiled roofs read from both views)
  buildHouse({ x: -4.55, z: -4.05, w: 0.7, d: 0.55, bodyH: 0.3, rise: 0.2, yaw: 0.1, wall: '#e9e3cf', roof: '#5c7072' })
  buildHouse({ x: -3.45, z: -4.35, w: 0.68, d: 0.54, bodyH: 0.28, rise: 0.18, yaw: -0.1, wall: '#e4ddc8', roof: '#566a6c' })
  buildHouse({ x: -4.25, z: -5.1, w: 0.62, d: 0.5, bodyH: 0.25, rise: 0.16, yaw: Math.PI + 0.1, wall: '#e7e1cc', roof: '#61777a' })

  // ---- narrow stone path through the gap between the two front houses ----
  const pathZ = [-3.7, -3.85, -4.0, -4.15, -4.3, -4.45]
  for (let i = 0; i < pathZ.length; i++) {
    const z = pathZ[i]
    box(group, [0.12, 0.04, 0.16], [-3.99, hillY(-3.99, z) + 0.02, z], i % 2 ? '#c7d2c8' : '#bcc9bf', slopeTilt(-3.99, z))
  }

  // ---- rounded layered trees; two of them sway very slightly ----
  const plantTree = (x, z, s, tint, lightTint) => {
    const t = new THREE.Group()
    t.position.set(x, hillY(x, z) - 0.03, z)
    t.rotation.y = rand() * Math.PI * 2
    group.add(t)
    cylinder(t, 0.03 * s, 0.055 * s, 0.4 * s, [0, 0.2 * s, 0], '#8b7a63', 7)
    sphere(t, 0.26 * s, [0, 0.48 * s, 0], tint, 12)
    sphere(t, 0.19 * s, [0.15 * s, 0.38 * s, 0.05 * s], tint, 10)
    sphere(t, 0.18 * s, [-0.14 * s, 0.37 * s, -0.04 * s], tint, 10)
    sphere(t, 0.14 * s, [0.01 * s, 0.6 * s, -0.02 * s], lightTint, 10)
    return t
  }
  const swayTrees = [
    plantTree(-5.5, -4.3, 0.7, '#6a9787', '#8ab8a6'),
    plantTree(-2.75, -3.75, 0.55, '#679486', '#87b5a4')
  ]
  plantTree(-5.15, -5.4, 0.6, '#6f9d8c', '#8fbcab')
  plantTree(-5.55, -3.85, 0.58, '#6a9787', '#8ab8a6')
  for (let i = 0; i < swayTrees.length; i++) {
    const tree = swayTrees[i]
    animate(tree, (time) => {
      tree.rotation.z = Math.sin(time * 0.6 + i * 1.9) * 0.010
    })
  }

  // ---- rounded bushes masking the low terrace edges and adding green layers ----
  const bush = (x, z, r, tint) => {
    const b = new THREE.Group()
    b.position.set(x, hillY(x, z) - 0.04, z)
    group.add(b)
    sphere(b, r, [0, r * 0.62, 0], tint, 10)
    sphere(b, r * 0.66, [r * 0.55, r * 0.45, r * 0.12], tint, 9)
    sphere(b, r * 0.6, [-r * 0.5, r * 0.44, -r * 0.1], tint, 9)
    sphere(b, r * 0.44, [r * 0.1, r * 0.9, 0], '#9cc4b3', 8)
    return b
  }
  bush(-4.95, -3.55, 0.14, '#7ba694')
  bush(-4.15, -3.6, 0.12, '#8fbcaa')
  bush(-3.0, -3.9, 0.13, '#7ba694')
  bush(-4.55, -4.6, 0.12, '#8fbcaa')
  bush(-3.6, -4.7, 0.12, '#7ba694')
  bush(-2.5, -4.25, 0.12, '#8fbcaa')

  // ---- wet mossy rocks and small grass tufts at the hill foot ----
  const rock = (x, z, r, tint) => {
    const rk = mesh(group, new THREE.SphereGeometry(1, 10, 7), tint, [x, hillY(x, z) + 0.01, z], [0, 0, 0], false)
    rk.scale.set(r, r * 0.62, r * 0.85)
    return rk
  }
  rock(-2.6, -3.7, 0.14, '#a6b6ac')
  rock(-5.15, -3.65, 0.13, '#9baca3')
  rock(-3.95, -3.45, 0.12, '#a6b6ac')

  const tuft = (x, z, r, tint) => {
    const tf = mesh(group, new THREE.SphereGeometry(1, 8, 5), tint, [x, hillY(x, z) + 0.01, z], [0, 0, 0], false)
    tf.scale.set(r, r * 0.5, r * 0.8)
    return tf
  }
  tuft(-5.6, -4.6, 0.13, '#9dc3b2')
  tuft(-3.2, -3.55, 0.11, '#9dc3b2')
  tuft(-4.0, -5.6, 0.12, '#7ba694')
  tuft(-5.05, -3.3, 0.1, '#8fbcaa')

  return group
}
