export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const g = new THREE.Group()
  g.name = 'cooperative-warehouse'

  // fixed plot: centre (-4.35, 1.6), 2.4 x 1.5, eave 2.2, ridge 2.53 above the quay top (y = .8)
  const X0 = -5.55, X1 = -3.15, Z0 = .85, Z1 = 2.35
  const CX = -4.35, CZ = 1.6, FLOOR = .86, EAVE = 2.2, RIDGE = 2.53
  const W = X1 - X0, D = Z1 - Z0
  const pale = p.concreteLight, wall = p.concrete, damp = p.concreteDark
  const roofColor = '#b7c8cc', roofEdge = '#9db1b6'
  const warmGlass = mat('#f5e3ab', { transparent: true, opacity: .3, depthWrite: false, side: THREE.DoubleSide })
  const wet = mat(p.water, { transparent: true, opacity: .38, depthWrite: false })
  const shaftMat = mat(p.gold, { transparent: true, opacity: .08, depthWrite: false, side: THREE.DoubleSide })
  const rustWash = mat(p.rust, { transparent: true, opacity: .45, depthWrite: false })
  const iceMat = mat('#e6f3ef', { transparent: true, opacity: .8, depthWrite: false })
  const causticMat = mat(p.gold, { transparent: true, opacity: .13, depthWrite: false })
  const warmBulb = mat('#fff2cc', { emissive: '#f2d98d', emissiveIntensity: .6 })

  // own thin floor slab inside the plot; the shared quay surface belongs to the base/quay modules
  box(g, [W, .06, D], [CX, .83, CZ], '#bcc7c1')

  // shell: back and left walls are solid, the harbour (+x) side is cut open into a high warm window band
  box(g, [W, EAVE - .8, .06], [CX, (EAVE + .8) / 2, Z0 + .03], wall)
  box(g, [.06, EAVE - .8, D], [X0 + .03, (EAVE + .8) / 2, CZ], wall)
  box(g, [.06, .88, D], [X1 - .03, 1.24, CZ], wall)
  box(g, [.06, .18, D], [X1 - .03, 2.11, CZ], wall)
  box(g, [.07, .05, D], [X1 - .03, 1.665, CZ], pale)
  box(g, [.07, .05, D], [X1 - .03, 2.045, CZ], pale)
  box(g, [.07, .34, .1], [X1 - .03, 1.85, .9], pale)
  box(g, [.07, .34, .06], [X1 - .03, 1.85, 1.0], pale)
  box(g, [.07, .34, .06], [X1 - .03, 1.85, 1.65], pale)
  box(g, [.07, .34, .06], [X1 - .03, 1.85, 2.29], pale)
  box(g, [.02, .3, .56], [X1 - .03, 1.85, 1.32], warmGlass)
  box(g, [.02, .3, .56], [X1 - .03, 1.85, 1.97], warmGlass)

  // front facade (+z) with the half-raised roller shutter and the faded cooperative sign
  box(g, [.93, EAVE - .8, .06], [-5.085, 1.5, Z1 - .03], wall)
  box(g, [.27, EAVE - .8, .06], [-3.285, 1.5, Z1 - .03], wall)
  box(g, [1.2, .18, .06], [-4.02, 2.11, Z1 - .03], wall)
  box(g, [1.26, .14, .13], [-4.02, 2.0, Z1 - .04], '#aebbb8')
  const roll = cylinder(g, .045, .045, 1.18, [-4.02, 1.955, Z1 - .04], '#b9c5c1', 12)
  roll.rotation.z = Math.PI / 2
  box(g, [1.16, .31, .03], [-4.02, 1.775, Z1 - .025], '#c6d1cc')
  for (let i = 0; i < 4; i++) box(g, [1.14, .007, .008], [-4.02, 1.7 + i * .062, Z1 - .006], damp, [0, 0, 0], false)
  box(g, [1.16, .022, .04], [-4.02, 1.63, Z1 - .02], p.metal)
  box(g, [.03, .46, .06], [-4.61, 1.78, Z1 - .02], p.metal)
  box(g, [.03, .46, .06], [-3.43, 1.78, Z1 - .02], p.metal)
  label(g, '漁協倉庫', .56, [-5.06, 1.93, Z1 + .006], [0, 0, 0], '#4b6b68', '#ecebd6')
  for (let i = 0; i < 3; i++) box(g, [.34, .018, .02], [-5.06, 1.44 + i * .05, Z1 + .004], damp, [0, 0, 0], false)
  box(g, [.93, .2, .02], [-5.085, .9, Z1 + .004], damp)
  box(g, [.27, .2, .02], [-3.285, .9, Z1 + .004], damp)
  box(g, [.02, .26, D], [X1 + .004, .93, CZ], damp)
  box(g, [1.28, .06, .14], [-4.02, .83, Z1 + .03], pale)

  // pitched pale gray-blue roof, two gable ends and the rusty front gutter
  const rise = RIDGE - EAVE, run = D / 2 + .1
  const slope = Math.atan2(rise, run)
  const slopeLen = Math.hypot(rise, run)
  box(g, [W + .2, .035, slopeLen], [CX, (RIDGE + EAVE) / 2, CZ + run / 2], roofColor, [slope, 0, 0])
  box(g, [W + .2, .035, slopeLen], [CX, (RIDGE + EAVE) / 2, CZ - run / 2], roofColor, [-slope, 0, 0])
  box(g, [W + .22, .04, .16], [CX, RIDGE + .002, CZ], roofEdge)
  const gable = (x) => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute([x, EAVE, Z1, x, EAVE, Z0, x, RIDGE, CZ], 3))
    geo.computeVertexNormals()
    return mesh(g, geo, mat(pale, { side: THREE.DoubleSide }), [0, 0, 0], [0, 0, 0], false)
  }
  gable(X0 + .012)
  gable(X1 - .012)
  for (let i = 0; i < 3; i++) box(g, [.05, .01, .3], [-5.1 + i * .78, 2.32 - i * .027, 2.14 + i * .07], rustWash, [slope, 0, 0], false)
  const gutter = cylinder(g, .04, .04, W + .18, [CX, 2.175, Z1 + .095], p.rust, 10)
  gutter.rotation.z = Math.PI / 2
  for (let i = 0; i < 3; i++) box(g, [.03, .07, .05], [-5.2 + i * .85, 2.215, Z1 + .08], p.metal, [0, 0, 0], false)
  cylinder(g, .028, .028, 1.34, [X0 + .12, 1.49, Z1 + .095], p.rust, 8)
  cylinder(g, .028, .028, 1.34, [X1 - .12, 1.49, Z1 + .095], p.rust, 8)
  box(g, [.06, .05, .12], [X0 + .12, .83, Z1 + .06], p.rust)
  box(g, [.06, .05, .12], [X1 - .12, .83, Z1 + .06], p.rust)

  // small warm lamp under the eave, above the open shutter
  beam(g, [-4.02, 2.17, Z1 + .01], [-4.02, 2.17, Z1 + .17], .03, p.metal)
  cylinder(g, .035, .095, .08, [-4.02, 2.12, Z1 + .17], p.metal, 10)
  sphere(g, .037, [-4.02, 2.07, Z1 + .17], warmBulb, 9)

  // interior ceiling, drifting caustic patches and daylight shafts from the high side windows
  box(g, [W - .02, .04, D - .02], [CX, 2.16, CZ], '#d6dcd2')
  const caustics = new THREE.Group()
  g.add(caustics)
  for (let i = 0; i < 7; i++) {
    box(caustics, [.18 + rand() * .14, .004, .12 + rand() * .1],
      [-5.05 + rand() * 1.25, 2.135, 1.05 + rand() * .85], causticMat, [0, rand() * 1.2, 0], false)
  }
  animate(caustics, t => {
    caustics.position.x = Math.sin(t * .21) * .02
    caustics.position.z = Math.cos(t * .17) * .015
  })
  const shaftAngle = Math.atan2(-.78, -1.3)
  for (let i = 0; i < 2; i++) box(g, [1.5, .16, .26], [-3.9, 1.45, 1.32 + i * .66], shaftMat, [0, 0, shaftAngle], false)

  // fishbox stacks at the back left
  const crate = (x, z, y, body, rim) => {
    box(g, [.33, .12, .25], [x, y + .06, z], body)
    box(g, [.35, .03, .27], [x, y + .135, z], rim)
  }
  const stacks = [[-5.26, 1.06, 4, pale, p.blue], [-5.24, 1.38, 3, pale, p.blue], [-4.93, 1.08, 3, pale, p.blue]]
  stacks.forEach(([sx, sz, n, body, rim]) => {
    for (let i = 0; i < n; i++) crate(sx + (rand() - .5) * .03, sz + (rand() - .5) * .03, FLOOR + i * .16, body, rim)
  })
  crate(-4.62, 1.12, FLOOR, p.blue, pale)
  crate(-4.62, 1.12, FLOOR + .16, p.blue, pale)

  // blackboard with tiny auction prices on the back wall
  box(g, [.76, .32, .02], [-4.45, 1.36, Z0 + .065], '#8b7d63')
  label(g, '800 / 1,200 / 650', .68, [-4.45, 1.36, Z0 + .078], [0, 0, 0], '#e9eadb', '#37504c')
  box(g, [.78, .02, .05], [-4.45, 1.19, Z0 + .08], pale)

  // rubber boots hung on the back wall above the chest, still swinging a little
  const boots = new THREE.Group()
  boots.position.set(-3.78, 1.66, .93)
  g.add(boots)
  for (const dx of [-.085, .085]) {
    box(boots, [.1, .3, .07], [dx, -.2, .02], '#4f6b62')
    box(boots, [.1, .07, .11], [dx, -.36, .06], '#3f5a54')
    box(boots, [.012, .09, .012], [dx, -.02, .005], p.metal)
  }
  animate(boots, t => { boots.rotation.x = Math.sin(t * .8) * .05 })

  // ice chest, analog platform scale, wet floor with puddles, scattered ice
  box(g, [.5, .3, .32], [-3.92, FLOOR + .15, 1.12], '#eef1ea')
  box(g, [.54, .06, .36], [-3.92, FLOOR + .33, 1.12], '#dde6df')
  box(g, [.08, .05, .02], [-3.92, FLOOR + .29, 1.29], p.blue)
  box(g, [.03, .04, .18], [-3.66, FLOOR + .19, 1.12], p.metal)
  box(g, [.03, .04, .18], [-4.18, FLOOR + .19, 1.12], p.metal)

  box(g, [.32, .07, .32], [-3.56, FLOOR + .035, 1.62], p.metal)
  box(g, [.25, .02, .25], [-3.56, FLOOR + .08, 1.62], pale)
  cylinder(g, .026, .03, .36, [-3.56, FLOOR + .27, 1.62], p.metal, 10)
  const dial = cylinder(g, .11, .11, .03, [-3.49, FLOOR + .5, 1.62], '#eff0e2', 18)
  dial.rotation.z = Math.PI / 2
  const dialRim = cylinder(g, .125, .125, .02, [-3.512, FLOOR + .5, 1.62], p.metal, 18)
  dialRim.rotation.z = Math.PI / 2
  box(g, [.035, .03, .05], [-3.53, FLOOR + .5, 1.62], p.metal)
  box(g, [.004, .012, .085], [-3.472, FLOOR + .51, 1.62], p.rust, [.5, 0, 0], false)

  const puddle = (x, z, r) => cylinder(g, r, r, .006, [x, FLOOR + .004, z], wet, 16)
  puddle(-4.7, 1.92, .16)
  puddle(-3.95, 1.42, .09)
  puddle(-5.05, 1.62, .07)
  box(g, [.22, .008, .16], [-4.3, FLOOR + .005, 1.66], p.metal, [0, 0, 0], false)

  for (let i = 0; i < 7; i++) {
    const a = rand() * Math.PI * 2, d = .1 + rand() * .3
    box(g, [.05 + rand() * .03, .022, .045 + rand() * .03],
      [-4.05 + Math.cos(a) * d, FLOOR + .011, 1.52 + Math.sin(a) * d * .6], iceMat, [0, rand() * .9, 0], false)
  }

  // warm interior bulb and the dust that hangs in the window shafts
  box(g, [.015, .1, .015], [-4.35, 2.1, 1.4], p.metal, [0, 0, 0], false)
  sphere(g, .045, [-4.35, 2.04, 1.4], warmBulb, 10)

  const moteMat = mat('#f6e8b4', { transparent: true, opacity: .75, depthWrite: false })
  for (let i = 0; i < 6; i++) {
    const mote = sphere(g, .012, [-4.55 + rand() * .95, 1.2 + rand() * .6, 1.1 + rand() * .7], moteMat, 8)
    const base = mote.position.clone(), phase = rand() * 6.283
    animate(mote, t => {
      mote.position.y = base.y + Math.sin(t * .45 + phase) * .04
      mote.position.x = base.x + Math.sin(t * .2 + phase) * .02
    })
  }

  return g
}
