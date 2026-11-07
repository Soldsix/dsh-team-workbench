// 08 · 白色渔船A（完整驾驶舱）— 太阳雨中的小渔港
// 船体为自建放样几何（9 站 × 13 环点），白舷墙 + 深青吃水带；尾部驾驶舱整面敞开可见内部。
// 第四轮补：细窄遮阳铁架、舱顶/舱内随水轻移的淡青水光斑块、护舷偶发轻摆（原摇船动效保留）。
// 唯一归属本文件；不含 UI、不引入依赖，只使用 CONTRACT 声明的 ctx 接口。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand, registry } = ctx

  const root = new THREE.Group()
  const boat = new THREE.Group()
  boat.position.set(-0.25, 0, 0.4)
  root.add(boat)

  const DECK = 0.52
  const BOW = -1.4
  const STERN = 1.4
  const sides = [1, -1]

  /* ---------- 1. 船体放样：站 = [z, 半宽, 龙骨高度] ---------- */
  const stations = [
    [BOW, 0.03, 0.1],
    [-1.15, 0.16, -0.02],
    [-0.85, 0.32, -0.12],
    [-0.5, 0.46, -0.17],
    [-0.1, 0.55, -0.18],
    [0.35, 0.575, -0.18],
    [0.8, 0.55, -0.17],
    [1.15, 0.5, -0.13],
    [STERN, 0.46, -0.09]
  ]
  // 半剖面归一化（外倾量, 高度）：0 = 龙骨，1 = 舷缘
  const profile = [[0, 0], [0.24, 0.05], [0.5, 0.17], [0.72, 0.36], [0.88, 0.58], [0.97, 0.8], [1, 1]]
  const N = profile.length
  // 每站环序：右舷舷缘 → 龙骨 → 左舷舷缘；共 2N-1 个环点
  const rows = stations.map(function (s) {
    const z = s[0]
    const b = s[1]
    const keel = s[2]
    const pts = []
    for (let k = N - 1; k >= 0; k--) pts.push([b * profile[k][0], keel + (DECK - keel) * profile[k][1], z])
    for (let k = 1; k < N; k++) pts.push([-b * profile[k][0], keel + (DECK - keel) * profile[k][1], z])
    return pts
  })
  // 取环点区间 i0..i1 沿 z 放样成曲面
  const skin = function (i0, i1, color) {
    const cols = i1 - i0 + 1
    const verts = []
    for (let r = 0; r < rows.length; r++) {
      for (let j = i0; j <= i1; j++) {
        const q = rows[r][j]
        verts.push(q[0], q[1], q[2])
      }
    }
    const index = []
    for (let r = 0; r < rows.length - 1; r++) {
      for (let j = 0; j < cols - 1; j++) {
        const a = r * cols + j
        index.push(a, a + 1, a + cols + 1, a, a + cols + 1, a + cols)
      }
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3))
    geo.setIndex(index)
    geo.computeVertexNormals()
    return mesh(boat, geo, mat(color, { side: THREE.DoubleSide }))
  }
  skin(0, 2, p.hull) // 右舷白舷墙（舷缘 → 吃水线）
  skin(10, 12, p.hull) // 左舷白舷墙
  skin(2, 10, p.deep) // 深青色防污漆带，向艏部上扬
  // 艉封板与艏端用剖面多边形补面
  const capAt = function (ring, z, color) {
    const pts = ring.map(function (q) { return new THREE.Vector2(q[0], q[1]) })
    return mesh(boat, new THREE.ShapeGeometry(new THREE.Shape(pts)), mat(color, { side: THREE.DoubleSide }), [0, 0, z])
  }
  capAt(rows[rows.length - 1], STERN, p.hull)
  capAt(rows[0], BOW, p.hull)

  /* ---------- 2. 甲板、舷缘压条与栏杆 ---------- */
  const deckPts = []
  stations.forEach(function (s) { deckPts.push(new THREE.Vector2(s[1], -s[0])) })
  for (let i = stations.length - 1; i >= 0; i--) deckPts.push(new THREE.Vector2(-stations[i][1], -stations[i][0]))
  mesh(boat, new THREE.ShapeGeometry(new THREE.Shape(deckPts)), mat('#dfe3d6'), [0, DECK, 0], [-Math.PI / 2, 0, 0])
  for (let i = 0; i < stations.length - 1; i++) {
    const a = stations[i]
    const b = stations[i + 1]
    beam(boat, [a[1], DECK + 0.01, a[0]], [b[1], DECK + 0.01, b[0]], 0.05, p.concreteLight)
    beam(boat, [-a[1], DECK + 0.01, a[0]], [-b[1], DECK + 0.01, b[0]], 0.05, p.concreteLight)
  }
  beam(boat, [0.46, DECK + 0.01, STERN], [-0.46, DECK + 0.01, STERN], 0.05, p.concreteLight)
  // 任意 z 处的舷侧半宽，用于栏杆与护舷定位
  const halfAt = function (z) {
    for (let i = 0; i < stations.length - 1; i++) {
      if (z <= stations[i + 1][0]) {
        const t = (z - stations[i][0]) / (stations[i + 1][0] - stations[i][0])
        return stations[i][1] + (stations[i + 1][1] - stations[i][1]) * t
      }
    }
    return stations[stations.length - 1][1]
  }
  const railZ = [-1.24, -0.96, -0.64, -0.32, 0, 0.3]
  sides.forEach(function (s) {
    const rail = railZ.map(function (z) { return [s * halfAt(z) * 0.9, DECK + 0.2, z] })
    rail.forEach(function (q) { cylinder(boat, 0.008, 0.008, 0.19, [q[0], DECK + 0.1, q[2]], p.metal, 6) })
    for (let i = 0; i < rail.length - 1; i++) beam(boat, rail[i], rail[i + 1], 0.016, p.metal)
  })
  beam(boat, [halfAt(-1.24) * 0.9, DECK + 0.2, -1.24], [-halfAt(-1.24) * 0.9, DECK + 0.2, -1.24], 0.016, p.metal)

  /* ---------- 3. 驾驶舱外壳：两舷与前壁玻璃，尾部整面开口 ---------- */
  const glass = mat(p.glass, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  const CX = 0.44
  const CZ0 = 0.4
  const CZ1 = 1.26
  const CTOP = 1.02
  const CMID = (CZ0 + CZ1) / 2
  const wallD = CZ1 - CZ0
  sides.forEach(function (s) {
    const x = s * CX
    box(boat, [0.035, 0.16, wallD], [x, 0.6, CMID], p.hull)
    box(boat, [0.035, 0.09, wallD], [x, 0.975, CMID], p.hull)
    box(boat, [0.014, 0.25, wallD - 0.08], [x, 0.805, CMID], glass)
    box(boat, [0.022, 0.25, 0.026], [x, 0.805, 0.66], p.metal)
    box(boat, [0.022, 0.25, 0.026], [x, 0.805, 1.02], p.metal)
    box(boat, [0.05, 0.5, 0.05], [x, 0.77, CZ1], p.hull)
  })
  box(boat, [0.95, 0.16, 0.035], [0, 0.6, CZ0], p.hull)
  box(boat, [0.95, 0.09, 0.035], [0, 0.975, CZ0], p.hull)
  box(boat, [0.86, 0.25, 0.014], [0, 0.805, CZ0], glass)
  box(boat, [0.024, 0.25, 0.03], [0, 0.805, CZ0], p.metal)
  box(boat, [0.95, 0.1, 0.035], [0, 0.57, CZ1], p.hull) // 尾门槛
  box(boat, [0.95, 0.06, 0.035], [0, 0.99, CZ1], p.hull) // 尾上梁
  box(boat, [0.98, 0.045, 0.94], [0, CTOP + 0.022, 0.83], p.concreteLight)
  box(boat, [0.96, 0.02, 0.13], [0, 1.01, 0.34], p.concreteLight) // 前檐

  /* ---------- 4. 舱内陈设（透过尾部开口与舷窗可见） ---------- */
  const glowRadar = new THREE.MeshBasicMaterial({ color: '#bfe8c9' })
  const glowFinder = new THREE.MeshBasicMaterial({ color: '#cfe8f2' })
  const glowLamp = new THREE.MeshBasicMaterial({ color: '#f7efc6' })
  box(boat, [0.84, 0.014, 0.82], [0, DECK + 0.004, 0.83], '#c8bb9e') // 木地板
  box(boat, [0.6, 0.2, 0.18], [0, 0.635, 0.52], '#e6e2cf') // 操舵台
  box(boat, [0.62, 0.03, 0.2], [-0.01, 0.75, 0.51], '#cfd3c4', [-0.16, 0, 0])
  mesh(boat, new THREE.TorusGeometry(0.055, 0.008, 5, 16), p.metal, [-0.02, 0.72, 0.615]) // 舵轮
  cylinder(boat, 0.014, 0.014, 0.02, [-0.02, 0.72, 0.6], p.metal, 8)
  for (let i = 0; i < 3; i++) {
    const ang = Math.PI / 2 + i * Math.PI * 2 / 3
    beam(boat, [-0.02, 0.72, 0.615], [-0.02 + Math.cos(ang) * 0.05, 0.72 + Math.sin(ang) * 0.05, 0.615], 0.008, p.metal)
  }
  box(boat, [0.14, 0.1, 0.028], [0.19, 0.8, 0.545], p.metal) // 雷达屏外框
  box(boat, [0.105, 0.072, 0.006], [0.19, 0.8, 0.562], glowRadar, [0, 0, 0], false) // 微光
  box(boat, [0.086, 0.062, 0.024], [-0.21, 0.79, 0.55], p.metal) // 鱼探仪
  box(boat, [0.062, 0.042, 0.006], [-0.21, 0.79, 0.566], glowFinder, [0, 0, 0], false)
  box(boat, [0.17, 0.006, 0.12], [-0.02, 0.766, 0.5], '#eee9d2', [0, 0.12, 0]) // 海图
  box(boat, [0.15, 0.003, 0.008], [-0.02, 0.772, 0.505], p.orange, [0, 0.12, 0])
  box(boat, [0.03, 0.012, 0.02], [-0.06, 0.773, 0.44], p.metal) // 图夹
  box(boat, [0.58, 0.1, 0.18], [0, 0.581, 0.95], '#cfc3a6') // 长凳
  box(boat, [0.58, 0.16, 0.03], [0, 0.66, 1.04], '#c7bd9f')
  cylinder(boat, 0.026, 0.028, 0.105, [0.24, 0.684, 0.95], '#cfd8d4', 10) // 保温壶
  cylinder(boat, 0.019, 0.019, 0.028, [0.24, 0.751, 0.95], p.metal, 8)
  cylinder(boat, 0.022, 0.02, 0.046, [-0.17, 0.654, 0.97], '#f4f1e4', 10) // 搪瓷杯
  box(boat, [0.012, 0.03, 0.012], [-0.143, 0.654, 0.97], '#f4f1e4')
  const coat = cylinder(boat, 0.032, 0.088, 0.26, [0.32, 0.8, 1.08], p.yellow, 8) // 黄色雨衣
  coat.scale.z = 0.55
  const hood = sphere(boat, 0.042, [0.32, 0.94, 1.08], p.yellow, 8)
  hood.scale.set(1, 0.7, 0.55)
  cylinder(boat, 0.006, 0.006, 0.035, [0.32, 0.955, 1.08], p.metal, 6) // 挂钩
  box(boat, [0.014, 0.05, 0.034], [-0.406, 0.855, 0.95], p.gold, [0, Math.PI / 2, 0.08]) // 护身符
  beam(boat, [-0.406, 0.93, 0.95], [-0.406, 0.882, 0.95], 0.005, p.orange)
  box(boat, [0.006, 0.055, 0.045], [-0.414, 0.895, 0.8], '#f0eee0') // 渔获照片
  box(boat, [0.006, 0.05, 0.04], [-0.414, 0.855, 0.86], '#e8e7dc')
  box(boat, [0.006, 0.07, 0.05], [-0.414, 0.645, 0.72], '#f2eedd') // 潮汐表
  cylinder(boat, 0.03, 0.03, 0.012, [0.02, 1.012, 0.84], glowLamp, 10) // 舱顶小灯
  mesh(boat, new THREE.ConeGeometry(0.12, 0.3, 8, 1, true),
    new THREE.MeshBasicMaterial({ color: p.gold, transparent: true, opacity: 0.1, side: THREE.DoubleSide, depthWrite: false }),
    [0.06, 0.85, 0.84], [0.14, 0, 0.1], false)

  /* ---------- 5. 舱外：雷达罩、桅杆、天线、护身舷、舷名 ---------- */
  cylinder(boat, 0.05, 0.056, 0.05, [0.26, 1.09, 0.56], p.concreteLight, 12) // 雷达罩
  const dome = sphere(boat, 0.05, [0.26, 1.115, 0.56], p.concreteLight, 12)
  dome.scale.y = 0.6
  cylinder(boat, 0.011, 0.016, 0.52, [-0.12, 1.33, 0.74], p.metal, 8) // 桅杆
  beam(boat, [-0.33, 1.5, 0.74], [0.09, 1.5, 0.74], 0.014, p.metal) // 横担
  beam(boat, [0.28, 1.07, 0.96], [0.35, 1.42, 1.02], 0.012, p.metal) // 天线
  cylinder(boat, 0.004, 0.006, 0.08, [0.35, 1.46, 1.02], p.metal, 6)
  cylinder(boat, 0.016, 0.02, 0.17, [-0.34, 1.14, 1.1], p.metal, 8) // 排气烟囱
  cylinder(boat, 0.02, 0.02, 0.014, [-0.34, 1.23, 1.1], p.dark, 8)
  sphere(boat, 0.014, [-0.12, 1.6, 0.74], p.gold, 8) // 桅顶灯
  sphere(boat, 0.012, [0.46, 1.075, 0.4], p.orange, 8) // 航行灯
  beam(boat, [0.46, 1.07, 0.37], [0.46, 1.07, 1.28], 0.012, p.metal) // 舱顶护栏
  beam(boat, [-0.46, 1.07, 0.37], [-0.46, 1.07, 1.28], 0.012, p.metal)
  beam(boat, [0.46, 1.07, 1.28], [-0.46, 1.07, 1.28], 0.012, p.metal)
  // 细窄遮阳铁架：四根细管立柱 + 外围框 + 两根中肋；避开桅杆、雷达罩与排气烟囱
  const FRAME_X = 0.4
  const FRAME_TOP = 1.3
  const FRAME_Z = [0.5, 1.18]
  sides.forEach(function (s) {
    FRAME_Z.forEach(function (z) {
      beam(boat, [s * FRAME_X, CTOP + 0.045, z], [s * FRAME_X, FRAME_TOP, z], 0.012, p.metal)
    })
    beam(boat, [s * FRAME_X, FRAME_TOP, FRAME_Z[0]], [s * FRAME_X, FRAME_TOP, FRAME_Z[1]], 0.012, p.metal)
    beam(boat, [s * 0.18, FRAME_TOP, FRAME_Z[0]], [s * 0.18, FRAME_TOP, FRAME_Z[1]], 0.009, p.metal)
  })
  FRAME_Z.forEach(function (z) {
    beam(boat, [-FRAME_X, FRAME_TOP, z], [FRAME_X, FRAME_TOP, z], 0.012, p.metal)
  })
  mesh(boat, new THREE.TorusGeometry(0.072, 0.02, 6, 16), p.orange, [0.485, 0.86, 0.8], [0, Math.PI / 2, 0]) // 救生圈
  for (let i = 0; i < 3; i++) {
    const a = 0.5 + i * 2.1
    box(boat, [0.04, 0.034, 0.034], [0.49, 0.86 + Math.sin(a) * 0.072, 0.8 + Math.cos(a) * 0.072], '#f7f5e8')
  }
  box(boat, [0.03, 0.02, 0.02], [0.468, 0.94, 0.8], p.metal) // 救生圈挂钩
  // 旧轮胎护舷：以舷缘挂点为枢轴，随水偶发轻摆；摆幅 0.03 rad，摆到最里侧仍不穿过舷侧与岸壁
  const tireGeo = new THREE.TorusGeometry(0.078, 0.024, 5, 14)
  const fenderSpec = [[1, 0.3, 0.4], [1, -0.26, 2.1], [-1, 0.12, 3.3], [-1, -0.42, 4.8]]
  const portTilt = [0.18, -0.22]
  const fenders = []
  fenderSpec.forEach(function (f, i) {
    const side = f[0]
    const z = f[1]
    const pivot = new THREE.Group()
    pivot.position.set(side * halfAt(z), DECK + 0.02, z)
    boat.add(pivot)
    // rand 抽样次数与首稿保持一致（各 1 次），避免影响后续模块的确定性随机序列
    const tilt = side > 0 ? (rand() - 0.5) * 0.25 : portTilt[i - 2]
    mesh(pivot, tireGeo, '#4c564f', [side * 0.065, -0.24, 0], [0, Math.PI / 2, tilt])
    beam(pivot, [0, 0, 0], [side * 0.065, -0.16, 0], 0.012, p.rope)
    fenders.push({ node: pivot, phase: f[2] })
  })
  label(boat, '白鷗丸', 0.3, [0.462, 0.61, 0.86], [0, Math.PI / 2, 0], '#4d6766', '#f3f2e4') // 舷名

  /* ---------- 6. 甲板与艉部渔具细节 ---------- */
  box(boat, [0.26, 0.04, 0.3], [0, DECK + 0.02, -0.16], p.concreteLight) // 鱼舱盖
  box(boat, [0.08, 0.02, 0.03], [0, DECK + 0.045, -0.28], p.metal)
  box(boat, [0.05, 0.03, 0.1], [0, DECK + 0.04, -0.52], p.metal) // 系缆桩
  box(boat, [0.16, 0.03, 0.06], [0, DECK + 0.04, -1.12], p.metal) // 导缆孔
  mesh(boat, new THREE.TorusGeometry(0.055, 0.009, 4, 12), p.rope, [0.27, DECK + 0.014, -0.06], [Math.PI / 2, 0, 0]) // 盘缆
  mesh(boat, new THREE.TorusGeometry(0.036, 0.009, 4, 12), p.rope, [0.27, DECK + 0.03, -0.06], [Math.PI / 2, 0, 0])
  box(boat, [0.4, 0.05, 0.1], [0, DECK + 0.025, 1.33], p.concreteLight) // 艉舱盖
  cylinder(boat, 0.035, 0.03, 0.075, [-0.3, DECK + 0.045, -0.02], p.blue, 10) // 蓝桶
  cylinder(boat, 0.012, 0.014, 0.42, [0.42, 0.75, 1.34], p.metal, 6) // 艉部吊架
  cylinder(boat, 0.012, 0.014, 0.42, [-0.42, 0.75, 1.34], p.metal, 6)
  beam(boat, [0.42, 0.96, 1.34], [-0.42, 0.96, 1.34], 0.016, p.metal)
  cylinder(boat, 0.014, 0.014, 0.03, [0.2, 0.93, 1.34], p.metal, 8) // 吊滑轮
  curve(boat, [[-0.12, 1.58, 0.74], [-0.14, 1.3, 0.2], [0, 0.74, -1.02]], p.metal, 0.008) // 前支索
  line(boat, [[-0.12, 1.58, 0.74], [-0.3, 1.4, 1], [-0.42, 1.09, 1.3]], p.metal, 0.4) // 细天线

  /* ---------- 7. 舱顶与舱内水光：少量淡青斑块，随水缓慢轻移 ---------- */
  const glintGeo = new THREE.CircleGeometry(0.075, 14)
  const glintMat = new THREE.MeshBasicMaterial({ color: '#c3e9ee', transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide })
  const glints = []
  const glintSpec = [[0.1, 1.0658, 0.9, 1.6, 1, 0.6], [-0.19, 1.0658, 1.02, 1.3, 0.9, 2.4], [0.03, 0.5325, 0.78, 1.2, 0.85, 3.6], [0.07, 0.633, 0.95, 0.95, 0.7, 5.1]]
  glintSpec.forEach(function (g) {
    const patch = mesh(boat, glintGeo, glintMat, [g[0], g[1], g[2]], [-Math.PI / 2, 0, 0], false)
    patch.scale.set(g[3], g[4], 1)
    glints.push({ node: patch, x: g[0], z: g[2], sx: g[3], sz: g[4], phase: g[5] })
  })

  /* ---------- 8. 注册与水面轻摇（含护舷轻摆与水光漂移，均按基准值正弦，不累积） ---------- */
  registry.set('boat-a', boat)
  const baseY = boat.position.y
  animate(boat, function (t) {
    boat.position.y = baseY + Math.sin(t * 1.15) * 0.017
    boat.rotation.z = Math.sin(t * 1.15 + 0.7) * 0.012
    boat.rotation.x = Math.sin(t * 0.87 + 1.3) * 0.008
    for (let i = 0; i < fenders.length; i++) {
      const f = fenders[i]
      f.node.rotation.z = Math.sin(t * 0.52 + f.phase) * 0.03
      f.node.rotation.x = Math.sin(t * 0.39 + f.phase * 1.6) * 0.018
    }
    for (let i = 0; i < glints.length; i++) {
      const g = glints[i]
      const swell = 1 + Math.sin(t * 0.62 + g.phase * 1.4) * 0.06
      g.node.position.x = g.x + Math.sin(t * 0.5 + g.phase) * 0.014
      g.node.position.z = g.z + Math.cos(t * 0.37 + g.phase) * 0.011
      g.node.scale.set(g.sx * swell, g.sz * swell, 1)
    }
  })
  return root
}
