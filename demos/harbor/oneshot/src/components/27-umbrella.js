// 27-umbrella —— 双乐器硬箱与透明雨伞
// 首稿：只负责本模块物件（前方堤岸上的两只乐器箱 + 台阶旁的透明雨伞），
// 不重复其他模块的水面、地坪、台阶、雨丝或人物。源码-only，未运行渲染。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '27-umbrella'

  // ------------------------------------------------------------------
  // 两只银灰乐器硬箱：平行放在前方堤岸 x[0,1.8] z[4.2,4.8] 上方
  // ------------------------------------------------------------------
  const shell = '#c6cecc'
  const shellSoft = '#d9dfda'
  const caseRim = '#3f4f4f'
  const steel = '#a9b6b4'
  const wetGloss = mat('#d8f1e9', { transparent: true, opacity: .45, depthWrite: false })

  const instrumentCase = (x, z, accent) => {
    const g = new THREE.Group()
    g.position.set(x, .8, z)
    group.add(g)

    // 下箱体 + 上盖（轻微两段色，读作硬壳箱）
    box(g, [1.25, .075, .3], [0, .0375, 0], shell)
    box(g, [1.25, .075, .3], [0, .1125, 0], shellSoft)
    // 深色合缝
    box(g, [1.252, .013, .303], [0, .075, 0], caseRim)

    // 深色包边：上盖四周 + 底缘
    box(g, [1.256, .014, .016], [0, .145, .145], caseRim)
    box(g, [1.256, .014, .016], [0, .145, -.145], caseRim)
    box(g, [1.256, .012, .014], [0, .008, .145], caseRim)
    box(g, [1.256, .012, .014], [0, .008, -.145], caseRim)
    box(g, [.016, .014, .28], [.618, .145, 0], caseRim)
    box(g, [.016, .014, .28], [-.618, .145, 0], caseRim)

    // 四角金属护角
    for (const sx of [-1, 1]) {
      for (const sz of [-1, 1]) box(g, [.045, .055, .04], [sx * .6, .118, sz * .128], steel)
    }

    // 前侧两个小搭扣
    for (const sx of [-1, 1]) {
      box(g, [.058, .062, .016], [sx * .28, .084, .152], steel)
      box(g, [.03, .016, .012], [sx * .28, .058, .163], caseRim)
      sphere(g, .007, [sx * .28, .1, .162], steel)
    }

    // 顶部提手（两个座 + 弧形握把）
    box(g, [.028, .02, .05], [-.092, .157, 0], caseRim)
    box(g, [.028, .02, .05], [.092, .157, 0], caseRim)
    curve(g, [[-.092, .166, 0], [-.06, .206, 0], [0, .216, 0], [.06, .206, 0], [.092, .166, 0]], p.dark, .013)

    // 金色小铭牌；另一只箱加一条暖橙行李牌、蓝色贴纸，避免完全重复
    box(g, [.14, .022, .006], [0, .112, .152], p.gold)
    if (accent) {
      box(g, [.016, .06, .01], [.3, .155, .06], p.orange, [.2, 0, .3])
      box(g, [.09, .05, .005], [-.34, .115, .153], p.blue)
    }

    // 盖上残留的雨珠（都落在盖面范围内）
    const wet = [[-.42, .1], [-.18, .12], [.13, .06], [.34, -.03], [.5, .09], [-.05, -.08]]
    for (const [wx, wz] of wet) sphere(g, .009 + Math.abs(wz) * .012, [wx, .158, wz], wetGloss)
    return g
  }

  instrumentCase(0.88, 4.35, true)
  instrumentCase(0.92, 4.65, false)

  // ------------------------------------------------------------------
  // 一把透明雨伞：伞尖点地、朝向台阶一侧轻斜
  // ------------------------------------------------------------------
  const tiltX = -0.26
  const tiltZ = 0.15
  const umbrella = new THREE.Group()
  umbrella.position.set(4.35, 0.82, 3.6)
  umbrella.rotation.set(tiltX, 0, tiltZ)
  group.add(umbrella)

  const clearGlass = mat(p.glass, { transparent: true, opacity: .2, depthWrite: false, side: THREE.DoubleSide })
  const beadMat = mat('#e8f7ef', { transparent: true, opacity: .55, depthWrite: false })
  const glintMat = mat(p.gold)

  // 金属伞尖、细伞杆与钩形手柄
  cylinder(umbrella, .004, .03, .05, [0, .028, 0], p.metal, 6)
  cylinder(umbrella, .013, .013, 1.02, [0, .53, 0], p.metal, 8)
  sphere(umbrella, .02, [0, 1.045, 0], p.metal, 8)
  curve(umbrella, [[0, 1.04, 0], [0, 1.088, 0], [0, 1.126, 0], [.028, 1.152, 0],
    [.062, 1.148, 0], [.083, 1.118, 0], [.086, 1.075, 0]], p.dark, .016)
  sphere(umbrella, .022, [.086, 1.071, 0], p.dark, 8)

  // 八角透明伞面（平面化的薄壳，depthWrite 关闭保持通透）
  mesh(umbrella, new THREE.ConeGeometry(.46, .24, 8, 1, true), clearGlass, [0, .86, 0], [0, 0, 0], false)

  // 八根细伞骨与八角形伞沿细线，骨尖略伸出伞面
  const rimPts = []
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    beam(umbrella, [cx * .04, .972, sz * .04], [cx * .452, .747, sz * .452], .011, p.metal)
    sphere(umbrella, .013, [cx * .462, .742, sz * .462], p.dark, 6)
    rimPts.push([cx * .46, .74, sz * .46])
  }
  rimPts.push(rimPts[0])
  line(umbrella, rimPts, p.dark, .45)

  // 伞顶骨盘与中心小帽
  cylinder(umbrella, .034, .04, .045, [0, .962, 0], p.metal, 8)

  // 伞面上几颗闪亮雨珠（用缩放做微光闪动，不重建几何/材质）
  const sparkle = []
  for (const [a, r] of [[.55, .3], [1.95, .34], [3.65, .28], [5.15, .33]]) {
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    const y = .74 + (1 - r / .46) * .24 + .012
    sparkle.push(sphere(umbrella, .017, [cx * r, y, sz * r], glintMat, 8))
  }

  // 伞沿挂着的三颗透亮水珠
  for (const a of [2.2, 3.9, 5.6]) {
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    sphere(umbrella, .018, [cx * .442, .726, sz * .442], beadMat, 6)
  }

  // 极轻的风中摆动 + 雨珠微闪（相对保存的基准姿态，不累积漂移）
  animate(umbrella, (t) => {
    umbrella.rotation.x = tiltX + Math.sin(t * .9) * .008
    umbrella.rotation.z = tiltZ + Math.sin(t * .7 + 1.7) * .006
    for (let i = 0; i < sparkle.length; i++) {
      const pulse = .8 + .26 * (0.5 + 0.5 * Math.sin(t * 2.6 + i * 1.9))
      sparkle[i].scale.setScalar(pulse)
    }
  })

  // 伞沿偶尔滴水：两滴沿竖直方向短促落下后重置（位置由倾斜角精确换算）
  const tiltE = new THREE.Euler(tiltX, 0, tiltZ)
  const rimDrip = (a, phase) => {
    const base = new THREE.Vector3(Math.cos(a) * .46, .74, Math.sin(a) * .46).applyEuler(tiltE)
    const drop = sphere(group, .016, [base.x + 4.35, base.y + .82, base.z + 3.6], beadMat, 6)
    animate(drop, (t) => {
      const k = (t * .32 + phase) % 1
      drop.position.set(base.x + 4.35, base.y + .82 - k * .22, base.z + 3.6)
      drop.scale.setScalar(Math.max(.001, k < .86 ? 1 : 1 - (k - .86) / .14))
    })
  }
  rimDrip(1.2, 0)
  rimDrip(4.4, .5)

  return group
}
