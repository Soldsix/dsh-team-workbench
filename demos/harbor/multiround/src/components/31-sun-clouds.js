// 31-sun-clouds.js — 太阳雨小渔港：薄云 / 淡金斜光 / 偶发极淡彩虹 / 远端薄雾。
// 第 2 轮（task-38）：真实 hero/reverse/interiors 截图显示 additive 长光柱在白天背景下被冲成刺眼白柱并遮挡左侧建筑；
// 改为短距、窄幅、正常混合的淡金斜光，只落空地；薄云去掉发灰冷底，提亮为通透薄絮。仅属于 artist-31-sun-clouds。
// 第 3 轮（task-50）：按 r2 截图核对——刺白柱已消除、建筑完全可读，但两道斜光过淡近不可见；小幅回调不透明度/宽度并加大倾角，
// 恢复“若隐若现”的淡金斜光；云与极偶发彩虹经核对保持自然，未改；低处远端薄雾收进底座范围。
// 第 5 轮（task-70）：在既有 castShadow 主方向光上补 ±min(3%, 0.051) 的缓慢云影照度——运行时读取基准、绝对时间乘算、不累乘；
// 不改 fill/背景/相机/曝光、不新建光或阴影图；保留薄云、柔和斜光、薄雾与极偶发彩虹及其原有时间节奏；保存 userData 基准供外部数值采样。
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'sun-clouds-atmosphere'

  // ---------- 第 5 轮：既有主 sun 的缓慢云影照度 ----------
  // 认主规则：isDirectionalLight 且 castShadow === true（场景补光没有阴影；不靠名字或亮度猜）。
  // 基准强度在运行时读取，绝不硬写；写回恒为“基准 × 绝对时间因子”，不做 += 累乘、不保存中间状态。
  let sunLight = null
  ctx.scene.traverse(object => {
    if (!sunLight && object.isDirectionalLight && object.castShadow === true) sunLight = object
  })
  const sunBaseline = sunLight ? sunLight.intensity : 0
  // 相对幅度 ≤3%，且绝对变化 ≤0.051（1.7 基准时恰为 3%；实际基准更大时取更小的百分比）
  const sunMaxDelta = sunBaseline > 0 ? Math.min(sunBaseline * 0.03, 0.051) : 0
  const sunRelAmplitude = sunBaseline > 0 ? sunMaxDelta / sunBaseline : 0
  if (sunLight) {
    sunLight.userData.cloudIllumination = {
      owner: '31-sun-clouds',
      detectedBy: 'isDirectionalLight && castShadow === true',
      baseIntensity: sunBaseline,
      minIntensity: sunBaseline - sunMaxDelta,
      maxIntensity: sunBaseline + sunMaxDelta,
      maxAbsDelta: sunMaxDelta,
      relativePercent: sunRelAmplitude * 100,
      mode: 'absolute-time multiply, no accumulation',
      periodsSeconds: [120.8, 369.6]
    }
  }
  // 自检基准：外部可直接采样 scene 中带 cloudIllumination 的 DirectionalLight 与 group.userData
  group.userData.cloudIllumination = {
    lightFound: Boolean(sunLight),
    baseIntensity: sunBaseline,
    minIntensity: sunBaseline - sunMaxDelta,
    maxIntensity: sunBaseline + sunMaxDelta,
    maxAbsDelta: sunMaxDelta,
    relativePercent: sunRelAmplitude * 100
  }

  // ---------- 自持材质：不改动 helper 的全局缓存材质，也不碰场景灯光/背景 ----------
  // 薄云：上亮下淡，去掉发灰的冷色底（截图里云曾像脏灰抹痕）
  const cloudLit = new THREE.MeshBasicMaterial({ color: '#fbfaf1', transparent: true, opacity: 0.320, depthWrite: false })
  const cloudCool = new THREE.MeshBasicMaterial({ color: '#eaf1ee', transparent: true, opacity: 0.120, depthWrite: false })
  const cloudHalo = new THREE.MeshBasicMaterial({ color: '#f4f8f2', transparent: true, opacity: 0.075, depthWrite: false })
  const cloudWarm = new THREE.MeshBasicMaterial({ color: '#fbeec7', transparent: true, opacity: 0.100, depthWrite: false })

  // 淡金斜光：正常混合 + 低不透明度（additive 会在明亮天空中叠加成刺眼纯白，继续弃用）
  // 第 3 轮：r2 截图中斜光几乎不可见，小幅回调到“若隐若现”的可见度
  const shaftCore = new THREE.MeshBasicMaterial({
    color: '#f1d9a6', transparent: true, opacity: 0.120, depthWrite: false, side: THREE.DoubleSide
  })
  const shaftSoft = new THREE.MeshBasicMaterial({
    color: '#f6ead2', transparent: true, opacity: 0.070, depthWrite: false, side: THREE.DoubleSide
  })

  const hazeNearMat = new THREE.MeshBasicMaterial({ color: '#dcebe9', transparent: true, opacity: 0.042, depthWrite: false, side: THREE.DoubleSide })
  const hazeFarMat = new THREE.MeshBasicMaterial({ color: '#e4f0ee', transparent: true, opacity: 0.030, depthWrite: false, side: THREE.DoubleSide })

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
      puff.scale.set(r * 1.62, r * 0.26, r * 0.66)
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

  // ---------- 淡金斜光：两道短距窄幅斜光落在仓库前空地/建筑间隙，顶端不超过仓库屋顶 y≈2.55 ----------
  const shaftGeo = new THREE.CylinderGeometry(0.032, 0.26, 1, 8, 1, true)
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

  addShaft(-1.95, 0.85, 0.95, 1.90, 0.50, 0.16, 0.0)
  addShaft(-3.05, 0.85, -0.40, 1.75, 0.46, 0.14, 1.6)

  // ---------- 偶发极淡彩虹：远海上方半圆弧（红在外、蓝在内），每 100 秒仅出现约 9 秒，绝不常驻 ----------
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

  // ---------- 远端极淡薄雾：两片缓慢漂移的薄纱，压在远海边缘（第 3 轮收进底座范围内） ----------
  const hazeNear = mesh(group, new THREE.PlaneGeometry(8.6, 0.90), hazeNearMat, [-1.30, 1.10, -5.85], [-0.02, 0.02, 0], false)
  const hazeFar = mesh(group, new THREE.PlaneGeometry(6.2, 0.70), hazeFarMat, [1.90, 1.50, -5.90], [0, -0.03, 0], false)

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

  // ---------- 动效 3：自有半透明材质的轻微起伏 + 既有主 sun 的缓慢云影照度 ----------
  animate(group, t => {
    const slow = Math.sin(t * 0.11)
    cloudLit.opacity = 0.320 + slow * 0.024
    cloudCool.opacity = 0.120 + slow * 0.015
    cloudHalo.opacity = 0.075 + slow * 0.010
    cloudWarm.opacity = 0.100 + Math.sin(t * 0.085 + 1.1) * 0.016
    shaftCore.opacity = 0.120 + Math.sin(t * 0.070 + 0.4) * 0.012
    shaftSoft.opacity = 0.070 + Math.sin(t * 0.060 + 2.0) * 0.008
    hazeNearMat.opacity = 0.042 + Math.sin(t * 0.045) * 0.008
    hazeFarMat.opacity = 0.030 + Math.sin(t * 0.038 + 1.9) * 0.006
    // 地面照度轻微云影：intensity = 运行时基准 ×（1 + 因子）。因子只依赖绝对时间，幅度 ≤ min(3%, 0.051)，
    // 均值 0 不压暗高调画面；不碰 fill（ HemisphereLight ）、背景、相机或曝光。
    if (sunLight) {
      const cloudShadow = sunRelAmplitude * (0.65 * Math.sin(t * 0.052 + 1.3) + 0.35 * Math.sin(t * 0.017 + 0.6))
      sunLight.intensity = sunBaseline * (1 + cloudShadow)
    }
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
      rainbowBands[i].opacity = 0.18 * alpha * (1 - i * 0.08)
    }
  })

  return group
}
