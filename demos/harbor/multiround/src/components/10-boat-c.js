// 10-boat-c.js — 白色游钓船C：锥形白船体 + 透明舱窗 + 木质舵台（首稿）
// 第4轮细化：细窄遮阳铁架、3 块克制的舱顶/棚顶水光斑、护舷吊架轻摆；船位、内部与既有细节保持不动。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'white-cruiser-c'
  group.position.set(3.55, .16, .5)

  const glass = mat(p.glass, { transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide })
  const white = p.hull
  const teak = p.rope
  const steel = p.metal

  // ---- hull: extruded tapered plan, bow to -z ----
  const hullPlan = [[-.52, -1.32], [.52, -1.32], [.575, -.60], [.575, .24], [.475, .60],
    [.315, .95], [.155, 1.18], [0, 1.33], [-.155, 1.18], [-.315, .95], [-.475, .60], [-.575, .24], [-.575, -.60]]
  const planShape = (points) => {
    const shape = new THREE.Shape()
    points.forEach(([x, s], index) => (index ? shape.lineTo(x, s) : shape.moveTo(x, s)))
    return shape
  }
  const hullGeo = new THREE.ExtrudeGeometry(planShape(hullPlan), { depth: .245, bevelEnabled: false })
  hullGeo.rotateX(-Math.PI / 2)
  mesh(group, hullGeo, white, [0, -.02, 0])

  const bandGeo = new THREE.ExtrudeGeometry(planShape(hullPlan), { depth: .05, bevelEnabled: false })
  bandGeo.rotateX(-Math.PI / 2)
  bandGeo.scale(1.012, 1, 1.012)
  mesh(group, bandGeo, p.blue, [0, -.02, 0])

  const rubGeo = new THREE.ExtrudeGeometry(planShape(hullPlan), { depth: .05, bevelEnabled: false })
  rubGeo.rotateX(-Math.PI / 2)
  rubGeo.scale(1.025, 1, 1.025)
  mesh(group, rubGeo, white, [0, .18, 0])

  box(group, [.70, .08, 1.60], [0, -.06, .05], p.blue)
  box(group, [.30, .08, .40], [0, -.05, -.95], p.blue)

  // ---- deck with open cockpit well ----
  const cockpit = new THREE.Path()
  cockpit.moveTo(-.36, -.96)
  cockpit.lineTo(-.36, -.14)
  cockpit.lineTo(.36, -.14)
  cockpit.lineTo(.36, -.96)
  cockpit.closePath()
  const deckShape = planShape(hullPlan)
  deckShape.holes.push(cockpit)
  const deckGeo = new THREE.ExtrudeGeometry(deckShape, { depth: .03, bevelEnabled: false })
  deckGeo.rotateX(-Math.PI / 2)
  deckGeo.scale(.99, 1, .99)
  mesh(group, deckGeo, white, [0, .225, 0])

  box(group, [.66, .014, .76], [0, .232, .545], teak)
  box(group, [.09, .09, .86], [-.356, .295, .545], white)
  box(group, [.09, .09, .86], [.356, .295, .545], white)
  box(group, [.80, .09, .08], [0, .295, .14], white)
  box(group, [.80, .09, .08], [0, .295, .95], white)
  for (const x of [-.22, 0, .22]) line(group, [[x, .24, .18], [x, .24, .90]], p.concreteDark, .3)

  // ---- foredeck fittings and pulpit rails ----
  box(group, [.12, .035, .05], [0, .275, -1.10], steel)
  box(group, [.03, .05, .06], [0, .258, -1.10], steel)
  box(group, [.30, .022, .26], [0, .262, -.78], p.concreteLight)
  box(group, [.05, .012, .03], [.10, .274, -.67], p.rust)
  box(group, [.05, .012, .03], [-.10, .274, -.89], p.rust)
  beam(group, [0, .262, -1.16], [0, .31, -1.27], .035, steel)
  sphere(group, .022, [0, .312, -1.28], p.gold, 8)
  for (const s of [-1, 1]) {
    beam(group, [s * .40, .40, -.45], [s * .22, .40, -.85], .018, steel)
    beam(group, [s * .22, .40, -.85], [s * .12, .40, -1.12], .018, steel)
    cylinder(group, .009, .011, .15, [s * .32, .3275, -.62], steel, 6)
    cylinder(group, .009, .011, .15, [s * .22, .3275, -.85], steel, 6)
    box(group, [.04, .03, .06], [s * .40, .266, -.60], white)
    sphere(group, .019, [s * .40, .285, -.60], s < 0 ? p.orange : p.green, 8)
  }
  beam(group, [-.12, .40, -1.12], [.12, .40, -1.12], .018, steel)
  line(group, [[-.34, .257, -.44], [.34, .257, -.44]], p.concreteDark, .28)
  line(group, [[-.26, .257, -.70], [.26, .257, -.70]], p.concreteDark, .24)

  // ---- cabin shell: open side windows, framed pale-blue glazing ----
  box(group, [.84, .34, .46], [0, .425, -.17], white)
  box(group, [.05, .09, .44], [-.445, .30, -.17], white)
  box(group, [.05, .09, .44], [.445, .30, -.17], white)
  for (const s of [-1, 1]) {
    box(group, [.07, .56, .07], [s * .46, .615, -.38], white)
    box(group, [.07, .56, .07], [s * .46, .615, .04], white)
    box(group, [.08, .08, .44], [s * .46, .38, -.17], white)
    box(group, [.08, .06, .48], [s * .46, .88, -.17], white)
  }
  box(group, [.86, .26, .10], [0, .385, -.455], white)
  box(group, [.78, .32, .015], [0, .66, -.44], glass, [.28, 0, 0])
  box(group, [.84, .04, .035], [0, .815, -.397], white, [.28, 0, 0])
  box(group, [.82, .04, .035], [0, .505, -.483], white, [.28, 0, 0])
  box(group, [.03, .32, .03], [-.26, .66, -.44], white, [.28, 0, 0])
  box(group, [.03, .32, .03], [.26, .66, -.44], white, [.28, 0, 0])
  beam(group, [.12, .52, -.50], [.10, .76, -.42], .008, p.dark)
  box(group, [.88, .10, .08], [0, .865, -.44], white)

  box(group, [1.00, .06, .74], [0, .93, -.14], white)
  box(group, [.88, .025, .60], [0, .972, -.14], p.concreteLight)
  box(group, [.70, .26, .012], [0, .715, .065], glass)
  box(group, [.76, .04, .05], [0, .58, .065], white)
  box(group, [.76, .05, .05], [0, .86, .065], white)
  box(group, [.05, .28, .05], [-.37, .72, .065], white)
  box(group, [.05, .28, .05], [.37, .72, .065], white)

  // ---- helm, instruments, mug, chart, rain jacket ----
  box(group, [.80, .075, .20], [0, .6325, -.29], teak)
  box(group, [.34, .12, .03], [-.18, .70, -.275], p.dark, [.2, 0, 0])
  box(group, [.26, .065, .012], [-.18, .705, -.257], p.foam, [.2, 0, 0])
  box(group, [.14, .10, .02], [.12, .69, -.27], p.dark, [.2, 0, 0])
  box(group, [.10, .05, .012], [.12, .695, -.256], p.foam, [.2, 0, 0])
  box(group, [.18, .008, .13], [-.30, .676, -.23], p.concreteLight, [0, .18, 0])
  box(group, [.05, .02, .05], [-.30, .69, -.21], p.rust)
  cylinder(group, .034, .03, .06, [.34, .70, -.25], white, 10)
  mesh(group, new THREE.TorusGeometry(.03, .008, 4, 8), white, [.375, .70, -.25], [0, Math.PI / 2, 0], false)

  cylinder(group, .035, .045, .345, [0, .4275, -.16], p.concreteLight, 8)
  box(group, [.06, .06, .05], [0, .615, -.12], white)
  const helm = new THREE.Group()
  helm.position.set(0, .64, -.13)
  helm.rotation.x = -.2
  group.add(helm)
  mesh(helm, new THREE.TorusGeometry(.10, .016, 6, 16), teak)
  box(helm, [.05, .05, .04], [0, 0, .015], steel)
  beam(helm, [0, 0, .01], [.088, 0, .012], .012, teak)
  beam(helm, [0, 0, .01], [-.088, 0, .012], .012, teak)
  beam(helm, [0, 0, .01], [0, .088, .012], .012, teak)

  cylinder(group, .009, .009, .05, [.33, .875, -.02], steel, 6)
  box(group, [.16, .26, .05], [.33, .73, -.02], p.yellow, [0, 0, .08])
  box(group, [.17, .05, .055], [.325, .845, -.02], p.yellow)
  box(group, [.06, .18, .04], [.245, .72, -.02], p.yellow, [0, 0, -.15])

  // ---- cockpit bench and the slim sun-shade iron frame ----
  box(group, [.68, .08, .24], [0, .279, .79], white)
  box(group, [.64, .06, .22], [0, .349, .79], p.blue)
  box(group, [.68, .16, .05], [0, .399, .925], p.blue)
  box(group, [.05, .05, .22], [-.345, .40, .79], p.concreteLight)
  box(group, [.05, .05, .22], [.345, .40, .79], p.concreteLight)

  // Four slender steel uprights carry a narrow rectangular shade frame just
  // above the aft deck. The pale canvas sits under the tubes and the centre
  // ridge is raised, so the thin dark frame reads against the sky from the
  // hero camera without enlarging the boat's footprint.
  for (const z of [.30, .86]) {
    cylinder(group, .010, .013, .78, [-.44, .645, z], steel, 6)
    cylinder(group, .010, .013, .78, [.44, .645, z], steel, 6)
    beam(group, [-.445, 1.038, z], [.445, 1.038, z], .015, steel)
  }
  for (const x of [-.445, .445]) beam(group, [x, 1.038, .29], [x, 1.038, .87], .015, steel)
  beam(group, [0, 1.062, .30], [0, 1.062, .86], .012, steel)
  for (const z of [.30, .86]) beam(group, [0, 1.038, z], [0, 1.062, z], .012, steel)
  box(group, [.82, .014, .54], [0, 1.018, .58], white)
  beam(group, [-.44, .27, .90], [-.44, 1.035, .62], .014, steel)
  beam(group, [.44, .27, .90], [.44, 1.035, .62], .014, steel)

  // ---- three restrained pale water-light patches sliding over roof/canopy ----
  const glints = [
    box(group, [.30, .004, .16], [-.10, .990, -.06], mat(p.foam, { transparent: true, opacity: .38, depthWrite: false }), [0, .22, 0], false),
    box(group, [.18, .004, .10], [.18, .9895, -.21], mat(p.gold, { transparent: true, opacity: .28, depthWrite: false }), [0, -.35, 0], false),
    box(group, [.20, .004, .10], [.06, 1.031, .50], mat(p.foam, { transparent: true, opacity: .26, depthWrite: false }), [0, .50, 0], false),
  ]
  const glintBase = glints.map(patch => [patch.position.x, patch.position.z])
  glints.forEach((patch, index) => animate(patch, t => {
    patch.position.x = glintBase[index][0] + Math.sin(t * (.58 + index * .07) + index) * .011
    patch.position.z = glintBase[index][1] + Math.sin(t * (.41 + index * .05) + index * 1.6) * .007
  }))

  // ---- roof gear: grab rails, radar dome, antenna + pennant ----
  beam(group, [-.32, .995, -.46], [-.32, .995, .15], .022, steel)
  beam(group, [.32, .995, -.46], [.32, .995, .15], .022, steel)
  cylinder(group, .10, .11, .06, [0, 1.00, -.33], p.concreteLight, 12)
  sphere(group, .085, [0, 1.06, -.33], p.concreteLight, 12)
  box(group, [.04, .05, .04], [.33, 1.00, -.12], steel)
  cylinder(group, .006, .009, .60, [.33, 1.27, -.12], steel, 6)
  sphere(group, .018, [.33, 1.575, -.12], p.orange, 8)
  const flag = new THREE.Group()
  flag.position.set(.33, 1.55, -.12)
  group.add(flag)
  box(flag, [.17, .085, .01], [.085, 0, 0], p.orange)

  // ---- stern rail, orange lifebuoy, cleats ----
  for (const s of [-1, 1]) {
    cylinder(group, .009, .011, .185, [s * .42, .3475, 1.05], steel, 6)
    cylinder(group, .009, .011, .185, [s * .42, .3475, 1.28], steel, 6)
    beam(group, [s * .42, .44, 1.05], [s * .42, .44, 1.29], .018, steel)
    box(group, [.10, .035, .045], [s * .40, .275, 1.18], steel)
  }
  beam(group, [-.42, .44, 1.29], [.42, .44, 1.29], .018, steel)
  mesh(group, new THREE.TorusGeometry(.11, .022, 6, 18), p.orange, [0, .50, 1.32])
  line(group, [[0, .615, 1.315], [0, .445, 1.295]], p.rope, .8)
  box(group, [.05, .026, .03], [0, .612, 1.33], white)
  box(group, [.05, .026, .03], [0, .388, 1.33], white)

  // ---- fenders on swaying hanger rigs, mooring lines, ropes, registration ----
  const fenderRigs = []
  for (const [x, z, phase] of [[.566, .52, .2], [.566, .98, 2.1], [-.566, .55, 3.6]]) {
    const rig = new THREE.Group()
    rig.position.set(x, .252, z)
    group.add(rig)
    const out = Math.sign(x) * .022
    mesh(rig, new THREE.TorusGeometry(.075, .026, 6, 12), p.dark, [out, -.167, 0], [0, Math.PI / 2, 0])
    line(rig, [[0, 0, 0], [out * .55, -.10, 0], [out, -.152, 0]], p.rope, .8)
    fenderRigs.push([rig, phase])
  }
  fenderRigs.forEach(([rig, phase]) => animate(rig, t => {
    rig.rotation.z = Math.sin(t * .82 + phase) * .05
    rig.rotation.x = Math.sin(t * .61 + phase * 1.6) * .034
  }))
  curve(group, [[.10, .258, -.92], [.19, .258, -.86], [.24, .258, -.95], [.16, .258, -1.01], [.10, .258, -.92]], p.rope, .014)
  curve(group, [[0, .285, -1.12], [.04, .22, -1.28], [.09, .13, -1.52], [.13, .05, -1.75]], p.rope, .016)
  // The stern painter loops forward along the port quarter and drops into open
  // water at world x <= 3.15 / z <= 1.64: clear of the 04-stairs mass
  // (x >= 3.5 / z >= 1.7) and of the 27-umbrella bounds (z >= 1.696).
  curve(group, [[-.40, .30, 1.14], [-.50, .28, 1.06], [-.57, .20, .98], [-.60, .05, .92]], p.rope, .016)
  label(group, 'C-32', .30, [0, .12, 1.332], [0, 0, 0], '#6f918d', '#f5f3df')

  const rustSpots = [[.578, .15, .30], [-.578, .14, .45], [.576, .10, -.20], [.22, .12, 1.328], [.545, .12, 1.02]]
  rustSpots.forEach(([x, y, z]) => box(group, [.018, .022, .04 + rand() * .05], [x, y, z], p.rust))

  // ---- independent bob/roll + pennant flutter ----
  const baseY = group.position.y, baseRX = group.rotation.x, baseRZ = group.rotation.z
  animate(group, (t) => {
    group.position.y = baseY + Math.sin(t * .85 + .4) * .012
    group.rotation.x = baseRX + Math.sin(t * .53 + 1.3) * .005
    group.rotation.z = baseRZ + Math.sin(t * .71 + 2.1) * .009
  })
  animate(flag, (t) => {
    flag.rotation.y = Math.sin(t * 2.7) * .38
    flag.rotation.z = Math.sin(t * 3.2) * .07
  })

  return group
}
