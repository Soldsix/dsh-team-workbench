// 19-tools.js — long-handled dip net, two buckets, boots, coiled line and bent hooks.
// Left quay cluster (~x -5.5, z 2.8) for the sun-shower harbour miniature. First pass, source only.

export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = 'harbour-tools-19'

  const GY = 0.8
  const vec = (x, y, z) => new THREE.Vector3(x, y, z)
  const ring = (parent, radius, tube, position, rotation, color, ink = true) =>
    mesh(parent, new THREE.TorusGeometry(radius, tube, 7, 22), color, position, rotation, ink)
  const wetPatch = (parent, radius, position, opacity) =>
    mesh(parent, new THREE.CylinderGeometry(radius, radius * 0.9, 0.008, 16),
      mat(p.water, { transparent: true, opacity, depthWrite: false }), position, [0, 0, 0], false)

  // --- damp concrete, the only trace of someone who has just walked off
  wetPatch(group, 0.30, [-5.16, GY + 0.006, 3.04], 0.24)
  wetPatch(group, 0.23, [-5.78, GY + 0.006, 3.08], 0.16)
  const printMaterial = mat(p.dark, { transparent: true, opacity: 0.22, depthWrite: false })
  const prints = [[-5.98, 3.30, 0.14], [-5.90, 3.42, -0.10], [-5.81, 3.52, 0.12], [-5.71, 3.62, -0.08]]
  for (let i = 0; i < prints.length; i++) {
    const [px, pz, turn] = prints[i]
    mesh(group, new THREE.CylinderGeometry(0.042, 0.034, 0.006, 10), printMaterial,
      [px, GY + 0.005, pz], [0, turn, i % 2 ? 0.05 : -0.05], false)
  }

  // --- long-handled dip net, shaft resting across the upright bucket's rim
  const netButt = vec(-5.95, GY + 0.022, 2.88)
  const netTop = vec(-5.30, GY + 0.44, 2.62)
  const netDir = netTop.clone().sub(netButt).normalize()
  const netGrip = netButt.clone().lerp(netTop, 0.26)
  beam(group, netButt.toArray(), netGrip.toArray(), 0.037, '#7a6a52')
  beam(group, netGrip.toArray(), netTop.toArray(), 0.030, p.rope)
  beam(group, netTop.clone().addScaledVector(netDir, -0.10).toArray(),
    netTop.clone().addScaledVector(netDir, 0.014).toArray(), 0.043, '#8ea5a0')
  const brassSeat = netGrip.clone()
  brassSeat.y -= 0.042
  ring(group, 0.030, 0.006, brassSeat.toArray(), [1.15, 0.25, 0.35], p.gold)

  const upAxis = vec(0, 1, 0)
  const planeUp = upAxis.clone().sub(netDir.clone().multiplyScalar(upAxis.dot(netDir))).normalize()
  const planeSide = netDir.clone().cross(planeUp).normalize()
  const hoopRadius = 0.21
  const hoopCentre = netTop.clone().addScaledVector(planeUp, hoopRadius)
  const hoopPivot = new THREE.Group()
  hoopPivot.position.copy(hoopCentre)
  group.add(hoopPivot)
  const hoopTwist = new THREE.Euler().setFromQuaternion(
    new THREE.Quaternion().setFromUnitVectors(vec(0, 0, 1), netDir))
  mesh(hoopPivot, new THREE.TorusGeometry(hoopRadius, 0.013, 7, 24), '#95ada7',
    [0, 0, 0], [hoopTwist.x, hoopTwist.y, hoopTwist.z])
  ring(group, 0.027, 0.007, netTop.toArray(), [hoopTwist.x, hoopTwist.y, hoopTwist.z], '#8c7c5e')

  // visible netting: twelve cords plus two hoops, gathered at the bag tip
  const bagTip = vec(0.150, -0.280, 0.100)
  const netting = '#dbe8e0'
  const rimOf = (angle, radius) => planeUp.clone().multiplyScalar(Math.cos(angle) * radius)
    .addScaledVector(planeSide, Math.sin(angle) * radius)
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2 + 0.13
    const start = rimOf(angle, hoopRadius)
    const middle = start.clone().lerp(bagTip, 0.42).multiplyScalar(1.05)
    const lower = start.clone().lerp(bagTip, 0.78).multiplyScalar(1.02)
    const end = bagTip.clone().addScaledVector(start.clone().normalize(), 0.012)
    curve(hoopPivot, [start.toArray(), middle.toArray(), lower.toArray(), end.toArray()], netting, 0.0055)
  }
  for (let s = 0; s < 2; s++) {
    const t = s === 0 ? 0.40 : 0.72
    const centre = bagTip.clone().multiplyScalar(t)
    const radius = hoopRadius * (1 - 0.50 * t)
    const hoopPts = []
    for (let i = 0; i <= 20; i++) hoopPts.push(centre.clone().add(rimOf((i / 20) * Math.PI * 2, radius)).toArray())
    curve(hoopPivot, hoopPts, netting, 0.0042)
  }
  sphere(hoopPivot, 0.024, bagTip.toArray(), '#cfe0d8', 8)

  animate(hoopPivot, (t) => {
    hoopPivot.rotation.set(Math.cos(t * 0.63) * 0.014, 0, Math.sin(t * 0.83) * 0.021)
  })

  // one slow drip from the wet net onto the concrete
  const tipWorld = hoopCentre.clone().add(bagTip)
  const drip = sphere(group, 0.017, [tipWorld.x, tipWorld.y - 0.03, tipWorld.z], '#c6e4d8', 8)
  animate(drip, (t) => {
    const cycle = t % 5.4
    if (cycle < 1.4) {
      drip.visible = true
      drip.position.y = tipWorld.y - 0.03 - (cycle / 1.4) * 0.30
    } else {
      drip.visible = false
    }
  })

  // --- upright bucket, pale blue-grey with a faded paint band
  const bucketA = new THREE.Group()
  bucketA.position.set(-5.46, GY, 2.62)
  group.add(bucketA)
  cylinder(bucketA, 0.175, 0.128, 0.30, [0, 0.15, 0], '#a9c2c5', 16)
  cylinder(bucketA, 0.142, 0.138, 0.045, [0, 0.055, 0], '#8fb3b8', 16)
  ring(bucketA, 0.172, 0.011, [0, 0.30, 0], [Math.PI / 2, 0, 0], '#d5ded8')
  mesh(bucketA, new THREE.CylinderGeometry(0.150, 0.150, 0.012, 16), '#78938f', [0, 0.292, 0], [0, 0, 0], false)
  box(bucketA, [0.016, 0.15, 0.012], [0.133, 0.165, 0.067], '#93a8a6', [0, 0.46, 0.05])
  const handleA = new THREE.Group()
  handleA.position.set(0, 0.30, 0)
  bucketA.add(handleA)
  curve(handleA, [[-0.170, 0, 0], [-0.158, 0.072, 0.014], [0, 0.122, 0.024],
    [0.158, 0.070, 0.014], [0.170, 0, 0]], p.metal, 0.011)
  animate(handleA, (t) => { handleA.rotation.z = Math.sin(t * 0.62) * 0.022 })

  // --- second bucket, knocked over, mouth toward the quay, handle flopped onto the ground
  const bucketB = new THREE.Group()
  bucketB.position.set(-5.14, GY + 0.15, 3.02)
  bucketB.quaternion.setFromUnitVectors(vec(0, 1, 0), vec(0.34, 0.16, 0.93).normalize())
  group.add(bucketB)
  cylinder(bucketB, 0.175, 0.125, 0.30, [0, 0, 0], '#b3c1ac', 16)
  cylinder(bucketB, 0.140, 0.136, 0.040, [0, -0.10, 0], '#9fb3a2', 16)
  ring(bucketB, 0.171, 0.011, [0, 0.15, 0], [Math.PI / 2, 0, 0], '#d5ded8')
  mesh(bucketB, new THREE.CylinderGeometry(0.146, 0.146, 0.012, 16), '#78938f', [0, 0.132, 0], [0, 0, 0], false)
  curve(group, [[-4.93, GY + 0.16, 3.10], [-5.01, GY + 0.05, 3.29], [-5.10, GY + 0.016, 3.36],
    [-5.20, GY + 0.05, 3.34], [-5.26, GY + 0.17, 3.22]], p.metal, 0.011)

  // --- a pair of rubber boots left by the warehouse wall
  const boot = (x, z, turn, tone) => {
    const g = new THREE.Group()
    g.position.set(x, GY, z)
    g.rotation.y = turn
    group.add(g)
    box(g, [0.148, 0.030, 0.300], [0, 0.015, 0.075], '#c5c9bd')
    box(g, [0.132, 0.088, 0.235], [0, 0.052, 0.062], tone)
    box(g, [0.118, 0.058, 0.062], [0, 0.085, 0.175], tone)
    cylinder(g, 0.083, 0.074, 0.300, [0, 0.160, 0], tone, 12)
    ring(g, 0.075, 0.009, [0, 0.310, 0], [Math.PI / 2, 0, 0], '#97adaa')
    mesh(g, new THREE.CylinderGeometry(0.062, 0.062, 0.012, 12), '#3f534f', [0, 0.305, 0], [0, 0, 0], false)
    box(g, [0.012, 0.150, 0.006], [0.074, 0.170, 0.012], '#a8bdb7')
    return g
  }
  boot(-5.86, 3.00, 0.17, '#55706d')
  boot(-5.69, 3.07, -0.11, '#5d7571')

  // --- orange mooring line coiled down on the wet concrete
  const coil = new THREE.Group()
  coil.position.set(-5.28, GY, 3.50)
  group.add(coil)
  const loop = (radius, height, thickness, phase) => {
    const pts = []
    for (let i = 0; i <= 15; i++) {
      const a = phase + (i / 15) * Math.PI * 1.88
      pts.push([Math.cos(a) * radius, height, Math.sin(a) * radius])
    }
    curve(coil, pts, p.orange, thickness)
  }
  loop(0.150, 0.020, 0.016, 0)
  loop(0.126, 0.017, 0.015, 1.10)
  loop(0.100, 0.015, 0.014, 2.30)
  curve(coil, [[0.02, 0.017, -0.09], [0.14, 0.015, -0.16], [0.26, 0.016, -0.14], [0.33, 0.014, -0.04]], p.orange, 0.013)
  sphere(coil, 0.028, [0.035, 0.032, -0.10], p.orange, 8)

  // --- a few bent hooks: two dropped, one still hooked over the bucket rim
  const hooks = [[-5.54, 3.42, 0.55, p.metal], [-5.14, 3.66, -0.35, '#7d8c88'], [-5.60, 3.60, 1.25, p.gold]]
  const hookShape = [[-0.095, 0], [-0.055, 0.002], [-0.018, 0.004], [0.008, 0.014],
    [0.016, 0.036], [0.004, 0.055], [-0.016, 0.058], [-0.030, 0.044]]
  for (let h = 0; h < hooks.length; h++) {
    const [hx, hz, turn, tone] = hooks[h]
    const c = Math.cos(turn)
    const s = Math.sin(turn)
    curve(group, hookShape.map(([u, w]) => [hx + u * c - w * s, GY + 0.010, hz + u * s + w * c]), tone, 0.0065)
  }
  curve(group, [[-5.68, 1.020, 2.44], [-5.62, 1.080, 2.50], [-5.601, 1.118, 2.5215],
    [-5.55, 1.090, 2.57], [-5.51, 1.020, 2.61], [-5.52, 0.985, 2.65]], '#7d8c88', 0.006)

  return group
}
