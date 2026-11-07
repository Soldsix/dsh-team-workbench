// 27-umbrella —— 双乐器硬箱与透明雨伞（第 4 轮，只改本文件）
// 自观 visual-review/r3 真实截图后的判断（本人观察，未引用他人措辞）：
// 1) hero 主视图：两只银灰硬箱仍可辨（深色包边、提手、深色圆头端），保留不动；
//    透明伞在该主视图里只剩一段深色骨架/环，伞面几乎看不见，而且位置悬在船一带，读不出与陆地或台阶的接触；
// 2) reverse：本模块物件仍太远，伞轮廓不可判，只作局限记录；
// 3) interiors：我同样定位不到伞骨架（与 verifier 反馈一致），因此不把 interiors 当作伞位置依据。
// 本轮只改雨伞：按 04-stairs 与 10-boat-c 的实际坐标，把伞改成"落在台阶旁陆地、伞沿真实压在台阶实心顶面"
// 的斜靠姿态（伞尖点堤面 + 伞沿触 tread1），并保留透明弧面、八根细伞骨、伞柄与细小水珠；箱子保持原样。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '27-umbrella'

  const goldMat = mat(p.gold)
  const shellSide = '#a6b4b1'
  const shellTop = '#c6d1cd'
  const darkTrim = '#2b3b3b'
  const steel = '#5f7272'
  const wetMat = mat('#9fc7c0', { transparent: true, opacity: .5, depthWrite: false })

  // ------------------------------------------------------------------
  // 两只银灰乐器硬壳箱（第 2 轮已可辨，本轮原样保留）：
  // 收腰箱体 + 深色圆头护角 + 深色合缝 + 金属搭扣/金色锁孔 + 侧提手 + 盖面雨珠
  // ------------------------------------------------------------------
  const instrumentCase = (x, z, withFrontTag) => {
    const g = new THREE.Group()
    g.position.set(x, .8, z)
    group.add(g)

    // 两端宽、腰身窄的收腰箱形（乐器硬壳箱的典型轮廓，替代普通直箱）
    for (const sx of [-1, 1]) {
      box(g, [.325, .075, .3], [sx * .3125, .0375, 0], shellSide)
      box(g, [.325, .075, .3], [sx * .3125, .1125, 0], shellTop)
      box(g, [.329, .012, .304], [sx * .3125, .075, 0], darkTrim)
      // 深色圆头护角：把直角板收成圆头硬壳箱，两端一眼可辨
      cylinder(g, .1506, .1506, .1495, [sx * .475, .0748, 0], darkTrim, 12)
    }
    box(g, [.3, .075, .22], [0, .0375, 0], shellSide)
    box(g, [.3, .075, .22], [0, .1125, 0], shellTop)
    box(g, [.296, .012, .224], [0, .075, 0], darkTrim)

    // 两只金属搭扣：正面锁板 + 下方锁舌 + 金色锁孔 + 盖沿锁舌（俯视也能看到）
    // 锁板微凸出箱面 .002，避免与箱面共面而闪烁
    for (const sx of [-1, 1]) {
      box(g, [.062, .084, .011], [sx * .36, .075, .1465], steel)
      box(g, [.034, .02, .008], [sx * .36, .045, .153], darkTrim)
      box(g, [.016, .016, .004], [sx * .36, .09, .1525], goldMat)
      box(g, [.052, .009, .05], [sx * .36, .1545, .112], darkTrim)
    }

    // 侧向提手：腰身正面伸出的深色拱形握把，主视角里形成凸起的提手剪影
    for (const sx of [-1, 1]) box(g, [.026, .03, .022], [sx * .085, .078, .118], darkTrim)
    curve(g, [[-.085, .078, .12], [-.055, .1, .13], [0, .11, .134], [.055, .1, .13], [.085, .078, .12]], p.dark, .014)

    // 金色铭牌；前箱多一条暖橙行李牌，后箱多一条蓝色贴条，避免读成复制体
    box(g, [.12, .018, .005], [.33, .1525, .08], goldMat)
    if (withFrontTag) box(g, [.05, .085, .006], [.26, .104, .1505], p.orange, [.15, 0, .25])
    else box(g, [.1, .026, .004], [-.3, .1525, .08], p.blue)

    // 盖面残留雨珠（落在盖面与圆头护角上）
    for (const [wx, wz] of [[-.42, .07], [-.2, .11], [.05, .03], [.28, .09], [.44, -.04]])
      sphere(g, .0085, [wx, .156, wz], wetMat, 6)
    return g
  }

  instrumentCase(0.88, 4.35, false)   // 后箱：蓝色贴条
  instrumentCase(0.92, 4.65, true)    // 前箱：正面朝向观察者，行李牌与锁扣可见

  // ------------------------------------------------------------------
  // 透明雨伞：台阶旁陆地斜靠（第 4 轮；箱子保持第 2 轮原样）
  // 依据输入源码实际坐标自算接触（不引用组件包围盒，避免把两只箱子算进伞的范围）：
  //  · 04-stairs：楼梯 x[3.6,4.76] × z[1.7,2.42]；台阶顶 yAt(i)=.782-.1276i；
  //    tread1（i=1）实心顶面 .6544、z[2.18,2.30]；东颊墙 x≈4.808；登船平台 x[4.86,5.66]×z[1.5,2.41]。
  //  · 10-boat-c：group 在 (3.55,.16,.5)，船体局部 z-1.32..1.33 → 世界实船 z≤1.83；
  //    系泊绳最远到世界 z≈2.307 且 y≤.44 → 伞只要 z≥2.2 就不在船顶。
  //  · 21-slipway 足迹 x[4.78,5.74] × z[2.679,5.861]：本轮不进入。
  // 摆法：伞尖点在堤面 [4.15,.80,3.086]（00-base TOP=.8），只向 -z 倾 rx=-1.172（67.15°）。
  // 伞沿钢圈（torus：环中心 y=.754、半径 .462、管径 .016、八角 8 段）倾 67.15° 后最低点世界
  // y=.80+.754·cos67.15°-.462·sin67.15°-.016≈.6510（八角管截面最低再抬≤.0012，约 .6522），
  // 低于 tread1 顶 .6544 约 2-3mm → 伞沿真实压在台阶实心顶面上；接触 z=3.086-.754·sin67.15°-
  // .462·cos67.15°≈2.2118，在 tread1 的 z[2.18,2.30] 内，x=4.15 在楼梯 x[3.6,4.76] 内。
  // 伞尖底 y=.80 同时落在堤面 → 两处真实接触（伞尖触陆地、伞沿触台阶）。
  // 伞子物体范围：x 3.688-4.612、z 2.054-3.086、y .651-1.535；伞面 z 2.213-2.573、最高 1.519，
  // 全在楼梯口与本层堤面上空，z<2.679、x<4.78、不在 z≤1.83 的船体上方；尺寸比例不变。
  // ------------------------------------------------------------------
  const tiltX = -1.172
  const tiltZ = 0
  const umbrella = new THREE.Group()
  umbrella.position.set(4.15, 0.80, 3.086)
  umbrella.rotation.set(tiltX, 0, tiltZ)
  group.add(umbrella)

  const canopyMat = mat('#b3dcd4', { transparent: true, opacity: .36, depthWrite: false, side: THREE.DoubleSide })
  const dropMat = mat('#6fb1ab', { transparent: true, opacity: .7, depthWrite: false })
  const ribColor = '#22393a'

  // 下尖金属伞尖（ferrule）、金属伞柄杆、收拢环、顶盘与顶部钩形手柄
  cylinder(umbrella, .032, .005, .052, [0, .026, 0], p.metal, 6)
  cylinder(umbrella, .016, .016, 1.0, [0, .52, 0], p.metal, 8)
  cylinder(umbrella, .022, .028, .05, [0, .70, 0], p.metal, 8)
  cylinder(umbrella, .034, .042, .05, [0, .962, 0], p.metal, 8)
  sphere(umbrella, .022, [0, 1.0, 0], p.dark, 8)
  curve(umbrella, [[0, 1.02, 0], [0, 1.062, 0], [0, 1.098, 0], [.026, 1.12, 0],
    [.058, 1.114, 0], [.078, 1.086, 0], [.082, 1.044, 0]], p.dark, .018)
  sphere(umbrella, .022, [.082, 1.04, 0], p.dark, 8)

  // 弧面八角伞面：真透明（depthWrite off、DoubleSide），比例与上一轮一致
  const canopyProfile = [
    [.03, .985], [.09, .972], [.17, .948], [.25, .916],
    [.33, .876], [.4, .830], [.445, .786], [.462, .752]
  ].map(([r, y]) => new THREE.Vector2(r, y))
  mesh(umbrella, new THREE.LatheGeometry(canopyProfile, 8), canopyMat, [0, 0, 0], [0, 0, 0], false)

  // 八根细伞骨 + 八角伞沿钢圈（tread1 接触件，8 段管）+ 骨尖帽
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    curve(umbrella, [
      [cx * .05, .988, sz * .05], [cx * .17, .956, sz * .17],
      [cx * .29, .902, sz * .29], [cx * .39, .843, sz * .39], [cx * .452, .772, sz * .452]
    ], ribColor, .015)
    sphere(umbrella, .016, [cx * .468, .755, sz * .468], ribColor, 6)
  }
  mesh(umbrella, new THREE.TorusGeometry(.462, .016, 8, 8), mat(ribColor), [0, .754, 0], [Math.PI / 2, 0, 0], false)

  // 伞内八根撑骨：透过半透明伞面可见的内部星形结构
  for (let k = 0; k < 8; k++) {
    const a = k * Math.PI / 4
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    curve(umbrella, [[cx * .02, .665, sz * .02], [cx * .115, .79, sz * .115],
      [cx * .225, .915, sz * .225]], ribColor, .0085)
  }

  // 伞沿细小水珠（6 颗，只放在不压台阶的上半圈，贴着伞沿外缘）
  for (const a of [.35, .95, 1.55, 2.15, 2.75, 3.05]) {
    const cx = Math.cos(a)
    const sz = Math.sin(a)
    sphere(umbrella, .021, [cx * .455, .737, sz * .455], dropMat, 6)
  }

  // 伞面四颗闪光金珠（放在同一子组里只注册一次缩放动画）
  const glints = new THREE.Group()
  umbrella.add(glints)
  const glintMeshes = []
  for (const [a, r, y] of [[.6, .18, .958], [2.1, .27, .918], [3.5, .35, .874], [5.0, .42, .822]])
    glintMeshes.push(sphere(glints, .014, [Math.cos(a) * r, y, Math.sin(a) * r], goldMat, 6))
  animate(glints, (t) => {
    for (let i = 0; i < glintMeshes.length; i++)
      glintMeshes[i].scale.setScalar(.8 + .28 * (0.5 + 0.5 * Math.sin(t * 2.4 + i * 1.7)))
  })

  // 伞沿细小滴水：三滴沿竖直方向短促落下后重置；伞体保持静止，接触点不会被动画带离台阶
  const tiltE = new THREE.Euler(tiltX, 0, tiltZ)
  const rimDrip = (a, phase) => {
    const base = new THREE.Vector3(Math.cos(a) * .455, .745, Math.sin(a) * .455).applyEuler(tiltE)
    const drop = sphere(group, .018, [base.x + 4.15, base.y + .80, base.z + 3.086], dropMat, 6)
    animate(drop, (t) => {
      const k = (t * .34 + phase) % 1
      drop.position.set(base.x + 4.15, base.y + .80 - k * .2, base.z + 3.086)
      drop.scale.setScalar(Math.max(.001, k < .88 ? 1 : 1 - (k - .88) / .12))
    })
  }
  rimDrip(.6, 0)
  rimDrip(1.4, .33)
  rimDrip(2.2, .66)

  return group
}
