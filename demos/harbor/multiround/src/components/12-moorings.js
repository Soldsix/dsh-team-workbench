// 12-moorings.js — blackened cast-iron mooring bollards along the front quay (z=2.7) and
// the west strip (x=-2), with thick orange-brown lines coiled on the barrels.
// Round 5: the main line on the centre front bollard (x=2.8) is now a hand-built dynamic
// tube — its bollard end stays pinned to the coil, its boat end tracks boat-b's known
// stern cleat, and the sag breathes with a restrained cycle. The coils, tails, spare line
// and the other two mooring lines are kept exactly as authored. Source only: the external
// acceptance driver performs the browser render, this module does not claim one.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '12-moorings'

  // local colour notes: matte blackened iron, rust weeping from the flanges, and damp
  // tarred rope that reads orange-red against the pale wet concrete
  const cIron = '#3d4a4b', cIronDark = '#2f3a3b', cIronHigh = '#586662'
  const cRustPale = '#b98a63'
  const cRope = '#a8673f', cRopeDark = '#8a4f33', cRopePale = '#c08d60'
  const mIron = mat(cIron), mIronDark = mat(cIronDark), mIronHigh = mat(cIronHigh)
  const mRust = mat(p.rust), mRustPale = mat(cRustPale)
  const mRope = mat(cRope), mRopeDark = mat(cRopeDark), mRopePale = mat(cRopePale)
  const mDamp = mat(p.concreteDark, { transparent: true, opacity: .26, depthWrite: false })

  const QUAY = .8              // top of the concrete quay
  const HITCH = QUAY + .175    // height where a line leaves the coil on the barrel

  // ------------------------------------------------------------------- bollards
  const bollard = (x, z, yaw) => {
    const g = new THREE.Group()
    g.name = 'iron-bollard'
    g.position.set(x, QUAY, z)
    g.rotation.y = yaw
    group.add(g)

    mesh(g, new THREE.CircleGeometry(.23, 12), mDamp, [0, .006, 0], [-Math.PI / 2, 0, 0], false).renderOrder = 1
    cylinder(g, .152, .176, .055, [0, .0275, 0], mIronDark)              // cast flange
    cylinder(g, .140, .152, .024, [0, .062, 0], mRust)                   // rust collar, always damp
    for (let i = 0; i < 4; i++) {                                        // flange studs
      const a = Math.PI / 4 + i * Math.PI / 2
      cylinder(g, .016, .017, .02, [Math.cos(a) * .128, .06, Math.sin(a) * .128], mIronHigh, 8)
    }
    cylinder(g, .078, .098, .24, [0, .19, 0], mIron, 12)                 // stout tapered barrel
    cylinder(g, .102, .082, .03, [0, .325, 0], mIronHigh, 12)            // shoulder
    sphere(g, .082, [0, .342, 0], mIron, 10).scale.y = .42               // low rounded cap
    for (let i = 0; i < 2; i++) {                                        // crossed rope horns
      const a = Math.PI / 4 + i * Math.PI / 2
      beam(g, [0, .30, 0], [Math.cos(a) * .19, .292, Math.sin(a) * .19], .033, mIron)
      sphere(g, .018, [Math.cos(a) * .19, .292, Math.sin(a) * .19], mIronDark, 7)
    }
    sphere(g, .05, [.11, .02, .07], mRustPale).scale.set(1.5, .35, 1.1)  // rust bloom on the flange
    return g
  }

  // ---------------------------------------------------------------------- coils
  const coil = (x, z, yaw, turns, color) => {
    const g = new THREE.Group()
    g.name = 'rope-coil'
    g.position.set(x, QUAY, z)
    g.rotation.y = yaw
    group.add(g)
    for (let i = 0; i < turns; i++) {
      mesh(g, new THREE.TorusGeometry(.113 - i * .0022, .024, 5, 16), color,
        [Math.cos(i * 1.9) * .005, .105 + i * .04, Math.sin(i * 1.9) * .005],
        [Math.PI / 2 + .012 * i, .18 * i, .02 * i], false)
    }
    return g
  }

  // gentle swell-driven sway; rotations only, always measured from the rest pose
  const sway = (g, phase, side, forward) => animate(g, t => {
    g.rotation.z = Math.sin(t * .82 + phase) * side
    g.rotation.x = Math.sin(t * .59 + phase * 1.7) * forward
  })

  // ---------------------------------------------------------------- mooring lines
  // line off the coil, over the front quay lip at z=2.4, sagging to a stern cleat on
  // the berth line (y=.65, z=1.7); the last points of the sag stay above y=.8 until
  // the rope has crossed the lip so nothing cuts through the concrete.
  const sternLine = (bx, bz, ex, ez, phase, color) => {
    const g = new THREE.Group()
    g.name = 'mooring-line'
    g.position.set(bx + .05, HITCH, bz - .105)
    group.add(g)
    const dx = ex - g.position.x
    const dy = .65 - HITCH
    const pts = [
      [0, 0, 0],
      [dx * .12, -.012, -.08],
      [dx * .24, -.03, -.185],
      [dx * .36, -.09, -.285],
      [dx * .48, -.155, -.40],
      [dx * .60, dy * .78, -.52],
      [dx * .72, dy * .88, -.66],
      [dx * .86, dy * .96, -.80],
      [dx, dy, ez - g.position.z]
    ]
    curve(g, pts, color, .025)
    mesh(g, new THREE.TorusGeometry(.048, .015, 4, 10), mRopeDark,
      [dx, dy + .012, ez - g.position.z], [.35, .45, .2], false)
    return sway(g, phase, .013, .009)
  }

  // line off a west-strip bollard, over the quay lip at x=-1.7, out to the side-berthed
  // boats; the rope only drops below the quay top once it is past the wall.
  const sideLine = (bx, bz, ex, ez, phase, color) => {
    const g = new THREE.Group()
    g.name = 'mooring-line'
    g.position.set(bx + .105, HITCH, bz + .02)
    group.add(g)
    const dx = ex - g.position.x
    const dz = ez - g.position.z
    const dy = .65 - HITCH
    const pts = [
      [0, 0, 0],
      [dx * .075, -.01, dz * .1],
      [dx * .148, -.025, dz * .2],
      [dx * .212, -.045, dz * .3],
      [dx * .317, -.11, dz * .5],
      [dx * .476, -.19, dz * .7],
      [dx * .656, -.255, dz * .9],
      [dx * .836, dy * .94, dz],
      [dx, dy, dz]
    ]
    curve(g, pts, color, .024)
    mesh(g, new THREE.TorusGeometry(.046, .014, 4, 10), mRopeDark, [dx, dy + .012, dz], [.3, -.4, .2], false)
    return sway(g, phase, .011, .008)
  }

  // a slack end of line thrown over the front lip, hanging down the quay wall
  const frontTail = (bx, bz, phase, color) => {
    const g = new THREE.Group()
    g.name = 'hanging-line'
    g.position.set(bx + .05, QUAY + .165, bz - .105)
    group.add(g)
    curve(g, [
      [0, 0, 0],
      [.02, -.012, -.075],
      [.04, -.042, -.19],
      [.055, -.10, -.285],
      [.065, -.43, -.32],
      [.07, -.78, -.335]
    ], color, .022)
    curve(g, [[.07, -.78, -.335], [.072, -.82, -.34], [.071, -.845, -.342]], mRopeDark, .012)
    return sway(g, phase, .03, .017)
  }

  // the same slack end on the west strip, hanging just clear of the wall
  const wallTail = (bx, bz, phase, color) => {
    const g = new THREE.Group()
    g.name = 'hanging-line'
    g.position.set(bx + .105, QUAY + .165, bz + .02)
    group.add(g)
    curve(g, [
      [0, 0, 0],
      [.08, -.01, .004],
      [.165, -.03, .008],
      [.225, -.055, .012],
      [.245, -.30, .016],
      [.26, -.60, .018],
      [.27, -.795, .02]
    ], color, .022)
    curve(g, [[.27, -.795, .02], [.272, -.835, .021], [.271, -.86, .02]], mRopeDark, .012)
    return sway(g, phase, .028, .015)
  }

  // a spare line coiled flat on the quay, its loose end curling away from the coil
  const spareCoil = (x, z, yaw) => {
    const g = new THREE.Group()
    g.name = 'spare-rope-coil'
    g.position.set(x, QUAY + .026, z)
    g.rotation.y = yaw
    group.add(g)
    const rings = [[.115, .026], [.078, .024], [.045, .021]]
    for (let i = 0; i < rings.length; i++) {
      mesh(g, new THREE.TorusGeometry(rings[i][0], rings[i][1], 4, 14), i === 1 ? mRopeDark : mRope,
        [0, i * .006, 0], [Math.PI / 2, .1 * i, .07 * i], false)
    }
    curve(g, [
      [-.06, .012, -.04],
      [-.115, .010, -.10],
      [-.155, .012, -.165],
      [-.18, .016, -.23]
    ], mRopePale, .017)
  }

  // ------------------------------- dynamic tension line (round 5) -----------------
  // The main line on the centre front bollard (z=2.7 / x=2.8): the bollard end is
  // pinned to the same coil hitch the static line used, the boat end follows boat-b's
  // known starboard stern cleat (09-boat-b.js cleat local .4283/.475/1.10, sway
  // position.y = sin(.90t)*.017 + sin(1.70t+.70)*.005, rotation.z = sin(.62t+.40)*.015,
  // rotation.x = sin(.78t+1.25)*.009) and the sag breathes with a restrained cycle.
  // One hand-built BufferGeometry is rewritten in place every frame (no geometry or
  // material is rebuilt); animate() sits on the rope group so batchStatic skips it.
  const tensionLine = () => {
    const SEG = 26, RAD = 8, ROPE_R = .025
    const geometry = new THREE.BufferGeometry()
    const positions = new Float32Array(SEG * RAD * 3)
    const normals = new Float32Array(SEG * RAD * 3)
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    geometry.setAttribute('normal', new THREE.BufferAttribute(normals, 3))
    const index = []
    for (let i = 0; i < SEG - 1; i++) {
      for (let j = 0; j < RAD; j++) {
        const a = i * RAD + j
        const b = i * RAD + (j + 1) % RAD
        index.push(a, b, a + RAD, b, b + RAD, a + RAD)
      }
    }
    geometry.setIndex(index)

    const rig = new THREE.Group()
    rig.name = 'dynamic-mooring-line'
    group.add(rig)

    const rope = mesh(rig, geometry, mRopeDark, [0, 0, 0], [0, 0, 0], false)
    rope.name = 'dynamic-mooring-rope'
    rope.frustumCulled = false
    // the hitch loop rides with the boat end and hides the open tube mouth
    const hitch = mesh(rig, new THREE.TorusGeometry(.04, .012, 4, 12), mRopeDark, [0, 0, 0], [.45, .5, .3], false)
    hitch.name = 'dynamic-mooring-hitch'
    hitch.frustumCulled = false

    const PIN = new THREE.Vector3(2.8 + .05, HITCH, 2.7 - .105)   // fixed coil hitch
    const ctrl = []
    for (let i = 0; i < 5; i++) ctrl.push(new THREE.Vector3())
    const curve = new THREE.CatmullRomCurve3(ctrl, false, 'centripetal', .5)
    const pts = []
    for (let i = 0; i < SEG; i++) pts.push(new THREE.Vector3())
    const tan = new THREE.Vector3(), nor = new THREE.Vector3(), bin = new THREE.Vector3()
    const ref = new THREE.Vector3(1, 0, 0), alt = new THREE.Vector3(0, 0, 1)
    let cleatX = 2.1283, cleatY = .475, cleatZ = 1.55

    const pose = time => {
      // boat-b's documented sway, read at its starboard stern cleat
      const heave = Math.sin(time * .90) * .017 + Math.sin(time * 1.70 + .70) * .005
      const roll = Math.sin(time * .62 + .40) * .015
      const pitch = Math.sin(time * .78 + 1.25) * .009
      cleatX = 2.1283 - .475 * roll
      cleatY = .475 + heave + .4283 * roll - 1.10 * pitch
      cleatZ = 1.55 + .475 * pitch
      // slack: slow swell breath plus the boat's own heave (a rising boat gives slack)
      const breath = Math.sin(time * .62 + 1.1)
      const sag = .105 + .030 * breath + .55 * (cleatY - .475)
      ctrl[0].copy(PIN)
      ctrl[1].set(PIN.x + .03, PIN.y - .02, PIN.z - .30)
      ctrl[2].set((PIN.x + cleatX) * .5 + .01, (PIN.y + cleatY) * .5 - sag, (PIN.z + cleatZ) * .5 + .02)
      ctrl[3].set(cleatX + .05, cleatY + .16 + .02 * breath, cleatZ + .18)
      ctrl[4].set(cleatX, cleatY, cleatZ)
      for (let i = 0; i < SEG; i++) {
        curve.getPoint(i / (SEG - 1), pts[i])
        // hard safety line above the wet concrete (top y=.8); the path clears by ~.14
        if (pts[i].z > 2.39 && pts[i].y < .845) pts[i].y = .845
      }
      for (let i = 0; i < SEG; i++) {
        const p = pts[i]
        tan.subVectors(pts[i === SEG - 1 ? SEG - 1 : i + 1], pts[i === 0 ? 0 : i - 1])
        if (tan.lengthSq() < 1e-10) tan.set(0, -1, 0)
        tan.normalize()
        nor.copy(ref).addScaledVector(tan, -tan.dot(ref))
        if (nor.lengthSq() < 1e-6) nor.copy(alt).addScaledVector(tan, -tan.dot(alt))
        nor.normalize()
        bin.crossVectors(tan, nor)
        for (let j = 0; j < RAD; j++) {
          const ang = j / RAD * Math.PI * 2
          const c = Math.cos(ang), s = Math.sin(ang)
          const k = (i * RAD + j) * 3
          positions[k] = p.x + (nor.x * c + bin.x * s) * ROPE_R
          positions[k + 1] = p.y + (nor.y * c + bin.y * s) * ROPE_R
          positions[k + 2] = p.z + (nor.z * c + bin.z * s) * ROPE_R
          normals[k] = nor.x * c + bin.x * s
          normals[k + 1] = nor.y * c + bin.y * s
          normals[k + 2] = nor.z * c + bin.z * s
        }
      }
      geometry.attributes.position.needsUpdate = true
      geometry.attributes.normal.needsUpdate = true
      hitch.position.set(cleatX, cleatY - .022, cleatZ)
    }
    pose(0)                       // valid authored shape before the first frame
    return animate(rig, pose)     // userData.dynamic on the group -> batchStatic skips it
  }

  // ---------------------------------------------------------------- placement
  // front quay edge (z=2.7): four bollards, ropes only where lines are actually needed
  bollard(-.8, 2.7, .12)
  bollard(1.0, 2.7, -.08)
  bollard(2.8, 2.7, .18)
  bollard(4.5, 2.7, -.15)
  coil(-.8, 2.7, .12, 4, mRope)
  coil(1.0, 2.7, -.08, 3, mRopePale)
  coil(2.8, 2.7, .18, 4, mRopeDark)
  coil(4.5, 2.7, -.15, 4, mRope)

  // west strip (x=-2): three bollards along the harbour wall
  bollard(-2, -3, .05)
  bollard(-2, -1, -.2)
  bollard(-2, 1, .25)
  coil(-2, -3, .05, 2, mRopeDark)
  coil(-2, -1, -.2, 3, mRope)
  coil(-2, 1, .25, 2, mRopeDark)

  // lines sagging to the berth sterns; the centre front one is the dynamic line and the
  // other two stay exactly as authored
  sternLine(-.8, 2.7, -.72, 1.72, .4, mRope)
  tensionLine()
  sternLine(4.5, 2.7, 4.4, 1.72, 3.4, mRope)
  frontTail(1.0, 2.7, 1.2, mRopePale)
  sideLine(-2, -1, -.95, -1.05, 5.0, mRopeDark)
  wallTail(-2, -3, .9, mRope)

  // a spare coil on the front quay, clear of the lip
  spareCoil(1.35, 2.95, .5)

  return group
}
