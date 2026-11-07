// 29-gulls：太阳雨小渔港上空的海鸥——高空盘旋滑翔、贴水低飞与系船柱顶栖落。
// 首轮独立源码：仅静态编写，尚未经过浏览器渲染验收，不宣称视觉通过。

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const gulls = new THREE.Group()
  gulls.name = 'gulls'

  // ---- 共享材质：全部体、翼复用，动画里不新建几何或材质 ----
  const bodyMat = mat('#fbfaf0')
  const mantleMat = mat(p.concrete)
  const wingWhiteMat = mat(p.hull, { side: THREE.DoubleSide })
  const wingDarkMat = mat(p.dark, { side: THREE.DoubleSide })
  const tailMat = mat(p.concreteLight, { side: THREE.DoubleSide })
  const beakMat = mat('#e6ab6e')
  const eyeMat = mat(p.dark)

  // ---- 共享翼形：后掠弧形翼面，外侧初级飞羽为深色翼尖 ----
  // 顶点在海鸥本地坐标：+x 为前方、+z 为右翼展、+y 为上。
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

  // 平摊的三角尾羽，栖落时可轻摆
  const tailGeometry = new THREE.BufferGeometry()
  tailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(
    [-0.118, 0.010, 0.058, -0.118, 0.010, -0.058, -0.304, 0.014, 0.000], 3))
  tailGeometry.setIndex([0, 1, 2])
  tailGeometry.computeVertexNormals()

  // ---- 单翼：滑翔时轻轻振动；栖落时后掠收拢 ----
  const addWing = (posture, side, folded) => {
    const wing = new THREE.Group()
    const panels = wingPanels[side > 0 ? 0 : 1]
    mesh(wing, panels.white, wingWhiteMat)
    mesh(wing, panels.dark, wingDarkMat)
    wing.rotation.set(folded ? 0.22 : 0.0, side * (folded ? -0.85 : 0.05), 0)
    posture.add(wing)
    return wing
  }

  // ---- 一只海鸥：圆润白身、灰色背羽、小头小暖喙、深色翼尖 ----
  const buildGull = (scale, folded) => {
    const root = new THREE.Group()      // 朝向与栖落位置
    const posture = new THREE.Group()   // 身体俯仰姿态
    root.add(posture)

    const body = sphere(posture, 0.078, [0, 0, 0], bodyMat, 12)
    body.scale.set(2.02, 0.92, 0.95)
    const back = sphere(posture, 0.074, [-0.012, 0.030, 0], mantleMat, 12)
    back.scale.set(1.88, 0.58, 0.90)
    const tail = mesh(posture, tailGeometry, tailMat)

    const head = new THREE.Group()
    head.position.set(0.132, 0.046, 0)
    posture.add(head)
    sphere(head, 0.053, [0, 0, 0], bodyMat, 10)
    sphere(head, 0.0095, [0.038, 0.013, 0.037], eyeMat, 6)
    sphere(head, 0.0095, [0.038, 0.013, -0.037], eyeMat, 6)
    const beak = cylinder(head, 0.004, 0.016, 0.058, [0.072, -0.010, 0], beakMat, 8)
    beak.rotation.z = -Math.PI / 2 - 0.12

    const rightWing = addWing(posture, 1, folded)
    const leftWing = addWing(posture, -1, folded)

    root.scale.setScalar(scale)
    return { root, posture, head, tail, rightWing, leftWing }
  }

  // 栖落时露出细腿与脚掌（腿挂在未俯仰的根部，保持垂直）
  const addLegs = (root) => {
    for (const z of [-0.030, 0.030]) {
      beam(root, [0.014, -0.050, z], [0.018, -0.140, z * 1.15], 0.011, p.orange)
      box(root, [0.042, 0.008, 0.017], [0.032, -0.142, z * 1.15], p.orange)
    }
  }

  // ---- 滑翔：绕圆心缓慢盘旋，翼面轻微起伏，航线不抖动 ----
  const addGlider = (spec) => {
    const orbit = new THREE.Group()
    orbit.position.set(spec.center[0], spec.height, spec.center[1])
    gulls.add(orbit)

    const flyer = new THREE.Group()
    flyer.position.set(0, 0, spec.radius)
    flyer.rotation.set(spec.bank, 0, 0)
    orbit.add(flyer)

    const bird = buildGull(spec.scale, false)
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

  // ---- 栖落：收翅站立，只做极轻的转头、啄理与尾羽动作 ----
  const addPerch = (spec) => {
    const bird = buildGull(spec.scale, true)
    bird.root.position.set(spec.x, spec.y, spec.z)
    bird.root.rotation.y = spec.heading
    bird.posture.rotation.z = spec.pitch
    addLegs(bird.root)
    gulls.add(bird.root)

    animate(bird.root, (time) => {
      bird.posture.rotation.z = spec.pitch + 0.012 * Math.sin(time * 0.60 + spec.phase)
      bird.head.rotation.y = 0.22 * Math.sin(time * 0.31 + spec.phase)
      bird.head.rotation.x = 0.05 * Math.sin(time * 0.23 + spec.phase + 0.7)
      bird.rightWing.rotation.x = 0.22 + 0.012 * Math.sin(time * 0.83 + spec.phase)
      bird.leftWing.rotation.x = 0.22 + 0.012 * Math.sin(time * 0.83 + spec.phase + 0.4)
      bird.tail.rotation.y = 0.05 * Math.sin(time * 0.77 + spec.phase)
    })
  }

  // 高空盘旋的五只：y 约 4.2–5.4，圆形航迹落在港湾水域上空
  addGlider({ center: [0.8, -0.7], radius: 2.00, height: 4.90, speed: 0.155, phase: 0.0, scale: 1.00, bank: -0.20, bobAmp: 0.10, bobRate: 0.33 })
  addGlider({ center: [2.6, -2.3], radius: 1.25, height: 4.25, speed: 0.235, phase: 2.2, scale: 0.92, bank: -0.24, bobAmp: 0.12, bobRate: 0.41 })
  addGlider({ center: [-0.5, -3.4], radius: 2.35, height: 5.30, speed: 0.125, phase: 4.1, scale: 1.08, bank: -0.16, bobAmp: 0.09, bobRate: 0.27 })
  addGlider({ center: [3.9, 0.5], radius: 1.05, height: 4.55, speed: 0.245, phase: 1.1, scale: 0.88, bank: -0.22, bobAmp: 0.10, bobRate: 0.47 })
  addGlider({ center: [0.2, 0.2], radius: 1.70, height: 4.70, speed: 0.175, phase: 5.0, scale: 0.96, bank: -0.18, bobAmp: 0.11, bobRate: 0.30 })

  // 一只贴着水面低飞，偶尔压低掠过港湾（y 约 1.5–1.9）
  addGlider({ center: [3.4, -1.8], radius: 1.35, height: 1.72, speed: 0.210, phase: 3.2, scale: 1.00, bank: -0.28, bobAmp: 0.22, bobRate: 0.35 })

  // 两只栖落在泊位旁系船柱顶；柱顶高度按底座 y0.8 加铸铁柱约 0.2 估算为 1.00
  addPerch({ x: -1.86, y: 1.14, z: 1.92, heading: -0.28, pitch: 0.30, scale: 0.95, phase: 0.4 })
  addPerch({ x: 0.92, y: 1.14, z: 2.56, heading: 1.72, pitch: 0.30, scale: 0.90, phase: 2.6 })

  return gulls
}
