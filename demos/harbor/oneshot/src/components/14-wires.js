// 14-wires: thin overhead cables between the two quay lamp heads and a rear
// utility pole, plus pale painterly puddle / wet-ground reflections on the
// front concrete apron (top y = .8, patches sit from y = .812 upward).
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '14-wires'

  // Own deterministic noise so the shared rand() stream stays untouched.
  let noiseState = 0x14c0ffee
  const noise = () => {
    noiseState = (noiseState * 1664525 + 1013904223) >>> 0
    return noiseState / 4294967296
  }

  const wireColor = '#4a6a6c'
  const ceramicColor = '#e7ecdf'
  const poleColor = '#a49d8b'

  // ---- overhead cables -------------------------------------------------
  // Parabolic sag sampled once between two fixed anchors: thin, finite tubes.
  const span = (a, b, sag, radius, bowX = 0, bowZ = 0, steps = 16) => {
    const path = []
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      path.push([
        a[0] + (b[0] - a[0]) * t + bowX * Math.sin(Math.PI * t),
        a[1] + (b[1] - a[1]) * t - sag * 4 * t * (1 - t),
        a[2] + (b[2] - a[2]) * t + bowZ * Math.sin(Math.PI * t)
      ])
    }
    return curve(group, path, wireColor, radius)
  }

  // Pale ceramic insulator wrapped by its own fine tie wire.
  const insulator = (at, scale = 1) => {
    const [x, y, z] = at
    cylinder(group, .036 * scale, .05 * scale, .072 * scale, [x, y, z], ceramicColor, 8)
    sphere(group, .025 * scale, [x, y + .05 * scale, z], ceramicColor, 8)
    curve(group, [
      [x - .055, y - .012, z + .012],
      [x - .042, y + .062 * scale, z],
      [x + .042, y + .062 * scale, z],
      [x + .055, y - .012, z - .012]
    ], wireColor, .0065)
    return [x, y + .062 * scale, z]
  }

  // Slim strain clamp sitting just under a lamp head, with one delicate tie.
  const clampAt = (x, y, z) => {
    cylinder(group, .026, .032, .055, [x, y, z], wireColor, 8)
    mesh(group, new THREE.TorusGeometry(.045, .007, 5, 14), p.dark, [x, y + .018, z], [Math.PI / 2, 0, 0], false)
    return [x, y, z]
  }

  // Lamp head tops are fixed by the lamp module; cables clamp right beneath them.
  const lampA = [-3.0, 3.5, 4.8]
  const lampB = [-3.2, 3.2, -2.0]
  const clampsA = [
    clampAt(lampA[0] - .075, lampA[1] - .075, lampA[2] + .05),
    clampAt(lampA[0], lampA[1] - .045, lampA[2]),
    clampAt(lampA[0] + .075, lampA[1] - .075, lampA[2] - .05)
  ]
  const clampsB = [
    clampAt(lampB[0] - .075, lampB[1] - .075, lampB[2] - .05),
    clampAt(lampB[0], lampB[1] - .045, lampB[2]),
    clampAt(lampB[0] + .075, lampB[1] - .075, lampB[2] + .05)
  ]

  // Main diagonal span across the sky: three slightly staggered strands.
  const mainSag = [.34, .48, .27]
  const mainBowX = [.1, -.06, .15]
  const mainBowZ = [.05, -.07, .03]
  for (let i = 0; i < 3; i++) span(clampsA[i], clampsB[i], mainSag[i], .0115, mainBowX[i], mainBowZ[i])

  // ---- rear utility pole: third anchor of the wire run ------------------
  const pole = [-5.15, .8, -4.05]
  const poleTop = 4.42
  const poleHeight = poleTop - pole[1]
  cylinder(group, .07, .105, poleHeight, [pole[0], pole[1] + poleHeight / 2, pole[2]], poleColor, 9)
  cylinder(group, .026, .072, .09, [pole[0], poleTop + .045, pole[2]], poleColor, 9)
  cylinder(group, .2, .215, .14, [pole[0], pole[1] + .07, pole[2]], p.concreteDark, 12)
  cylinder(group, .086, .089, .03, [pole[0], 3.62, pole[2]], p.metal, 10)
  cylinder(group, .097, .1, .028, [pole[0], 2.62, pole[2]], p.metal, 10)

  const armY = 4.18
  const toLampX = clampsB[1][0] - pole[0]
  const toLampZ = clampsB[1][2] - pole[2]
  const flatLen = Math.hypot(toLampX, toLampZ)
  const perpX = -toLampZ / flatLen
  const perpZ = toLampX / flatLen
  // Box local +x maps to (cos yaw, -sin yaw); align it with (perpX, perpZ).
  const armYaw = Math.atan2(-perpZ, perpX)
  box(group, [1.34, .075, .095], [pole[0], armY, pole[2]], poleColor, [0, armYaw, 0])
  beam(group, [pole[0], armY - .46, pole[2]], [pole[0] + perpX * .42, armY - .05, pole[2] + perpZ * .42], .045, poleColor)
  beam(group, [pole[0], armY - .46, pole[2]], [pole[0] - perpX * .42, armY - .05, pole[2] - perpZ * .42], .045, poleColor)

  const armAttach = [.5, 0, -.5].map(k =>
    insulator([pole[0] + perpX * k, armY + .045, pole[2] + perpZ * k], 1))

  span(clampsB[0], armAttach[0], .17, .0105, .05, .04)
  span(clampsB[1], armAttach[1], .22, .0115, -.05, .03)
  span(clampsB[2], armAttach[2], .15, .0105, .04, -.03)

  // Service drop hugging the pole into a small junction box, then a slack loop.
  const boxAt = [pole[0] + .115, 2.06, pole[2] + .075]
  box(group, [.2, .27, .13], boxAt, p.metal, [0, -.34, 0])
  curve(group, [
    [pole[0] + .02, 4.1, pole[2] + .02],
    [pole[0] + .05, 3.58, pole[2] + .05],
    [pole[0] + .06, 2.95, pole[2] + .07],
    [pole[0] + .09, 2.34, pole[2] + .08],
    [boxAt[0], 2.16, boxAt[2]]
  ], wireColor, .0125)
  curve(group, [
    [boxAt[0], 1.94, boxAt[2]],
    [pole[0] + .33, 1.63, pole[2] + .19],
    [pole[0] + .2, 1.16, pole[2] + .08],
    [pole[0] + .09, 1.33, pole[2] + .05],
    [pole[0] + .085, 1.74, pole[2] + .04]
  ], wireColor, .011)
  mesh(group, new THREE.TorusGeometry(.082, .0085, 5, 16), p.dark, [pole[0], 4.12, pole[2]], [Math.PI / 2, 0, 0], false)

  // Two small cable ties left dangling under the crossarm, gently swinging.
  const danglers = []
  const addDangler = (x, y, z, length, phase) => {
    const pivot = new THREE.Group()
    pivot.position.set(x, y, z)
    group.add(pivot)
    box(pivot, [.013, length, .013], [0, -length / 2, 0], p.dark, [0, 0, 0], false)
    box(pivot, [.018, .028, .018], [.01, -length - .008, 0], ceramicColor, [0, 0, 0], false)
    danglers.push({ pivot, phase })
  }
  addDangler(armAttach[0][0] + .17, armY - .02, armAttach[0][2] - .1, .19, .4)
  addDangler(armAttach[2][0] - .13, armY - .02, armAttach[2][2] + .09, .15, 2.1)

  // ---- painterly wet-ground reflections on the front apron --------------
  const flat = (geometry, material, x, z, y = .812, yaw = 0) =>
    mesh(group, geometry, material, [x, y, z], [-Math.PI / 2, 0, yaw], false)
  const sheen = (color, opacity) => new THREE.MeshBasicMaterial({
    color, transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide
  })

  // Irregular soft-edged blob, sampled once into a flat shape.
  const blob = (radius, squash, seed, wobble = .16, steps = 24) => {
    const pts = []
    for (let i = 0; i < steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const w = 1 + Math.sin(a * 3 + seed) * wobble +
        Math.sin(a * 5 - seed * 1.7) * wobble * .5 +
        Math.cos(a * 2 + seed * 2.3) * wobble * .45
      pts.push(new THREE.Vector2(Math.cos(a) * radius * w, Math.sin(a) * radius * w * squash))
    }
    return new THREE.ShapeGeometry(new THREE.Shape(pts))
  }

  // Long hull-like patch used as a flat painted reflection of the moored boats.
  const hullPatch = (width, height) => {
    const s = new THREE.Shape()
    s.moveTo(-width * .5, -height * .15)
    s.quadraticCurveTo(-width * .3, -height * .52, width * .04, -height * .5)
    s.quadraticCurveTo(width * .4, -height * .47, width * .5, -height * .1)
    s.quadraticCurveTo(width * .34, height * .3, -width * .04, height * .32)
    s.quadraticCurveTo(-width * .4, height * .28, -width * .5, -height * .15)
    return new THREE.ShapeGeometry(s)
  }

  // Broad damp sheen on the concrete (kept very faint, no mirror boxes).
  flat(blob(1.9, .55, 8.2, .26), sheen('#dfeae2', .12), 1.9, 4.2, .8115, .3)
  flat(blob(1.4, .5, 1.1, .3), sheen('#cfe0d8', .1), -1.1, 5.05, .8115, -.4)

  const puddles = [
    { x: 1.42, z: 3.06, r: .95, squash: .4, yaw: .1, seed: 1.7, hull: true },
    { x: 3.66, z: 3.02, r: .58, squash: .38, yaw: -.24, seed: 4.3, hull: true },
    { x: -2.5, z: 4.55, r: .7, squash: .54, yaw: .36, seed: 2.6, lamp: true },
    { x: .28, z: 5.14, r: .38, squash: .56, yaw: -.48, seed: 5.1 },
    { x: 2.4, z: 4.46, r: .3, squash: .6, yaw: .78, seed: 3.4, lamp: true }
  ]
  const shimmer = []

  puddles.forEach(q => {
    flat(blob(q.r * 1.22, q.squash * 1.05, q.seed, .2), sheen('#e9f2e6', .16), q.x, q.z, .812, q.yaw)
    flat(blob(q.r, q.squash, q.seed + .9, .18), sheen('#d9eae2', .3), q.x, q.z, .812, q.yaw)
    flat(blob(q.r * .74, q.squash * .82, q.seed + 2.2, .22), sheen('#eef6ee', .22), q.x, q.z, .8135, q.yaw)

    if (q.hull) {
      // White boat bodies, broken waterline glints and a mast trace.
      flat(hullPatch(q.r * 1.05, q.r * .5), sheen('#f1f3e4', .42), q.x + .1, q.z - q.r * .06, .815, q.yaw + .12)
      flat(hullPatch(q.r * .82, q.r * .4), sheen('#e2efe6', .36), q.x - .22, q.z + q.r * .16, .8165, q.yaw - .2)
      for (let k = 0; k < 3; k++) {
        const m = sheen('#f6faf0', .34 - k * .06)
        mesh(group, new THREE.PlaneGeometry(q.r * (.45 + k * .18), .026), m,
          [q.x - q.r * .35 + k * q.r * .28, .818 + k * .0015, q.z + q.r * (.1 - k * .05)],
          [-Math.PI / 2, 0, q.yaw + k * .06], false)
        shimmer.push({ material: m, base: m.opacity, phase: noise() * 6.283, speed: .7 + noise() * .8 })
      }
      line(group, [
        [q.x - q.r * .5, .819, q.z + .04],
        [q.x - q.r * .34, .819, q.z - .28],
        [q.x - q.r * .08, .819, q.z - .32]
      ], '#7fa9a4', .26)
    }

    if (q.lamp) {
      // Warm lamp glow stretched over the wet ground.
      const glow = sheen('#f0e3b6', .26)
      mesh(group, new THREE.PlaneGeometry(q.r * .24, q.r * 1.2), glow,
        [q.x + q.r * .08, .815, q.z - q.r * .1], [-Math.PI / 2, 0, q.yaw], false)
      const core = sheen('#faf3d8', .34)
      mesh(group, new THREE.PlaneGeometry(q.r * .1, q.r * .72), core,
        [q.x + q.r * .04, .8165, q.z - q.r * .05], [-Math.PI / 2, 0, q.yaw], false)
      shimmer.push({ material: glow, base: glow.opacity, phase: noise() * 6.283, speed: .5 + noise() * .5 })
      shimmer.push({ material: core, base: core.opacity, phase: noise() * 6.283, speed: .6 + noise() * .6 })
    }
  })

  // Subtle breathing of the painted highlights; absolute values only, no drift.
  animate(group, time => {
    for (const s of shimmer) {
      s.material.opacity = s.base * (.62 + .38 * Math.sin(time * s.speed + s.phase))
    }
    for (const d of danglers) {
      d.pivot.rotation.z = Math.sin(time * 1.5 + d.phase) * .16
    }
  })

  return group
}
