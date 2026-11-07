export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const g = new THREE.Group()
  g.name = 'cooperative-warehouse'

  // round 2: same fixed plot (-4.35, 1.6; 2.4 x 1.5). The pale shell is a step darker, the loading
  // bay is a real opening cut through the facade, and the room behind it is a dark cavity so the
  // fish boxes, chest and scale read instead of dissolving into the white quay
  const X0 = -5.55, X1 = -3.15, Z0 = .85, Z1 = 2.35
  const CX = -4.35, CZ = 1.6, FLOOR = .8, EAVE = 2.2, RIDGE = 2.53
  const W = X1 - X0, D = Z1 - Z0
  const wall = '#a3b3ae', frame = '#c7d1cb', damp = '#7c938d'
  const roofColor = '#8ea8b3', roofEdge = '#71898f'
  const NO_INK = false
  const warmGlass = mat('#f3e2ae', { transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })
  const wet = mat('#7fb3ab', { transparent: true, opacity: .32, depthWrite: false })
  const shaftMat = mat('#f0e3ab', { transparent: true, opacity: .05, depthWrite: false, side: THREE.DoubleSide })
  const rustWash = mat(p.rust, { transparent: true, opacity: .4, depthWrite: false })
  const iceMat = mat('#dff0ea', { transparent: true, opacity: .6, depthWrite: false })
  const causticMat = mat('#f0e0a6', { transparent: true, opacity: .1, depthWrite: false })
  const bulbMat = mat('#fff2cc', { emissive: '#f2d98d', emissiveIntensity: .55 })
  const cavity = '#4e6d68', cavityTop = '#7c918a', jamb = '#47635f'

  // the shared helper outlines every opaque mesh; twelve extra ink lines on every crate read as
  // noise in the distance, so only the big silhouette pieces keep the outline
  const plain = (o) => { o.children.slice().forEach(c => { if (c.isLineSegments) o.remove(c) }); return o }

  // shell — the quay top is the one shared ground, so this module adds no second floor slab
  box(g, [W, EAVE - FLOOR, .06], [CX, (EAVE + FLOOR) / 2, Z0 + .03], wall)
  box(g, [.06, EAVE - FLOOR, D], [X0 + .03, (EAVE + FLOOR) / 2, CZ], wall)

  // harbour (+x) side: low sill, an open cut band, warm high windows — the room shows from outside
  box(g, [.06, .4, D], [X1 - .03, 1.0, CZ], wall)
  box(g, [.06, .18, D], [X1 - .03, 2.11, CZ], wall)
  for (const ry of [1.22, 1.72, 2.02]) box(g, [.08, .04, D], [X1 - .03, ry, CZ], frame, [0, 0, 0], NO_INK)
  for (const pz of [.95, 1.42, 1.89, 2.3]) box(g, [.07, .84, .07], [X1 - .03, 1.61, pz], frame, [0, 0, 0], NO_INK)
  box(g, [.02, .25, .42], [X1 - .03, 1.87, 1.185], warmGlass, [0, 0, 0], NO_INK)
  box(g, [.02, .25, .42], [X1 - .03, 1.87, 1.655], warmGlass, [0, 0, 0], NO_INK)
  box(g, [.02, .25, .37], [X1 - .03, 1.87, 2.095], warmGlass, [0, 0, 0], NO_INK)

  // front (+z): wide loading bay, half-raised roller shutter hanging over it
  const OL = -4.70, OR = -3.26, OC = (OL + OR) / 2
  box(g, [OL - X0, EAVE - FLOOR, .06], [(X0 + OL) / 2, (EAVE + FLOOR) / 2, Z1 - .03], wall)
  box(g, [X1 - OR, EAVE - FLOOR, .06], [(OR + X1) / 2, (EAVE + FLOOR) / 2, Z1 - .03], wall)
  box(g, [OR - OL, .18, .06], [OC, 2.11, Z1 - .03], wall)
  box(g, [1.5, .14, .13], [OC, 2.0, Z1 - .04], '#a7b4af', [0, 0, 0], NO_INK)
  plain(cylinder(g, .045, .045, 1.42, [OC, 1.955, Z1 - .04], '#9fb0ab', 12)).rotation.z = Math.PI / 2
  box(g, [1.4, .25, .03], [OC, 1.805, Z1 - .025], '#8a9d98')
  for (let i = 0; i < 2; i++) box(g, [1.38, .008, .008], [OC, 1.725 + i * .075, Z1 - .006], jamb, [0, 0, 0], NO_INK)
  box(g, [1.4, .025, .05], [OC, 1.665, Z1 - .02], '#3e5652', [0, 0, 0], NO_INK)
  box(g, [.03, .44, .06], [OL, 1.74, Z1 - .02], '#3e5652', [0, 0, 0], NO_INK)
  box(g, [.03, .44, .06], [OR, 1.74, Z1 - .02], '#3e5652', [0, 0, 0], NO_INK)
  box(g, [.05, .9, .05], [OL + .02, 1.25, Z1 - .05], jamb, [0, 0, 0], NO_INK)
  box(g, [.05, .9, .05], [OR - .02, 1.25, Z1 - .05], jamb, [0, 0, 0], NO_INK)
  box(g, [.62, .22, .02], [(X0 + OL) / 2, 1.9, Z1 + .003], '#647772', [0, 0, 0], NO_INK)
  label(g, '漁協倉庫', .56, [(X0 + OL) / 2, 1.9, Z1 + .012], [0, 0, 0], '#eef0e0', '#3d5853')
  box(g, [OL - X0, .2, .02], [(X0 + OL) / 2, .9, Z1 + .004], damp, [0, 0, 0], NO_INK)
  box(g, [.02, .26, D], [X1 + .004, .93, CZ], damp, [0, 0, 0], NO_INK)

  // pitched pale gray-blue roof, two gable ends and the rusty front gutter
  const rise = RIDGE - EAVE, run = D / 2 + .1, slope = Math.atan2(rise, run), slopeLen = Math.hypot(rise, run)
  box(g, [W + .2, .035, slopeLen], [CX, (RIDGE + EAVE) / 2, CZ + run / 2], roofColor, [slope, 0, 0])
  box(g, [W + .2, .035, slopeLen], [CX, (RIDGE + EAVE) / 2, CZ - run / 2], roofColor, [-slope, 0, 0])
  box(g, [W + .22, .04, .16], [CX, RIDGE + .002, CZ], roofEdge)
  const gable = (x) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([x, EAVE, Z1, x, EAVE, Z0, x, RIDGE, CZ], 3))
    geo.computeVertexNormals()
    return mesh(g, geo, mat(frame, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], NO_INK)
  }
  gable(X0 + .012)
  gable(X1 - .012)
  for (let i = 0; i < 2; i++) box(g, [.05, .01, .3], [-5.05 + i * .82, 2.32 - i * .025, 2.16 + i * .06], rustWash, [slope, 0, 0], NO_INK)
  plain(cylinder(g, .04, .04, W + .18, [CX, 2.175, Z1 + .095], p.rust, 10)).rotation.z = Math.PI / 2
  for (const bx of [-5.2, -4.35, -3.5]) box(g, [.03, .07, .05], [bx, 2.215, Z1 + .08], p.metal, [0, 0, 0], NO_INK)
  plain(cylinder(g, .028, .028, 1.34, [X0 + .12, 1.49, Z1 + .095], p.rust, 8))
  plain(cylinder(g, .028, .028, 1.34, [X1 - .12, 1.49, Z1 + .095], p.rust, 8))
  box(g, [.06, .05, .12], [X0 + .12, .81, Z1 + .06], p.rust, [0, 0, 0], NO_INK)
  box(g, [.06, .05, .12], [X1 - .12, .81, Z1 + .06], p.rust, [0, 0, 0], NO_INK)

  // small warm lamp under the eave, above the open bay
  box(g, [.03, .03, .16], [OC, 2.18, Z1 + .07], p.metal, [0, 0, 0], NO_INK)
  plain(cylinder(g, .035, .095, .08, [OC, 2.13, Z1 + .16], '#5d7570', 10))
  sphere(g, .037, [OC, 2.08, Z1 + .16], bulbMat, 9)

  // interior: dark cavity wall, warm ceiling, faint window shafts and drifting caustic patches
  box(g, [W - .02, .04, D - .02], [CX, 2.16, CZ], cavityTop, [0, 0, 0], NO_INK)
  box(g, [W - .12, .92, .02], [CX, 1.26, Z0 + .065], cavity, [0, 0, 0], NO_INK)
  box(g, [.72, .3, .02], [-4.6, 1.32, Z0 + .082], '#6d5f4d', [0, 0, 0], NO_INK)
  label(g, '800 / 1,200 / 650', .64, [-4.6, 1.32, Z0 + .094], [0, 0, 0], '#e8ecdc', '#31504b')
  box(g, [.74, .018, .05], [-4.6, 1.165, Z0 + .09], '#8b7d63', [0, 0, 0], NO_INK)

  const caustics = new THREE.Group()
  g.add(caustics)
  for (let i = 0; i < 4; i++) {
    box(caustics, [.16 + rand() * .12, .004, .11 + rand() * .08],
      [-4.95 + rand() * .95, 2.135, 1.15 + rand() * .8], causticMat, [0, rand() * 1.2, 0], NO_INK)
  }
  animate(caustics, t => {
    caustics.position.x = Math.sin(t * .21) * .02
    caustics.position.z = Math.cos(t * .17) * .015
  })
  const shaftAngle = Math.atan2(-.72, -1.15)
  for (let i = 0; i < 2; i++) box(g, [1.15, .1, .18], [-3.95, 1.42, 1.32 + i * .62], shaftMat, [0, 0, shaftAngle], NO_INK)

  // round 4: a few soft sea-glass / gold water glints on the ceiling and the high inner wall.
  // Only six small quads (six extra draw calls: ~0.1% of the r3 5002, far under the 5% cap);
  // transparent pieces never batch, so they stay this small on purpose. Each one drifts on its
  // own slow sine, and no rand() is consumed here so the other modules keep their exact layout.
  const glintTeal = mat('#a9d8cf', { transparent: true, opacity: .16, depthWrite: false })
  const glintGold = mat('#f2e3ad', { transparent: true, opacity: .14, depthWrite: false })
  const glints = [
    [.3, .004, .2, -4.62, 2.132, 2.0, glintTeal, 0],
    [.2, .004, .14, -4.18, 2.132, 1.84, glintGold, .3],
    [.34, .004, .22, -3.66, 2.132, 1.72, glintTeal, -.2],
    [.46, .004, .3, -3.5, 2.13, 2.04, glintTeal, .15],
    [.22, .11, .004, -4.86, 1.6, Z0 + .1, glintTeal, -.12],
    [.16, .085, .004, -4.2, 1.54, Z0 + .102, glintGold, .1]
  ]
  glints.forEach(([w, h, d, gx, gy, gz, color, yaw], i) => {
    const patch = box(g, [w, h, d], [gx, gy, gz], color, [0, yaw, 0], NO_INK)
    const base = patch.position.clone(), phase = i * 1.7
    animate(patch, t => {
      patch.position.x = base.x + Math.sin(t * (.24 + i * .012) + phase) * .026
      patch.position.z = base.z + Math.cos(t * (.16 + i * .009) + phase) * .016
      const breathe = 1 + Math.sin(t * (.29 + i * .01) + phase) * .13
      patch.scale.set(breathe, 1, breathe)
    })
  })

  // fish boxes: white bodies with blue rims, one blue basket, stacked near the bay
  const crate = (x, z, y, body, rim) => {
    box(g, [.33, .12, .25], [x, y + .06, z], body, [0, 0, 0], NO_INK)
    box(g, [.35, .03, .27], [x, y + .135, z], rim, [0, 0, 0], NO_INK)
  }
  const stacks = [[-4.98, 1.88, 3, '#e3eae1', p.blue], [-4.66, 1.7, 2, '#e3eae1', p.blue], [-5.2, 1.5, 1, p.blue, frame]]
  stacks.forEach(([sx, sz, n, body, rim]) => {
    for (let i = 0; i < n; i++) crate(sx + (rand() - .5) * .03, sz + (rand() - .5) * .03, FLOOR + i * .16, body, rim)
  })

  // rubber boots hung on the wall, swaying a little above the chest
  const boots = new THREE.Group()
  boots.position.set(-3.85, 1.52, .93)
  g.add(boots)
  for (const dx of [-.085, .085]) {
    box(boots, [.1, .28, .07], [dx, -.2, .02], '#3f5d55', [0, 0, 0], NO_INK)
    box(boots, [.1, .07, .11], [dx, -.36, .06], '#324c46', [0, 0, 0], NO_INK)
    box(boots, [.012, .09, .012], [dx, -.02, .005], p.metal, [0, 0, 0], NO_INK)
  }
  animate(boots, t => { boots.rotation.x = Math.sin(t * .8) * .05 })

  // ice chest, analog platform scale, wet floor and scattered ice
  box(g, [.5, .3, .32], [-4.12, FLOOR + .15, 1.5], '#eef1ea', [0, 0, 0], NO_INK)
  box(g, [.54, .06, .36], [-4.12, FLOOR + .33, 1.5], '#dbe4dc', [0, 0, 0], NO_INK)
  box(g, [.08, .05, .02], [-4.12, FLOOR + .29, 1.67], p.blue, [0, 0, 0], NO_INK)
  box(g, [.03, .04, .18], [-3.86, FLOOR + .19, 1.5], p.metal, [0, 0, 0], NO_INK)
  box(g, [.03, .04, .18], [-4.38, FLOOR + .19, 1.5], p.metal, [0, 0, 0], NO_INK)

  box(g, [.32, .07, .32], [-3.72, FLOOR + .035, 1.8], '#5d7570', [0, 0, 0], NO_INK)
  box(g, [.25, .02, .25], [-3.72, FLOOR + .08, 1.8], '#dfe5da', [0, 0, 0], NO_INK)
  plain(cylinder(g, .026, .03, .36, [-3.72, FLOOR + .27, 1.8], '#5d7570', 10))
  plain(cylinder(g, .11, .11, .03, [-3.65, FLOOR + .46, 1.8], '#f6f2df', 18)).rotation.z = Math.PI / 2
  plain(cylinder(g, .125, .125, .02, [-3.672, FLOOR + .46, 1.8], '#3e5652', 18)).rotation.z = Math.PI / 2
  box(g, [.035, .03, .05], [-3.69, FLOOR + .46, 1.8], '#3e5652', [0, 0, 0], NO_INK)
  box(g, [.004, .012, .08], [-3.632, FLOOR + .47, 1.8], p.rust, [.5, 0, 0], NO_INK)

  const puddle = (x, z, r) => plain(cylinder(g, r, r, .006, [x, FLOOR + .004, z], wet, 16))
  puddle(-4.62, 2.02, .14)
  puddle(-5.02, 1.55, .08)
  box(g, [.2, .006, .14], [-4.34, FLOOR + .004, 1.98], '#5d7570', [0, 0, 0], NO_INK)

  for (let i = 0; i < 4; i++) {
    const a = rand() * Math.PI * 2, d = .08 + rand() * .24
    box(g, [.05 + rand() * .03, .022, .045 + rand() * .03],
      [-4.35 + Math.cos(a) * d, FLOOR + .011, 1.95 + Math.sin(a) * d * .6], iceMat, [0, rand() * .9, 0], NO_INK)
  }

  // warm bulb inside and dust hanging in the window shafts
  box(g, [.015, .1, .015], [-4.35, 2.1, 1.7], p.metal, [0, 0, 0], NO_INK)
  sphere(g, .045, [-4.35, 2.04, 1.7], bulbMat, 10)

  const moteMat = mat('#f6e8b4', { transparent: true, opacity: .6, depthWrite: false })
  for (let i = 0; i < 4; i++) {
    const mote = sphere(g, .011, [-4.45 + rand() * .8, 1.2 + rand() * .5, 1.25 + rand() * .6], moteMat, 8)
    const base = mote.position.clone(), phase = rand() * 6.283
    animate(mote, t => {
      mote.position.y = base.y + Math.sin(t * .45 + phase) * .035
      mote.position.x = base.x + Math.sin(t * .2 + phase) * .02
    })
  }

  return g
}
