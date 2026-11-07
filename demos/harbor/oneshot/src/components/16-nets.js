// 16-nets.js — 渔网晾架与浮球绳串 / net drying frame and float rope strings
// First pass, source only. Fixed interface (CONTRACT.md): export function create(ctx) -> THREE.Group

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '16-nets'
  group.position.set(-4.8, 0.8, 0.1)   // left quay top; stays inside x[-5.7,-3.9] z[-.7,1]

  const rust = mat('#a1734f')
  const rustDark = mat('#845739')
  const iron = mat(p.metal)

  // ---- slender rusted drying frame, 1.5 tall above the quay ----
  for (const sx of [-0.55, 0.55]) {
    box(group, [0.24, 0.032, 0.24], [sx, 0.016, 0], p.concreteDark)
    box(group, [0.1, 0.05, 0.1], [sx, 0.055, 0], rustDark)
    cylinder(group, 0.026, 0.034, 1.5, [sx, 0.75, 0], rust, 10)
    cylinder(group, 0.037, 0.037, 0.045, [sx, 1.33, 0], iron, 10)
  }
  beam(group, [-0.62, 1.44, 0], [0.62, 1.44, 0], 0.045, rust)
  beam(group, [-0.55, 0.66, -0.035], [0.55, 0.66, -0.035], 0.028, iron)
  beam(group, [-0.55, 0.09, 0.02], [0.55, 0.09, 0.02], 0.025, rustDark)
  beam(group, [-0.55, 1.3, -0.05], [-0.26, 0.1, -0.05], 0.022, rustDark)
  beam(group, [0.55, 1.3, -0.05], [0.26, 0.1, -0.05], 0.022, rustDark)

  // rain-worn rust bleeds down the uprights
  for (let i = 0; i < 6; i++) {
    const sx = i % 2 === 0 ? -0.55 : 0.55
    box(group, [0.055, 0.06 + rand() * 0.1, 0.004], [sx, 0.24 + rand() * 0.98, 0.036], rustDark, [0, 0, 0], false)
  }

  // ---- netting draped over the top rail, pivoted at the rail for the breeze ----
  const netPivot = new THREE.Group()
  netPivot.position.set(0, 1.38, 0.045)
  group.add(netPivot)
  const net = new THREE.Group()
  net.position.set(0, -1.38, -0.045)
  netPivot.add(net)

  const railY = 1.39
  const netX = u => (u - 0.5) * 1.04
  // u across [-.52,.52], v from a short back flap (-.22) to the hanging hem (1)
  const netPoint = (u, v) => {
    const back = Math.max(0, -v)
    const front = Math.max(0, v)
    const belly = Math.sin(Math.PI * u)
    const y = railY - front * (0.92 + 0.12 * belly) - back * 0.48
    const z = 0.045 + 0.15 * Math.sin(Math.PI * 0.9 * Math.min(1, front))
      + 0.02 * Math.sin(u * 6.3 + v * 5.1) - back * 0.28
    return [netX(u), y, z]
  }

  let drawn = 0
  const lattice = (parent, u0, u1, v0, v1, cells, color, opacity) => {
    const at = (a, b) => netPoint(u0 + a * (u1 - u0), v0 + b * (v1 - v0))
    const stroke = (a0, a1, slope, offset) => {
      if (a1 - a0 < 0.05) return
      const points = []
      for (let j = 0; j <= 12; j++) {
        const a = a0 + (a1 - a0) * (j / 12)
        points.push(at(a, a * slope + offset))
      }
      line(parent, points, drawn++ % 7 === 3 ? '#c3d6c9' : color, opacity)
    }
    for (let i = 0; i <= cells * 2; i++) {
      const s = -1 + i / cells            // family 1: b - a = s
      stroke(Math.max(0, -s), Math.min(1, 1 - s), 1, s)
      const q = i / cells                 // family 2: a + b = q
      stroke(Math.max(0, q - 1), Math.min(1, q), -1, q)
    }
  }
  lattice(net, 0, 1, -0.22, 1, 9, '#6d8c83', 0.72)          // whole hanging net
  lattice(net, 0.3, 0.72, 0.18, 0.56, 3, '#54716b', 0.85)   // hand-mended panel

  // lacing loops over the top rail, then the two side ropes
  for (let i = 0; i < 9; i++) {
    const u = 0.05 + i * 0.1125
    const [x, y, z] = netPoint(u, 0.02)
    curve(net, [[x, y - 0.005, z + 0.01], [x, 1.468, 0.0], [x, 1.305, -0.03]], p.rope, 0.008)
  }
  for (const u of [0, 1]) {
    const side = []
    for (let i = 0; i <= 8; i++) {
      const [x, y, z] = netPoint(u, -0.22 + (1.22 * i) / 8)
      side.push([x, y, z + 0.004])
    }
    curve(net, side, p.rope, 0.011)
  }

  // hem rope with small orange / ivory / blue floats threaded on it
  const hem = []
  for (let i = 0; i <= 14; i++) {
    const [x, y, z] = netPoint(i / 14, 1)
    hem.push([x, y - 0.008, z + 0.012])
  }
  curve(net, hem, p.rope, 0.015)
  const floatTones = [p.orange, p.hull, p.blue]
  for (let i = 0; i < 10; i++) {
    const [x, y, z] = netPoint(0.06 + i * 0.098, 1)
    sphere(net, i % 2 ? 0.028 : 0.035, [x, y - 0.012, z + 0.028], floatTones[i % 3], 8)
  }

  // gathered net ends hanging a little lower on the right
  for (let i = 0; i < 4; i++) {
    const [x, y, z] = netPoint(0.87 + i * 0.03, 1)
    curve(net, [[x, y, z], [x + 0.02, y - 0.14 - i * 0.02, z + 0.02], [x + 0.045, y - 0.2 - i * 0.02, z + 0.035]], '#c3d6c9', 0.006)
  }
  // netting needle left stuck in the mesh
  const needle = netPoint(0.62, 0.42)
  box(net, [0.15, 0.012, 0.028], [needle[0], needle[1], needle[2] + 0.022], '#c8b189', [0.1, 0.4, 0.35])

  // ---- heavier float rope string hanging off the left upright ----
  const rigA = [-0.55, 1.36, 0.03]
  const rigB = [-0.79, 0.06, 0.36]
  const rigPoint = t => [
    rigA[0] + (rigB[0] - rigA[0]) * t - 0.03 * Math.sin(Math.PI * t),
    rigA[1] + (rigB[1] - rigA[1]) * t - 0.19 * Math.sin(Math.PI * t),
    rigA[2] + (rigB[2] - rigA[2]) * t + 0.025 * Math.sin(Math.PI * t)
  ]
  const rigPivot = new THREE.Group()
  rigPivot.position.set(rigA[0], rigA[1], rigA[2])
  group.add(rigPivot)
  const rig = new THREE.Group()
  rig.position.set(-rigA[0], -rigA[1], -rigA[2])
  rigPivot.add(rig)

  const ropePts = []
  for (let i = 0; i <= 10; i++) ropePts.push(rigPoint(i / 10))
  curve(rig, ropePts, p.rope, 0.014)
  for (let i = 0; i < 6; i++) {
    const fp = rigPoint(0.1 + i * 0.15)
    sphere(rig, i % 2 ? 0.042 : 0.052, [fp[0], fp[1] - 0.01, fp[2] + 0.026], floatTones[i % 3], 9)
  }

  // ---- rope coil resting on the quay below the frame ----
  const coilCenter = [-0.6, 0.02, 0.52]
  for (let i = 0; i < 3; i++) {
    mesh(group, new THREE.TorusGeometry(0.16 - i * 0.022, 0.018, 6, 22), p.rope,
      [coilCenter[0] + (i - 1) * 0.01, coilCenter[1] + i * 0.026, coilCenter[2] + (i - 1) * 0.012],
      [Math.PI / 2, 0, i * 0.5], false)
  }
  curve(group, [rigB, [-0.72, 0.05, 0.43], [-0.66, 0.035, 0.48], [-0.61, 0.055, 0.51]], p.rope, 0.016)
  curve(group, [[-0.6, 0.09, 0.52], [-0.53, 0.07, 0.575], [-0.47, 0.045, 0.52], [-0.44, 0.03, 0.46]], p.rope, 0.013)
  mesh(group, new THREE.TorusGeometry(0.05, 0.012, 6, 14), rustDark, [-0.82, 0.03, 0.4], [Math.PI / 2, 0, 0], false)

  // ---- bounded sea-breeze sway: absolute angles, no cumulative drift ----
  const baseY = group.position.y
  animate(group, time => {
    group.rotation.z = Math.sin(time * 0.85) * 0.009
    group.rotation.x = Math.sin(time * 0.61 + 1.7) * 0.006
    group.position.y = baseY + Math.sin(time * 1.27 + 0.6) * 0.003
  })
  animate(netPivot, time => {
    netPivot.rotation.z = Math.sin(time * 1.43 + 0.4) * 0.012
    netPivot.rotation.x = Math.sin(time * 1.09 + 2.1) * 0.008
  })
  animate(rigPivot, time => {
    rigPivot.rotation.z = Math.sin(time * 1.62 + 1.2) * 0.02
    rigPivot.rotation.x = Math.sin(time * 1.24 + 0.3) * 0.01
  })

  return group
}
