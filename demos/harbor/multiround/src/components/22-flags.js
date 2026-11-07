// 风向袋、港口小旗与风动 — windsock pole on the left quay plus a small
// harbour pennant mast on the front-left apron. First-pass authored source;
// no renderer was executed for this module (the external driver does that).

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = 'harbor-22-flags'
  const Y = .8 // concrete quay top

  const metal = mat(p.metal)
  const rust = mat(p.rust)
  const orange = mat(p.orange, { side: THREE.DoubleSide })
  const ivory = mat(p.hull, { side: THREE.DoubleSide })

  // ---------------------------------------------------------------- windsock pole
  const sx = -5.3, sz = -2.5, poleH = 2.7
  cylinder(group, .15, .19, .12, [sx, Y + .06, sz], p.concreteDark, 12) // cast footing
  const pole = new THREE.Group()
  pole.position.set(sx, Y, sz)
  pole.rotation.z = -.045 // leans gently downwind (+x)
  group.add(pole)
  cylinder(pole, .026, .04, poleH, [0, poleH / 2, 0], p.metal, 8)
  cylinder(pole, .052, .056, .04, [0, .02, 0], p.rust, 8) // rusty shoe
  cylinder(pole, .036, .04, .022, [0, 1.02, 0], p.rust, 8) // collar for the guy rope
  sphere(pole, .042, [0, poleH, 0], p.metal, 8)

  // ------------------------------------------- segmented orange / ivory windsock
  const sock = new THREE.Group()
  sock.position.set(0, poleH, 0)
  pole.add(sock)
  // swivel hoop: the fabric pivots around this ring, not around its own tail
  mesh(sock, new THREE.TorusGeometry(.172, .012, 6, 18), metal, [.03, 0, 0], [0, Math.PI / 2, 0], false)
  // two short bridle ropes and their little clamps
  curve(sock, [[0, .012, .02], [.02, .09, 0], [.03, .172, 0]], p.rope, .008)
  curve(sock, [[0, -.012, .02], [.02, -.09, 0], [.03, -.172, 0]], p.rope, .008)
  box(sock, [.024, .022, .016], [.03, .172, 0], p.rust, [0, 0, 0], false)
  box(sock, [.024, .022, .016], [.03, -.172, 0], p.rust, [0, 0, 0], false)

  const joints = []
  const mouthR = .155, tipR = .042, segLen = .13
  let mount = sock
  for (let i = 0; i < 5; i++) {
    const joint = new THREE.Group()
    joint.position.x = i === 0 ? .03 : segLen
    mount.add(joint)
    const r0 = mouthR + (tipR - mouthR) * (i / 5)
    const r1 = mouthR + (tipR - mouthR) * ((i + 1) / 5)
    // open-ended frustum so the mouth reads hollow; axis rotated onto +x
    mesh(joint, new THREE.CylinderGeometry(r1, r0, segLen, 12, 1, true),
      i % 2 === 0 ? orange : ivory, [segLen / 2, 0, 0], [0, 0, -Math.PI / 2], false)
    joints.push(joint)
    mount = joint
  }
  // tiny clamps where the fabric rings meet, plus a tip ring
  mesh(joints[1], new THREE.TorusGeometry(.136, .009, 5, 14), rust, [0, 0, 0], [0, Math.PI / 2, 0], false)
  mesh(joints[3], new THREE.TorusGeometry(.092, .009, 5, 14), metal, [0, 0, 0], [0, Math.PI / 2, 0], false)
  mesh(joints[4], new THREE.TorusGeometry(.048, .008, 5, 14), metal, [segLen, 0, 0], [0, Math.PI / 2, 0], false)

  animate(sock, (t) => {
    sock.rotation.y = Math.sin(t * .55) * .15 + Math.sin(t * .21 + 1.3) * .05
    sock.rotation.z = -.055 + Math.sin(t * .8 + .2) * .028 // slight droop, never a spin
    for (let i = 0; i < joints.length; i++) {
      joints[i].rotation.y = Math.sin(t * 1.15 - i * .55) * (.045 + i * .01)
      joints[i].rotation.z = Math.sin(t * .85 - i * .4 + .7) * (.012 + i * .006)
    }
  })

  // ------------------------------------------------- thin guy rope, stake and tail
  const a = new THREE.Vector3(0, 1.02, 0).applyEuler(pole.rotation).add(pole.position)
  const bx = sx + 1.25, bz = sz + .78
  curve(group, [
    [a.x, a.y, a.z],
    [a.x + (bx - a.x) * .33, a.y + (Y + .04 - a.y) * .33 - .035, a.z + (bz - a.z) * .33],
    [a.x + (bx - a.x) * .66, a.y + (Y + .04 - a.y) * .66 - .035, a.z + (bz - a.z) * .66],
    [bx, Y + .04, bz]
  ], p.rope, .011)
  cylinder(group, .013, .021, .2, [bx, Y + .1, bz], p.metal, 8) // stake
  mesh(group, new THREE.TorusGeometry(.026, .007, 4, 10), rust, [bx, Y + .2, bz], [Math.PI / 2, 0, 0], false)
  curve(group, [[bx, Y + .045, bz], [bx + .07, Y + .02, bz + .06], [bx + .16, Y + .015, bz + .11]], p.rope, .01)

  // -------------------------------------------- small harbour pennant, front left
  const mx = -4.9, mz = 3.55, mastH = 2.2
  box(group, [.18, .09, .18], [mx, Y + .045, mz], p.concrete) // small pad
  box(group, [.15, .022, .15], [mx, Y + .101, mz], p.rust) // base plate
  box(group, [.018, .018, .018], [mx - .049, Y + .112, mz - .049], p.metal)
  box(group, [.018, .018, .018], [mx + .049, Y + .112, mz + .049], p.metal)

  const mast = new THREE.Group()
  mast.position.set(mx, Y + .1, mz)
  mast.rotation.z = -.035 // the wind has pushed it slightly askew
  group.add(mast)
  cylinder(mast, .022, .034, mastH, [0, mastH / 2, 0], p.metal, 8)
  cylinder(mast, .03, .03, .022, [0, .55, 0], p.rust, 8) // cleat collar
  box(mast, [.056, .02, .02], [.018, .55, 0], p.rust) // cleat bar
  sphere(mast, .032, [0, mastH, 0], p.metal, 8)
  // halyard running from the mast head down to the cleat
  curve(mast, [[0, mastH - .03, .01], [.024, 1.55, .022], [.012, 1.0, .014], [.04, .57, .012]], p.rope, .007)

  const pennant = new THREE.Group()
  pennant.position.set(.025, mastH - .02, 0)
  mast.add(pennant)
  // clips holding the hoist to the halyard
  box(pennant, [.02, .026, .016], [0, -.01, 0], p.rust, [0, 0, 0], false)
  box(pennant, [.02, .026, .016], [0, -.152, 0], p.rust, [0, 0, 0], false)
  // triangular cloth: five strips with a straight top edge and an orange hoist band
  const stripH = [.152, .118, .086, .056, .028]
  const flagJoints = []
  let holder = pennant
  for (let i = 0; i < stripH.length; i++) {
    const joint = new THREE.Group()
    joint.position.x = i === 0 ? .012 : .105
    holder.add(joint)
    box(joint, [.105, stripH[i], .006], [.0525, -stripH[i] / 2, 0],
      i === 0 ? orange : ivory, [0, 0, 0], false)
    flagJoints.push(joint)
    holder = joint
  }
  animate(pennant, (t) => {
    pennant.rotation.y = .14 + Math.sin(t * .62) * .1
    pennant.rotation.x = Math.sin(t * .8 + .5) * .02
    for (let i = 0; i < flagJoints.length; i++) {
      flagJoints[i].rotation.y = Math.sin(t * 1.9 - i * .7) * (.05 + i * .015)
      flagJoints[i].rotation.x = Math.sin(t * 1.35 - i * .5 + .9) * (.04 + i * .012)
    }
  })

  // a short rope coil left on the concrete at the pennant mast
  curve(group, [
    [mx - .13, Y + .012, mz - .05], [mx - .02, Y + .014, mz - .15],
    [mx + .11, Y + .012, mz - .04], [mx + .02, Y + .012, mz + .1],
    [mx - .12, Y + .013, mz + .04], [mx - .02, Y + .012, mz - .03]
  ], p.rope, .012)

  return group
}
