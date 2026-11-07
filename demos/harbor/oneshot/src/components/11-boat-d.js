// 11-boat-d — 侧泊小船D与敞开船舱（首稿，仅源码）
// 泊位：中心 x=-.65, z=-2.5；长 2.6（船头朝 -z）、宽 1.0；局部原点取水面高度。
// 特征：白色船体 + 海绿饰带、敞开低驾驶舱（可见舵轮与仪表）、蓝色鱼箱、
// 系缆绳与缆圈、橙白救生圈、旧轮胎护舷、小桅杆 + 明黄安全三角旗；整体轻缓起伏。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const boat = new THREE.Group()
  boat.position.set(-.65, .15, -2.5)
  boat.name = '11-boat-d'

  // ── 船体：俯视轮廓拉伸（shape.y 对应世界 -z，故船头在 -z） ─────────
  const hullShape = new THREE.Shape()
  hullShape.moveTo(0, 1.3)
  hullShape.quadraticCurveTo(.24, 1.04, .33, .78)
  hullShape.quadraticCurveTo(.52, -.08, .5, -.55)
  hullShape.lineTo(.45, -1.3)
  hullShape.lineTo(-.45, -1.3)
  hullShape.lineTo(-.5, -.55)
  hullShape.quadraticCurveTo(-.52, -.08, -.33, .78)
  hullShape.quadraticCurveTo(-.24, 1.04, 0, 1.3)

  const extrudeOpts = { bevelEnabled: false, curveSegments: 10 }
  mesh(boat, new THREE.ExtrudeGeometry(hullShape, { ...extrudeOpts, depth: .5 }), p.hull,
    [0, -.21, 0], [-Math.PI / 2, 0, 0])

  // 甲板：内缩的浅灰平涂面，四周留出白色舷缘
  const deckGeo = new THREE.ExtrudeGeometry(hullShape, { ...extrudeOpts, depth: .04 })
  deckGeo.scale(.9, .92, 1)
  mesh(boat, deckGeo, p.concreteLight, [0, .262, 0], [-Math.PI / 2, 0, 0])

  // 海绿饰带：沿轮廓微外扩的薄带（本船识别特征）
  const stripeGeo = new THREE.ExtrudeGeometry(hullShape, { ...extrudeOpts, depth: .065 })
  stripeGeo.scale(1.02, 1.008, 1)
  mesh(boat, stripeGeo, p.green, [0, .19, 0], [-Math.PI / 2, 0, 0])

  // 舷号：右舷尾部水线附近的褪色小标签
  label(boat, 'KK-211', .22, [.481, .11, .93], [0, Math.PI / 2 - .09, 0])

  // ── 敞开驾驶舱：无顶、低围板，舵轮与仪表从上方可见 ───────────────
  const cabin = new THREE.Group()
  cabin.position.set(0, .302, .64)
  boat.add(cabin)

  box(cabin, [.68, .016, .6], [0, .008, 0], p.concrete)
  box(cabin, [.036, .15, .66], [-.372, .078, 0], p.hull)
  box(cabin, [.036, .15, .66], [.372, .078, 0], p.hull)
  box(cabin, [.024, .32, .024], [-.3, .16, -.33], p.metal)
  box(cabin, [.024, .32, .024], [.3, .16, -.33], p.metal)
  box(cabin, [.62, .022, .028], [0, .32, -.33], p.metal)
  mesh(cabin, new THREE.PlaneGeometry(.58, .26),
    mat(p.glass, { transparent: true, opacity: .18, depthWrite: false, side: THREE.DoubleSide }), [0, .165, -.334])

  // 控制台、仪表与天线
  box(cabin, [.56, .15, .11], [0, .075, -.25], p.concreteLight)
  box(cabin, [.54, .026, .15], [0, .165, -.225], p.hull, [-.3, 0, 0])
  box(cabin, [.13, .075, .012], [-.13, .112, -.198], p.metal)
  box(cabin, [.1, .05, .014], [-.13, .112, -.19], mat(p.gold))
  box(cabin, [.08, .045, .012], [.12, .108, -.19], mat(p.glass))
  sphere(cabin, .015, [.21, .176, -.21], p.gold)
  beam(cabin, [.18, .17, -.3], [.18, .38, -.3], .008, p.metal)

  // 舵轮（可见）：舵柱 + 三辐轮 + 金色轮毂
  const wheel = new THREE.Group()
  wheel.position.set(0, .23, -.12)
  wheel.rotation.x = -.3
  cabin.add(wheel)
  mesh(wheel, new THREE.TorusGeometry(.1, .014, 6, 18), p.metal)
  for (let i = 0; i < 3; i += 1) box(wheel, [.012, .19, .012], [0, 0, 0], p.metal, [0, 0, i * Math.PI / 3])
  sphere(wheel, .024, [0, 0, 0], p.gold)
  cylinder(cabin, .02, .03, .17, [0, .145, -.12], p.metal)

  // 油门杆与尾凳
  beam(cabin, [.2, .1, -.19], [.25, .2, -.22], .014, p.metal)
  sphere(cabin, .017, [.25, .2, -.22], p.orange)
  box(cabin, [.58, .1, .16], [0, .05, .27], p.hull)
  box(cabin, [.5, .035, .12], [0, .117, .27], p.concreteLight)

  // 橙白救生圈：挂在右舷围板外
  mesh(boat, new THREE.TorusGeometry(.1, .025, 6, 16), p.orange, [.42, .48, .84], [0, Math.PI / 2, 0])
  for (let i = 0; i < 4; i += 1) {
    const a = i * Math.PI / 2
    box(boat, [.02, .06, .055], [.42, .48 + Math.sin(a) * .1, .84 + Math.cos(a) * .1], p.foam, [0, Math.PI / 2, 0])
  }

  // ── 甲板：蓝色鱼箱（半开盖）、白色塑料箱、缆圈、船首柱、机舱盖 ────
  box(boat, [.3, .15, .2], [-.22, .377, -.12], p.blue)
  box(boat, [.31, .024, .21], [-.22, .465, -.15], p.blue, [-.18, 0, 0])
  box(boat, [.26, .12, .18], [.18, .362, -.12], p.hull)
  box(boat, [.27, .02, .19], [.18, .428, -.12], p.blue)
  box(boat, [.05, .08, .05], [0, .334, -1.24], p.hull)
  box(boat, [.24, .12, .18], [0, .365, 1.1], p.hull)
  box(boat, [.16, .02, .1], [0, .43, 1.1], p.metal)

  const coil = []
  for (let i = 0; i <= 10; i += 1) {
    const a = (i / 10) * Math.PI * 3.4
    coil.push([-.1 + Math.cos(a) * .085, .312, -.62 + Math.sin(a) * .085])
  }
  curve(boat, coil, p.rope, .013)

  // ── 系泊：舷边小卡座与两根湿缆绳（通向 x=-1.7 的岸壁） ────────────
  box(boat, [.07, .03, .05], [-.35, .306, -.95], p.metal)
  box(boat, [.07, .03, .05], [-.45, .306, .95], p.metal)
  curve(boat, [[-.35, .325, -.95], [-.62, .42, -1], [-.88, .55, -1.03], [-1.05, .65, -1.06]], p.rope, .011)
  curve(boat, [[-.45, .325, .95], [-.7, .42, .84], [-.92, .54, .72], [-1.05, .63, .62]], p.rope, .011)

  // ── 旧轮胎护舷：靠岸壁一侧，半沉在水线，用细绳挂在舷缘 ────────────
  for (const tireZ of [-.42, .88]) {
    mesh(boat, new THREE.TorusGeometry(.085, .034, 7, 14), p.dark, [-.53, .12, tireZ], [0, Math.PI / 2, 0])
    curve(boat, [[-.5, .29, tireZ], [-.545, .2, tireZ]], p.rope, .008)
  }

  // ── 小桅杆、横杆、桅灯与明黄安全三角旗 ────────────────────────────
  cylinder(boat, .014, .02, .92, [0, .76, -.86], p.metal)
  beam(boat, [-.15, 1.08, -.86], [.15, 1.08, -.86], .014, p.metal)
  sphere(boat, .03, [0, 1.24, -.86], p.gold)

  const pennant = new THREE.Group()
  pennant.position.set(0, 1.19, -.86)
  boat.add(pennant)
  const pennantShape = new THREE.Shape()
  pennantShape.moveTo(0, 0)
  pennantShape.lineTo(.3, -.05)
  pennantShape.lineTo(0, -.13)
  pennantShape.lineTo(0, 0)
  mesh(pennant, new THREE.ExtrudeGeometry(pennantShape, { depth: .008, bevelEnabled: false }),
    p.yellow, [0, 0, 0], [0, -Math.PI / 2, 0])
  animate(pennant, time => {
    pennant.rotation.y = Math.sin(time * 2.2) * .14
    pennant.rotation.z = Math.sin(time * 3.1 + .6) * .05
  })

  // ── 水面轻缓起伏：以静止位姿为基准，不累积漂移 ────────────────────
  const restY = boat.position.y
  animate(boat, time => {
    boat.position.y = restY + Math.sin(time * 1.3) * .016
    boat.rotation.z = Math.sin(time * 1.05 + .4) * .012
    boat.rotation.x = Math.cos(time * .85) * .007
  })

  return boat
}
