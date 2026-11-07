// 06-tetrapods — off-white concrete tetrapod breakwater blocks with a pale foam wash.
// Deliberately low and concrete-only: the red-and-white lighthouse belongs to another module.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '06-tetrapods'

  const WATER_Y = 0.15
  const FOAM_Y = WATER_Y + 0.012
  const LANE_Y = WATER_Y + 0.008
  const UP = new THREE.Vector3(0, 1, 0)

  // Tetrahedral arm directions of a classic tetrapod wave-breaker.
  const ARM_DIRS = [
    [1, 1, 1], [1, -1, -1], [-1, 1, -1], [-1, -1, 1]
  ].map(d => new THREE.Vector3(d[0], d[1], d[2]).normalize())

  const ARM_LEN = 0.60
  const ARM_BASE_R = 0.165
  const ARM_TIP_R = 0.082
  const CONCRETE = p.concreteLight
  const SEAM = p.concrete
  const taperRadius = t => ARM_BASE_R + (ARM_TIP_R - ARM_BASE_R) * t

  // One unit: a rounded core plus four tapered arms, each capped by a small sphere
  // and banded with two shallow mould seams. The pod is its own group so a block
  // can settle at a random angle between the others like dumped armour units.
  const tetrapod = (x, y, z, scale, spin, tiltX, tiltZ) => {
    const pod = new THREE.Group()
    pod.position.set(x, y, z)
    pod.rotation.set(tiltX, spin, tiltZ)
    pod.scale.setScalar(scale)
    group.add(pod)

    sphere(pod, ARM_BASE_R * 1.02, [0, 0, 0], CONCRETE, 10)

    for (const dir of ARM_DIRS) {
      const arm = new THREE.Group()
      arm.quaternion.setFromUnitVectors(UP, dir)
      pod.add(arm)

      // 12 radial segments keeps every side facet under the outline threshold,
      // so each arm reads as a clean tapered cone with a rounded tip.
      mesh(arm, new THREE.CylinderGeometry(ARM_TIP_R, ARM_BASE_R, ARM_LEN, 12, 1),
        CONCRETE, [0, ARM_LEN * 0.5, 0])
      sphere(arm, ARM_TIP_R, [0, ARM_LEN, 0], CONCRETE, 8)

      const rootR = taperRadius(0.14) + 0.006
      cylinder(arm, rootR, rootR, 0.016, [0, ARM_LEN * 0.14, 0], SEAM, 12)
      const midR = taperRadius(0.52) + 0.005
      cylinder(arm, midR, midR, 0.012, [0, ARM_LEN * 0.52, 0], SEAM, 12)
    }

    return pod
  }

  // Six units cluster in the far-right water corner; the extreme corner stays open
  // for the lighthouse breakwater. Two more sit half-sunk at the front-right edge.
  const PODS = [
    [4.60, 0.10, -4.46, 0.78, 0.35, 0.16, 0.10],
    [5.00, 0.07, -4.58, 0.84, 1.18, -0.12, 0.20],
    [5.42, 0.12, -4.44, 0.72, 2.02, 0.20, -0.14],
    [4.80, 0.04, -4.98, 0.80, 2.72, -0.18, 0.16],
    [5.22, 0.13, -5.10, 0.74, 3.44, 0.14, -0.20],
    [5.52, 0.06, -4.94, 0.70, 4.30, 0.22, 0.18],
    [4.55, 0.09, 1.86, 0.76, 5.06, -0.16, 0.12],
    [5.25, 0.13, 1.58, 0.70, 5.86, 0.20, -0.16]
  ]
  for (const [x, y, z, scale, spin, tiltX, tiltZ] of PODS) tetrapod(x, y, z, scale, spin, tiltX, tiltZ)

  // Pale foam blobs straddle the waterline around each block, and thin foam lanes
  // drift in the gaps between them. All of it lives in one animated group.
  const foam = new THREE.Group()
  foam.name = '06-tetrapod-foam'
  group.add(foam)
  const foamBits = []

  const fleck = (x, z, radius) => {
    const blob = sphere(foam, radius, [x, FOAM_Y, z], p.foam, 8)
    const flatten = 0.26 + rand() * 0.10
    blob.rotation.y = rand() * Math.PI
    blob.scale.set(1, flatten, 0.88)
    blob.castShadow = false
    foamBits.push({
      object: blob, kind: 'fleck', baseY: FOAM_Y, baseX: x,
      phase: rand() * Math.PI * 2, amp: 0.006 + rand() * 0.008, flatten
    })
    return blob
  }

  const lane = (x, z, width, length, angle) => {
    const streak = box(foam, [width, 0.008, length], [x, LANE_Y, z], p.foam, [0, angle, 0], false)
    streak.castShadow = false
    foamBits.push({
      object: streak, kind: 'lane', baseY: LANE_Y, baseX: x,
      phase: rand() * Math.PI * 2, amp: 0.004 + rand() * 0.004, flatten: 1
    })
    return streak
  }

  // Three flecks hug every block; the water-edge side is clamped short of the quay.
  for (const pod of PODS) {
    for (let i = 0; i < 3; i += 1) {
      const angle = (i / 3) * Math.PI * 2 + rand() * 1.1
      const distance = 0.30 + rand() * 0.13
      fleck(pod[0] + Math.cos(angle) * distance,
        Math.min(2.30, pod[2] + Math.sin(angle) * distance),
        0.030 + rand() * 0.045)
    }
  }

  const GAP_FLECKS = [
    [4.74, -4.72, 0.070], [5.10, -4.86, 0.050], [5.40, -4.66, 0.045],
    [4.92, -4.36, 0.050], [5.34, -4.52, 0.040], [4.60, -5.16, 0.055],
    [4.86, 1.80, 0.060], [5.42, 1.74, 0.045], [5.02, 1.50, 0.045],
    [4.40, 1.70, 0.040]
  ]
  for (const [x, z, radius] of GAP_FLECKS) fleck(x, z, radius)

  const LANES = [
    [4.88, -4.58, 0.075, 0.46, 0.34],
    [5.16, -4.94, 0.065, 0.50, -0.28],
    [4.98, 1.88, 0.070, 0.40, 0.22],
    [5.36, 1.44, 0.052, 0.28, -0.36]
  ]
  for (const [x, z, width, length, angle] of LANES) lane(x, z, width, length, angle)

  // Slow small swell: foam breathes around the blocks while the lanes drift a few
  // centimetres. No geometry or material is created inside the loop.
  animate(foam, time => {
    for (const bit of foamBits) {
      const swell = Math.sin(time * 0.55 + bit.phase)
      bit.object.position.y = bit.baseY + swell * bit.amp
      if (bit.kind === 'fleck') {
        const breathe = 1 + Math.sin(time * 0.42 + bit.phase * 1.7) * 0.10
        bit.object.scale.set(breathe, bit.flatten, breathe * 0.88)
      } else {
        bit.object.position.x = bit.baseX + Math.sin(time * 0.30 + bit.phase) * 0.03
        bit.object.scale.x = 1 + swell * 0.10
      }
    }
  })

  return group
}
