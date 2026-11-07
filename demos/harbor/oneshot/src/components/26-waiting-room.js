// 26-waiting-room.js — 候船室与玻璃内陈设
// Owns only this file (artist-26-waiting-room). First-pass authored source for
// the sunshower harbor miniature: a small pale-cream waiting room on the left
// land strip, footprint x[-5.6,-3.2] z[-2.35,-1.05], walls y[.8,2.35], with
// very clear front and right glass, an open sliding doorway, low benches, a
// faded timetable, a retro radio, a kettle, a pothos and a slightly crooked
// wall clock under a sea-blue roof with a rain gutter. Source only; no renderer
// was run and no visual acceptance is claimed for this first pass.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const room = new THREE.Group()
  room.name = 'waiting-room'

  const cx = -4.4, cz = -1.7
  const baseY = .8, wallH = 1.55, midY = baseY + wallH / 2

  const glassMat = mat(p.glass, { transparent: true, opacity: .13, depthWrite: false, side: THREE.DoubleSide })
  const cream = mat('#f2edda')
  const wallMat = mat('#e9e5d2')
  const frameMat = mat('#eae9d5')
  const wood = mat('#c9ab7e')
  const steel = mat(p.metal)
  const roofBlue = mat(p.blue)
  const sunPatch = new THREE.MeshBasicMaterial({ color: '#f9edc2', transparent: true, opacity: .2, depthWrite: false })

  // ---------- raised floor slab, cream walls, corner posts ----------
  box(room, [2.24, .1, 1.14], [cx, .85, cz], '#dedbc7')
  for (const x of [-5.0, -4.4, -3.8]) box(room, [.014, .006, 1.14], [x, .903, cz], '#cbc7b2')
  for (const z of [-2.0, -1.4]) box(room, [2.24, .006, .014], [cx, .903, z], '#cbc7b2')
  box(room, [.08, wallH, 1.3], [-5.56, midY, cz], wallMat)
  box(room, [2.4, wallH, .08], [cx, midY, -2.31], wallMat)
  box(room, [.1, wallH, .1], [-5.56, midY, -1.05], frameMat)
  box(room, [.1, wallH, .1], [-3.24, midY, -1.05], frameMat)
  box(room, [.1, wallH, .1], [-3.24, midY, -2.31], frameMat)
  box(room, [2.24, .12, .09], [cx, 2.29, -1.05], frameMat)

  // ---------- front glazing: clear panes, open sliding doorway ----------
  box(room, [1.07, .34, .09], [-4.995, .97, -1.05], frameMat)
  box(room, [.31, .34, .09], [-3.425, .97, -1.05], frameMat)
  box(room, [.06, 1.33, .08], [-4.45, 1.565, -1.05], frameMat)
  box(room, [.06, 1.33, .08], [-3.59, 1.565, -1.05], frameMat)
  box(room, [1.03, 1.09, .012], [-4.995, 1.685, -1.05], glassMat, [0, 0, 0], false)
  box(room, [.27, 1.09, .012], [-3.425, 1.685, -1.05], glassMat, [0, 0, 0], false)
  box(room, [1.03, .03, .05], [-4.995, 1.68, -1.05], frameMat)
  box(room, [.03, 1.09, .05], [-4.995, 1.685, -1.05], frameMat)
  box(room, [.8, .12, .14], [-4.02, .86, -1.05], '#d6d3c0')
  box(room, [1.04, .08, .34], [-4.02, .84, -.86], '#cfd2c3')

  // sliding glass leaf, slid open against the left pane
  const leaf = new THREE.Group()
  leaf.position.set(-5.04, 0, -1.15)
  room.add(leaf)
  box(leaf, [.72, .05, .035], [0, .945, 0], frameMat)
  box(leaf, [.72, .05, .035], [0, 2.155, 0], frameMat)
  box(leaf, [.04, 1.26, .035], [-.34, 1.55, 0], frameMat)
  box(leaf, [.04, 1.26, .035], [.34, 1.55, 0], frameMat)
  box(leaf, [.64, 1.16, .008], [0, 1.55, 0], glassMat, [0, 0, 0], false)
  box(leaf, [.022, .11, .022], [.29, 1.5, .03], steel)
  box(room, [.88, .035, .07], [-5.04, 2.2, -1.13], steel)

  line(room, [[-5.4, 1.24, -1.033], [-5.02, 1.95, -1.033]], '#f7fbf5', .4)
  line(room, [[-4.84, 1.3, -1.033], [-4.6, 1.74, -1.033]], '#f7fbf5', .3)

  // ---------- right glass wall ----------
  box(room, [.09, .34, 1.16], [-3.24, .97, -1.68], frameMat)
  box(room, [.09, .12, 1.16], [-3.24, 2.29, -1.68], frameMat)
  box(room, [.012, 1.09, 1.16], [-3.235, 1.685, -1.68], glassMat, [0, 0, 0], false)
  box(room, [.05, .03, 1.16], [-3.235, 1.68, -1.68], frameMat)
  box(room, [.05, 1.09, .03], [-3.235, 1.685, -1.68], frameMat)
  line(room, [[-3.226, 1.28, -2.16], [-3.226, 1.94, -1.76]], '#f7fbf5', .32)

  // ---------- sea-blue roof, gutter, downspout, roof fittings ----------
  box(room, [2.6, .09, 1.5], [cx, 2.395, cz], roofBlue)
  box(room, [2.6, .07, .04], [cx, 2.36, -.955], frameMat)
  box(room, [2.5, .012, .02], [cx, 2.442, -1.2], '#6f9fb0')
  box(room, [2.5, .012, .02], [cx, 2.442, -2.0], '#6f9fb0')
  beam(room, [-5.65, 2.31, -.94], [-3.15, 2.31, -.94], .06, '#5f93a4')
  box(room, [.03, .04, .07], [-5.05, 2.335, -.94], '#5f93a4')
  box(room, [.03, .04, .07], [-3.75, 2.335, -.94], '#5f93a4')
  beam(room, [-3.17, 2.3, -.94], [-3.17, .9, -.94], .045, '#5f93a4')
  beam(room, [-3.17, .9, -.94], [-3.17, .8, -.72], .045, '#5f93a4')
  cylinder(room, .045, .045, .22, [-5.15, 2.55, -2.12], '#b7c2ba')
  cylinder(room, .062, .062, .025, [-5.15, 2.67, -2.12], frameMat)
  box(room, [.32, .035, .24], [-3.8, 2.455, -2.05], '#93b1b7')
  box(room, [.09, .02, .025], [-3.8, 2.482, -1.95], '#6f8d93')

  // name plate over the open doorway
  label(room, '待合室', .36, [-4.02, 2.29, -1.0], [0, 0, 0], '#3f6a6e', '#eae8d2')

  // ---------- interior shell: ceiling, pendant, wall trim ----------
  box(room, [2.24, .03, 1.14], [cx, 2.315, cz], cream)
  beam(room, [-4.4, 2.305, -1.6], [-4.4, 2.17, -1.6], .012, p.metal)
  cylinder(room, .03, .085, .06, [-4.4, 2.14, -1.6], '#e9e4cf')
  sphere(room, .028, [-4.4, 2.1, -1.6], '#f4e6b4')
  box(room, [2.2, .025, .012], [cx, 1.08, -2.262], '#d9d5bf')

  // ---------- low wooden benches facing the glass ----------
  for (const bx of [-4.86, -4.04]) {
    box(room, [.8, .06, .3], [bx, 1.21, -2.06], wood)
    box(room, [.7, .04, .04], [bx, .99, -2.06], steel)
    for (const dx of [-.32, .32]) for (const dz of [-.11, .11]) {
      box(room, [.05, .28, .05], [bx + dx, 1.04, -2.06 + dz], steel)
    }
  }
  box(room, [.34, .05, .24], [-4.7, 1.265, -2.06], '#b9ccbd')

  // ---------- side table, kettle, cup, bin ----------
  box(room, [.42, .05, .32], [-5.27, 1.2, -1.6], wood)
  for (const dx of [-.17, .17]) for (const dz of [-.12, .12]) {
    box(room, [.035, .3, .035], [-5.27 + dx, 1.05, -1.6 + dz], steel)
  }
  cylinder(room, .06, .075, .12, [-5.26, 1.285, -1.62], '#efece0')
  cylinder(room, .045, .05, .02, [-5.26, 1.35, -1.62], '#dcd6c2')
  sphere(room, .017, [-5.26, 1.368, -1.62], p.gold)
  beam(room, [-5.2, 1.28, -1.62], [-5.15, 1.34, -1.62], .018, '#efece0')
  curve(room, [[-5.26, 1.345, -1.55], [-5.26, 1.42, -1.61], [-5.26, 1.345, -1.67]], p.metal, .011)
  cylinder(room, .045, .045, .008, [-5.38, 1.229, -1.53], '#e3dcc8')
  cylinder(room, .03, .026, .045, [-5.38, 1.2475, -1.53], '#f2efe2')
  cylinder(room, .065, .058, .15, [-5.3, .975, -1.2], steel)
  cylinder(room, .07, .07, .015, [-5.3, 1.055, -1.2], '#9aa7a2')

  // ---------- faded timetable board on the back wall ----------
  box(room, [.52, .22, .015], [-4.06, 1.53, -2.257], '#efe9d2')
  label(room, '時刻表', .3, [-4.06, 1.588, -2.245], [0, 0, 0], '#5f7a74', '#efe9d2')
  box(room, [.4, .008, .006], [-4.07, 1.498, -2.245], '#9aa79a')
  box(room, [.32, .008, .006], [-4.11, 1.476, -2.245], '#9aa79a')
  box(room, [.36, .008, .006], [-4.09, 1.454, -2.245], '#9aa79a')
  box(room, [.1, .012, .006], [-3.97, 1.492, -2.245], '#c98966')
  box(room, [.56, .018, .02], [-4.06, 1.645, -2.25], wood)
  box(room, [.56, .018, .02], [-4.06, 1.415, -2.25], wood)
  box(room, [.018, .24, .02], [-4.33, 1.53, -2.25], wood)
  box(room, [.018, .24, .02], [-3.79, 1.53, -2.25], wood)

  // ---------- slightly crooked wall clock with a slow second hand ----------
  const clock = new THREE.Group()
  clock.position.set(-3.48, 1.94, -2.253)
  clock.rotation.z = .12
  room.add(clock)
  mesh(clock, new THREE.CylinderGeometry(.115, .115, .03, 20), p.dark, [0, 0, 0], [Math.PI / 2, 0, 0])
  mesh(clock, new THREE.CylinderGeometry(.1, .1, .032, 20), '#f6f1de', [0, 0, .001], [Math.PI / 2, 0, 0])
  box(clock, [.02, .055, .008], [-.004, .026, .019], '#46625f')
  box(clock, [.012, .074, .006], [.002, .034, .019], '#5d7a76')
  const secondHand = new THREE.Group()
  clock.add(secondHand)
  box(secondHand, [.006, .086, .005], [0, .042, .023], '#bd7f56')
  sphere(clock, .012, [0, 0, .02], p.rust)
  animate(secondHand, (time) => { secondHand.rotation.z = -time * .38 })

  // ---------- retro radio on the right bench ----------
  const radio = new THREE.Group()
  radio.position.set(-3.87, 1.24, -2.04)
  radio.rotation.y = .22
  room.add(radio)
  box(radio, [.26, .15, .1], [0, .075, 0], '#e5dcc0')
  box(radio, [.12, .05, .006], [-.05, .09, .052], '#cfc7ab')
  box(radio, [.08, .012, .007], [-.05, .09, .056], '#7d8f86')
  mesh(radio, new THREE.CylinderGeometry(.036, .036, .012, 12), '#556b66', [.06, .072, .052], [Math.PI / 2, 0, 0])
  mesh(radio, new THREE.CylinderGeometry(.011, .011, .014, 10), p.gold, [.06, .026, .054], [Math.PI / 2, 0, 0])
  mesh(radio, new THREE.CylinderGeometry(.011, .011, .014, 10), p.gold, [.024, .026, .054], [Math.PI / 2, 0, 0])
  sphere(radio, .011, [-.05, .108, .052], '#f2df9f')
  curve(radio, [[-.09, .15, 0], [0, .196, 0], [.09, .15, 0]], '#9a7b52', .012)
  beam(radio, [.1, .15, 0], [.2, .31, 0], .01, '#8fa19b')

  // ---------- pothos by the front glass with one swaying vine ----------
  cylinder(room, .078, .058, .14, [-3.45, .97, -1.3], '#c58a62')
  cylinder(room, .082, .082, .025, [-3.45, 1.033, -1.3], '#d0956b')
  cylinder(room, .07, .07, .012, [-3.45, 1.042, -1.3], '#6b5644')
  for (const [x, y, z, r, c] of [[-.03, 1.1, .02, .055, '#7aa17f'], [.04, 1.13, -.03, .045, '#8eb489'], [0, 1.165, .03, .05, '#6f9a7a']]) {
    const leafBall = sphere(room, r, [-3.45 + x, y, -1.3 + z], c)
    leafBall.scale.set(1, .55, 1)
  }
  beam(room, [-3.45, 1.04, -1.3], [-3.43, 1.1, -1.28], .008, '#5f8770')
  const vine = new THREE.Group()
  vine.position.set(-3.4, 1.05, -1.34)
  room.add(vine)
  curve(vine, [[0, 0, 0], [.06, -.05, -.02], [.09, -.1, .02], [.06, -.14, .07]], '#6f9a7a', .012)
  for (const [x, y, z] of [[.05, -.04, -.02], [.09, -.09, .02], [.07, -.13, .06]]) {
    const leafBall = sphere(vine, .03, [x, y, z], '#7aa17f')
    leafBall.scale.set(1, .5, 1)
  }
  animate(vine, (time) => {
    vine.rotation.z = Math.sin(time * 1.15) * .028
    vine.rotation.x = Math.sin(time * .83 + .5) * .02
  })

  // ---------- worn doormat and pale gold light spilling through the glass ----------
  box(room, [.46, .012, .26], [-3.98, .906, -1.24], '#bcc2a9')
  box(room, [.34, .004, .02], [-3.98, .913, -1.19], '#a8b096')
  mesh(room, new THREE.PlaneGeometry(.62, .3), sunPatch, [-4.62, .907, -1.47], [-Math.PI / 2, 0, .3], false)
  mesh(room, new THREE.PlaneGeometry(.42, .22), sunPatch, [-3.88, .907, -1.5], [-Math.PI / 2, 0, .55], false)

  return room
}
