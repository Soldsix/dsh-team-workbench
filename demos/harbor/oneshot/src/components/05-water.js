// 05-water.js — 太阳雨小渔港 · 首轮独立源码（第一稿，尚未经浏览器渲染验收）
// 职责归属：色块化青绿港湾水面与倒影。只允许修改本文件，不新增海床/陆地方块。
// 水面足迹 x[-1.7,6] z[-6,2.4]，基准 y=.15；透明 ShaderMaterial，可透视水下海床与小鱼。
// 顶点位移与全部色块/泡沫/闪光都在 GLSL 内解析生成，不创建逐帧几何或材质。
// 首稿只做静态自检：不运行命令、不安装依赖、不宣称已渲染。

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  // ---- 水面足迹：岸侧（-x / +z）各内收 0.08 塞进岸壁与堤面下方，避免接缝露光；
  // ---- 底座外缘（+x=6 / -z=-6）严格止于模型边界，不伸出侧壁剖面。
  const xMin = -1.7 - 0.08
  const xMax = 6.0
  const zMin = -6.0
  const zMax = 2.4 + 0.08
  const width = xMax - xMin
  const depth = zMax - zMin
  const centerX = (xMin + xMax) * 0.5
  const centerZ = (zMin + zMax) * 0.5

  // 同一解析波场被顶点与片元共用：抬高表面 + 求法线斜率，保证位移/高光一致。
  const vertexShader = /* glsl */`
    uniform float uTime;
    varying vec3 vWorld;
    varying vec2 vSurf;

    float waterSwell(vec2 q, float t) {
      float h = sin(q.y * 1.65 + t * 0.55) * 0.020;
      h += sin(q.x * 2.05 - t * 0.47 + 1.7) * 0.014;
      h += sin((q.x + q.y) * 1.25 + t * 0.83) * 0.010;
      h += sin((q.x - q.y * 1.4) * 2.6 - t * 1.15) * 0.005;
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
    uniform vec3 uDeep;
    uniform vec3 uMid;
    uniform vec3 uIvory;
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
      float h = sin(q.y * 1.65 + t * 0.55) * 0.020;
      h += sin(q.x * 2.05 - t * 0.47 + 1.7) * 0.014;
      h += sin((q.x + q.y) * 1.25 + t * 0.83) * 0.010;
      h += sin((q.x - q.y * 1.4) * 2.6 - t * 1.15) * 0.005;
      return h;
    }

    void main() {
      float t = uTime;
      vec2 q = vSurf;

      // 解析坡度 → 片元法线，用于天空反射的菲涅尔提亮。
      float e = 0.07;
      float gx = (waterSwell(q + vec2(e, 0.0), t) - waterSwell(q - vec2(e, 0.0), t)) / (2.0 * e);
      float gz = (waterSwell(q + vec2(0.0, e), t) - waterSwell(q - vec2(0.0, e), t)) / (2.0 * e);
      vec3 nrm = normalize(vec3(-gx * 2.2, 1.0, -gz * 2.2));

      // 缓慢漂移的域扭曲：让色块边沿像动画背景美术那样起伏、碎裂、重组。
      vec2 warp = vec2(
        sin(q.y * 0.84 + t * 0.30) + 0.55 * sin(q.y * 2.10 - q.x * 0.62 + t * 0.17),
        cos(q.x * 0.79 - t * 0.26) + 0.55 * sin(q.x * 1.72 + q.y * 0.70 + t * 0.21)
      );
      vec2 rq = q + warp * 0.22;

      // 多倍频噪声后硬量化 → 边缘利落的青绿/深蓝/象牙白色块（posterized）。
      float field = waterNoise(rq * 1.55 + vec2(3.1, 8.4)) * 0.58
                  + waterNoise(rq * 3.40 - vec2(6.2, 1.7)) * 0.30
                  + waterNoise(rq * 8.20 + vec2(11.0, 4.0)) * 0.12;
      float level = floor(field * 6.0 + 0.5);
      float deepW = 1.0 - step(1.5, level);
      float ivoryW = step(4.5, level);

      vec3 col = mix(uMid, uDeep, deepW * 0.85);
      col = mix(col, uIvory, ivoryW * 0.82);

      // 沿岸构筑物的倒影：沿 z 拉长的细长碎块，仅出现在临岸一圈。
      float shard = waterNoise(vec2(rq.x * 4.4 + 2.0, rq.y * 0.52 + t * 0.035));
      col = mix(col, uIvory, smoothstep(0.70, 0.79, shard) * 0.28);

      float dLeft = q.x + 1.7;
      float dFront = 2.4 - q.y;
      float shore = clamp((1.0 - smoothstep(0.05, 1.55, dLeft)) + 0.8 * (1.0 - smoothstep(0.05, 1.25, dFront)), 0.0, 1.0);
      float streak = waterNoise(vec2(dLeft * 6.5, q.y * 1.10 + t * 0.05));
      col = mix(col, uIvory, smoothstep(0.60, 0.71, streak) * shore * 0.40);

      // 漂移的泡沫细带：窄条 + 断续遮罩，不与消波块碎浪抢戏。
      float foamDrift = waterNoise(rq * vec2(2.6, 1.2) + vec2(t * 0.045, -t * 0.030));
      float foamBand = sin(q.y * 4.6 + foamDrift * 6.283 + q.x * 0.5 + t * 0.75);
      float foamMask = smoothstep(0.30, 0.70, waterNoise(rq * 2.2 + 5.0));
      float foam = smoothstep(0.94, 0.99, foamBand) * foamMask;
      col = mix(col, uIvory, foam * 0.72);

      // 克制的暖金太阳闪光：两档高频噪声阈值 + 缓慢漂移，读作粼光而非灯效。
      float fleck = waterNoise(rq * 24.0 + vec2(t * 0.55, -t * 0.35));
      float fine = waterNoise(rq * 41.0 - vec2(t * 0.40, t * 0.25));
      float glint = smoothstep(0.80, 0.93, fleck) * 0.11 + smoothstep(0.90, 0.97, fine) * 0.09;
      col += uGold * glint * 1.7;

      // 掠射角更高透更亮；底部保留低透明度让海床、锚链、海草透出。
      vec3 viewDir = normalize(cameraPosition - vWorld);
      float fres = pow(1.0 - clamp(dot(nrm, viewDir), 0.0, 1.0), 3.0);
      col = mix(col, uSky, fres * 0.30);

      float alpha = 0.50 + deepW * 0.18 + ivoryW * 0.06 + fres * 0.16 + foam * 0.12;
      alpha = clamp(alpha, 0.34, 0.86);

      gl_FragColor = vec4(col, alpha);

      #include <tonemapping_fragment>
      #include <colorspace_fragment>
    }
  `

  // THREE.Color 在色彩管理开启时存入线性空间，配合上面的色彩空间 chunk 与场景其余材质一致。
  const uniforms = {
    uTime: { value: 0 },
    uDeep: { value: new THREE.Color(p.deep) },
    uMid: { value: new THREE.Color(p.water) },
    uIvory: { value: new THREE.Color(p.foam) },
    uGold: { value: new THREE.Color(p.gold) },
    uSky: { value: new THREE.Color('#d8efec') }
  }

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide
  })

  const group = new THREE.Group()
  group.name = 'water-surface'

  // 平面几何在 XY 平面，绕 X 轴 -90° 后平躺：局部 +y → 世界 -z。
  const geometry = new THREE.PlaneGeometry(width, depth, 72, 80)
  const surface = mesh(group, geometry, material, [centerX, 0.15, centerZ], [-Math.PI / 2, 0, 0], false)
  surface.name = 'posterized-teal-water'
  surface.receiveShadow = true

  // 只更新时间 uniform；不逐帧创建几何/材质，也不做累计漂移。
  animate(group, (time) => {
    uniforms.uTime.value = time
  })

  return group
}
