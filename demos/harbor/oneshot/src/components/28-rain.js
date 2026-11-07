// 28-rain.js — 暖金细雨与滴水 (warm ivory-gold sunshower streaks + sparse pier-edge drips)
// Scope: only this module's own rain volume. No shared water, quay, lamp or ripple
// geometry is rebuilt here. Authored from source only: the author did not run a
// renderer, so this file claims no visual acceptance for the first pass.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'rain-warm-sunshower'

  // Fixed rain volume from the assignment: x,z in [-6,6] and streak heads wrapping
  // inside y[.9,6]. Wrap is a pure function of time, never accumulated per frame.
  const MIN_Y = 0.9
  const MAX_Y = 6.0
  const FALL = MAX_Y - MIN_Y
  const SPAN = 12
  const wrap = (value, size) => ((value % size) + size) % size

  // Depth bands of thin 1px rain streaks. Each band is ONE LineSegments object with a
  // single shared position buffer; the buffer is rewritten in place every frame, so no
  // geometry or material is ever created inside the animation callback.
  const makeStreakBand = (options) => {
    const { count, color, opacity, length, speed, wind, name } = options
    const positions = new Float32Array(count * 6)
    const base = new Float32Array(count * 6) // x0, y0, z0, length, speed, tilt
    for (let i = 0; i < count; i += 1) {
      const offset = i * 6
      base[offset] = rand() * SPAN - 6
      base[offset + 1] = MIN_Y + rand() * FALL
      base[offset + 2] = rand() * SPAN - 6
      base[offset + 3] = length[0] + rand() * (length[1] - length[0])
      base[offset + 4] = speed[0] + rand() * (speed[1] - speed[0])
      base[offset + 5] = 0.13 + rand() * 0.2 // gentle slant toward +x / +z
    }
    const geometry = new THREE.BufferGeometry()
    const attribute = new THREE.BufferAttribute(positions, 3)
    attribute.setUsage(THREE.DynamicDrawUsage)
    geometry.setAttribute('position', attribute)
    const material = new THREE.LineBasicMaterial({
      color, transparent: true, opacity, depthWrite: false
    })
    const band = new THREE.LineSegments(geometry, material)
    band.name = name
    band.frustumCulled = false
    group.add(band)
    return { attribute, base, count, wind, material, baseOpacity: opacity }
  }

  // 760 + 1040 + 300 = 2100 segments, under the 2200 limit; near bands are brighter
  // and shorter, the far veil is longer, paler and slower for airy depth.
  const bands = [
    makeStreakBand({ count: 760, color: '#f3e1a4', opacity: 0.62, length: [0.20, 0.42], speed: [4.6, 7.0], wind: 0.42, name: 'sunshower-near' }),
    makeStreakBand({ count: 1040, color: '#f5edd2', opacity: 0.28, length: [0.12, 0.30], speed: [3.4, 5.4], wind: 0.28, name: 'sunshower-far' }),
    makeStreakBand({ count: 300, color: '#f7edc6', opacity: 0.13, length: [0.45, 0.85], speed: [2.4, 3.8], wind: 0.20, name: 'sunshower-veil' })
  ]

  // A few slow droplets hanging under real quay-edge points, then falling toward the
  // water. They belong to this module's own rain, not to the seawall or ripple tiles.
  const dripGeometry = new THREE.SphereGeometry(0.015, 6, 4)
  const dripMaterial = mat('#f7f2dd', { transparent: true, opacity: 0.92 })
  const edgePoints = [
    [-1.62, -5.05], [-1.62, -2.55], [-1.62, -0.35], [-1.62, 1.35],
    [0.85, 2.34], [2.75, 2.34], [4.35, 2.34]
  ]
  const drips = edgePoints.map((point, index) => {
    const node = mesh(group, dripGeometry, dripMaterial, [point[0], 0.78, point[1]], [0, 0, 0], false)
    node.name = 'pier-edge-drip-' + index
    return { node, x: point[0], z: point[1], period: 2.1 + rand() * 1.7, phase: rand() }
  })

  // Single registration for the whole rain group. Every value is a pure function of
  // time against stored base data, so streaks wrap without drift and the first frame
  // is already correct because update(0) runs once before registration.
  const update = (time) => {
    // Slow air gust: the same gentle breathing changes streak opacity and slant light.
    const gust = 0.5 + 0.5 * Math.sin(time * 0.35)

    for (const band of bands) {
      const { attribute, base, count, wind, material, baseOpacity } = band
      const positions = attribute.array
      for (let i = 0; i < count; i += 1) {
        const offset = i * 6
        const headY = MIN_Y + wrap(base[offset + 1] - base[offset + 4] * time - MIN_Y, FALL)
        const headX = -6 + wrap(base[offset] + wind * time + 6, SPAN)
        const headZ = base[offset + 2]
        const length = base[offset + 3]
        const tilt = base[offset + 5]
        positions[offset] = headX
        positions[offset + 1] = headY
        positions[offset + 2] = headZ
        positions[offset + 3] = headX + tilt * length
        positions[offset + 4] = Math.min(headY + length, MAX_Y)
        positions[offset + 5] = headZ + tilt * length * 0.35
      }
      attribute.needsUpdate = true
      material.opacity = baseOpacity * (0.88 + 0.24 * gust)
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
