// 13-lamps.js — three slim weathered pier lamps with circular ring shades.
// Each lamp owns a translucent warm pale cover, rusted seams, fine support
// braces and occasional golden droplets that gather on the rim and fall.
// First pass, source only. Owner: artist-13-lamps.
// Interface: export function create(ctx) -> THREE.Group
export function create (ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '13-lamps'

  const iron = '#425d5b'
  const ironDark = '#345050'
  const rust = '#a97a58'
  const rustDeep = '#8d6045'
  const brass = '#c4a469'
  const ironMat = mat(iron)
  const ironDarkMat = mat(ironDark)
  const rustMat = mat(rust)
  const rustDeepMat = mat(rustDeep)
  const brassMat = mat(brass)
  const poleAMat = mat(p.metal)
  const poleBMat = mat('#778b86')
  const warmCover = mat('#f2e2b2', { transparent: true, opacity: .45, depthWrite: false, side: THREE.DoubleSide, emissive: '#e6cd90', emissiveIntensity: .32 })
  const paleCover = mat('#e8dfbd', { transparent: true, opacity: .34, depthWrite: false, side: THREE.DoubleSide })
  const coreMat = mat('#fff3ce', { emissive: '#f4dc9b', emissiveIntensity: .5 })
  const haloMat = mat('#f5e2a6', { transparent: true, opacity: .1, depthWrite: false })
  const dropMat = mat('#f8e7ae', { transparent: true, opacity: .78, depthWrite: false })
  const beadMat = mat('#f3dda0', { transparent: true, opacity: .88, depthWrite: false })
  const plateMat = mat('#d9d6bc')

  // local wrappers around the declared helper interface only
  const ring = (parent, radius, tube, y, material, segments = 30) =>
    mesh(parent, new THREE.TorusGeometry(radius, tube, 6, segments), material, [0, y, 0], [Math.PI / 2, 0, 0], true)
  const cover = (parent, top, bottom, height, y, material, segments = 22) =>
    mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments, 1, true), material, [0, y, 0], [0, 0, 0], false)

  const specs = [
    { x: -3, z: 4.8, h: 2.6, shade: 'double', pole: poleAMat, base: p.concreteLight, drips: 3, phase: .15 },
    { x: -3.2, z: -2, h: 2.4, shade: 'belled', pole: poleBMat, base: p.concrete, drips: 2, phase: .55 },
    { x: 5, z: 4.8, h: 2.1, shade: 'globe', pole: poleAMat, base: p.concreteLight, drips: 2, phase: .82 }
  ]

  specs.forEach((spec, index) => {
    const lamp = new THREE.Group()
    lamp.name = 'pier-lamp-' + (index + 1)
    lamp.position.set(spec.x, .8, spec.z)
    const h = spec.h
    const top = h - .12

    // ---------- concrete footing, iron collar, rusted anchor bolts ----------
    cylinder(lamp, .16, .19, .08, [0, .04, 0], spec.base, 18)
    cylinder(lamp, .135, .15, .035, [0, .095, 0], ironDarkMat, 16)
    cylinder(lamp, .125, .125, .012, [0, .105, 0], rustMat, 14)
    for (let i = 0; i < 4; i++) {
      const a = rand() * Math.PI * 2
      cylinder(lamp, .016, .018, .045, [Math.cos(a) * .12, .11, Math.sin(a) * .12], brassMat, 6)
    }

    // ---------- slim tapered pole with worn paint, rust seams and blisters ----------
    cylinder(lamp, .032, .05, top - .11, [0, .11 + (top - .11) / 2, 0], spec.pole, 16)
    for (let i = 0; i < 3; i++) {
      const y = .4 + (i / 3) * (top - .95) + rand() * .09
      const r = .052 - (y / top) * .016
      cylinder(lamp, r, r, .028 + rand() * .024, [0, y, 0], i === 1 ? rustDeepMat : rustMat, 12)
    }
    for (let i = 0; i < 2; i++) {
      const a = rand() * Math.PI * 2
      const y = .55 + rand() * (top - .85)
      const r = .05 - (y / top) * .015
      box(lamp, [.022, .05 + rand() * .06, .012], [Math.cos(a) * r, y, Math.sin(a) * r], rustDeepMat, [0, -a, 0])
    }

    // ---------- small per-lamp service details ----------
    if (index === 0) {
      // junction box with a short sagging service cable
      box(lamp, [.1, .15, .08], [.062, top * .62, 0], ironDarkMat)
      box(lamp, [.052, .096, .012], [.062, top * .62, .045], rustMat)
      curve(lamp, [[.07, top * .62, .02], [.088, top * .4, .03], [.06, top * .22, .01]], '#3d5352', .011)
    } else if (index === 1) {
      // faded harbour name plate bolted to the pole
      box(lamp, [.16, .07, .014], [0, 1.24, .046], plateMat)
      box(lamp, [.03, .04, .03], [0, 1.24, .03], ironDarkMat)
      label(lamp, 'みなと', .14, [0, 1.24, .056], [0, 0, 0], '#5c7470', '#d9d6bc')
    } else {
      // conduit clamp and a thin wire running down the pole
      cylinder(lamp, .028, .038, .06, [0, top * .55, .05], ironDarkMat, 8)
      line(lamp, [[.05, top * .55, .03], [.052, top * .3, .045], [.02, top * .1, .028]], '#4a6361', .55)
    }

    // ---------- head: top ferrule then a circular ring shade ----------
    let rimR = .2
    let rimY = h - .2
    let halo = null
    cylinder(lamp, .045, .058, .1, [0, h - .08, 0], ironDarkMat, 14)
    sphere(lamp, .044, [0, h - .02, 0], ironDarkMat, 10)

    if (spec.shade === 'double') {
      // twin ring: wide iron hoop over a fine brass inner hoop
      ring(lamp, .3, .034, h + .05, ironMat, 36)
      ring(lamp, .12, .018, h + .08, brassMat, 22)
      for (let i = 0; i < 4; i++) {
        const a = i * Math.PI / 2 + .39
        beam(lamp, [0, h + .04, 0], [Math.cos(a) * .3, h + .05, Math.sin(a) * .3], .016, iron)
      }
      beam(lamp, [0, h - .03, 0], [0, h + .08, 0], .028, brass)
      cover(lamp, .085, .235, .26, h - .09, warmCover)
      ring(lamp, .235, .017, h - .22, ironDarkMat, 30)
      sphere(lamp, .062, [0, h - .09, 0], coreMat, 10)
      halo = sphere(lamp, .13, [0, h - .09, 0], haloMat, 10)
      rimR = .235
      rimY = h - .22
    } else if (spec.shade === 'belled') {
      // heavier single hoop held by three fine curved braces over a bell cover
      ring(lamp, .26, .03, h + .04, ironMat, 34)
      for (let i = 0; i < 3; i++) {
        const a = i * Math.PI * 2 / 3 + .5
        const ca = Math.cos(a)
        const sa = Math.sin(a)
        curve(lamp, [[0, h - .6, 0], [ca * .16, h - .3, sa * .16], [ca * .25, h + .02, sa * .25]], iron, .012)
      }
      cover(lamp, .075, .21, .22, h - .13, paleCover)
      ring(lamp, .21, .015, h - .24, ironDarkMat, 28)
      sphere(lamp, .055, [0, h - .13, 0], coreMat, 10)
      halo = sphere(lamp, .12, [0, h - .13, 0], haloMat, 10)
      rimR = .21
      rimY = h - .24
    } else {
      // small fine hoop with six spokes over a pale glass globe and drain cup
      ring(lamp, .23, .026, h + .03, ironMat, 30)
      for (let i = 0; i < 6; i++) {
        const a = i * Math.PI / 3 + .22
        beam(lamp, [0, h + .01, 0], [Math.cos(a) * .23, h + .03, Math.sin(a) * .23], .011, iron)
      }
      sphere(lamp, .155, [0, h - .12, 0], paleCover, 16)
      cylinder(lamp, .045, .075, .05, [0, h - .3, 0], ironDarkMat, 16)
      ring(lamp, .065, .012, h - .322, brassMat, 18)
      sphere(lamp, .05, [0, h - .12, 0], coreMat, 10)
      halo = sphere(lamp, .1, [0, h - .12, 0], haloMat, 10)
      rimR = .075
      rimY = h - .322
    }

    // ---------- golden droplets: beads swell on the rim, then slip and fall ----------
    const drips = []
    for (let i = 0; i < spec.drips; i++) {
      const a = spec.phase * Math.PI * 2 + i * 2.1 + index
      const bx = Math.cos(a) * rimR
      const bz = Math.sin(a) * rimR
      const bead = sphere(lamp, .017, [bx, rimY - .01, bz], beadMat, 8)
      const drop = sphere(lamp, .015, [bx, rimY - .02, bz], dropMat, 8)
      drop.scale.setScalar(.001)
      drips.push({ drop, bead, bx, bz, period: 3.4 + i * 1.15 + index * .4, phase: (i * .37 + spec.phase) % 1 })
    }

    animate(lamp, (t) => {
      for (const d of drips) {
        const k = (t / d.period + d.phase) % 1
        d.drop.position.set(d.bx, rimY - k * (rimY - .03), d.bz)
        const fade = k < .1 ? k / .1 : k > .86 ? (1 - k) / .14 : 1
        d.drop.scale.setScalar(Math.max(.001, fade) * .95)
        d.bead.scale.setScalar(.75 + .45 * Math.sin(Math.PI * Math.min(1, k * 1.35)))
      }
      if (halo) halo.scale.setScalar(1 + .05 * Math.sin(t * 1.6 + index * 2.1))
    })

    group.add(lamp)
  })

  return group
}
