// 09-boat-b — 工作渔船B与甲板细节（首稿，静态源码；尚未经浏览器渲染验证）
// 唯一归属：src/components/09-boat-b.js。弓向 -z，中心 x=1.7 / z=.45，长 2.5、宽 1.0。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, label, animate } = ctx

  const g = new THREE.Group()
  g.name = 'boat-b'
  g.position.set(1.7, 0, 0.45)
  const boat = new THREE.Group()                 // 只有这一层做轻微摇曳，外层位置固定
  g.add(boat)

  // ---------- 站线船体：方艉、V 形底、首部收尖 ----------
  const L = 2.5, W = 1.0
  const halfW = t => W * 0.5 * Math.pow(Math.max(0, 1 - Math.pow(t, 1.8)), 0.62)
  const sheerY = t => 0.40 + 0.13 * t * t
  const keelY = t => 0.015 + 0.17 * t * t
  const zAt = t => L * 0.5 - L * t
  const station = z => {
    const t = Math.min(1, Math.max(0, (L * 0.5 - z) / L))
    return { t, z, w: Math.max(halfW(t), 0.012), s: sheerY(t), k: keelY(t) }
  }
  const bilgeY = st => st.k + (st.s - st.k) * 0.42
  const sideX = (st, y) => {                     // 给定高度处船壳半宽
    const b = bilgeY(st)
    if (y >= b) return st.w * (0.76 + 0.24 * (y - b) / Math.max(0.001, st.s - b))
    return st.w * 0.76 * Math.max(0, (y - st.k) / Math.max(0.001, b - st.k))
  }
  const deckY = z => sheerY(station(z).t) - 0.012
  const trim = '#7fa9a2'
  const rust = '#a9825f'
  const ST = 16
  const stations = []
  for (let i = 0; i < ST; i++) stations.push(station(zAt(i / (ST - 1))))

  const hullPos = [], hullIdx = []
  for (const st of stations) {
    const b = bilgeY(st)
    hullPos.push(-st.w, st.s, st.z, -st.w * 0.76, b, st.z, 0, st.k, st.z, st.w * 0.76, b, st.z, st.w, st.s, st.z)
  }
  for (let i = 0; i < ST - 1; i++) {
    for (let j = 0; j < 4; j++) {
      const a = i * 5 + j
      hullIdx.push(a, a + 1, a + 6, a, a + 6, a + 5)
    }
  }
  const hullGeo = new THREE.BufferGeometry()
  hullGeo.setAttribute('position', new THREE.Float32BufferAttribute(hullPos, 3))
  hullGeo.setIndex(hullIdx)
  hullGeo.computeVertexNormals()
  mesh(boat, hullGeo, mat(p.hull, { side: THREE.DoubleSide }))

  // 甲板面
  const dkPos = [], dkIdx = []
  for (const st of stations) dkPos.push(-st.w * 0.945, st.s - 0.012, st.z, st.w * 0.945, st.s - 0.012, st.z)
  for (let i = 0; i < ST - 1; i++) {
    const a = i * 2
    dkIdx.push(a, a + 2, a + 3, a, a + 3, a + 1)
  }
  const dkGeo = new THREE.BufferGeometry()
  dkGeo.setAttribute('position', new THREE.Float32BufferAttribute(dkPos, 3))
  dkGeo.setIndex(dkIdx)
  dkGeo.computeVertexNormals()
  mesh(boat, dkGeo, mat('#d5cdb2', { side: THREE.DoubleSide }))

  // 舷缘青绿饰条 + 吃水线附近的青绿细带
  const rimP = [], rimS = [], bootP = [], bootS = []
  for (const st of stations) {
    rimP.push([-st.w * 0.99, st.s + 0.012, st.z])
    rimS.push([st.w * 0.99, st.s + 0.012, st.z])
    const bw = sideX(st, 0.185) * 1.012 + 0.003
    bootP.push([-bw, 0.185, st.z])
    bootS.push([bw, 0.185, st.z])
  }
  curve(boat, rimP, trim, 0.021)
  curve(boat, rimS, trim, 0.021)
  curve(boat, bootP, trim, 0.011)
  curve(boat, bootS, trim, 0.011)

  // 方艉、船名、轻微锈迹
  box(boat, [0.94, 0.36, 0.05], [0, 0.23, 1.245], p.hull)
  box(boat, [0.60, 0.18, 0.045], [0, 0.09, 1.248], p.hull)
  box(boat, [0.96, 0.045, 0.09], [0, 0.415, 1.23], trim)
  label(boat, '福丸', 0.30, [0, 0.29, 1.274], [0, 0, 0], '#4d6a66', '#eef0e2')
  box(boat, [0.10, 0.15, 0.012], [0.30, 0.21, 1.268], rust, [0, 0, 0.10])
  box(boat, [0.05, 0.10, 0.012], [-0.33, 0.18, 1.268], rust, [0, 0, -0.08])
  const portPatch = station(0.42)
  box(boat, [0.012, 0.085, 0.10], [-(sideX(portPatch, 0.30) + 0.004), 0.30, 0.42], rust)
  box(boat, [0.03, 0.12, 0.03], [0, 0.33, -1.232], rust)

  // 首柱、首部小五金与前甲板舱盖
  beam(boat, [0, 0.53, -1.19], [0, 0.64, -1.28], 0.034, p.hull)
  box(boat, [0.10, 0.04, 0.12], [0, 0.552, -1.16], p.metal)
  const bowDeck = deckY(-0.92)
  box(boat, [0.30, 0.024, 0.34], [0, bowDeck - 0.004, -0.92], trim)
  box(boat, [0.26, 0.05, 0.30], [0, bowDeck + 0.022, -0.92], '#c9c2a8')
  box(boat, [0.09, 0.02, 0.09], [0, bowDeck + 0.052, -0.92], p.metal)
  const bowSt = station(-1.05)
  cylinder(boat, 0.014, 0.018, 0.07, [0, bowSt.s + 0.035, -1.05], p.metal, 8)
  box(boat, [0.08, 0.014, 0.018], [0, bowSt.s + 0.07, -1.05], p.metal, [0, Math.PI / 2, 0])

  // ---------- 驾驶舱：前后开口、侧窗、可见舵轮与琥珀仪表 ----------
  const cab = new THREE.Group()
  cab.position.set(0, deckY(-0.32), -0.32)
  boat.add(cab)
  const cw = 0.52, cl = 0.60
  const glass = mat(p.glass, { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })
  box(cab, [cw, 0.10, cl], [0, -0.03, 0], '#cfc8ae')
  box(cab, [cw + 0.02, 0.02, cl + 0.02], [0, 0.021, 0], trim)

  for (const sx of [-1, 1]) {
    box(cab, [0.04, 0.14, cl], [sx * 0.26, 0.09, 0], p.hull)
    box(cab, [0.04, 0.10, cl], [sx * 0.26, 0.41, 0], p.hull)
    box(cab, [0.04, 0.20, 0.05], [sx * 0.26, 0.26, -0.275], p.hull)
    box(cab, [0.04, 0.20, 0.05], [sx * 0.26, 0.26, 0.275], p.hull)
    box(cab, [0.012, 0.20, cl - 0.10], [sx * 0.26, 0.26, 0], glass)
  }
  box(cab, [cw + 0.05, 0.05, cl + 0.05], [0, 0.475, 0], p.hull)
  box(cab, [cw + 0.03, 0.018, cl + 0.03], [0, 0.448, 0], trim)

  // 前壁：下舱壁 + 立柱 + 倾斜挡风玻璃 + 雨刷
  box(cab, [cw, 0.14, 0.06], [0, 0.09, -0.30], p.hull)
  box(cab, [cw, 0.06, 0.06], [0, 0.43, -0.30], p.hull)
  box(cab, [0.05, 0.44, 0.06], [-0.235, 0.24, -0.30], p.hull)
  box(cab, [0.05, 0.44, 0.06], [0.235, 0.24, -0.30], p.hull)
  mesh(cab, new THREE.BoxGeometry(cw - 0.10, 0.26, 0.012), glass, [0, 0.27, -0.312], [-0.05, 0, 0])
  beam(cab, [-0.12, 0.31, -0.318], [0.02, 0.16, -0.322], 0.010, '#6a8380')
  box(cab, [cw + 0.02, 0.022, 0.13], [0, 0.462, -0.335], p.hull, [0.13, 0, 0])

  // 后壁：宽门洞 + 半开推拉门（真正的开口，可看进舱内）
  box(cab, [0.05, 0.44, 0.05], [-0.235, 0.24, 0.30], p.hull)
  box(cab, [0.05, 0.44, 0.05], [0.235, 0.24, 0.30], p.hull)
  box(cab, [cw, 0.07, 0.05], [0, 0.425, 0.30], p.hull)
  box(cab, [cw, 0.03, 0.05], [0, 0.035, 0.30], trim)
  box(cab, [0.20, 0.40, 0.03], [0.155, 0.22, 0.285], p.hull)
  mesh(cab, new THREE.BoxGeometry(0.135, 0.15, 0.012), glass, [0.155, 0.27, 0.268])
  box(cab, [0.02, 0.09, 0.02], [0.06, 0.22, 0.30], p.metal)

  // 舱内：驾驶台、舵轮、琥珀仪表、雷达屏
  box(cab, [0.40, 0.16, 0.13], [0, 0.10, -0.14], '#b7b2a0')
  box(cab, [0.38, 0.02, 0.11], [0, 0.19, -0.14], trim)
  const helm = new THREE.Group()
  helm.position.set(0, 0.255, -0.055)
  helm.rotation.x = -0.20
  cab.add(helm)
  mesh(helm, new THREE.TorusGeometry(0.088, 0.010, 6, 18), mat('#415552'))
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2 + 0.5
    beam(helm, [0, 0, 0], [Math.cos(a) * 0.084, Math.sin(a) * 0.084, 0], 0.012, '#415552')
  }
  const hub = cylinder(helm, 0.016, 0.016, 0.06, [0, 0, -0.032], '#6c7f7b', 8)
  hub.rotation.x = Math.PI / 2
  box(cab, [0.32, 0.15, 0.035], [0, 0.27, -0.25], '#3d4f4c', [-0.25, 0, 0])
  for (const gx of [-0.082, 0, 0.082]) {
    const gm = cylinder(cab, 0.019, 0.019, 0.016, [gx, 0.318, -0.224],
      mat('#e6b26a', { emissive: '#8a5a22', emissiveIntensity: 0.85 }), 10)
    gm.rotation.x = Math.PI / 2 - 0.25
  }
  box(cab, [0.12, 0.07, 0.02], [0.172, 0.30, -0.222], '#384a47', [-0.25, 0.22, 0])
  mesh(cab, new THREE.BoxGeometry(0.095, 0.045, 0.012),
    mat('#8fd8cc', { emissive: '#2c6a63', emissiveIntensity: 0.7 }), [0.172, 0.302, -0.206], [-0.25, 0.22, 0])

  // 舱内：海图板、黄色雨衣、保温壶与搪瓷杯、木长椅
  box(cab, [0.012, 0.10, 0.15], [-0.236, 0.10, 0.06], '#e6e0c8')
  box(cab, [0.016, 0.018, 0.018], [-0.242, 0.148, 0.11], p.metal)
  box(cab, [0.016, 0.018, 0.018], [-0.242, 0.148, 0.02], p.metal)
  box(cab, [0.02, 0.24, 0.13], [0.225, 0.24, 0.17], '#e8c96a', [0, 0, 0.05])
  cylinder(cab, 0.007, 0.007, 0.03, [0.228, 0.372, 0.17], p.metal, 6)
  cylinder(cab, 0.026, 0.028, 0.10, [0.115, 0.235, -0.155], '#dfe4d9', 10)
  cylinder(cab, 0.022, 0.020, 0.05, [-0.115, 0.21, -0.17], '#e9e6d3', 10)
  box(cab, [0.22, 0.05, 0.16], [-0.11, 0.075, 0.21], '#c8bfa4')
  box(cab, [0.05, 0.10, 0.05], [-0.11, 0.125, 0.27], '#c8bfa4')

  // 舱顶：桅杆、横桁、雷达罩、细天线、锈迹
  cylinder(cab, 0.016, 0.021, 0.95, [0.08, 0.975, 0.02], p.metal, 8)
  sphere(cab, 0.024, [0.08, 1.452, 0.02], p.gold, 8)
  beam(cab, [-0.12, 1.30, 0.02], [0.30, 1.30, 0.02], 0.02, p.metal)
  beam(cab, [-0.20, 0.50, 0.10], [-0.26, 1.02, 0.20], 0.009, p.metal)
  cylinder(cab, 0.048, 0.062, 0.05, [0.16, 0.525, 0.11], p.hull, 12)
  sphere(cab, 0.048, [0.16, 0.552, 0.11], p.hull, 10)
  box(cab, [0.24, 0.012, 0.02], [0.10, 0.452, 0.312], rust)

  // ---------- 后甲板：头顶金属遮阳架 ----------
  const shadeTop = 1.10
  const shadeAt = [[-0.34, 0.14], [0.34, 0.14], [-0.31, 0.98], [0.31, 0.98]]
  for (const [px, pz] of shadeAt) {
    const base = deckY(pz) - 0.01
    cylinder(boat, 0.015, 0.019, shadeTop - base, [px, (shadeTop + base) * 0.5, pz], p.metal, 8)
    box(boat, [0.05, 0.018, 0.05], [px, base + 0.02, pz], p.metal)
  }
  beam(boat, [-0.34, shadeTop, 0.14], [-0.31, shadeTop, 0.98], 0.02, p.metal)
  beam(boat, [0.34, shadeTop, 0.14], [0.31, shadeTop, 0.98], 0.02, p.metal)
  beam(boat, [-0.34, shadeTop, 0.14], [0.34, shadeTop, 0.14], 0.02, p.metal)
  beam(boat, [-0.31, shadeTop, 0.98], [0.31, shadeTop, 0.98], 0.02, p.metal)
  beam(boat, [-0.325, shadeTop, 0.56], [0.325, shadeTop, 0.56], 0.016, p.metal)
  beam(boat, [-0.335, deckY(0.56) + 0.40, 0.14], [-0.335, shadeTop, 0.56], 0.012, p.metal)
  const tarp = cylinder(boat, 0.05, 0.05, 0.74, [-0.30, shadeTop - 0.015, 0.55], '#e3e0cd', 10)
  tarp.rotation.x = Math.PI / 2
  for (const tz of [0.30, 0.80]) {
    mesh(boat, new THREE.TorusGeometry(0.052, 0.010, 5, 12), mat(p.rope), [-0.30, shadeTop - 0.015, tz])
  }

  // 护舷旧轮胎（悬绳系在舷缘）
  const fender = (z, y, side) => {
    const st = station(z)
    const x = side * (sideX(st, y) + 0.036)
    const tire = mesh(boat, new THREE.TorusGeometry(0.098, 0.036, 6, 16), mat('#45544f'), [x, y, z])
    tire.rotation.y = Math.PI / 2
    curve(boat, [[x, y + 0.10, z], [x - side * 0.015, y + 0.17, z + 0.015], [side * st.w * 0.94, st.s + 0.015, z + 0.04]], p.rope, 0.011)
  }
  fender(0.52, 0.225, -1)
  fender(0.95, 0.215, -1)
  fender(0.70, 0.23, 1)

  // 橙白救生圈（挂在舱壁外侧，避开侧窗正中的舵轮视线）
  const ringY = cab.position.y + 0.225
  const ringZ = -0.50
  const lifeRing = mesh(boat, new THREE.TorusGeometry(0.082, 0.025, 6, 18), mat(p.orange), [0.30, ringY, ringZ])
  lifeRing.rotation.y = Math.PI / 2
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.35
    box(boat, [0.014, 0.04, 0.04], [0.322, ringY + Math.cos(a) * 0.082, ringZ + Math.sin(a) * 0.082], '#eef0e4')
  }

  // 船尾机舱箱与系缆桩
  const sternDeck = deckY(1.02)
  box(boat, [0.32, 0.18, 0.22], [0, sternDeck + 0.09, 1.02], '#d7d8c8')
  box(boat, [0.34, 0.03, 0.24], [0, sternDeck + 0.19, 1.02], p.hull)
  box(boat, [0.09, 0.015, 0.09], [0.09, sternDeck + 0.207, 1.03], rust)
  cylinder(boat, 0.024, 0.024, 0.05, [-0.10, sternDeck + 0.225, 1.02], p.metal, 8)
  for (const cz of [1.10, 0.02]) {
    for (const cs of [-1, 1]) {
      const st = station(cz)
      cylinder(boat, 0.016, 0.02, 0.07, [cs * st.w * 0.86, st.s + 0.03, cz], p.metal, 8)
      box(boat, [0.075, 0.013, 0.018], [cs * st.w * 0.86, st.s + 0.068, cz], p.metal, [0, Math.PI / 2, 0])
    }
  }

  // ---------- 甲板作业物：网卷、浮球缆绳、盘好的缆索、鱼箱 ----------
  const netY = deckY(0.28) + 0.132
  const netRoll = cylinder(boat, 0.132, 0.132, 0.52, [0.02, netY, 0.28], '#55756a', 12)
  netRoll.rotation.z = Math.PI / 2
  for (const nx of [-0.16, 0.18]) {
    const strap = mesh(boat, new THREE.TorusGeometry(0.136, 0.011, 5, 14), mat(p.rope), [0.02 + nx, netY, 0.28])
    strap.rotation.y = Math.PI / 2
  }
  curve(boat, [[-0.10, netY + 0.10, 0.34], [-0.22, 0.425, 0.50], [-0.34, 0.415, 0.66],
    [-0.42, 0.408, 0.82], [-0.47, 0.402, 0.93], [-0.49, 0.30, 1.00], [-0.51, 0.16, 1.04]], p.rope, 0.013)
  sphere(boat, 0.048, [-0.36, 0.445, 0.745], p.orange, 10)
  sphere(boat, 0.044, [-0.49, 0.25, 1.015], p.orange, 10)

  const coilY = deckY(0.62) + 0.012
  const coil = (cx, cz, radius) => {
    const pts = []
    for (let i = 0; i <= 12; i++) {
      const a = (i / 12) * Math.PI * 2
      pts.push([cx + Math.cos(a) * radius, coilY, cz + Math.sin(a) * radius])
    }
    curve(boat, pts, '#3f5350', 0.013)
  }
  coil(-0.24, 0.60, 0.105)
  coil(-0.24, 0.60, 0.055)

  const crateY = deckY(0.70)
  box(boat, [0.26, 0.15, 0.30], [0.22, crateY + 0.075, 0.70], '#eef0e4')
  box(boat, [0.27, 0.032, 0.31], [0.22, crateY + 0.152, 0.70], p.blue)
  box(boat, [0.24, 0.14, 0.28], [0.24, crateY + 0.238, 0.66], '#eef0e4', [0, 0.14, 0.02])
  box(boat, [0.25, 0.03, 0.29], [0.24, crateY + 0.312, 0.66], p.blue, [0, 0.14, 0.02])
  sphere(boat, 0.026, [0.18, crateY + 0.335, 0.68], '#dff1ec', 6)
  sphere(boat, 0.02, [0.28, crateY + 0.10, 0.62], '#dff1ec', 6)

  // 雨水积在甲板上的淡淡反光
  const wet = mat(p.water, { transparent: true, opacity: 0.26, depthWrite: false })
  mesh(boat, new THREE.PlaneGeometry(0.24, 0.14), wet, [0.10, deckY(0.12) + 0.004, 0.12], [-Math.PI / 2, 0, 0.25])
  mesh(boat, new THREE.PlaneGeometry(0.20, 0.14), wet, [-0.22, deckY(0.90) + 0.004, 0.90], [-Math.PI / 2, 0, -0.30])

  // ---------- 轻微起伏与横摇（幅度很小，不会撞到邻船） ----------
  animate(boat, t => {
    boat.position.y = Math.sin(t * 0.90) * 0.017 + Math.sin(t * 1.70 + 0.70) * 0.005
    boat.rotation.z = Math.sin(t * 0.62 + 0.40) * 0.015
    boat.rotation.x = Math.sin(t * 0.78 + 1.25) * 0.009
  })

  return g
}
