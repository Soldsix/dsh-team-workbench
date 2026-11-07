// 18-buoys — 褪色系船浮标与港口告示牌（首轮首稿）
// 本文件只负责：两枚近景编号系船浮标、一枚远景小浮标、
// 前方左侧的「潮見港」港名告示牌、台阶旁的小型「注意落水」告示牌。
// 水面、码头、台阶、系船柱等属于其他模块，本文件不复制它们。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = 'buoys-and-harbor-signs'

  const foamMaterial = mat(p.foam, { transparent: true, opacity: 0.5 })

  // ---------------- 编号系船浮标 ----------------
  const buildBuoy = (x, z, number, bodyColor, bandColor, plateColor, inkColor, phase, scale) => {
    const anchor = new THREE.Group()
    anchor.position.set(x, 0, z)
    anchor.scale.setScalar(scale)
    group.add(anchor)

    // 水面泡沫领：固定在水面上，不随浮标摇摆
    mesh(anchor, new THREE.CylinderGeometry(0.3, 0.34, 0.024, 16), foamMaterial, [0, 0.158, 0])

    const float = new THREE.Group()
    float.rotation.y = 0.42
    anchor.add(float)

    cylinder(float, 0.17, 0.235, 0.42, [0, 0.36, 0], bodyColor, 16)       // 浮体
    cylinder(float, 0.239, 0.239, 0.1, [0, 0.235, 0], bandColor, 16)      // 褪色色带
    cylinder(float, 0.232, 0.232, 0.032, [0, 0.2, 0], p.concreteDark, 16) // 吃水污痕
    cylinder(float, 0.052, 0.17, 0.13, [0, 0.63, 0], bodyColor, 14)       // 顶部锥台
    cylinder(float, 0.018, 0.018, 0.075, [0, 0.7, 0], p.metal, 8)         // 吊环柱
    mesh(float, new THREE.TorusGeometry(0.082, 0.019, 6, 14), p.metal, [0, 0.754, 0])
    mesh(float, new THREE.TorusGeometry(0.238, 0.011, 6, 16), p.rust, [0, 0.279, 0], [Math.PI / 2, 0, 0], false)

    // 腰间旧绳与拖入水面的尾绳
    const waist = []
    for (let i = 0; i <= 9; i++) {
      const a = (i / 9) * Math.PI * 2
      waist.push([Math.sin(a) * 0.249, 0.3 + Math.cos(a) * 0.01, Math.cos(a) * 0.249])
    }
    curve(float, waist, p.rope, 0.015)
    curve(float, [[0.245, 0.3, 0.075], [0.32, 0.22, 0.17], [0.365, 0.156, 0.27]], p.rope, 0.013)

    // 编号铭牌：小背板 + 两支支架 + 褪色数字，保持平面以便读清
    box(float, [0.3, 0.12, 0.01], [0, 0.38, 0.202], p.concreteDark, [0, 0, 0], false)
    label(float, number, 0.27, [0, 0.38, 0.215], [0, 0, 0], inkColor, plateColor)
    box(float, [0.025, 0.025, 0.055], [-0.13, 0.38, 0.176], p.metal, [0, 0, 0], false)
    box(float, [0.025, 0.025, 0.055], [0.13, 0.38, 0.176], p.metal, [0, 0, 0], false)

    // 掉漆与锈斑小细节
    box(float, [0.05, 0.028, 0.012], [0.15, 0.252, 0.186], p.rust, [0, 0.2, 0.1], false)
    box(float, [0.04, 0.05, 0.012], [-0.155, 0.24, 0.182], p.concreteLight, [0, -0.25, -0.1], false)

    // 细微起伏：只摆动浮体子树，锚点与泡沫领留在水面
    animate(float, (time) => {
      float.position.y = Math.sin(time * 1.15 + phase) * 0.03
      float.rotation.z = Math.sin(time * 0.88 + phase) * 0.06
      float.rotation.x = Math.sin(time * 0.71 + phase * 1.7) * 0.045
    })
  }

  buildBuoy(4.8, -2.4, '3', p.hull, p.orange, '#e4dcc2', '#ab684a', 0.4, 1)
  buildBuoy(1.8, -3.4, '7', p.orange, p.hull, '#b57152', '#f2ead6', 2.1, 0.94)
  buildBuoy(5.5, -5.1, '11', p.hull, p.orange, '#e4dcc2', '#ab684a', 4.2, 0.72)

  // ---------------- 「潮見港」港名告示牌（前方左侧码头） ----------------
  const portSign = new THREE.Group()
  portSign.position.set(-3.8, 0.8, 4.3)
  portSign.rotation.y = 0.5
  group.add(portSign)

  box(portSign, [2.5, 0.09, 0.52], [0, 0.045, 0], p.concreteDark)          // 基座
  for (const sx of [-0.86, 0.86]) {
    box(portSign, [0.34, 0.06, 0.34], [sx, 0.11, 0], p.rust)               // 锈蚀底脚
    for (const [bx, bz] of [[-0.11, -0.11], [0.11, -0.11], [-0.11, 0.11], [0.11, 0.11]])
      sphere(portSign, 0.022, [sx + bx, 0.152, bz], p.metal, 6)            // 底脚螺栓
    box(portSign, [0.1, 1.5, 0.1], [sx, 0.83, 0], p.metal)                 // 立柱
    box(portSign, [0.11, 0.42, 0.105], [sx, 0.5, 0], p.rust, [0, 0, 0], false)
    box(portSign, [0.105, 0.1, 0.11], [sx, 1.13, 0.004], p.concreteLight, [0, 0, 0.06], false)
    box(portSign, [0.105, 0.07, 0.105], [sx, 1.45, 0], p.concreteDark, [0, 0, -0.05], false)
    beam(portSign, [sx, 1.02, 0], [sx * 0.4, 1.55, 0], 0.045, p.metal)      // 斜撑
  }

  box(portSign, [2.3, 0.86, 0.08], [0, 1.99, 0], p.concreteLight)           // 板身
  box(portSign, [2.34, 0.07, 0.1], [0, 2.44, 0], p.concreteDark)            // 上下边框
  box(portSign, [2.34, 0.07, 0.1], [0, 1.54, 0], p.concreteDark)
  box(portSign, [0.07, 0.86, 0.09], [-1.12, 1.99, 0], p.concreteDark)       // 左右边框
  box(portSign, [0.07, 0.86, 0.09], [1.12, 1.99, 0], p.concreteDark)
  label(portSign, '潮見港', 1.78, [0, 2.0, 0.055], [0, 0, 0], '#57736f', '#e6e5cb')

  // 板面掉漆与锈斑（均放在文字区之外）
  box(portSign, [0.16, 0.12, 0.012], [-1.02, 1.72, 0.046], p.rust, [0, 0, 0.12], false)
  box(portSign, [0.1, 0.09, 0.012], [1.04, 2.28, 0.046], p.concreteDark, [0, 0, -0.1], false)
  box(portSign, [0.2, 0.06, 0.012], [0.05, 2.37, 0.046], p.rust, [0, 0, 0.03], false)
  box(portSign, [0.05, 0.2, 0.012], [-1.06, 2.05, 0.046], p.metal, [0, 0, 0.05], false)

  // ---------------- 台阶旁的「注意落水」小告示牌 ----------------
  const warningSign = new THREE.Group()
  warningSign.position.set(5.0, 0.8, 3.8)
  warningSign.rotation.y = 0.6
  group.add(warningSign)

  box(warningSign, [0.3, 0.05, 0.3], [0, 0.025, 0], p.concreteDark)         // 底座
  box(warningSign, [0.09, 0.06, 0.09], [0, 0.07, 0], p.rust)                // 锈脚箍
  box(warningSign, [0.07, 1.02, 0.07], [0, 0.55, 0], p.metal)               // 立杆
  box(warningSign, [0.075, 0.06, 0.075], [0, 0.95, 0.004], p.rust, [0, 0, 0], false)
  box(warningSign, [0.74, 0.44, 0.055], [0, 1.3, 0], p.concreteLight)       // 牌面
  box(warningSign, [0.78, 0.05, 0.06], [0, 1.54, 0], p.concreteDark)
  box(warningSign, [0.78, 0.05, 0.06], [0, 1.06, 0], p.concreteDark)
  label(warningSign, '注意落水', 0.62, [0, 1.31, 0.036], [0, 0, 0], '#7d4a38', '#ead17d')
  box(warningSign, [0.09, 0.06, 0.012], [0.29, 1.11, 0.03], p.rust, [0, 0, 0.2], false)
  box(warningSign, [0.07, 0.05, 0.012], [-0.3, 1.47, 0.03], p.metal, [0, 0, -0.15], false)

  return group
}
