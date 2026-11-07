// 05-water.js — 太阳雨小渔港 · 第二轮源码（依据 visual-review/r1 的真实截图修订）
// 第二轮实读 hero.png / reverse.png / interiors.png 的观察：
//   三个视角的水面都偏白、几乎没有青绿色相，大块象牙白斑覆盖水面，低不透明度
//   又把浅色水下地面透出来，于是水面读不出“水”，与灰白码头明度也拉不开。
// 修订策略（只在本模块内）：
//   1) 加深基底青绿，并按离岸距离做 4 级清晰平涂分层（浅滩→中层→深水→港心），
//      层界用低频噪声做手绘式起伏，保持“平涂动画背景”而不是渐变写实；
//   2) 倒影改成边缘利落的碎片化平涂：只有近岸少量浅色碎片 + 青绿族深浅碎片，
//      不再是大面积象牙白；
//   3) 粼光改为细柔低强度暖金细闪 + 淡薄荷微光，避免白色泛滥；
//   4) 提高 alpha 让水面成为可读的水体，仅浅滩一圈稍透，保留可观察性；
//   5) 不新增任何几何：仍是同一块透明 ShaderMaterial 水面，不遮挡他人 geometry。
// 颜色按 main.js 的 ACESFilmicToneMapping + exposure 1.32 做深色预补偿；
// 实际观感必须由外部构建服务再次渲染确认，本文件不宣称已渲染。
// 静态自检：不运行命令、不安装依赖。

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  // 水面足迹 x[-1.7,6] z[-6,2.4]、基准 y=.15。
  // 岸侧（-x / +z）各内收 0.08 塞进岸壁与堤面下方，避免接缝露光；
  // 底座外缘（+x=6 / -z=-6）严格止于模型边界，不伸出侧壁水体剖面。
  const xMin = -1.7 - 0.08
  const xMax = 6.0
  const zMin = -6.0
  const zMax = 2.4 + 0.08
  const width = xMax - xMin
  const depth = zMax - zMin
  const centerX = (xMin + xMax) * 0.5
  const centerZ = (zMin + zMax) * 0.5

  // 同一解析波场被顶点与片元共用：顶点抬高表面，片元求解析坡度做法线。
  const vertexShader = /* glsl */`
    uniform float uTime;
    varying vec3 vWorld;
    varying vec2 vSurf;

    float waterSwell(vec2 q, float t) {
      float h = sin(q.y * 1.55 + t * 0.50) * 0.018;
      h += sin(q.x * 1.95 - t * 0.44 + 1.7) * 0.013;
      h += sin((q.x + q.y) * 1.20 + t * 0.72) * 0.009;
      h += sin((q.x - q.y * 1.4) * 2.45 - t * 1.05) * 0.005;
      return h;
    }

    void main() {
      vec4 world = modelMatrix * vec4(position, 1.0);
      world.y += waterSwell(world.xz, uTime);
      vWorld = world.xyz;
      vSurf = world.xz;
      gl_Position = projectionMatrix * viewMatrix * world;
    }
  `

  const fragmentShader = /* glsl */`
    uniform float uTime;
    uniform vec3 uShallow;
    uniform vec3 uMid;
    uniform vec3 uDeep;
    uniform vec3 uBasin;
    uniform vec3 uIvory;
    uniform vec3 uFoam;
    uniform vec3 uGold;
    uniform vec3 uSky;
    varying vec3 vWorld;
    varying vec2 vSurf;

    float waterHash(vec2 v) {
      v = fract(v * vec2(127.1, 311.7));
      v += dot(v, v + 34.23);
      return fract(v.x * v.y);
    }

    float waterNoise(vec2 v) {
      vec2 i = floor(v);
      vec2 f = fract(v);
      vec2 u = f * f * (3.0 - 2.0 * f);
      float a = waterHash(i);
      float b = waterHash(i + vec2(1.0, 0.0));
      float c = waterHash(i + vec2(0.0, 1.0));
      float d = waterHash(i + vec2(1.0, 1.0));
      return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
    }

    float waterSwell(vec2 q, float t) {
      float h = sin(q.y * 1.55 + t * 0.50) * 0.018;
      h += sin(q.x * 1.95 - t * 0.44 + 1.7) * 0.013;
      h += sin((q.x + q.y) * 1.20 + t * 0.72) * 0.009;
      h += sin((q.x - q.y * 1.4) * 2.45 - t * 1.05) * 0.005;
      return h;
    }

    void main() {
      float t = uTime;
      vec2 q = vSurf;

      // ---- 解析坡度 → 片元法线（只用于柔和的天空菲涅尔，不做镜面模拟）----
      float e = 0.07;
      float gx = (waterSwell(q + vec2(e, 0.0), t) - waterSwell(q - vec2(e, 0.0), t)) / (2.0 * e);
      float gz = (waterSwell(q + vec2(0.0, e), t) - waterSwell(q - vec2(0.0, e), t)) / (2.0 * e);
      vec3 nrm = normalize(vec3(-gx * 2.0, 1.0, -gz * 2.0));

      // ---- 离岸距离：x=-1.7 与 z=2.4 两道岸壁的较小距离决定水深层次 ----
      float dLeft = q.x + 1.7;
      float dFront = 2.4 - q.y;
      float shoreD = min(dLeft, dFront);

      // 层界不画成直线：低频噪声做手绘式起伏，第二层细噪声让边缘微微毛糙。
      float wob1 = waterNoise(q * 0.85 + vec2(0.0, t * 0.035)) - 0.5;
      float wob2 = waterNoise(q * 2.60 + vec2(4.0, 1.0) - vec2(t * 0.020, 0.0)) - 0.5;
      float depthD = shoreD + wob1 * 0.55 + wob2 * 0.18;
      float depthT = clamp(depthD / 4.9, 0.0, 1.0);

      // ---- 4 级清晰平涂分层：浅滩 / 中层 / 深水 / 港心（crisp step 边界）----
      float bandMid = step(0.17, depthT);
      float bandDeep = step(0.55, depthT);
      float bandBasin = step(0.82, depthT);

      vec3 col = mix(uShallow, uMid, bandMid);
      col = mix(col, uDeep, bandDeep);
      col = mix(col, uBasin, bandBasin);

      // ---- 碎片化平涂倒影：青绿族深浅碎片，边缘利落，缓慢漂移 ----
      vec2 flow = vec2(sin(q.y * 0.70 + t * 0.22), cos(q.x * 0.63 - t * 0.19)) * 0.10;
      vec2 rq = q + flow + wob2 * 0.30;
      float fragA = waterNoise(rq * 4.4 + vec2(2.0, 5.0) + vec2(t * 0.015, 0.0));
      float fragB = waterNoise(rq * 7.6 - vec2(1.5, 3.0) - vec2(0.0, t * 0.012));
      col = mix(col, uDeep, step(0.64, fragA) * 0.22);
      col = mix(col, uShallow, step(0.70, fragB) * 0.18);

      // 近岸的浅色碎片读作船身/护轮坎倒影：只在离岸 2.4 内出现，权重克制。
      float shoreNear = 1.0 - smoothstep(0.0, 2.4, shoreD);
      float shard = waterNoise(vec2(rq.x * 6.0 + 4.0, rq.y * 1.05 + t * 0.045));
      col = mix(col, uIvory, smoothstep(0.72, 0.80, shard) * shoreNear * 0.40);

      // ---- 细柔粼光：低强度淡薄荷微光 + 极少量暖金细闪，避免白色泛滥 ----
      float shimmer = waterNoise(vec2(rq.x * 2.6, rq.y * 8.6) + vec2(t * 0.06, t * 0.26));
      col = mix(col, uIvory, smoothstep(0.68, 0.80, shimmer) * 0.13);
      float fleck = waterNoise(rq * 17.0 + vec2(t * 0.30, -t * 0.20));
      col += uGold * smoothstep(0.88, 0.965, fleck) * 0.055;

      // ---- 岸线泡沫细带：只贴浅滩，避免整片白 ----
      float foamBand = sin(q.y * 6.0 + fragA * 6.283 + q.x * 0.55 + t * 0.55);
      float foam = smoothstep(0.90, 0.98, foamBand) * (1.0 - smoothstep(0.0, 0.9, shoreD));
      col = mix(col, uFoam, foam * 0.40);

      // ---- 岸壁接触处极淡的压暗，帮水面和混凝土拉开边界 ----
      float edge = 1.0 - smoothstep(0.0, 0.20, shoreD);
      col *= 1.0 - edge * 0.12;

      // ---- 柔和菲涅尔天光（只提亮，不镜像）----
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - clamp(dot(nrm, viewDir), 0.0, 1.0), 3.0);
      col = mix(col, uSky, fres * 0.18);

      // ---- 不透明度：水体主段成“体”，只有浅滩一圈稍透，仍可看到少量水下痕迹 ----
      float alpha = 0.82;
      alpha -= 0.16 * (1.0 - bandMid);
      alpha += 0.05 * bandDeep + 0.03 * bandBasin;
      alpha += 0.05 * fres + 0.05 * foam;
      alpha = clamp(alpha, 0.62, 0.95);

      gl_FragColor = vec4(col, alpha);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `

  // ACESFilmic(1.32) + sRGB 输出下，线性色会被整体提亮、去饱和；
  // 这里用比 palette 更深、略偏青蓝的线性色做预补偿，确保显示时仍是清晰的青绿分层。
  const uniforms = {
    uTime: { value: 0 },
    uShallow: { value: new THREE.Color('#4f948a') },
    uMid: { value: new THREE.Color('#357f79') },
    uDeep: { value: new THREE.Color('#296c73') },
    uBasin: { value: new THREE.Color('#1d5560') },
    uIvory: { value: new THREE.Color('#dbe9d9') },
    uFoam: { value: new THREE.Color('#cfe6d6') },
    uGold: { value: new THREE.Color('#e2d2a0') },
    uSky: { value: new THREE.Color('#a6d2cb') }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    name: 'posterized-teal-water-r2'
  })

  const group = new THREE.Group()
  group.name = 'water-surface'

  // 平面几何在 XY 平面，绕 X 轴 -90° 后平躺：局部 +y → 世界 -z。
  // 64x72 分段足够支撑 ≥1.4 单位波长的缓慢起伏，同时比首稿略降顶点数。
  const geometry = new THREE.PlaneGeometry(width, depth, 64, 72)
  const surface = mesh(group, geometry, material, [centerX, 0.15, centerZ], [-Math.PI / 2, 0, 0], false)
  surface.name = 'posterized-teal-water'
  surface.receiveShadow = true

  // 只更新时间 uniform；不逐帧创建几何/材质，也不做累计漂移。
  animate(group, (time) => {
    uniforms.uTime.value = time
  })

  return group
}
