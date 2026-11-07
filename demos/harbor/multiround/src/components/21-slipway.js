export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'slipway'

  // Reject note (run-1): the water-entry chute broke two hard constraints of the brief:
  // the given footprint z>=2.6 and "do not cover the boarding steps" (04-stairs platform
  // x[4.86,5.66] z[1.5,2.41], stair band x[3.6,4.76]).
  // Fix: no water-entry geometry at all. Every vertex stays inside x[4.78,5.74] and
  // z[2.67,5.87]; the apron itself carries the descent toward the water (y=.8 at z=2.68
  // rising to y=.927 at z=5.86, padSlope .04) and its front edge is flush with the quay top.
  const padX = 5.26
  const padW = 0.96
  const padZFront = 2.68
  const padZBack = 5.86
  const padSlope = 0.04
  const padY = (z) => 0.8 + (z - padZFront) * padSlope
  const padAngle = -Math.atan(padSlope)

  const wetConcrete = mat('#b4c5c0')
  const curbConcrete = mat('#cfd9d2')
  const seamTone = mat('#7e9893')
  const sheen = mat('#8fb3ad', { transparent: true, opacity: 0.3, depthWrite: false })
  const rustWash = mat('#b08a6a', { transparent: true, opacity: 0.4, depthWrite: false })
  const timber = mat('#b3a284')
  const timberLight = mat('#c4b595')
  const timberDark = mat('#93836a')

  // ---- wet concrete apron descending toward the water ----
  const padMidZ = (padZFront + padZBack) / 2
  box(group, [padW, 0.1, padZBack - padZFront], [padX, padY(padMidZ) - 0.05, padMidZ], wetConcrete, [padAngle, 0, 0])

  for (const x of [5.1, 5.26, 5.42]) {
    box(group, [0.15, 0.004, 2.8], [x, padY(4.3) + 0.004, 4.3], sheen, [padAngle, 0, 0], false)
  }

  for (const z of [3.05, 3.55, 4.05, 4.55, 5.05, 5.55]) {
    box(group, [0.74, 0.006, 0.016], [padX, padY(z) + 0.004, z], seamTone, [padAngle, 0, 0])
  }

  // damp band where the apron meets the quay surface
  box(group, [0.86, 0.005, 0.06], [padX, padY(2.7) + 0.004, 2.7], seamTone, [padAngle, 0, 0], false)

  // cheek curbs and head sill: all inland of z=3.0, so nothing shades the boarding steps
  for (const x of [padX - padW / 2 + 0.05, padX + padW / 2 - 0.05]) {
    beam(group, [x, padY(5.8) + 0.05, 5.8], [x, padY(3.05) + 0.05, 3.05], 0.1, curbConcrete)
  }
  beam(group, [padX - padW / 2 + 0.01, padY(5.82) + 0.05, 5.82], [padX + padW / 2 - 0.01, padY(5.82) + 0.05, 5.82], 0.09, curbConcrete)

  const railXs = [padX - 0.33, padX + 0.33]
  for (const x of railXs) {
    beam(group, [x, padY(5.8) + 0.03, 5.8], [x, padY(3.05) + 0.026, 3.05], 0.045, p.metal)
    for (const z of [3.2, 4.2, 5.2]) {
      box(group, [0.1, 0.026, 0.09], [x, padY(z) + 0.01, z], p.metal, [padAngle, 0, 0])
      box(group, [0.16, 0.004, 0.15], [x, padY(z) + 0.005, z + 0.02], rustWash, [padAngle, 0, 0], false)
    }
  }

  // ---- overturned timber dinghy, half hauled up the ramp ----
  const boat = new THREE.Group()
  boat.name = 'overturned-dinghy'
  boat.position.set(5.26, padY(4.7) - 0.046, 4.7)
  boat.rotation.x = padAngle
  boat.rotation.y = 0.04
  group.add(boat)

  const hullArc = 0.42
  const keelTop = 0.16
  const shell = (u) => keelTop - (u * u) / (2 * hullArc)

  const plankUs = [-0.231, -0.154, -0.077, 0, 0.077, 0.154, 0.231]
  plankUs.forEach((u, index) => {
    box(boat, [0.078, 0.026, 0.94], [u, shell(u) - 0.012, -0.05], index % 2 ? timberLight : timber, [0, 0, -Math.atan(u / hullArc)])
  })
  box(boat, [0.06, 0.042, 1.14], [0, keelTop + 0.008, 0], timberDark)
  box(boat, [0.05, 0.085, 0.055], [0, keelTop - 0.025, -0.552], timberDark, [0.16, 0, 0])

  for (const side of [-1, 1]) {
    const u = side * 0.249
    box(boat, [0.038, 0.052, 1.0], [u, shell(u) - 0.014, -0.03], timberDark, [0, 0, -Math.atan(u / hullArc)])
  }

  // stern planking weathered away, so the curved frames read against the light
  for (const ribZ of [0.43, 0.525]) {
    const ribPoints = []
    for (let i = 0; i <= 8; i += 1) {
      const angle = (Math.PI * i) / 8
      const x = -0.223 * Math.cos(angle)
      ribPoints.push([x, shell(x) - 0.028, ribZ])
    }
    curve(boat, ribPoints, timberDark, 0.011)
  }
  box(boat, [0.042, 0.16, 0.035], [0, keelTop - 0.075, 0.552], timberDark, [-0.14, 0, 0])

  for (const u of [-0.1925, -0.1155, -0.0385, 0.0385, 0.1155, 0.1925]) {
    line(boat, [[u, shell(u) + 0.002, -0.5], [u, shell(u) + 0.002, 0.41]], '#8b7c63', 0.55)
  }

  // ---- a few short hauling rollers and timber blocks ----
  const rollerGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.34, 10)
  for (const z of [5.45, 3.9]) {
    mesh(group, rollerGeometry, p.rope, [5.26, padY(z) + 0.032, z], [padAngle, 0, Math.PI / 2])
  }
  box(group, [0.15, 0.07, 0.1], [5.26, padY(3.62) + 0.035, 3.62], timber, [0, 0.24, 0])
  box(group, [0.12, 0.06, 0.09], [5.26, padY(5.62) + 0.03, 5.62], timberDark, [0, -0.18, 0])
  box(group, [0.09, 0.03, 0.42], [5.09, padY(3.4) + 0.02, 3.4], timber, [0, 0.3, 0.02])

  return group
}
