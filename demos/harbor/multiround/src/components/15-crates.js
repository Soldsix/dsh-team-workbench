// 15-crates.js — 鱼箱・蓝色周转筐・碎冰与交易痕迹（渔港转角、前景左侧码头，首稿）
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const g = new THREE.Group()
  g.name = 'crates-fish-market'

  const TOP = 0.8                                    // 契约固定的码头面高度
  const C = {
    box: '#eef2ea', boxAlt: '#e7ede3', shade: '#dde7df', damp: '#cfdcd6', handle: '#bccbc6',
    crate: '#8fadba', crateDeep: '#7895a2', crateRim: '#a3bec8',
    ice: '#e3f3f2', glint: '#f6fdfb', drop: '#cfe9e6',
    paper: '#e9e3cf', paperEdge: '#c9c0a6', ink: '#5c7774', chalk: '#f1f5ec',
    fish: '#aec5cb', fin: '#93abb1', lid: '#e9eee5'
  }

  // 每一摞共用一个组，整体做极轻微的水平旋转，避免排得过于整齐
  const stack = (x, z, ry) => {
    const s = new THREE.Group()
    s.position.set(x, TOP, z)
    s.rotation.y = ry
    g.add(s)
    return s
  }

  // 白色发泡鱼箱：薄箱沿、两侧模压把手、被雨打湿的底边
  const whiteBox = (parent, y, x = 0, z = 0, ry = 0, alt = 0) => {
    const b = new THREE.Group()
    b.position.set(x, y, z)
    b.rotation.y = ry
    parent.add(b)
    box(b, [0.5, 0.185, 0.34], [0, 0.0925, 0], alt ? C.boxAlt : C.box, [0, 0, 0], true)
    box(b, [0.528, 0.026, 0.368], [0, 0.176, 0], C.shade, [0, 0, 0], false)
    box(b, [0.506, 0.038, 0.346], [0, 0.019, 0], C.damp, [0, 0, 0], false)
    for (const s of [-1, 1]) box(b, [0.058, 0.028, 0.012], [s * 0.155, 0.13, 0.171], C.handle, [0, 0, 0], false)
    return b
  }

  // 敞口鱼箱：真实薄壁箱体，内部盛半融碎冰，箱沿留一圈浅色唇边
  const openWhiteBox = (parent, y, x = 0, z = 0, ry = 0) => {
    const b = new THREE.Group()
    b.position.set(x, y, z)
    b.rotation.y = ry
    parent.add(b)
    const W = 0.5, D = 0.34, H = 0.19
    box(b, [W, 0.038, D], [0, 0.019, 0], C.box, [0, 0, 0], true)
    box(b, [W - 0.03, 0.012, D - 0.03], [0, 0.041, 0], C.damp, [0, 0, 0], false)
    for (const s of [-1, 1]) {
      box(b, [0.026, H, D], [s * 0.237, H / 2 + 0.02, 0], C.box, [0, 0, 0], true)
      box(b, [W - 0.052, H, 0.026], [0, H / 2 + 0.02, s * 0.157], C.boxAlt, [0, 0, 0], true)
      box(b, [W + 0.018, 0.02, 0.022], [0, H + 0.028, s * 0.169], C.shade, [0, 0, 0], false)
    }
    box(b, [W - 0.09, 0.07, D - 0.09], [0, H - 0.006, 0.008], C.ice, [0, 0.06, 0], false)
    box(b, [0.26, 0.005, 0.15], [0.02, H + 0.032, 0.02], C.glint, [0, 0.2, 0], false)
    return b
  }

  // 褪色蓝周转筐：横条缝隙 + 实心端板 + 浅色筐沿
  const blueCrate = (parent, y, x = 0, z = 0, ry = 0) => {
    const c = new THREE.Group()
    c.position.set(x, y, z)
    c.rotation.y = ry
    parent.add(c)
    const W = 0.46, D = 0.32, H = 0.205
    box(c, [W, 0.032, D], [0, 0.016, 0], C.crateDeep, [0, 0, 0], false)
    box(c, [W + 0.02, 0.022, D + 0.02], [0, H - 0.011, 0], C.crateRim, [0, 0, 0], true)
    for (const s of [-1, 1]) {
      for (const yy of [0.072, 0.163]) box(c, [W - 0.018, 0.06, 0.018], [0, yy, s * (D / 2 - 0.009)], C.crate, [0, 0, 0], false)
      box(c, [0.018, H - 0.02, D - 0.02], [s * (W / 2 - 0.009), H / 2, 0], C.crate, [0, 0, 0], false)
    }
    return c
  }

  // 收敛的小鱼剪影，浮在碎冰里
  const fish = (parent, x, y, z, ry, len = 0.17) => {
    const f = new THREE.Group()
    f.position.set(x, y, z)
    f.rotation.y = ry
    parent.add(f)
    const body = sphere(f, len * 0.34, [0, 0, 0], C.fish, 8)
    body.scale.set(1.55, 0.5, 0.78)
    box(f, [len * 0.26, 0.006, len * 0.15], [-len * 0.6, 0, 0], C.fin, [0, 0, 0.6], false)
    sphere(f, len * 0.03, [len * 0.3, len * 0.05, len * 0.14], C.ink, 5)
    return f
  }

  const chunk = (parent, x, y, z, s, ry = 0) =>
    box(parent, [s, s * 0.42, s * 0.74], [x, y, z], C.glint, [0, ry, 0.1], false)

  const iceBed = (parent, x, y, z, w, d, ry = 0) => {
    box(parent, [w, 0.05, d], [x, y, z], C.ice, [0, ry, 0], false)
    box(parent, [w * 0.64, 0.005, d * 0.48], [x + 0.012, y + 0.028, z + 0.02], C.glint, [0, ry + 0.22, 0], false)
  }

  // 纸质标签、手写价签与掉落的小票（交易痕迹）
  const paperTag = (parent, x, y, z, ry, w = 0.14, h = 0.075) => {
    box(parent, [w, 0.0035, h], [x, y, z], C.paper, [0, ry, 0], false)
    box(parent, [w, 0.0036, 0.01], [x, y + 0.0006, z - h * 0.4], C.paperEdge, [0, ry, 0], false)
    return box(parent, [w * 0.26, 0.0036, h * 0.55], [x + w * 0.42, y + 0.002, z + h * 0.42], C.paperEdge, [0, ry + 0.5, 0.06], false)
  }
  const textPlate = (parent, text, w, x, y, z, ry = 0) =>
    label(parent, text, w, [x, y, z], [0, ry, 0], C.ink, C.paper)

  // 取下的白箱盖随手放在地上
  const looseLid = (parent, x, y, z, ry = 0) => {
    const l = box(parent, [0.5, 0.02, 0.34], [x, y, z], C.lid, [0.03, ry, 0.02], true)
    box(parent, [0.44, 0.004, 0.28], [x, y + 0.014, z], C.shade, [0.03, ry, 0.02], false)
    bead(parent, x + 0.12, y + 0.03, z + 0.06, 0.012)
    return l
  }

  // 水珠与偶发滴落（动效只改位置与缩放，不新建几何）
  const drops = []
  const bead = (parent, x, y, z, s = 0.015) => {
    const b = sphere(parent, s, [x, y, z], C.glint, 6)
    b.scale.set(0.78, 1.35, 0.78)
    return b
  }
  const drip = (parent, x, y0, z, phase) => {
    const d = sphere(parent, 0.014, [x, y0, z], C.drop, 6)
    d.scale.set(0.75, 1.45, 0.75)
    drops.push({ d, y0, phase })
  }

  // A. 五只白鱼箱叠成最高的一摞，越往上越歪
  const sA = stack(-4.5, 3.96, 0.06)
  const aOff = [0.016, -0.012, 0.022, -0.018, 0.008]
  for (let i = 0; i < 5; i++) {
    whiteBox(sA, i * 0.187, aOff[i], i % 2 ? -0.014 : 0.018, i % 2 ? 0.07 : -0.045, i % 2)
  }
  box(sA, [0.11, 0.004, 0.012], [0.05, 0.939, 0.1], C.chalk, [0, 0.5, 0], false)
  box(sA, [0.06, 0.004, 0.012], [0.06, 0.939, 0.02], C.chalk, [0, 0.5, 0], false)
  textPlate(sA, '15', 0.16, -0.12, 0.62, 0.186, -0.04)
  paperTag(sA, 0.11, 0.4, 0.185, 0.12, 0.15, 0.08)
  looseLid(sA, 0.03, 0.948, 0.02, 0.32)

  // B. 两只叠放 + 一只敞口鱼箱，冰里躺着一条小鱼
  const sB = stack(-3.88, 3.72, 0.42)
  whiteBox(sB, 0, -0.012, 0.006, -0.04, 1)
  whiteBox(sB, 0.187, 0.014, -0.01, 0.05, 0)
  const bOpen = openWhiteBox(sB, 0.374, 0.004, 0, 0.02)
  fish(bOpen, 0.06, 0.232, 0.03, -0.52, 0.16)
  chunk(bOpen, -0.11, 0.235, -0.04, 0.05, 0.4)
  chunk(bOpen, 0.14, 0.234, -0.06, 0.035, 1.1)
  bead(sB, 0.14, 0.59, 0.15)

  // C. 三只褪色蓝周转筐，最上层敞口：碎冰、两条小鱼、手写价签与散落小票
  const sC = stack(-3.54, 4.64, -0.2)
  blueCrate(sC, 0, 0, 0, 0.02)
  blueCrate(sC, 0.206, 0.012, -0.01, -0.03)
  const cTop = blueCrate(sC, 0.412, 0.004, 0.006, 0.01)
  iceBed(cTop, 0, 0.07, 0, 0.38, 0.24, 0.05)
  fish(cTop, -0.07, 0.118, -0.02, 0.42, 0.16)
  fish(cTop, 0.09, 0.114, 0.05, -0.62, 0.14)
  textPlate(cTop, '¥1,200', 0.26, 0, 0.164, -0.09, 0.2)
  paperTag(sC, 0.16, 0.13, 0.163, -0.5, 0.12, 0.065)
  bead(sC, 0.15, 0.6, 0.168)

  // D. 靠前的一对周转筐，上面那只略歪，与 C 之间留出空档
  const sD = stack(-3.16, 4.04, 0.5)
  blueCrate(sD, 0, 0, 0, 0.03)
  blueCrate(sD, 0.206, 0.02, -0.012, -0.07)
  paperTag(sD, -0.08, 0.3, 0.164, 0.4, 0.11, 0.06)

  // E. 最靠近观者的敞口鱼箱：冰上又一条小鱼，标签搁在冰沿
  const sE = stack(-4.68, 4.86, -0.3)
  const eOpen = openWhiteBox(sE, 0, 0, 0, 0)
  fish(eOpen, -0.05, 0.232, 0.04, 0.68, 0.15)
  chunk(eOpen, 0.13, 0.234, -0.05, 0.045, 0.2)
  paperTag(eOpen, 0.14, 0.222, 0.11, 0.3, 0.12, 0.062)
  bead(sE, 0.19, 0.23, 0.16)

  // F. 同区另一处留白：地面只放掉落的小票与碎冰，不再堆箱（负空间）
  const shards = [
    [-4.22, 4.36, 0.07, 0.4], [-3.88, 4.46, 0.05, 1.3], [-3.02, 4.55, 0.06, 2.2],
    [-2.98, 4.3, 0.045, 0.8], [-4.25, 4.64, 0.05, 1.7], [-3.06, 4.62, 0.055, 2.8],
    [-4.06, 4.88, 0.045, 1.1], [-4.62, 4.3, 0.04, 0.2], [-3.7, 4.2, 0.05, 2.4]
  ]
  for (const [x, z, s, ry] of shards) chunk(g, x, TOP + 0.008, z, s, ry)
  box(g, [0.22, 0.002, 0.13], [-4.12, TOP + 0.002, 4.28], '#dfeeea', [0, 0.4, 0], false)
  box(g, [0.15, 0.002, 0.09], [-3.3, TOP + 0.002, 4.36], '#e6f2ee', [0, -0.3, 0], false)
  paperTag(g, -3.0, TOP + 0.004, 4.42, 0.6, 0.14, 0.08)

  // 箱沿的水珠与偶发滴落
  bead(sA, 0.2, 0.94, 0.18)
  bead(sA, -0.16, 0.75, 0.18)
  bead(sD, -0.17, 0.4, 0.16)
  drip(sA, 0.23, 0.94, 0.19, 0.15)
  drip(sC, -0.2, 0.6, 0.185, 0.55)
  drip(sD, 0.2, 0.4, 0.17, 0.35)
  animate(g, t => {
    for (const { d, y0, phase } of drops) {
      const k = (t * 0.5 + phase) % 1
      d.position.y = y0 - (y0 - 0.02) * k * k
      d.scale.y = 1.45 + k * 1.1
      d.visible = k < 0.88
    }
  })

  return g
}
