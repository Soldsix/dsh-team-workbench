// 23-lighthouse — far low breakwater with a tiny red-and-white lighthouse.
// Owns only src/components/23-lighthouse.js: no water, land, foam or other props.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const g = new THREE.Group()
  g.name = 'far-breakwater-lighthouse'

  // Fixed layout: wall at z=-5.2, x=-1.1..5.4, walkable top y=.62,
  // tower 1.6 above that top (world y 2.22).
  const X0 = -1.1
  const X1 = 5.4
  const Z = -5.2
  const HALF = .25
  const WALL = HALF * 2
  const MID = (X0 + X1) / 2
  const TOP = .62
  const LX = 4.9
  const RED = '#cd7365'
  const WHITE = '#f2efdd'

  // ---- submerged footing resting on the shared seabed; no water is added ----
  box(g, [X1 - X0, 1.5, WALL + .1], [MID, -.8, Z], p.concreteDark, [0, 0, 0], false)

  // ---- two courses of worn concrete blocks with staggered joints ----
  const courses = [{ y0: -.05, h: .38, n: 9, gap: .014 }, { y0: .33, h: .22, n: 8, gap: .02 }]
  for (const course of courses) {
    const len = (X1 - X0 - course.gap * (course.n - 1)) / course.n
    for (let i = 0; i < course.n; i += 1) {
      const h = course.h + (rand() - .5) * .022
      const tone = [p.concrete, p.concreteLight, p.concreteDark, p.concreteLight][i % 4]
      box(g, [len, h, WALL + (i % 5 === 0 ? .012 : 0)],
        [X0 + len * (i + .5) + course.gap * i, course.y0 + h / 2, Z], tone)
    }
  }

  // heavier head blocks at both ends of the wall
  for (const x of [X0 + .1, X1 - .1]) box(g, [.2, .6, WALL + .08], [x, .25, Z], p.concreteDark)

  // coping, then the narrow safe path whose surface is exactly y=.62
  box(g, [X1 - X0 + .06, .05, WALL + .06], [MID, .575, Z], p.concrete)
  box(g, [X1 - X0 - .02, .02, .30], [MID, .61, Z], p.concreteLight)
  for (let i = 0; i < 6; i += 1) {
    const x = X0 + .58 + i * 1.02
    line(g, [[x, .621, Z - .15], [x, .621, Z + .15]], p.concreteDark, .35)
  }
  for (let i = 0; i < 4; i += 1) {
    box(g, [.26, .002, .09], [X0 + .95 + i * 1.35 + (rand() - .5) * .3, .6215, Z + (rand() - .5) * .08],
      p.concreteDark, [0, 0, 0], false)
  }

  // damp tide line, rain streaks and a chipped corner on the visible +z face
  box(g, [X1 - X0 - .32, .07, .012], [MID, .158, Z + HALF + .006], p.concreteDark, [0, 0, 0], false)
  for (let i = 0; i < 7; i += 1) {
    const h = .16 + rand() * .26
    const x = X0 + .38 + i * .92 + (rand() - .5) * .2
    box(g, [.045 + rand() * .03, h, .012], [x, .5 - h / 2, Z + HALF + .006], p.concreteDark, [0, 0, 0], false)
  }
  box(g, [.07, .06, .045], [X0 + 1.66, .31, Z + HALF - .012], p.concreteDark, [.15, .3, .1], false)

  // ======================= lighthouse (top y .62 -> 2.22) ==================
  const tower = new THREE.Group()
  tower.position.set(LX, TOP, Z)
  g.add(tower)

  // octagonal concrete plinth, then four tapered red/white bands
  cylinder(tower, .235, .255, .09, [0, .045, 0], p.concreteLight, 8)
  const bands = [[WHITE, .205, .181], [RED, .181, .157], [WHITE, .157, .133], [RED, .133, .109]]
  bands.forEach(([color, bottom, top], i) => {
    cylinder(tower, top, bottom, .21, [0, .09 + .21 * (i + .5), 0], color, 16)
  })

  // gallery deck, eight stanchions and the rail ring
  cylinder(tower, .175, .175, .035, [0, .9475, 0], '#dfe0d2', 16)
  for (let i = 0; i < 8; i += 1) {
    const a = (i / 8) * Math.PI * 2
    box(tower, [.012, .115, .012], [Math.cos(a) * .168, 1.0225, Math.sin(a) * .168], p.metal)
  }
  mesh(tower, new THREE.TorusGeometry(.168, .008, 6, 24), p.metal, [0, 1.08, 0], [Math.PI / 2, 0, 0])
  mesh(tower, new THREE.TorusGeometry(.168, .005, 6, 24), p.metal, [0, 1.02, 0], [Math.PI / 2, 0, 0])

  // clear lantern with a warm lamp core, halo and rarely used pale beam
  const glass = mat(p.glass, { transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide })
  cylinder(tower, .11, .11, .02, [0, .975, 0], p.metal, 12)
  cylinder(tower, .095, .105, .24, [0, 1.085, 0], glass, 12)
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2 + Math.PI / 4
    box(tower, [.011, .24, .011], [Math.cos(a) * .1, 1.085, Math.sin(a) * .1], p.metal)
  }
  cylinder(tower, .05, .06, .13, [0, 1.08, 0], mat('#f8efcd', { emissive: '#e8d9a2', emissiveIntensity: .45 }), 10)
  const glowMat = new THREE.MeshBasicMaterial({ color: '#f7ebc6', transparent: true, opacity: .07, depthWrite: false })
  const beamMat = new THREE.MeshBasicMaterial({ color: '#f4e8bf', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide })
  const glow = sphere(tower, .17, [0, 1.085, 0], glowMat, 12)
  mesh(tower, new THREE.ConeGeometry(.155, 1.6, 14, 1, true), beamMat, [0, 1.085, .8], [-Math.PI / 2, 0, 0], false)

  // red cap, finial and lightning rod (rod top local 1.6 = world 2.22)
  mesh(tower, new THREE.ConeGeometry(.152, .15, 14), RED, [0, 1.28, 0])
  sphere(tower, .034, [0, 1.366, 0], RED, 8)
  cylinder(tower, .005, .005, .23, [0, 1.485, 0], p.metal, 6)

  // fine ladder on the +z face, following the taper of the tower
  const zLow = .24
  const zHigh = .13
  for (const x of [-.05, .05]) beam(tower, [x, .04, zLow], [x, .93, zHigh], .012, p.metal)
  for (let i = 0; i < 9; i += 1) {
    const t = i / 8
    box(tower, [.11, .011, .012], [0, .06 + .86 * t, zLow + (zHigh - zLow) * t], p.metal)
  }

  // seaward door, small window, weather cabinet and its feed cable
  box(tower, [.01, .16, .085], [.203, .125, 0], '#4a6663')
  box(tower, [.01, .05, .05], [.163, .52, 0], glass, [0, 0, 0], false)
  box(tower, [.09, .13, .07], [.13, .155, .19], p.concrete)
  curve(tower, [[.1, .99, .02], [.14, .72, .1], [.16, .42, .16], [.12, .225, .185]], p.dark, .012)

  // Assigned beacon: one brief pale flash per 85 s, relative to stored base transforms.
  animate(tower, time => {
    const cycle = time % 85
    const flash = cycle > 61.2 && cycle < 62.8 ? Math.sin(Math.PI * (cycle - 61.2) / 1.6) : 0
    const idle = .06 + .018 * Math.sin(time * 1.21)
    glowMat.opacity = Math.max(idle, flash * .36)
    beamMat.opacity = flash * .13
    glow.scale.setScalar(1 + flash * .55)
  })

  // A distant breakwater silhouette is deliberately not added: the square base
  // must not grow extra land, and the backdrop is owned by another module.
  return g
}
