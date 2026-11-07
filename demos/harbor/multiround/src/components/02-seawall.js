// 02 — 潮位岸壁与藤壶牡蛎
// Tide-level quay wall: layered concrete block courses, dark teal tide lines, rust runoff,
// iron mooring rings, a short rusty ladder, barnacle clusters and ivory oyster shells.
// Owns only src/components/02-seawall.js. Source-only first pass; no renderer is claimed.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'seawall'

  // fixed world conventions from CONTRACT.md: exposed faces at x=-1.7 (normal +x) and z=2.4 (normal -z)
  const BOTTOM = -1.35
  const TOP = 0.72
  const COURSES = 9
  const COURSE = (TOP - BOTTOM) / COURSES
  const GAP = 0.014
  const THICK = 0.34
  const WEST_X = -1.7
  const NORTH_Z = 2.4
  const WEST_Z0 = -6
  const WEST_Z1 = 2.4
  const NORTH_X0 = -1.7
  const NORTH_X1 = 6

  // slightly different concrete casts keep the block courses readable without harsh contrast
  const tones = ['#ccd6cf', '#c1cdc7', '#b8c7c1', '#c8d2ca', '#becac3', '#b3c1bb']
  const toneOf = n => tones[(n % tones.length + tones.length) % tones.length]

  // every block face outline is merged into one LineSegments: the whole block pattern costs one draw call
  const ink = []
  const outlineRect = (face, at, a0, a1, y0, y1) => {
    const q = face === 'x'
      ? [[at, y0, a0], [at, y0, a1], [at, y1, a1], [at, y1, a0]]
      : [[a0, y0, at], [a1, y0, at], [a1, y1, at], [a0, y1, at]]
    ink.push(q[0], q[1], q[1], q[2], q[2], q[3], q[3], q[0])
  }

  // running-bond spans: every other course is offset half a block, ends are clamped to the wall
  const spans = (t0, t1, count, offset) => {
    const step = (t1 - t0) / count
    const cuts = []
    let c = offset ? t0 - step * 0.5 : t0
    while (c < t1 - 1e-6) { cuts.push(c); c += step }
    cuts.push(c)
    const out = []
    for (let k = 0; k < cuts.length - 1; k++) {
      const a = Math.max(t0, cuts[k])
      const b = Math.min(t1, cuts[k + 1])
      if (b - a > step * 0.3) out.push([a, b])
    }
    return out
  }

  // --- layered concrete block wall, both exposed faces plus a solid corner quoin ---
  for (let i = 0; i < COURSES; i++) {
    const cy = BOTTOM + COURSE * (i + 0.5)
    const bh = COURSE - GAP
    const y0 = cy - bh * 0.5
    const y1 = cy + bh * 0.5
    spans(WEST_Z0, WEST_Z1, 6, i % 2 === 1).forEach(([a, b], k) => {
      const w = b - a - GAP
      const zc = (a + b) * 0.5
      box(group, [THICK, bh, w], [WEST_X - THICK * 0.5, cy, zc], toneOf(i * 3 + k), [0, 0, 0], false)
      outlineRect('x', WEST_X + 0.004, zc - w * 0.5, zc + w * 0.5, y0, y1)
    })
    spans(NORTH_X0, NORTH_X1, 5, i % 2 === 1).forEach(([a, b], k) => {
      const w = b - a - GAP
      const xc = (a + b) * 0.5
      box(group, [w, bh, THICK], [xc, cy, NORTH_Z + THICK * 0.5], toneOf(i * 2 + k + 2), [0, 0, 0], false)
      outlineRect('z', NORTH_Z - 0.004, xc - w * 0.5, xc + w * 0.5, y0, y1)
    })
    box(group, [THICK - GAP, bh, THICK - GAP], [WEST_X - THICK * 0.5, cy, NORTH_Z + THICK * 0.5],
      toneOf(i + 1), [0, 0, 0], false)
  }
  const jointLines = new THREE.LineSegments(
    new THREE.BufferGeometry().setFromPoints(ink.map(v => new THREE.Vector3(v[0], v[1], v[2]))),
    new THREE.LineBasicMaterial({ color: '#547773', transparent: true, opacity: 0.42, depthWrite: false })
  )
  jointLines.name = 'seawall-block-joint-ink'
  group.add(jointLines)

  // --- weathered coping cap that overhangs the water edge ---
  const COP_T = THICK + 0.07
  const COP_X0 = WEST_X - THICK
  const COP_X1 = WEST_X + 0.07
  const COP_Z0 = NORTH_Z - 0.07
  const COP_Z1 = NORTH_Z + THICK
  box(group, [COP_T, 0.12, COP_Z0 - WEST_Z0], [(COP_X0 + COP_X1) * 0.5, 0.66, (WEST_Z0 + COP_Z0) * 0.5], p.concreteLight)
  box(group, [NORTH_X1 - COP_X0, 0.12, COP_T], [(COP_X0 + NORTH_X1) * 0.5, 0.66, (COP_Z0 + COP_Z1) * 0.5], p.concreteLight)
  line(group, [[WEST_X + 0.006, 0.598, WEST_Z0], [WEST_X + 0.006, 0.598, COP_Z0]], '#4d716f', 0.22)
  line(group, [[COP_X0, 0.598, NORTH_Z - 0.006], [NORTH_X1, 0.598, NORTH_Z - 0.006]], '#4d716f', 0.22)

  // --- irregular dark teal tide lines around y = 0.1, plus pale dried salt marks ---
  const teal = ['#4c7a77', '#3d6a6e', '#578982', '#456f72', '#39636b']
  for (let i = 0; i < 20; i++) {
    const z = WEST_Z0 + 0.3 + rand() * (WEST_Z1 - WEST_Z0 - 0.6)
    const len = 0.22 + rand() * 1.15
    const h = 0.012 + rand() * 0.022
    const y = 0.05 + rand() * 0.14
    box(group, [0.008, h, len], [WEST_X + 0.005, y, z], mat(teal[i % teal.length]), [0, 0, 0], false)
  }
  for (let i = 0; i < 14; i++) {
    const x = NORTH_X0 + 0.3 + rand() * (NORTH_X1 - NORTH_X0 - 0.6)
    const len = 0.22 + rand() * 1.05
    const h = 0.012 + rand() * 0.022
    const y = 0.05 + rand() * 0.14
    box(group, [len, h, 0.008], [x, y, NORTH_Z - 0.005], mat(teal[(i + 2) % teal.length]), [0, 0, 0], false)
  }
  box(group, [0.006, 0.014, 3.4], [WEST_X + 0.005, 0.215, -2.4], mat('#8aa5a0'), [0, 0, 0], false)
  box(group, [0.006, 0.01, 2.2], [WEST_X + 0.005, 0.255, 0.4], mat('#7c9893'), [0, 0, 0], false)
  box(group, [0.006, 0.1, WEST_Z1 - WEST_Z0 - 0.3], [WEST_X + 0.005, 0.155, -1.8],
    mat('#4f7779', { transparent: true, opacity: 0.13 }), [0, 0, 0], false)
  box(group, [NORTH_X1 - NORTH_X0 - 0.3, 0.1, 0.006], [2.15, 0.155, NORTH_Z - 0.005],
    mat('#4f7779', { transparent: true, opacity: 0.13 }), [0, 0, 0], false)

  // --- subtle rust runoff from old fittings, kept thin and irregular ---
  const runoff = (z, yA, yB, drift) => line(group,
    [[WEST_X + 0.006, yA, z], [WEST_X + 0.006, (yA + yB) * 0.5, z + drift * 0.55], [WEST_X + 0.006, yB, z + drift]],
    p.rust, 0.4)
  const rustZones = [-3.95, -1.15, 1.3]
  rustZones.forEach(z => runoff(z, 0.47, 0.2, 0.06))
  for (let i = 0; i < 6; i++) {
    runoff(WEST_Z0 + 0.7 + rand() * 7.0, 0.5 + rand() * 0.14, 0.14 + rand() * 0.22, (rand() - 0.5) * 0.16)
  }
  rustZones.forEach(z => box(group, [0.006, 0.24, 0.15], [WEST_X + 0.005, 0.31, z],
    mat(p.rust, { transparent: true, opacity: 0.15 }), [0, 0, 0], false))
  for (let i = 0; i < 3; i++) {
    const z = WEST_Z0 + 1.2 + rand() * 6.0
    line(group, [[WEST_X + 0.007, 0.62, z], [WEST_X + 0.007, 0.5, z + 0.02], [WEST_X + 0.007, 0.42, z + 0.05]],
      '#ecf3e7', 0.16)
  }

  // --- iron mooring rings on both exposed faces ---
  const ringGeo = new THREE.TorusGeometry(0.1, 0.02, 6, 16)
  const ringWest = (z, tone) => {
    box(group, [0.05, 0.16, 0.2], [WEST_X + 0.025, 0.47, z], p.metal)
    box(group, [0.016, 0.02, 0.02], [WEST_X + 0.055, 0.5, z - 0.062], p.metal, [0, 0, 0], false)
    box(group, [0.016, 0.02, 0.02], [WEST_X + 0.055, 0.5, z + 0.062], p.metal, [0, 0, 0], false)
    mesh(group, ringGeo, tone, [WEST_X + 0.062, 0.365, z], [0, Math.PI * 0.5, 0], false)
  }
  ringWest(-3.95, p.metal)
  ringWest(-1.15, p.rust)
  ringWest(1.3, p.metal)
  const ringNorth = (x, tone) => {
    box(group, [0.2, 0.16, 0.05], [x, 0.47, NORTH_Z - 0.025], p.metal)
    mesh(group, ringGeo, tone, [x, 0.365, NORTH_Z - 0.062], [0, 0, 0], false)
  }
  ringNorth(1.35, p.metal)
  ringNorth(4.55, p.rust)

  // --- short rusty wall ladder near x = 3, z = 2.35 ---
  const ladX = 3.01
  const railCol = '#8a6a51'
  beam(group, [ladX - 0.11, 0.7, 2.3], [ladX - 0.11, -0.22, 2.3], 0.034, railCol)
  beam(group, [ladX + 0.11, 0.7, 2.3], [ladX + 0.11, -0.22, 2.3], 0.034, railCol)
  const rungs = [0.62, 0.48, 0.34, 0.2, 0.06, -0.08, -0.2]
  rungs.forEach(y => beam(group, [ladX - 0.11, y, 2.3], [ladX + 0.11, y, 2.3], 0.026, p.rust))
  const brackets = [0.68, 0.1]
  brackets.forEach(y => beam(group, [ladX, y, 2.3], [ladX, y, NORTH_Z], 0.03, p.metal))
  line(group, [[ladX + 0.16, 0.58, NORTH_Z - 0.006], [ladX + 0.16, 0.2, NORTH_Z - 0.006],
    [ladX + 0.2, 0.02, NORTH_Z - 0.006]], p.rust, 0.36)

  // --- barnacle and oyster clusters: instanced so the shells stay cheap and finite ---
  const barnGeo = new THREE.ConeGeometry(1, 1, 6)
  const shellGeo = new THREE.SphereGeometry(1, 8, 5)
  const lightM = [], darkM = [], shellM = []
  const m4 = new THREE.Matrix4(), q4 = new THREE.Quaternion(), v3 = new THREE.Vector3(), s3 = new THREE.Vector3()
  const coneWest = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -Math.PI * 0.5)
  const coneNorth = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI * 0.5)
  const tiltX = new THREE.Vector3(1, 0, 0), tiltZ = new THREE.Vector3(0, 0, 1)
  const barnacle = (x, y, z, quat, sy, r, dark) => {
    s3.set(r, sy, r)
    v3.set(x, y, z)
    m4.compose(v3, quat, s3)
    if (dark) darkM.push(m4.clone())
    else lightM.push(m4.clone())
  }
  const oysterWest = (y, z) => {
    const thin = 0.014 + rand() * 0.012
    const wide = 0.045 + rand() * 0.03
    q4.setFromAxisAngle(tiltX, (rand() - 0.5) * 1.1)
    s3.set(thin, wide * (0.72 + rand() * 0.3), wide)
    v3.set(WEST_X + thin * 0.55, y, z)
    m4.compose(v3, q4, s3)
    shellM.push(m4.clone())
  }
  const oysterNorth = (y, x) => {
    const thin = 0.014 + rand() * 0.012
    const wide = 0.045 + rand() * 0.028
    q4.setFromAxisAngle(tiltZ, (rand() - 0.5) * 1.1)
    s3.set(wide * (0.72 + rand() * 0.3), wide, thin)
    v3.set(x, y, NORTH_Z - thin * 0.55)
    m4.compose(v3, q4, s3)
    shellM.push(m4.clone())
  }
  for (let c = 0; c < 10; c++) {
    const cz = WEST_Z0 + 0.55 + c * 0.78 + rand() * 0.3
    const baseY = -0.12 + rand() * 0.3
    const n = 5 + Math.floor(rand() * 7)
    for (let k = 0; k < n; k++) {
      const sy = 0.012 + rand() * 0.012
      const r = 0.015 + rand() * 0.019
      const y = Math.max(-0.55, Math.min(0.32, baseY + (rand() - 0.5) * 0.24))
      const z = cz + (rand() - 0.5) * 0.36
      barnacle(WEST_X + sy * 0.5, y, z, coneWest, sy, r, rand() < 0.32)
    }
  }
  for (let c = 0; c < 7; c++) {
    const cx = -1.1 + c * 0.95 + rand() * 0.3
    const baseY = -0.1 + rand() * 0.26
    const n = 4 + Math.floor(rand() * 6)
    for (let k = 0; k < n; k++) {
      const sy = 0.012 + rand() * 0.012
      const r = 0.015 + rand() * 0.018
      const y = Math.max(-0.55, Math.min(0.3, baseY + (rand() - 0.5) * 0.22))
      const x = cx + (rand() - 0.5) * 0.34
      if (Math.abs(x - ladX) < 0.42 && y > -0.3) continue
      barnacle(x, y, NORTH_Z - sy * 0.5, coneNorth, sy, r, rand() < 0.3)
    }
  }
  const oysterZ = [-4.9, -3.2, -1.6, 0.1, 1.4]
  oysterZ.forEach(cz => {
    for (let k = 0; k < 3; k++) oysterWest(-0.5 + rand() * 0.62, cz + (rand() - 0.5) * 0.34)
  })
  const oysterX = [0.2, 2.0, 4.4]
  oysterX.forEach(cx => {
    for (let k = 0; k < 2; k++) oysterNorth(-0.48 + rand() * 0.5, cx + (rand() - 0.5) * 0.3)
  })
  const instanced = (geo, material, matrices, name) => {
    if (!matrices.length) return null
    const inst = new THREE.InstancedMesh(geo, material, matrices.length)
    matrices.forEach((m, i) => inst.setMatrixAt(i, m))
    inst.instanceMatrix.needsUpdate = true
    inst.castShadow = true
    inst.receiveShadow = true
    inst.frustumCulled = false
    inst.name = name
    group.add(inst)
    return inst
  }
  instanced(barnGeo, mat('#d6ddce'), lightM, 'seawall-barnacles-light')
  instanced(barnGeo, mat('#bcc7b5'), darkM, 'seawall-barnacles-dark')
  instanced(shellGeo, mat('#ece6d2'), shellM, 'seawall-oyster-shells')

  // 第 4 轮：底座外侧混凝土剖面附着（潮线 / 藤壶 / 牡蛎 / 海藻剪影）。
  // 00-base 分带 inset [0,.05,.05,.025,0]：y -1.10..0.02 在 ±5.95、y 0.02..0.55 在 ±5.975；
  // 只贴内收面（外凸 ≤5.996 < 6），避开 x=5.995(z<2.4) 与 z=-5.995(x>-1.7) 的水面透光剖面。
  const OUT = { front: [false, 1], back: [false, -1], east: [true, 1], west: [true, -1] }
  // Local fixed-seed LCG: this section must never draw from the shared random
  // stream (helpers keeps one global seed shared by all modules in load order).
  let outerSeed = 0x5ea11
  const outerRand = () => {
    outerSeed = (outerSeed * 1664525 + 1013904223) >>> 0
    return outerSeed / 4294967296
  }
  const outPlane = (f, upper) => (upper ? 5.975 : 5.95) * OUT[f][1]
  const outPatch = (f, upper, u, y, len, h, t, color, tilt = 0) => {
    const z = outPlane(f, upper), s = OUT[f][1]
    return OUT[f][0]
      ? box(group, [t, h, len], [z + s * t * 0.5, y, u], color, [tilt, 0, 0], false)
      : box(group, [len, h, t], [u, y, z + s * t * 0.5], color, [0, 0, tilt], false)
  }
  const outCone = new THREE.ConeGeometry(1, 1, 6)
  const outBarnacle = (f, u, y, r, hgt, dark) => {
    const z = outPlane(f, false), s = OUT[f][1]
    const m = mesh(group, outCone, mat(dark ? '#bcc7b4' : '#d7dccd'), [0, 0, 0], [0, 0, 0], false)
    m.scale.set(r, hgt, r)
    if (OUT[f][0]) {
      m.position.set(z + s * hgt * 0.5, y, u)
      m.quaternion.setFromAxisAngle(new THREE.Vector3(0, 0, 1), -s * Math.PI * 0.5)
    } else {
      m.position.set(u, y, z + s * hgt * 0.5)
      m.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), s * Math.PI * 0.5)
    }
    return m
  }
  const outShell = new THREE.SphereGeometry(1, 8, 5)
  const outOyster = (f, u, y, across, thin, tilt) => {
    const z = outPlane(f, false), s = OUT[f][1]
    const m = mesh(group, outShell, mat('#e8e3cf'), [0, 0, 0], [0, 0, 0], false)
    if (OUT[f][0]) {
      m.scale.set(thin, across * 0.82, across)
      m.position.set(z + s * thin * 0.45, y, u)
      m.rotation.x = tilt
    } else {
      m.scale.set(across, across * 0.82, thin)
      m.position.set(u, y, z + s * thin * 0.45)
      m.rotation.z = tilt
    }
    return m
  }
  const outBlade = new THREE.ConeGeometry(1, 1, 4)
  const outWeeds = [mat('#37695c'), mat('#2c5a50'), mat('#457666')]
  const outKelp = (f, u, top, w, len, t, tilt, ci) => {
    const z = outPlane(f, false), s = OUT[f][1]
    const m = mesh(group, outBlade, outWeeds[ci], [0, 0, 0], [0, 0, 0], false)
    if (OUT[f][0]) {
      m.scale.set(t, len, w)
      m.position.set(z + s * t * 0.55, top - len * 0.5, u)
      m.rotation.x = Math.PI + tilt
    } else {
      m.scale.set(w, len, t)
      m.position.set(u, top - len * 0.5, z + s * t * 0.55)
      m.rotation.z = Math.PI + tilt
    }
    return m
  }
  const tideRows = [
    ['front', -4.2, .22, 2.1, .05, '#4a7673', .02], ['front', -.9, .16, 1.5, .035, '#3d676b', -.015],
    ['front', 2.4, .26, 2.6, .045, '#587f7a', .01], ['east', 3.3, .2, 1.6, .04, '#3d676b', .02],
    ['east', 5.1, .27, 1.1, .03, '#587f7a', -.01], ['back', -5.0, .18, 1.4, .04, '#587f7a', .015],
    ['back', -2.6, .24, 1.2, .03, '#4a7673', -.02], ['west', -4.6, .2, 2.0, .045, '#3d676b', .02],
    ['west', -1.4, .15, 1.3, .03, '#436f70', -.01], ['west', 2.8, .25, 2.2, .04, '#4a7673', .015]
  ]
  tideRows.forEach(([f, u, y, len, h, c, tilt]) => outPatch(f, true, u, y, len, h, .012, c, tilt))
  const dampRows = [
    ['front', -1.6, -.2, 2.6, .05, '#4a7673'], ['east', 4.4, -.18, 1.2, .04, '#3d676b'],
    ['back', -3.4, -.22, 1.8, .045, '#587f7a'], ['west', 3.4, -.2, 2.4, .05, '#436f70']
  ]
  dampRows.forEach(([f, u, y, len, h, c]) => outPatch(f, false, u, y, len, h, .01, c))
  const barnRows = [
    ['front', -4.4, -.78], ['front', -.6, -.56], ['front', 3.6, -.94], ['east', 3.4, -.8],
    ['back', -5.1, -.72], ['back', -2.4, -.9], ['west', -4.0, -.86], ['west', 1.4, -.6]
  ]
  barnRows.forEach(([f, uc, yc]) => {
    for (let i = 0; i < 4; i++) {
      const r = .026 + outerRand() * .019
      const y = Math.max(-1.04, yc + (outerRand() - .5) * .3)
      outBarnacle(f, uc + (outerRand() - .5) * .5, y, r, .026 + outerRand() * .02, outerRand() < .35)
    }
  })
  const oysterRows = [
    ['front', -3.4, -.95, .1, .024, .35], ['front', 1.6, -.64, .085, .02, -.4],
    ['east', 4.4, -.9, .09, .022, .2], ['back', -4.4, -.86, .095, .022, -.3],
    ['west', -3.2, -.68, .1, .024, .15], ['west', 3.6, -.92, .08, .02, -.45]
  ]
  oysterRows.forEach(([f, u, y, across, thin, tilt]) => outOyster(f, u, y, across, thin, tilt))
  const kelpRows = [['front', -4.9, -.55], ['front', 2.9, -.5], ['east', 3.9, -.55], ['back', -5.3, -.58], ['back', -3.0, -.5], ['west', -2.2, -.55]]
  kelpRows.forEach(([f, uc, top], wi) => {
    for (let i = 0; i < 3; i++) {
      outKelp(f, uc + (outerRand() - .5) * .34, top, .034 + outerRand() * .02,
        .3 + outerRand() * .12, .014 + outerRand() * .006, (outerRand() - .5) * .5, (wi + i) % 3)
    }
  })

  return group
}
