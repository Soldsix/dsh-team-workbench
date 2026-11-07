export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'slipway'

  // CONTRACT.md fixes the quay top at y=.8. The apron stays just above that plane
  // and the launch chute drops from the quay edge into the harbour water.
  const padX = 5.2
  const padW = 1.08
  const padZFront = 2.64
  const padZBack = 5.86
  const padSlope = 0.03
  const padY = (z) => 0.8 + (z - padZFront) * padSlope
  const padAngle = -Math.atan(padSlope)

  const chuteZTop = 2.62
  const chuteZBottom = 1.06
  const chuteYBottom = 0.175
  const chuteYTop = padY(chuteZTop)
  const chuteSlope = (chuteYTop - chuteYBottom) / (chuteZTop - chuteZBottom)
  const chuteAngle = -Math.atan(chuteSlope)
  const chuteY = (z) => chuteYBottom + (z - chuteZBottom) * chuteSlope
  const chuteLength = Math.hypot(chuteZTop - chuteZBottom, chuteYTop - chuteYBottom)

  const wetConcrete = mat('#b4c5c0')
  const curbConcrete = mat('#cfd9d2')
  const seamTone = mat('#7e9893')
  const sheen = mat('#8fb3ad', { transparent: true, opacity: 0.3, depthWrite: false })
  const rustWash = mat('#b08a6a', { transparent: true, opacity: 0.4, depthWrite: false })
  const timber = mat('#b3a284')
  const timberLight = mat('#c4b595')
  const timberDark = mat('#93836a')

  // ---- wet concrete apron sloping toward the water ----
  const padMidZ = (padZFront + padZBack) / 2
  box(group, [padW, 0.1, padZBack - padZFront], [padX, padY(padMidZ) - 0.05, padMidZ], wetConcrete, [padAngle, 0, 0])

  for (const x of [5.02, 5.2, 5.38]) {
    box(group, [0.17, 0.004, 2.9], [x, padY(4.28) + 0.004, 4.28], sheen, [padAngle, 0, 0], false)
  }

  for (const z of [3.04, 3.5, 3.96, 4.42, 4.88, 5.34, 5.72]) {
    box(group, [padW - 0.22, 0.006, 0.016], [padX, padY(z) + 0.003, z], seamTone, [padAngle, 0, 0])
  }

  for (const x of [padX - padW / 2 + 0.05, padX + padW / 2 - 0.05]) {
    beam(group, [x, padY(padZBack - 0.02) + 0.05, padZBack - 0.02], [x, padY(padZFront + 0.05) + 0.05, padZFront + 0.05], 0.1, curbConcrete)
  }
  beam(group, [padX - padW / 2, padY(padZBack - 0.05) + 0.045, padZBack - 0.05], [padX + padW / 2, padY(padZBack - 0.05) + 0.045, padZBack - 0.05], 0.09, curbConcrete)

  const railXs = [padX - 0.4, padX + 0.4]
  for (const x of railXs) {
    beam(group, [x, padY(5.8) + 0.035, 5.8], [x, padY(2.72) + 0.03, 2.72], 0.045, p.metal)
    for (const z of [3.15, 4.2, 5.25]) {
      box(group, [0.1, 0.026, 0.09], [x, padY(z) + 0.01, z], p.metal, [padAngle, 0, 0])
      box(group, [0.16, 0.004, 0.15], [x, padY(z) + 0.005, z + 0.02], rustWash, [padAngle, 0, 0], false)
    }
  }

  // ---- launch chute running through the quay edge ----
  const chuteMidZ = (chuteZTop + chuteZBottom) / 2
  const chuteMidY = (chuteYTop + chuteYBottom) / 2
  box(group, [padW, 0.16, chuteLength], [padX, chuteMidY - 0.08 * Math.cos(chuteAngle), chuteMidZ - 0.08 * Math.sin(chuteAngle)], wetConcrete, [chuteAngle, 0, 0])
  for (const z of [1.34, 1.8, 2.26]) {
    box(group, [padW - 0.22, 0.008, 0.02], [padX, chuteY(z) + 0.003, z], seamTone, [chuteAngle, 0, 0])
  }
  box(group, [padW - 0.3, 0.005, 0.9], [padX, chuteY(1.4) + 0.006, 1.4], sheen, [chuteAngle, 0, 0], false)
  for (const x of [padX - padW / 2 + 0.05, padX + padW / 2 - 0.05]) {
    beam(group, [x, chuteY(2.6) + 0.07, 2.6], [x, chuteY(0.98) + 0.07, 0.98], 0.1, curbConcrete)
  }
  for (const x of railXs) {
    beam(group, [x, chuteY(2.68) + 0.04, 2.68], [x, chuteY(1.1) + 0.04, 1.1], 0.045, p.metal)
    box(group, [0.08, 0.05, 0.05], [x, chuteY(1.16) + 0.055, 1.16], p.metal)
  }

  const noseZ = chuteZBottom - 0.2
  const noseY = chuteY(noseZ)
  box(group, [padW, 0.14, 0.4], [padX, noseY - 0.07 * Math.cos(chuteAngle), noseZ - 0.07 * Math.sin(chuteAngle)], wetConcrete, [chuteAngle, 0, 0])
  for (const x of [padX - 0.34, padX + 0.34]) {
    box(group, [0.16, 1.62, 0.16], [x, -0.745, noseZ], wetConcrete)
  }

  // ---- overturned timber dinghy, half hauled up the ramp ----
  const boat = new THREE.Group()
  boat.name = 'overturned-dinghy'
  boat.position.set(5.13, padY(4.66) - 0.046, 4.66)
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
  for (const z of [5.35, 3.95]) {
    mesh(group, rollerGeometry, p.rope, [5.3, padY(z) + 0.032, z], [0, 0, Math.PI / 2])
  }
  box(group, [0.15, 0.07, 0.1], [5.5, padY(4.66) + 0.035, 4.66], timber, [0, 0.24, 0])
  box(group, [0.12, 0.06, 0.09], [5.48, padY(5.04) + 0.03, 5.04], timberDark, [0, -0.18, 0])
  box(group, [0.09, 0.03, 0.48], [4.98, padY(5.5) + 0.02, 5.5], timber, [0, 0.32, 0.02])

  return group
}
