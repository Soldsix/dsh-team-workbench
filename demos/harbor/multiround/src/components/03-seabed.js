/**
 * 03-seabed.js — 水体剖面与水下杂物
 * Owns only the submerged composition of the open water rectangle plus the two
 * transparent teal cutaway panes on x=6 and z=-6. The water top plane, the quay,
 * the seawall and the collection plinth belong to the other artists' modules.
 * Round 4 bounds pass: the tilted sunk tire was the only submerged box below the
 * plinth bottom (external round-3 componentBounds minY -1.6101, plinth bottom
 * -1.60). It is lifted 2 cm, pose unchanged, so every bound of this component now
 * clears y >= -1.60. Sediment, chain, tire, panes and the open water volume stay
 * as authored - no capping slab and no opaque body is added to the cutaway.
 * Source only in this pass too: no renderer or build was run.
 */
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'seabed-water-section'

  // ---- fixed water region from CONTRACT.md, kept 0.1 m clear of the neighbours ----
  const X0 = -1.6, X1 = 5.9, Z0 = -5.9, Z1 = 2.3
  const BED = -1.44 // visible seabed surface, a little above the declared -1.55 floor
  const PANE_BOTTOM = -1.48, PANE_TOP = 0.155
  const sx = X1 - X0, sz = Z1 - Z0

  // muted wet palette: every surface below sits behind the teal glass
  const sand = '#c6c1a7', sandLight = '#d7d1b5', sandDark = '#a6a592', rubber = '#3f4d4a'
  const stoneColors = [p.concrete, p.concreteDark, p.metal, '#9fa9a0', '#b3bbad']
  const floatWhite = '#f2efd9'

  // transparent only — never an opaque body filling the water volume
  const paneGlass = mat(p.water, { transparent: true, opacity: .17, depthWrite: false, side: THREE.DoubleSide })
  const paneDeep = mat(p.deep, { transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide })
  const paneLight = mat(p.foam, { transparent: true, opacity: .1, depthWrite: false, side: THREE.DoubleSide })
  const bottleGlass = mat('#a9ccb5', { transparent: true, opacity: .4, depthWrite: false, side: THREE.DoubleSide })
  const bubbleMat = mat(p.foam, { transparent: true, opacity: .5, depthWrite: false })
  const causticMat = mat('#f7f1d2', { transparent: true, opacity: .16, depthWrite: false, side: THREE.DoubleSide })

  // ---- 1. sediment: one thin slab whose cut faces touch the glass panes ----
  const slab = { x0: X0 - .02, x1: 5.985, z0: -5.985, z1: Z1 + .02 }
  const slabCx = (slab.x0 + slab.x1) / 2, slabCz = (slab.z0 + slab.z1) / 2
  const slabW = slab.x1 - slab.x0, slabD = slab.z1 - slab.z0
  box(group, [slabW, .04, slabD], [slabCx, BED - .02, slabCz], sand, [0, 0, 0], false)
  // buried gravel strata on both cut faces so the section reads as sediment, not a plate
  box(group, [.005, .014, slabD], [slab.x1 + .002, BED - .032, slabCz], sandDark, [0, 0, 0], false)
  box(group, [slabW, .014, .005], [slabCx, BED - .032, slab.z0 - .002], sandDark, [0, 0, 0], false)
  // soft ripple ridges combed into the sand
  for (let i = 0; i < 6; i++) {
    const z = -5.15 + i * 1.32, pts = []
    for (let k = 0; k <= 4; k++) pts.push([-1.45 + k * 1.75, BED + .004, z + Math.sin(k * 1.25 + i * .9) * .17])
    curve(group, pts, sandDark, .009)
  }

  // ---- 2. worn stones: faceted, sparse, with the fine ink outline kept crisp ----
  const gravel = (x, z, spread, radius, colors) => {
    for (let i = 0; i < 3; i++) {
      const r = radius * (.5 + rand() * .8)
      const chip = sphere(group, r, [x + (rand() - .5) * spread, BED + r * .3, z + (rand() - .5) * spread],
        colors[Math.floor(rand() * colors.length)], 5)
      chip.scale.set(1 + rand() * .6, .4 + rand() * .3, .8 + rand() * .5)
      chip.rotation.y = rand() * Math.PI
    }
  }
  const wornStone = (x, z, r, color) => {
    const stone = mesh(group, new THREE.DodecahedronGeometry(r, 0), color,
      [x, BED + r * .26, z], [0, rand() * Math.PI, 0])
    stone.scale.set(1 + rand() * .35, .42 + rand() * .3, .82 + rand() * .3)
    return stone
  }
  const clusters = [
    [-.95, 1.55, 3, .17], [.7, .05, 4, .2], [2.45, -1.35, 4, .23],
    [4.35, 1.0, 3, .18], [1.75, -3.7, 3, .21], [4.55, -4.3, 3, .19], [-.5, -4.95, 2, .16]
  ]
  clusters.forEach(([x, z, count, radius], ci) => {
    for (let i = 0; i < count; i++) {
      wornStone(x + (rand() - .5) * radius * 3, z + (rand() - .5) * radius * 3,
        radius * (.55 + rand() * .8), stoneColors[(ci + i) % stoneColors.length])
    }
    gravel(x, z, radius * 4.5, radius * .34, [sandLight, p.concreteLight, sandDark])
  })

  // ---- 3. sunk tire used as a mooring weight, half settled into the sand ----
  // Round 4: the torus is tilted by the authored rotation, so its Box3 dips far
  // below its centre (measured -1.6100721 at centre y = -1.375). +2 cm keeps the
  // same pose, still buries the lower ring in the sand (bed top y = -1.44) and
  // puts the component bound at y = -1.5900721, clear of the -1.60 plinth bottom.
  const tirePos = [3.32, BED + .085, .42]
  const tireRot = [-Math.PI / 2 + .06, .38, .05]
  mesh(group, new THREE.TorusGeometry(.3, .1, 8, 18), rubber, tirePos, tireRot).scale.set(1, 1, .62)
  mesh(group, new THREE.TorusGeometry(.165, .02, 6, 12), p.rust,
    [tirePos[0], tirePos[1] + .03, tirePos[2]], tireRot).scale.set(1, 1, .62)
  gravel(tirePos[0] - .22, tirePos[2] + .2, .3, .05, [sandLight, sandDark])

  // ---- 4. anchor chain lying across the bed, alternating flat and upright links ----
  const linkGeo = new THREE.TorusGeometry(.045, .0135, 4, 8)
  const chainA = [1.44, -2.12], chainB = [3.02, .16]
  const heading = Math.atan2((chainB[0] - chainA[0]) / 26, (chainB[1] - chainA[1]) / 26)
  for (let i = 0; i <= 26; i++) {
    const t = i / 26
    const x = chainA[0] + (chainB[0] - chainA[0]) * t + Math.sin(t * Math.PI * 3.1) * .14
    const z = chainA[1] + (chainB[1] - chainA[1]) * t + Math.sin(t * Math.PI * 2.2 + 1) * .1
    const flat = i % 2 === 0
    mesh(group, linkGeo, i % 7 === 0 ? p.rust : p.metal,
      [x, BED + (flat ? .022 : .045), z], flat ? [-Math.PI / 2, heading, 0] : [0, heading, -.12])
  }

  // ---- 5. old anchor half sunk at the chain's landward end ----
  beam(group, [1.03, BED + .07, -2.8], [1.44, BED + .1, -2.1], .07, p.metal)
  box(group, [.46, .06, .07], [.78, BED + .07, -3.06], p.metal, [0, .62, 0])
  box(group, [.22, .035, .13], [.58, BED + .04, -3.24], p.metal, [0, .62, .34])
  box(group, [.22, .035, .13], [.98, BED + .04, -3.3], p.metal, [0, 1.2, -.3])
  mesh(group, new THREE.TorusGeometry(.05, .012, 5, 8), p.rust,
    [1.5, BED + .12, -2.02], [-Math.PI / 2 + .4, 0, 0])
  box(group, [.1, .02, .06], [1.2, BED + .11, -2.55], p.rust, [0, .6, .2])

  // ---- 6. light debris dropped from the quay ----
  box(group, [.26, .17, .2], [1.62, BED + .085, 1.62], p.blue, [.14, .52, .08])
  box(group, [.2, .02, .15], [1.68, BED + .17, 1.7], '#a3c6c9', [.3, .52, .34])
  const canA = cylinder(group, .05, .05, .13, [2.22, BED + .05, -1.1], p.rust, 8)
  canA.rotation.set(0, .5, Math.PI / 2)
  const canB = cylinder(group, .044, .044, .11, [2.42, BED + .045, -1.32], '#b08768', 8)
  canB.rotation.set(0, -1.1, Math.PI / 2 - .18)
  mesh(group, new THREE.CylinderGeometry(.045, .05, .22, 9), bottleGlass,
    [.3, BED + .05, .82], [0, 0, Math.PI / 2], false)
  mesh(group, new THREE.CylinderGeometry(.02, .028, .08, 8), bottleGlass,
    [.45, BED + .05, .82], [0, 0, Math.PI / 2], false)
  mesh(group, new THREE.SphereGeometry(.12, 12, 8), floatWhite, [5.0, BED + .11, .8])
  curve(group, [[5.0, BED + .06, .8], [4.87, BED + .03, .69], [4.74, BED + .015, .76]], p.rope, .012)
  box(group, [.62, .035, .14], [-.5, BED + .02, -.9], '#ab9070', [.04, .34, .02])
  const coil = []
  for (let i = 0; i < 9; i++) {
    const a = i / 8 * Math.PI * 1.85
    coil.push([1.0 + Math.cos(a) * .22, BED + .022, 1.02 + Math.sin(a) * .18])
  }
  curve(group, coil, p.rope, .014)
  const shells = [[1.95, .55], [-.25, -2.35], [3.85, -3.15]]
  shells.forEach(([x, z], i) => {
    const shell = sphere(group, .05 + i * .008, [x, BED + .012, z], '#e7e2c9', 6)
    shell.scale.set(1.25, .3, 1)
  })

  // ---- 7. posterized sand caustics, rising bubbles, slow suspended silt ----
  const causticGeo = new THREE.CircleGeometry(.34, 4)
  const caustics = []
  for (let i = 0; i < 7; i++) {
    const caustic = mesh(group, causticGeo, causticMat,
      [X0 + .9 + rand() * (sx - 1.8), BED + .008, Z0 + .9 + rand() * (sz - 1.8)],
      [-Math.PI / 2, 0, rand() * Math.PI], false)
    caustic.scale.set(.9 + rand() * .9, .55 + rand() * .5, 1)
    caustic.userData.base = { x: caustic.position.x, z: caustic.position.z, sx: caustic.scale.x, sy: caustic.scale.y }
    caustics.push(caustic)
  }
  const bubbles = []
  for (let i = 0; i < 5; i++) {
    const bubble = sphere(group, .026 + i * .004,
      [3.02 + (rand() - .5) * .3, BED + .2, .94 + (rand() - .5) * .3], bubbleMat, 6)
    bubble.userData.base = { x: bubble.position.x, z: bubble.position.z }
    bubble.userData.phase = rand()
    bubble.userData.speed = .1 + rand() * .05
    bubbles.push(bubble)
  }
  const silt = []
  for (let i = 0; i < 9; i++) {
    const mote = sphere(group, .012 + rand() * .008,
      [X0 + rand() * sx, BED + .08 + rand() * 1.1, Z0 + rand() * sz], '#d9e3d3', 5)
    mote.userData.base = { x: mote.position.x, y: mote.position.y, z: mote.position.z, phase: rand() * 6.28 }
    silt.push(mote)
  }
  // one registration, absolute transforms rebuilt from stored bases: no cumulative drift
  animate(group, (t) => {
    bubbles.forEach((bubble) => {
      const base = bubble.userData.base
      const cycle = (t * bubble.userData.speed + bubble.userData.phase) % 1
      bubble.position.set(base.x + Math.sin(t * 1.2 + bubble.userData.phase * 8) * .04,
        BED + .05 + cycle * 1.22,
        base.z + Math.cos(t * .9 + bubble.userData.phase * 6) * .035)
      bubble.scale.setScalar(Math.max(.2, .55 + .65 * Math.sin(cycle * Math.PI)))
    })
    caustics.forEach((caustic, i) => {
      const base = caustic.userData.base
      caustic.position.x = base.x + Math.sin(t * .33 + i) * .07
      caustic.position.z = base.z + Math.cos(t * .27 + i * 1.7) * .06
      caustic.scale.x = base.sx * (1 + Math.sin(t * .75 + i * 2.1) * .12)
      caustic.scale.y = base.sy * (1 + Math.cos(t * .62 + i * 1.3) * .12)
    })
    silt.forEach((mote) => {
      const base = mote.userData.base
      mote.position.set(base.x + Math.sin(t * .18 + base.phase) * .05,
        base.y + Math.cos(t * .14 + base.phase) * .035,
        base.z + Math.sin(t * .21 + base.phase * 1.3) * .04)
    })
  })

  // ---- 8. cutaway panes: transparent teal sections on x=6 and z=-6 ----
  const paneH = PANE_TOP - PANE_BOTTOM, paneY = (PANE_TOP + PANE_BOTTOM) / 2
  const paneX = 5.995, paneZ = -5.995, xPaneW = 8.4, zPaneW = 7.7
  const paneZc = -1.8, paneXc = 2.15
  mesh(group, new THREE.PlaneGeometry(xPaneW, paneH), paneGlass,
    [paneX, paneY, paneZc], [0, Math.PI / 2, 0], false)
  mesh(group, new THREE.PlaneGeometry(zPaneW, paneH), paneGlass,
    [paneXc, paneY, paneZ], [0, Math.PI, 0], false)
  // depth strata and a surface glow, inset a hair so they never fight the pane
  mesh(group, new THREE.PlaneGeometry(xPaneW - .1, .86), paneDeep,
    [paneX - .012, -1.05, paneZc], [0, Math.PI / 2, 0], false)
  mesh(group, new THREE.PlaneGeometry(zPaneW - .1, .86), paneDeep,
    [paneXc, -1.05, paneZ + .012], [0, Math.PI, 0], false)
  mesh(group, new THREE.PlaneGeometry(xPaneW - .1, .135), paneLight,
    [paneX - .012, .0875, paneZc], [0, Math.PI / 2, 0], false)
  mesh(group, new THREE.PlaneGeometry(zPaneW - .1, .135), paneLight,
    [paneXc, .0875, paneZ + .012], [0, Math.PI, 0], false)
  line(group, [
    [paneX - .006, PANE_BOTTOM, paneZc - xPaneW / 2], [paneX - .006, PANE_BOTTOM, paneZc + xPaneW / 2],
    [paneX - .006, PANE_TOP, paneZc + xPaneW / 2], [paneX - .006, PANE_TOP, paneZc - xPaneW / 2],
    [paneX - .006, PANE_BOTTOM, paneZc - xPaneW / 2]
  ], p.deep, .45)
  line(group, [
    [paneXc - zPaneW / 2, PANE_BOTTOM, paneZ + .006], [paneXc + zPaneW / 2, PANE_BOTTOM, paneZ + .006],
    [paneXc + zPaneW / 2, PANE_TOP, paneZ + .006], [paneXc - zPaneW / 2, PANE_TOP, paneZ + .006],
    [paneXc - zPaneW / 2, PANE_BOTTOM, paneZ + .006]
  ], p.deep, .45)

  return group
}
