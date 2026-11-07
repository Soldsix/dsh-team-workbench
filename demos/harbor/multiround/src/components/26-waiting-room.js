// 26-waiting-room.js — 候船室与玻璃内陈设（round 2, visibility revision)
// Owns only this file (artist-26-waiting-room). Same miniature waiting room:
// x[-5.6,-3.2] z[-2.35,-1.05], walls y[.8,2.35], clear front (+z) and right
// (+x) glazing, 0.8m open doorway, low benches, faded timetable, retro radio,
// kettle, pothos and a crooked clock under a sea-blue roof with a gutter.
// Round-2 changes are based on the real r1 screenshots: glass panes are now
// single quads at low opacity (no double-face milk veil), and the interior uses
// deeper wood/teal/terracotta accents plus a painted wainscot so the listed
// furnishings read from the hero camera. Warm gold light stays weak; no white
// glare was added. Source only: no renderer was run for this revision.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const room = new THREE.Group()
  room.name = 'waiting-room'

  const cx = -4.4, cz = -1.7
  const baseY = .8, wallH = 1.55, midY = baseY + wallH / 2

  // single-quad glass: one blended layer instead of two box faces
  const glassMat = mat(p.glass, { transparent: true, opacity: .075, depthWrite: false, side: THREE.DoubleSide })
  const leafGlass = mat(p.glass, { transparent: true, opacity: .045, depthWrite: false, side: THREE.DoubleSide })
  const cream = mat('#f0eadb')
  const wallMat = mat('#e8e3ce')
  const frameMat = mat('#e4e2cc')
  const wood = mat('#a97f4e')
  const deepWood = mat('#8a6238')
  const doorFrame = mat('#86a39b')
  const steel = mat(p.metal)
  const roofBlue = mat('#6f9fb0')
  const gutterBlue = mat('#547f92')
  const wainscot = mat('#c7d6cb')
  const warmBulb = new THREE.MeshBasicMaterial({ color: '#f6df9a' })
  const sunPatch = new THREE.MeshBasicMaterial({ color: '#f2dca6', transparent: true, opacity: .11, depthWrite: false })

  // ---------- floor slab, cream walls, painted wainscot, corner posts ----------
  box(room, [2.24, .1, 1.14], [cx, .85, cz], '#ddd9c2')
  box(room, [.08, wallH, 1.3], [-5.56, midY, cz], wallMat)
  box(room, [2.4, wallH, .08], [cx, midY, -2.31], wallMat)
  box(room, [2.16, .44, .012], [cx, 1.12, -2.258], wainscot)
  box(room, [2.16, .018, .02], [cx, 1.342, -2.25], deepWood)
  box(room, [.012, .44, 1.2], [-5.514, 1.12, cz], wainscot)
  box(room, [.1, wallH, .1], [-5.56, midY, -1.05], frameMat)
  box(room, [.1, wallH, .1], [-3.24, midY, -1.05], frameMat)
  box(room, [.1, wallH, .1], [-3.24, midY, -2.31], frameMat)
  box(room, [2.24, .13, .09], [cx, 2.285, -1.05], frameMat)

  // ---------- front glazing: clear panes, open sliding doorway ----------
  box(room, [1.07, .34, .09], [-4.995, .97, -1.05], frameMat)
  box(room, [.31, .34, .09], [-3.425, .97, -1.05], frameMat)
  box(room, [.06, 1.32, .08], [-4.45, 1.56, -1.05], doorFrame)
  box(room, [.06, 1.32, .08], [-3.59, 1.56, -1.05], doorFrame)
  mesh(room, new THREE.PlaneGeometry(1.03, 1.08), glassMat, [-4.995, 1.68, -1.05])
  mesh(room, new THREE.PlaneGeometry(.27, 1.08), glassMat, [-3.425, 1.68, -1.05])
  box(room, [1.03, .03, .05], [-4.995, 1.67, -1.05], frameMat)
  box(room, [.03, 1.08, .05], [-4.995, 1.68, -1.05], frameMat)
  box(room, [.8, .12, .14], [-4.02, .86, -1.05], '#b9bdb1')
  box(room, [1.02, .08, .3], [-4.02, .84, -.87], '#cbd0c2')

  const leaf = new THREE.Group()
  leaf.position.set(-5.04, 0, -1.15)
  room.add(leaf)
  box(leaf, [.72, .05, .035], [0, .945, 0], frameMat)
  box(leaf, [.72, .05, .035], [0, 2.155, 0], frameMat)
  box(leaf, [.04, 1.26, .035], [-.34, 1.55, 0], frameMat)
  box(leaf, [.04, 1.26, .035], [.34, 1.55, 0], frameMat)
  mesh(leaf, new THREE.PlaneGeometry(.64, 1.16), leafGlass, [0, 1.55, 0])
  box(leaf, [.022, .11, .022], [.29, 1.5, .03], steel)
  box(room, [.88, .035, .07], [-5.04, 2.2, -1.13], steel)

  // faint cool glass edge, deliberately dim (no white glare)
  line(room, [[-5.4, 1.26, -1.038], [-5.05, 1.9, -1.038]], '#d7ece6', .16)
  line(room, [[-3.228, 1.32, -2.1], [-3.228, 1.9, -1.78]], '#d7ece6', .14)

  // ---------- right glass wall ----------
  box(room, [.09, .34, 1.16], [-3.24, .97, -1.68], frameMat)
  box(room, [.09, .13, 1.16], [-3.24, 2.285, -1.68], frameMat)
  mesh(room, new THREE.PlaneGeometry(1.16, 1.08), glassMat, [-3.235, 1.68, -1.68], [0, Math.PI / 2, 0])
  box(room, [.05, .03, 1.16], [-3.235, 1.67, -1.68], frameMat)
  box(room, [.05, 1.08, .03], [-3.235, 1.68, -1.68], frameMat)

  // ---------- sea-blue roof, gutter, downspout, roof fittings ----------
  box(room, [2.6, .09, 1.5], [cx, 2.395, cz], roofBlue)
  box(room, [2.6, .07, .04], [cx, 2.36, -.955], frameMat)
  beam(room, [-5.65, 2.31, -.94], [-3.15, 2.31, -.94], .06, gutterBlue)
  box(room, [.03, .04, .07], [-5.05, 2.335, -.94], gutterBlue)
  box(room, [.03, .04, .07], [-3.75, 2.335, -.94], gutterBlue)
  beam(room, [-3.17, 2.3, -.94], [-3.17, .9, -.94], .045, gutterBlue)
  beam(room, [-3.17, .9, -.94], [-3.17, .8, -.72], .045, gutterBlue)
  cylinder(room, .045, .045, .22, [-5.15, 2.55, -2.12], '#a9b8b0')
  cylinder(room, .062, .062, .025, [-5.15, 2.67, -2.12], frameMat)
  box(room, [.32, .035, .24], [-3.8, 2.455, -2.05], '#7fa1a8')
  box(room, [.09, .02, .025], [-3.8, 2.482, -1.95], '#5e7d82')
  label(room, '待合室', .42, [-4.02, 2.285, -1.0], [0, 0, 0], '#395f5f', '#eee9d3')

  // ---------- interior shell: ceiling, pendant, rug ----------
  box(room, [2.24, .03, 1.14], [cx, 2.315, cz], cream)
  beam(room, [-4.4, 2.305, -1.62], [-4.4, 2.18, -1.62], .012, steel)
  cylinder(room, .028, .082, .055, [-4.4, 2.15, -1.62], '#e4ddc6')
  sphere(room, .03, [-4.4, 2.11, -1.62], warmBulb)
  box(room, [1.15, .006, .54], [-4.44, .904, -1.92], '#9ab8ae')

  // ---------- low wooden benches facing the glass ----------
  for (const bx of [-4.86, -4.04]) {
    box(room, [.8, .06, .3], [bx, 1.21, -2.05], wood)
    box(room, [.7, .04, .04], [bx, .99, -2.05], steel)
    for (const dx of [-.32, .32]) for (const dz of [-.11, .11]) {
      box(room, [.05, .28, .05], [bx + dx, 1.04, -2.05 + dz], steel)
    }
  }
  box(room, [.34, .05, .24], [-4.7, 1.265, -2.05], '#7fa39c')
  box(room, [.28, .03, .2], [-4.3, 1.255, -2.0], '#b6c8bd')

  // ---------- side table with kettle and cup; steel bin ----------
  box(room, [.42, .05, .32], [-5.28, 1.2, -1.5], wood)
  for (const dx of [-.17, .17]) for (const dz of [-.12, .12]) {
    box(room, [.035, .3, .035], [-5.28 + dx, 1.05, -1.5 + dz], steel)
  }
  cylinder(room, .06, .075, .12, [-5.27, 1.285, -1.52], '#e7e2cf')
  cylinder(room, .078, .078, .014, [-5.27, 1.232, -1.52], '#6f8781')
  cylinder(room, .045, .05, .02, [-5.27, 1.35, -1.52], '#d9d2bd')
  sphere(room, .017, [-5.27, 1.368, -1.52], p.gold)
  beam(room, [-5.21, 1.28, -1.52], [-5.16, 1.34, -1.52], .018, '#e7e2cf')
  curve(room, [[-5.27, 1.345, -1.45], [-5.27, 1.42, -1.51], [-5.27, 1.345, -1.57]], steel, .011)
  cylinder(room, .045, .045, .008, [-5.42, 1.229, -1.43], '#dfd8c3')
  cylinder(room, .03, .026, .045, [-5.42, 1.2475, -1.43], '#f3f0e3')
  cylinder(room, .065, .058, .15, [-5.34, .975, -2.1], steel)
  cylinder(room, .07, .07, .015, [-5.34, 1.055, -2.1], '#8fa39c')

  // ---------- faded timetable board on the back wall ----------
  box(room, [.54, .24, .015], [-4.06, 1.5, -2.256], '#e7dab0')
  label(room, '時刻表', .34, [-4.06, 1.565, -2.244], [0, 0, 0], '#3d5b56', '#e7dab0')
  box(room, [.42, .009, .006], [-4.07, 1.485, -2.244], '#6f8377')
  box(room, [.34, .009, .006], [-4.11, 1.462, -2.244], '#6f8377')
  box(room, [.38, .009, .006], [-4.09, 1.439, -2.244], '#6f8377')
  box(room, [.12, .012, .006], [-3.97, 1.415, -2.244], '#c98966')
  box(room, [.58, .018, .02], [-4.06, 1.622, -2.25], deepWood)
  box(room, [.58, .018, .02], [-4.06, 1.378, -2.25], deepWood)
  box(room, [.018, .25, .02], [-4.34, 1.5, -2.25], deepWood)
  box(room, [.018, .25, .02], [-3.78, 1.5, -2.25], deepWood)

  // ---------- slightly crooked wall clock, readable dark rim ----------
  const clock = new THREE.Group()
  clock.position.set(-3.5, 1.88, -2.253)
  clock.rotation.z = .13
  room.add(clock)
  mesh(clock, new THREE.CylinderGeometry(.135, .135, .03, 20), p.dark, [0, 0, 0], [Math.PI / 2, 0, 0])
  mesh(clock, new THREE.CylinderGeometry(.115, .115, .032, 20), '#f8f2dc', [0, 0, .001], [Math.PI / 2, 0, 0])
  box(clock, [.022, .06, .008], [-.004, .028, .02], '#2f4a48')
  box(clock, [.012, .08, .006], [.002, .038, .02], '#2f4a48')
  const secondHand = new THREE.Group()
  clock.add(secondHand)
  box(secondHand, [.006, .092, .005], [0, .045, .024], '#b9784f')
  sphere(clock, .012, [0, 0, .021], p.gold)
  animate(secondHand, (time) => { secondHand.rotation.z = -time * .38 })

  // ---------- retro radio on the right bench, dark body for contrast ----------
  const radio = new THREE.Group()
  radio.position.set(-3.88, 1.24, -2.02)
  radio.rotation.y = .2
  room.add(radio)
  box(radio, [.28, .16, .1], [0, .08, 0], '#4a6460')
  box(radio, [.15, .08, .005], [-.055, .085, .051], '#dfd8c1')
  box(radio, [.13, .055, .003], [-.055, .085, .054], '#3c514d')
  box(radio, [.07, .022, .005], [.065, .095, .052], '#efd792')
  mesh(radio, new THREE.CylinderGeometry(.012, .012, .014, 10), steel, [.065, .045, .053], [Math.PI / 2, 0, 0])
  mesh(radio, new THREE.CylinderGeometry(.012, .012, .014, 10), steel, [.03, .045, .053], [Math.PI / 2, 0, 0])
  sphere(radio, .012, [.065, .095, .058], warmBulb)
  curve(radio, [[-.09, .16, 0], [0, .205, 0], [.09, .16, 0]], '#7a5c3d', .012)
  beam(radio, [.11, .16, 0], [.21, .32, 0], .01, '#7f9891')

  // ---------- fuller pothos by the front glass, one swaying vine ----------
  cylinder(room, .08, .058, .15, [-3.5, .975, -1.28], '#b06a45')
  cylinder(room, .085, .085, .025, [-3.5, 1.045, -1.28], '#c47f55')
  cylinder(room, .072, .072, .012, [-3.5, 1.052, -1.28], '#5e4c3c')
  for (const [x, y, z, r, c, s] of [
    [-.03, 1.12, .02, .06, '#5f8f6d', .6], [.05, 1.15, -.03, .05, '#7aa97c', .55],
    [-.01, 1.19, .03, .045, '#4f7c61', .6], [.06, 1.1, -.05, .04, '#6f9f76', .5]
  ]) {
    const leafBall = sphere(room, r, [-3.5 + x, y, -1.28 + z], c)
    leafBall.scale.set(1, s, 1)
  }
  beam(room, [-3.5, 1.05, -1.28], [-3.47, 1.12, -1.26], .008, '#4f7c61')
  const vine = new THREE.Group()
  vine.position.set(-3.45, 1.06, -1.33)
  room.add(vine)
  curve(vine, [[0, 0, 0], [.07, -.05, -.01], [.1, -.1, .03], [.07, -.15, .08]], '#5f8f6d', .012)
  for (const [x, y, z] of [[.06, -.04, -.01], [.1, -.09, .03], [.08, -.14, .07]]) {
    const leafBall = sphere(vine, .032, [x, y, z], '#6f9f76')
    leafBall.scale.set(1, .5, 1)
  }
  animate(vine, (time) => {
    vine.rotation.z = Math.sin(time * 1.15) * .028
    vine.rotation.x = Math.sin(time * .83 + .5) * .02
  })

  // ---------- worn doormat and weak warm light spilling through the glass ----------
  box(room, [.46, .012, .26], [-3.98, .906, -1.24], '#b0b79e')
  box(room, [.36, .004, .02], [-3.98, .913, -1.18], '#9aa58d')
  mesh(room, new THREE.PlaneGeometry(.62, .3), sunPatch, [-4.6, .907, -1.44], [-Math.PI / 2, 0, .3])
  mesh(room, new THREE.PlaneGeometry(.44, .24), sunPatch, [-3.86, .907, -1.47], [-Math.PI / 2, 0, .55])

  return room
}
