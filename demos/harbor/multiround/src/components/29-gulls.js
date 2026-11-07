// 29-gulls — 太阳雨小渔港：6 只盘旋/掠水海鸥 + 2 只静态栖落 + 1 只完整着陆循环海鸥。
// r5 依据 12-moorings.js 实测：柱顶 = QUAY .8 + 帽心 .342 + 球帽 .082×scaleY .42 = 1.17644；
// 前沿柱位 z=2.7 为 x=-.8/1.0/2.8/4.5，西岸 x=-2 为 z=-3/-1/1，全部按数组引用，不再用首稿估算值。
// 08–11 四船实际船位/顶棚与桅高已读取，用于确认进近走廊无穿模；本模块源码静态编写，未在浏览器运行。

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const gulls = new THREE.Group()
  gulls.name = '29-gulls'

  // ---- 共享材质：全部海鸥复用，动画回调内不新建几何或材质 ----
  const bodyMat = mat('#fbfaf0')
  const mantleMat = mat(p.concrete)
  const wingWhiteMat = mat(p.hull, { side: THREE.DoubleSide })
  const wingDarkMat = mat(p.dark, { side: THREE.DoubleSide })
  const tailMat = mat(p.concreteLight, { side: THREE.DoubleSide })
  const beakMat = mat('#e6ab6e')
  const eyeMat = mat(p.dark)

  // ---- 共享翼面：后掠弧形翼面，外侧初级飞羽为深色翼尖 ----
  // 顶点在海鸥本地坐标：+x 前方、+z 右翼展、+y 上方。
  const wingPlanform = [
    [0.084, 0.000, 0.048],   // 0 翼根前缘
    [-0.050, 0.000, 0.048],  // 1 翼根后缘
    [0.076, 0.010, 0.170],   // 2 内段前缘
    [-0.068, 0.006, 0.158],  // 3 内段后缘
    [0.044, 0.019, 0.252],   // 4 外段前缘（深色起点）
    [-0.088, 0.013, 0.238],  // 5 外段后缘（深色起点）
    [-0.022, 0.029, 0.318],  // 6 翼尖前缘
    [-0.120, 0.025, 0.300],  // 7 翼尖后缘
    [-0.152, 0.035, 0.334]   // 8 后掠尖点
  ]
  const panelIndex = {
    white: [0, 1, 2, 1, 3, 2, 2, 3, 4, 3, 5, 4],
    dark: [4, 5, 6, 5, 7, 6, 6, 7, 8]
  }
  const buildPanel = (side, tone) => {
    const positions = []
    for (const vertex of wingPlanform) positions.push(vertex[0], vertex[1], vertex[2] * side)
    const geometry = new THREE.BufferGeometry()
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    geometry.setIndex(panelIndex[tone])
    geometry.computeVertexNormals()
    return geometry
  }
  const wingPanels = [
    { white: buildPanel(1, 'white'), dark: buildPanel(1, 'dark') },
    { white: buildPanel(-1, 'white'), dark: buildPanel(-1, 'dark') }
  ]

  // 平摊三角尾羽；命名便于外部按对象取样
  const tailGeometry = new THREE.BufferGeometry()
  tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(
    [-0.118, 0.010, 0.058, -0.118, 0.010, -0.058, -0.304, 0.014, 0.000], 3))
  tailGeometry.setIndex([0, 1, 2])
  tailGeometry.computeVertexNormals()

  // ---- 单翼组：滑翔时轻振；收翅时后掠 1.40 rad 并缩短翼展 ----
  const addWing = (posture, side, folded, name) => {
    const wing = new THREE.Group()
    wing.name = name
    const panels = wingPanels[side > 0 ? 0 : 1]
    mesh(wing, panels.white, wingWhiteMat)
    mesh(wing, panels.dark, wingDarkMat)
    wing.rotation.set(folded ? 0.22 : 0.0, side * (folded ? -1.40 : 0.05), 0)
    if (folded) wing.scale.z = 0.82
    posture.add(wing)
    return wing
  }

  // ---- 一只海鸥：白身灰背、小头暖喙、深色翼尖；子对象全部命名 ----
  const buildGull = (scale, folded, name) => {
    const root = new THREE.Group()
    root.name = name
    const posture = new THREE.Group()
    posture.name = name + '-body'
    root.add(posture)

    const body = sphere(posture, 0.078, [0, 0, 0], bodyMat, 12)
    body.name = name + '-torso'
    body.scale.set(2.02, 0.92, 0.95)
    const back = sphere(posture, 0.074, [-0.012, 0.030, 0], mantleMat, 12)
    back.name = name + '-mantle'
    back.scale.set(1.88, 0.58, 0.90)
    const tail = mesh(posture, tailGeometry, tailMat)
    tail.name = name + '-tail'

    const head = new THREE.Group()
    head.name = name + '-head'
    head.position.set(0.132, 0.046, 0)
    posture.add(head)
    sphere(head, 0.053, [0, 0, 0], bodyMat, 10)
    sphere(head, 0.0095, [0.038, 0.013, 0.037], eyeMat, 6)
    sphere(head, 0.0095, [0.038, 0.013, -0.037], eyeMat, 6)
    const beak = cylinder(head, 0.004, 0.016, 0.058, [0.072, -0.010, 0], beakMat, 8)
    beak.name = name + '-beak'
    beak.rotation.z = -Math.PI / 2 - 0.12

    const rightWing = addWing(posture, 1, folded, name + '-wing-right')
    const leftWing = addWing(posture, -1, folded, name + '-wing-left')
    root.scale.setScalar(scale)
    return { root, posture, head, tail, rightWing, leftWing }
  }

  // 腿组：枢轴在 y=-0.05，脚底在海鸥根部本地 y=-0.146（可由 scale.y 收腿）
  const FOOT_DROP = 0.146
  const addLegs = (root, name) => {
    const legs = new THREE.Group()
    legs.name = name
    legs.position.set(0, -0.050, 0)
    root.add(legs)
    for (const z of [-0.030, 0.030]) {
      beam(legs, [0.014, 0, z], [0.018, -0.090, z * 1.15], 0.011, p.orange)
      box(legs, [0.042, 0.008, 0.017], [0.032, -0.092, z * 1.15], p.orange)
    }
    return legs
  }

  // ---- 真实支撑面：12-moorings 的铸铁系船柱（读自该文件，非估算） ----
  const BOLLARD_TOP = 0.8 + 0.342 + 0.082 * 0.42          // 1.17644
  const FRONT_BOLLARDS = [[-0.8, 2.7], [1.0, 2.7], [2.8, 2.7], [4.5, 2.7]]   // 前沿 z=2.7
  const WEST_BOLLARDS = [[-2, -3], [-2, -1], [-2, 1]]                        // 西岸 x=-2

  // ---- 滑翔（保留 r4 的 6 只航线与节奏，仅补命名） ----
  const addGlider = (spec) => {
    const orbit = new THREE.Group()
    orbit.name = 'gull-orbit-' + spec.id
    orbit.position.set(spec.center[0], spec.height, spec.center[1])
    gulls.add(orbit)

    const flyer = new THREE.Group()
    flyer.position.set(0, 0, spec.radius)
    flyer.rotation.set(spec.bank, 0, 0)
    orbit.add(flyer)

    const bird = buildGull(spec.scale, false, 'gull-' + spec.id)
    flyer.add(bird.root)

    animate(orbit, (time) => {
      orbit.rotation.y = spec.phase + time * spec.speed
      flyer.position.y = spec.bobAmp * Math.sin(time * spec.bobRate + spec.phase)
      flyer.rotation.z = 0.045 * Math.sin(time * 0.62 + spec.phase)
      const lift = 0.06 + 0.05 * Math.sin(time * 1.12 + spec.phase + 1.1)
      bird.rightWing.rotation.x = -lift
      bird.leftWing.rotation.x = lift
      const sweep = 0.05 + 0.085 * Math.sin(time * 1.12 + spec.phase + 1.9)
      bird.rightWing.rotation.y = sweep
      bird.leftWing.rotation.y = -sweep
      bird.head.rotation.y = 0.07 * Math.sin(time * 0.37 + spec.phase)
    })
  }

  // ---- 静态栖落：站在真实系船柱帽顶，脚底 y = BOLLARD_TOP ----
  const addPerch = (spec) => {
    const bird = buildGull(spec.scale, true, spec.name)
    bird.root.position.set(spec.x, BOLLARD_TOP + FOOT_DROP * spec.scale, spec.z)
    bird.root.rotation.y = spec.heading
    bird.posture.rotation.z = 0.30
    bird.root.userData.perch = { support: '12-moorings-bollard-cap', top: BOLLARD_TOP }
    addLegs(bird.root, spec.name + '-legs')
    gulls.add(bird.root)

    animate(bird.root, (time) => {
      bird.posture.rotation.z = 0.30 + 0.012 * Math.sin(time * 0.60 + spec.phase)
      bird.head.rotation.y = 0.22 * Math.sin(time * 0.31 + spec.phase)
      bird.head.rotation.x = 0.05 * Math.sin(time * 0.23 + spec.phase + 0.7)
      bird.rightWing.rotation.x = 0.22 + 0.012 * Math.sin(time * 0.83 + spec.phase)
      bird.leftWing.rotation.x = 0.22 + 0.012 * Math.sin(time * 0.83 + spec.phase + 0.4)
      bird.tail.rotation.y = 0.05 * Math.sin(time * 0.77 + spec.phase)
    })
  }

  // ---- 完整着陆循环：盘旋 → 进近 → 脚落柱顶并收翅停留 → 起飞归航 ----
  // 周期 24 s，全部由绝对时间求值；每帧只写变换，不分配对象。
  const CYCLE = 24
  const smoothstep = (value) => {
    const x = Math.min(1, Math.max(0, value))
    return x * x * (3 - 2 * x)
  }
  const addLander = (spec) => {
    const bird = buildGull(spec.scale, false, spec.name)
    bird.root.rotation.order = 'YXZ'
    const legs = addLegs(bird.root, spec.name + '-legs')
    bird.root.userData.cycle = { period: CYCLE, offset: spec.offset }
    bird.root.userData.support = { support: '12-moorings-bollard-cap', top: BOLLARD_TOP, x: spec.x, z: spec.z }
    gulls.add(bird.root)
    const restY = BOLLARD_TOP + FOOT_DROP * spec.scale
    animate(bird.root, (time) => {
      const cycle = ((time + spec.offset) % CYCLE + CYCLE) % CYCLE
      const arrive = smoothstep((cycle - 9) / 4)        // 9–13 s 从航线降到柱顶
      const leave = smoothstep((cycle - 19) / 4)        // 19–23 s 离柱归航
      const weight = arrive * (1 - leave)               // 1 = 完全落在柱顶
      const fold = smoothstep((cycle - 11.6) / 1.4) * (1 - smoothstep((cycle - 19) / 1.6))
      const extend = smoothstep((cycle - 12.1) / 0.9) * (1 - smoothstep((cycle - 19) / 0.8))
      const theta = spec.phase + time * spec.speed
      const orbitX = spec.center[0] + spec.radius * Math.sin(theta)
      const orbitZ = spec.center[1] + spec.radius * Math.cos(theta)
      const orbitY = spec.height + 0.10 * Math.sin(time * 0.33 + spec.phase)
      bird.root.position.set(
        orbitX + (spec.x - orbitX) * weight,
        orbitY + (restY - orbitY) * weight,
        orbitZ + (spec.z - orbitZ) * weight)
      let turn = spec.heading - theta
      turn = ((turn + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI
      const dive = cycle > 9 && cycle < 13 ? Math.sin(Math.PI * (cycle - 9) / 4) : 0
      const climb = cycle > 19 && cycle < 23 ? Math.sin(Math.PI * (cycle - 19) / 4) : 0
      bird.root.rotation.set(
        -0.24 * (1 - weight),                            // 盘旋内倾
        theta + turn * weight,                           // 落到柱顶时朝向港湾
        (1 - weight) * (0.03 + 0.02 * Math.sin(time * 0.61 + spec.phase)) - 0.26 * dive + 0.20 * climb)
      bird.posture.rotation.z = 0.02 + 0.28 * weight     // 站立时抬头
      const lift = 0.06 + 0.05 * Math.sin(time * 1.12 + spec.phase + 1.1)
      const sweep = 0.05 + 0.085 * Math.sin(time * 1.12 + spec.phase + 1.9)
      bird.rightWing.rotation.x = -lift * (1 - fold) + 0.22 * fold
      bird.leftWing.rotation.x = lift * (1 - fold) + 0.22 * fold
      bird.rightWing.rotation.y = sweep * (1 - fold) - 1.40 * fold
      bird.leftWing.rotation.y = -sweep * (1 - fold) + 1.40 * fold
      bird.rightWing.scale.z = 1 - 0.18 * fold
      bird.leftWing.scale.z = 1 - 0.18 * fold
      legs.scale.y = 0.02 + 0.98 * extend
      bird.head.rotation.y = 0.07 * Math.sin(time * 0.37 + spec.phase) * (1 - weight) + 0.22 * Math.sin(time * 0.31 + spec.phase) * weight
      bird.head.rotation.x = 0.05 * Math.sin(time * 0.23 + spec.phase + 0.7) * weight
      bird.tail.rotation.y = 0.05 * Math.sin(time * 0.77 + spec.phase) * weight
    })
  }

  // 高空盘旋五只（y 约 4.2–5.4，参数与 r4 一致）
  addGlider({ id: 1, center: [0.8, -0.7], radius: 2.00, height: 4.90, speed: 0.155, phase: 0.0, scale: 1.00, bank: -0.20, bobAmp: 0.10, bobRate: 0.33 })
  addGlider({ id: 2, center: [2.6, -2.3], radius: 1.25, height: 4.25, speed: 0.235, phase: 2.2, scale: 0.92, bank: -0.24, bobAmp: 0.12, bobRate: 0.41 })
  addGlider({ id: 3, center: [-0.5, -3.4], radius: 2.35, height: 5.30, speed: 0.125, phase: 4.1, scale: 1.08, bank: -0.16, bobAmp: 0.09, bobRate: 0.27 })
  addGlider({ id: 4, center: [3.9, 0.5], radius: 1.05, height: 4.55, speed: 0.245, phase: 1.1, scale: 0.88, bank: -0.22, bobAmp: 0.10, bobRate: 0.47 })
  addGlider({ id: 5, center: [0.2, 0.2], radius: 1.70, height: 4.70, speed: 0.175, phase: 5.0, scale: 0.96, bank: -0.18, bobAmp: 0.11, bobRate: 0.30 })
  // 一只贴水低飞（y 约 1.5–1.9）
  addGlider({ id: 6, center: [3.4, -1.8], radius: 1.35, height: 1.72, speed: 0.210, phase: 3.2, scale: 1.00, bank: -0.28, bobAmp: 0.22, bobRate: 0.35 })

  // 两只静态栖落：前沿 x=1.0 与西岸 z=1 的真实柱顶
  addPerch({ name: 'gull-perch-01', x: FRONT_BOLLARDS[1][0], z: FRONT_BOLLARDS[1][1], heading: Math.PI / 2 + 0.22, scale: 0.95, phase: 0.4 })
  addPerch({ name: 'gull-perch-02', x: WEST_BOLLARDS[2][0], z: WEST_BOLLARDS[2][1], heading: -0.35, scale: 0.90, phase: 2.6 })

  // 一只完整着陆循环：落前沿 x=2.8, z=2.7 的真实柱顶；offset 使 t=0 时已在柱顶
  addLander({
    name: 'gull-lander-01',
    center: [1.8, -0.6], radius: 1.8, height: 5.05, speed: 0.17, phase: 2.4, scale: 0.95,
    x: FRONT_BOLLARDS[2][0], z: FRONT_BOLLARDS[2][1], heading: Math.PI / 2 + 0.16, offset: 16
  })

  return gulls
}
