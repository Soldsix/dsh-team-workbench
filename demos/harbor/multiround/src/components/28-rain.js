// 28-rain.js — 暖金细雨与滴水 (round 4: same fine drizzle + a timed rain easing)
// Round-4 revision (task-62) keeps the round-3 drizzle that the round-3 screenshots
// validated: fine, short, sparse pale-gold dashes (1040 strands, longest 0.155), five
// slow pier-edge drips, density biased away from the boats and the quay. It adds one
// thing only: a short rain easing window phase-locked to the faint rainbow that
// 31-sun-clouds.js shows. That module drives the rainbow from the same shared clock:
//   local = (t + 12) % 100
//   fade in local 0 - 2.2 s, full local 2.2 - 5.8 s, fade out local 5.8 - 9.2 s
//   (smoothstep of presence, band alpha = presence * 0.92)
// so the rainbow begins to appear at t = 88 s of every 100 s cycle. This module puts
// a smooth bell on the rain around local 0.8 s (half width 3.8 s): the drizzle eases
// from t = 85.0 s, is weakest (~0.65 of its normal opacity) while the rainbow is
// being born, and is fully back by t = 92.6 s, i.e. before the rainbow's fade-out.
// The easing moves opacity only: point count, strand length, fall speed and ground
// coverage are untouched, so no strand disappears and no long bar can appear. Drips
// keep their own independent cycle.
// Rain tails are clamped to x,z ±6 so the airborne field stays inside the base
// footprint; the volume itself remains above the ground (y 0.15-6), which is sky
// rain, not new ground geometry on the base edge.
// Scope stays only this module's own rain volume; no shared water, quay, lamp or
// ripple geometry is rebuilt and nothing outside this file is touched. No renderer was
// run for this revision, so no visual acceptance is claimed here.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'rain-warm-sunshower'

  const MIN_Y = 0.9
  const MAX_Y = 6.0
  const FALL = MAX_Y - MIN_Y
  const SPAN = 12
  const wrap = (value, size) => ((value % size) + size) % size

  // ---------- rain easing, phase-locked to 31-sun-clouds' faint rainbow ----------
  // 31-sun-clouds.js (lines 156-168) reads the rainbow from the shared clock with
  // local = (t + 12) % 100 and shows it while local < 9.2 s. We reuse exactly that
  // period and offset, so the two modules agree without touching each other.
  const RAINBOW_PERIOD = 100
  const RAINBOW_OFFSET = 12
  const RELAX_CENTER = 0.8 // local seconds: just inside the rainbow's fade-in
  const RELAX_HALF = 3.8 // +-3.8 s window -> rain eases t = 85.0 .. 92.6 s per cycle
  const RELAX_DEPTH = 0.35 // weakest = 0.65 of normal opacity; never zero, never a stop

  // Smooth bell on cyclic distance: 1 outside the window, 0.65 at its centre.
  // Pure function of time; no state, no arrays, no allocation.
  const rainRelax = (time) => {
    const local = wrap(time + RAINBOW_OFFSET, RAINBOW_PERIOD)
    const delta = local - RELAX_CENTER
    const distance = Math.min(Math.abs(delta), RAINBOW_PERIOD - Math.abs(delta))
    if (distance >= RELAX_HALF) return 1
    const u = distance / RELAX_HALF
    const bell = 1 - u * u
    const smooth = bell * bell * (3 - 2 * bell)
    return 1 - RELAX_DEPTH * smooth
  }

  // One LineSegments band per depth layer. Positions and per-vertex glint brightness
  // live in two Float32Arrays that are overwritten in place every frame; no geometry,
  // material, vector or array is ever created inside the animation callback.
  const makeStreakBand = (options) => {
    const { count, color, opacity, length, speed, wind, twinkle, name } = options
    const positions = new Float32Array(count * 6)
    const glints = new Float32Array(count * 6)
    const base = new Float32Array(count * 7) // x0, y0, z0, length, speed, tilt, phase
    for (let i = 0; i < count; i += 1) {
      const offset = i * 7
      base[offset] = rand() * SPAN - 6
      // Mild upward bias: fewer dashes right over the boats and the quay deck, so
      // extra readability lands in the sky instead of on the cabins.
      base[offset + 1] = MIN_Y + FALL * Math.pow(rand(), 0.66)
      base[offset + 2] = rand() * SPAN - 6
      base[offset + 3] = length[0] + rand() * (length[1] - length[0])
      base[offset + 4] = speed[0] + rand() * (speed[1] - speed[0])
      base[offset + 5] = 0.26 + rand() * 0.24 // pronounced slant on very short dashes
      base[offset + 6] = rand() * Math.PI * 2 // independent glint phase per streak
    }
    const geometry = new THREE.BufferGeometry()
    const positionAttribute = new THREE.BufferAttribute(positions, 3)
    positionAttribute.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', positionAttribute)
    const glintAttribute = new THREE.BufferAttribute(glints, 3)
    glintAttribute.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('color', glintAttribute)
    const material = new THREE.LineBasicMaterial({
      color, transparent: true, opacity, depthWrite: false, vertexColors: true
    })
    const band = new THREE.LineSegments(geometry, material)
    band.name = name
    band.frustumCulled = false
    group.add(band)
    return { positionAttribute, glintAttribute, base, count, wind, twinkle, material, baseOpacity: opacity }
  }

  // 450 + 590 = 1040 strands (round 2: 940, round 1: 2100). Near layer: a touch
  // brighter and a little longer than round 2 so the main view reads as sunshower;
  // far layer: the wide-shot sky accent, raised the most but still short and thin.
  const bands = [
    makeStreakBand({ count: 450, color: '#f3e1a8', opacity: 0.44, length: [0.075, 0.155], speed: [4.2, 6.4], wind: 0.30, twinkle: 2.2, name: 'sunshower-near' }),
    makeStreakBand({ count: 590, color: '#f2ead6', opacity: 0.27, length: [0.05, 0.115], speed: [3.0, 4.8], wind: 0.22, twinkle: 1.5, name: 'sunshower-far' })
  ]

  // A few slow droplets hanging under real quay-edge points, then falling toward the
  // water. Shared geometry and one cached material: five small meshes, no drip tubes.
  const dripGeometry = new THREE.SphereGeometry(0.013, 6, 4)
  const dripMaterial = mat('#f6f1de', { transparent: true, opacity: 0.85 })
  const edgePoints = [
    [-1.62, -5.05], [-1.62, -1.6], [-1.62, 1.35],
    [1.55, 2.34], [4.0, 2.34]
  ]
  const drips = edgePoints.map((point, index) => {
    const node = mesh(group, dripGeometry, dripMaterial, [point[0], 0.78, point[1]], [0, 0, 0], false)
    node.name = 'pier-edge-drip-' + index
    return { node, x: point[0], z: point[1], period: 2.1 + rand() * 1.7, phase: rand() }
  })

  // Single registration for the whole rain group. Every value is a pure function of
  // time against stored base data, so streaks wrap without drift and the first frame is
  // already correct because update(0) runs once before registration.
  const update = (time) => {
    // One easing factor for the whole drizzle; drips below keep their own cycle.
    const relax = rainRelax(time)
    for (const band of bands) {
      const { positionAttribute, glintAttribute, base, count, wind, twinkle, material, baseOpacity } = band
      const positions = positionAttribute.array
      const glints = glintAttribute.array
      for (let i = 0; i < count; i += 1) {
        const offset = i * 7
        const vert = i * 6
        const headY = MIN_Y + wrap(base[offset + 1] - base[offset + 4] * time - MIN_Y, FALL)
        const headX = -6 + wrap(base[offset] + wind * time + 6, SPAN)
        const headZ = base[offset + 2]
        const length = base[offset + 3]
        const tilt = base[offset + 5]
        // Per-streak glint: the dash brightens and dims like a raindrop catching sun.
        // Floor 0.58 keeps the fine dashes readable instead of blinking out entirely.
        const glow = 0.58 + 0.21 * (1 + Math.sin(time * twinkle + base[offset + 6]))
        positions[vert] = headX
        positions[vert + 1] = headY
        positions[vert + 2] = headZ
        positions[vert + 3] = Math.min(Math.max(headX + tilt * length, -6), 6)
        positions[vert + 4] = Math.min(headY + length, MAX_Y)
        positions[vert + 5] = Math.min(Math.max(headZ + tilt * length * 0.35, -6), 6)
        glints[vert] = glow
        glints[vert + 1] = glow
        glints[vert + 2] = glow
        glints[vert + 3] = glow
        glints[vert + 4] = glow
        glints[vert + 5] = glow
      }
      positionAttribute.needsUpdate = true
      glintAttribute.needsUpdate = true
      // Rain easing only moves this band's alpha; strand length and count stay fixed.
      material.opacity = baseOpacity * relax
    }

    for (const drip of drips) {
      const cycle = wrap(time / drip.period + drip.phase, 1)
      let y
      let scale
      if (cycle < 0.55) {
        // Hang on the damp edge while the bead gathers.
        const hang = cycle / 0.55
        y = 0.78 - 0.014 * hang
        scale = 0.55 + 0.45 * hang
      } else {
        // Then fall gently and thin out just above the water line.
        const fall = (cycle - 0.55) / 0.45
        y = 0.766 - 0.6 * Math.pow(fall, 1.35)
        scale = 1 - 0.32 * fall
      }
      drip.node.position.set(drip.x, y, drip.z)
      drip.node.scale.set(scale * 0.85, scale * 1.5, scale * 0.85)
    }
  }

  update(0)
  animate(group, update)

  return group
}
