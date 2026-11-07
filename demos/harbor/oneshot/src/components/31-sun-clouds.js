// 31-sun-clouds.js — 太阳雨小渔港：薄云 / 极淡暖色光柱 / 偶发极淡彩虹 / 远端薄雾。
// 首稿源码，仅属于 artist-31-sun-clouds。Y 向上，天空层 y≈5.5–7；坐标与 CONTRACT.md 一致。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'sun-clouds-atmosphere'

  // ---------- 自持材质：不改动 helper 的全局缓存材质，也不碰场景灯光/背景 ----------
  const cloudLit = new THREE.MeshBasicMaterial({ color: '#f8f6ec', transparent: true, opacity: 0.300, depthWrite: false })
  const cloudCool = new THREE.MeshBasicMaterial({ color: '#dce9e6', transparent: true, opacity: 0.240, depthWrite: false })
  const cloudHalo = new THREE.MeshBasicMaterial({ color: '#eff6f1', transparent: true, opacity: 0.090, depthWrite: false })
  const cloudWarm = new THREE.MeshBasicMaterial({ color: '#faeecb', transparent: true, opacity: 0.130, depthWrite: false })

  const shaftCore = new THREE.MeshBasicMaterial({
    color: '#f6e2b6', transparent: true, opacity: 0.072, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  })
  const shaftSoft = new THREE.MeshBasicMaterial({
    color: '#f1ead6', transparent: true, opacity: 0.030, depthWrite: false,
    blending: THREE.AdditiveBlending, side: THREE.DoubleSide
  })

  const hazeNearMat = new THREE.MeshBasicMaterial({ color: '#dcebe9', transparent: true, opacity: 0.048, depthWrite: false, side: THREE.DoubleSide })
  const hazeFarMat = new THREE.MeshBasicMaterial({ color: '#e4f0ee', transparent: true, opacity: 0.036, depthWrite: false, side: THREE.DoubleSide })

  // ---------- 薄云：压扁的半透明椭球层拼成 5 片薄云，全部落在 y 5.75–6.85 ----------
  const puffGeo = new THREE.SphereGeometry(1, 12, 8)
  const wispGeo = new THREE.SphereGeometry(1, 10, 6)
  const clouds = []

  const addCloud = (cx, cy, cz, spread, scale, phase, warm) => {
    const cloud = new THREE.Group()
    cloud.position.set(cx, cy, cz)
    group.add(cloud)

    const count = 5
    for (let i = 0; i < count; i += 1) {
      const f = i / (count - 1)
      const px = (f - 0.5) * spread + (rand() - 0.5) * 0.30
      const py = Math.sin(f * Math.PI) * 0.12 + (rand() - 0.5) * 0.05
      const pz = (rand() - 0.5) * 0.34 * scale
      const r = (0.60 + rand() * 0.42) * scale
      const puff = mesh(cloud, puffGeo, cloudLit, [px, py, pz], [0, rand() * 6.28, 0], false)
      puff.scale.set(r * 1.55, r * 0.30, r * 0.68)
    }

    // 冷色薄底 + 更淡的外缘光晕：保持通透，避免死板白块
    const under = mesh(cloud, wispGeo, cloudCool, [0.05, -0.09, -0.04], [0, 0, 0], false)
    under.scale.set(spread * 0.50, 0.075, spread * 0.26 * scale)
    const halo = mesh(cloud, wispGeo, cloudHalo, [0, 0.02, 0.02], [0, 0, 0], false)
    halo.scale.set(spread * 0.60, spread * 0.12, spread * 0.34)

    // 向阳侧的一点极淡暖金反光，说明“阳光仍在”
    if (warm) {
      const glow = mesh(cloud, wispGeo, cloudWarm, [spread * 0.27, 0.035, -0.05], [0, 0, 0], false)
      glow.scale.set(spread * 0.21, spread * 0.05, spread * 0.15)
    }

    clouds.push({ cloud, cx, cy, cz, phase })
  }

  addCloud(-3.00, 5.75, -2.40, 2.80, 0.90, 0.0, false)
  addCloud(0.00, 6.55, -4.80, 3.60, 1.00, 1.7, true)
  addCloud(2.90, 5.95, -3.30, 2.80, 0.85, 2.9, true)
  addCloud(1.10, 6.85, -0.60, 2.30, 0.70, 4.1, false)
  addCloud(-3.80, 6.35, 0.90, 2.10, 0.68, 5.3, false)

  // ---------- 极淡暖色光柱：左侧渔协仓库卷帘门前与坡上民家窗前，内亮外柔双层锥体 ----------
  const shaftGeo = new THREE.CylinderGeometry(0.07, 0.62, 1, 10, 1, true)
  const shafts = []

  const addShaft = (x, y, z, length, leanZ, leanX, phase) => {
    const holder = new THREE.Group()
    holder.position.set(x, y, z)
    holder.rotation.z = leanZ
    holder.rotation.x = leanX
    group.add(holder)

    const core = mesh(holder, shaftGeo, shaftCore, [0, length * 0.5, 0], [0, 0, 0], false)
    core.scale.set(1, length, 1)
    const soft = mesh(holder, shaftGeo, shaftSoft, [0, length * 0.5, 0], [0, 0, 0], false)
    soft.scale.set(1.55, length * 1.02, 1.55)

    shafts.push({ holder, leanZ, leanX, phase })
  }

  addShaft(-2.52, 0.85, 1.10, 5.20, -0.100, 0.060, 0.0)
  addShaft(-2.95, 0.85, 0.05, 4.80, -0.095, 0.055, 1.6)
  addShaft(-4.10, 1.12, -2.85, 4.30, -0.088, 0.052, 3.1)

  // ---------- 偶发极淡彩虹：远海上方半圆弧（红在外、蓝在内），每 100 秒出现一次 ----------
  const rainbow = new THREE.Group()
  rainbow.position.set(0.90, 0.92, -6.15)
  rainbow.rotation.y = 0.08
  rainbow.visible = false
  group.add(rainbow)

  const rainbowBands = []
  const bandColors = ['#f4cbb8', '#f5e5c6', '#dfefd0', '#cbe6e7', '#cfd6ea']
  for (let i = 0; i < bandColors.length; i += 1) {
    const bandMat = new THREE.MeshBasicMaterial({
      color: bandColors[i], transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide
    })
    mesh(rainbow, new THREE.TorusGeometry(3.02 - i * 0.075, 0.02, 5, 72, Math.PI), bandMat, [0, 0, 0], [0, 0, 0], false)
    rainbowBands.push(bandMat)
  }

  // ---------- 远端极淡薄雾：两片缓慢漂移的薄纱，压在远海边缘 ----------
  const hazeNear = mesh(group, new THREE.PlaneGeometry(8.6, 0.90), hazeNearMat, [-1.30, 1.10, -6.25], [-0.02, 0.02, 0], false)
  const hazeFar = mesh(group, new THREE.PlaneGeometry(6.2, 0.70), hazeFarMat, [1.90, 1.50, -6.50], [0, -0.03, 0], false)

  // ---------- 动效 1：薄云缓慢平移、轻微起伏（每帧按基准位置绝对赋值，无累积漂移） ----------
  for (const c of clouds) {
    animate(c.cloud, t => {
      c.cloud.position.x = c.cx + Math.sin(t * 0.028 + c.phase) * 0.34
      c.cloud.position.y = c.cy + Math.sin(t * 0.041 + c.phase * 1.6) * 0.045
      c.cloud.rotation.z = Math.sin(t * 0.021 + c.phase) * 0.012
    })
  }

  // ---------- 动效 2：光柱极轻微摇曳 ----------
  for (const s of shafts) {
    animate(s.holder, t => {
      s.holder.rotation.z = s.leanZ + Math.sin(t * 0.16 + s.phase) * 0.008
      s.holder.rotation.x = s.leanX + Math.sin(t * 0.13 + s.phase * 1.4) * 0.006
    })
  }

  // ---------- 动效 3：整体明暗极轻微起伏（只调自有半透明材质，不改场景灯光） ----------
  animate(group, t => {
    const slow = Math.sin(t * 0.11)
    cloudLit.opacity = 0.300 + slow * 0.028
    cloudCool.opacity = 0.240 + slow * 0.022
    cloudHalo.opacity = 0.090 + slow * 0.012
    cloudWarm.opacity = 0.130 + Math.sin(t * 0.085 + 1.1) * 0.022
    shaftCore.opacity = 0.072 + Math.sin(t * 0.070 + 0.4) * 0.014
    shaftSoft.opacity = 0.030 + Math.sin(t * 0.060 + 2.0) * 0.006
    hazeNearMat.opacity = 0.048 + Math.sin(t * 0.045) * 0.010
    hazeFarMat.opacity = 0.036 + Math.sin(t * 0.038 + 1.9) * 0.008
  })

  // ---------- 动效 4：薄雾缓慢漂移 ----------
  animate(hazeNear, t => {
    hazeNear.position.x = -1.30 + Math.sin(t * 0.018) * 0.30
    hazeNear.position.y = 1.10 + Math.sin(t * 0.026 + 0.7) * 0.045
  })
  animate(hazeFar, t => {
    hazeFar.position.x = 1.90 + Math.sin(t * 0.015 + 2.2) * 0.20
  })

  // ---------- 动效 5：极偶发彩虹，约每 100 秒在远海上方浮现数秒后消散 ----------
  animate(rainbow, t => {
    const local = (t + 12) % 100
    let presence = 0
    if (local < 2.2) presence = local / 2.2
    else if (local < 5.8) presence = 1
    else if (local < 9.2) presence = 1 - (local - 5.8) / 3.4
    presence = presence * presence * (3 - 2 * presence)
    const alpha = presence * 0.92
    rainbow.visible = alpha > 0.002
    for (let i = 0; i < rainbowBands.length; i += 1) {
      rainbowBands[i].opacity = 0.21 * alpha * (1 - i * 0.08)
    }
  })

  return group
}
