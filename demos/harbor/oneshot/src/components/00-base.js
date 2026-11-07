// 00-base — 正方形收藏模型底座 (square collectible plinth)
// Owns only this file. Builds the layered concrete foundation under the land
// region (x <= -1.7 or z >= 2.4, top y = .8) and the single thin seabed slab
// (top y = -1.55) that closes the plinth inside the water cutaway. The water
// volume, its tide-wall skin and underwater props belong to the seabed /
// seawall / water modules; nothing of theirs is duplicated here.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = 'plinth-00-base'

  const BOUND = 6       // square plinth boundary, x and z in [-6, 6]
  const BOTTOM = -1.6   // plinth bottom
  const TOP = 0.8       // concrete land top
  const CHAMFER = 0.03  // softly beveled pour edges
  const SEAWALL = -1.7  // land face on the west side of the water cutaway
  const QUAY = 2.4      // land face on the front side of the water cutaway

  // L-shaped land outline in shape space (shape x = world x, shape y = -world z).
  // A three.js bevel grows outward from the outline, so the outline sits one
  // chamfer inside every wanted face; only the four outer boundary sides take
  // the per-band inset, so both water-facing planes stay exactly on the
  // land/water border for the modules that skin them.
  const landOutline = (inset = 0) => {
    const low = -BOUND + CHAMFER + inset
    const high = BOUND - CHAMFER - inset
    const waterX = SEAWALL - CHAMFER
    const waterZ = -(QUAY + CHAMFER)
    const corners = [
      [low, low], [high, low], [high, waterZ],
      [waterX, waterZ], [waterX, high], [low, high],
    ]
    const shape = new THREE.Shape()
    corners.forEach(([sx, sy], index) => (index === 0 ? shape.moveTo(sx, sy) : shape.lineTo(sx, sy)))
    return shape
  }

  // One poured band: extrude the outline, stand it up onto +y, then let the
  // bevel of every band tuck into its neighbours. The plinth stays watertight
  // and each joint reads as a thin form-work moulding line.
  const pourBand = (y0, y1, color, inset, capTop = false) => {
    const height = y1 - y0
    const geometry = new THREE.ExtrudeGeometry(landOutline(inset), {
      depth: capTop ? height - CHAMFER * 2 : height,
      bevelEnabled: true,
      bevelThickness: CHAMFER,
      bevelSize: CHAMFER,
      bevelSegments: 1,
      curveSegments: 1,
      steps: 1,
    })
    return mesh(group, geometry, color, [0, y0 + CHAMFER, 0], [-Math.PI / 2, 0, 0])
  }

  // bottom-heavy strata: wet footing, recessed service band, drier upper pours
  const STRATA = [
    { y0: BOTTOM, y1: -1.10, color: p.concreteDark, inset: 0 },
    { y0: -1.10, y1: -0.58, color: p.concrete, inset: 0.05 },
    { y0: -0.58, y1: 0.02, color: '#ccd7d1', inset: 0.05 },
    { y0: 0.02, y1: 0.55, color: p.concreteLight, inset: 0.025 },
    { y0: 0.55, y1: TOP, color: p.concreteLight, inset: 0, capTop: true },
  ]
  STRATA.forEach(({ y0, y1, color, inset, capTop }) => pourBand(y0, y1, color, inset, capTop))

  const facePlane = y => {
    const band = STRATA.find(s => y >= s.y0 && y <= s.y1)
    return BOUND - (band ? band.inset : 0)
  }

  // The water cutaway holds only this thin basal slab: top y = -1.55, bottom
  // flush with the plinth bottom. Everything else in the water is left open.
  box(group, [BOUND - SEAWALL, 0.05, QUAY + BOUND],
    [(SEAWALL + BOUND) / 2, -1.575, (QUAY - BOUND) / 2], p.concreteDark, [0, 0, 0], false)

  // Fine worn edges: pebbles half sunk in the pour faces and low chipped /
  // damp patches; both stay inside the 12 x 12 boundary because they only sit
  // on the recessed bands.
  const pebble = (face, along, y, radius, color = p.concreteDark) => {
    const inner = facePlane(y) - radius * 0.45
    if (face === 'front') sphere(group, radius, [along, y, inner], color, 8)
    else if (face === 'back') sphere(group, radius, [along, y, -inner], color, 8)
    else if (face === 'west') sphere(group, radius, [-inner, y, along], color, 8)
    else sphere(group, radius, [inner, y, along], color, 8)
  }
  const STONES = [
    ['west', 4.15, -0.90, 0.085], ['west', -2.55, -0.75, 0.070, p.concrete],
    ['west', 1.05, -0.34, 0.075], ['front', -4.55, -0.85, 0.080],
    ['front', 2.35, -0.95, 0.075, p.concrete], ['front', 5.15, -0.24, 0.070],
    ['east', 3.55, -0.90, 0.080], ['east', 4.90, -0.30, 0.065, p.concrete],
    ['back', -3.85, -0.80, 0.085], ['back', -5.15, -0.22, 0.065],
    ['west', -4.20, 0.30, 0.042, p.concrete], ['front', -1.35, 0.16, 0.040],
    ['front', 3.90, 0.42, 0.042],
  ]
  STONES.forEach(([face, along, y, radius, color]) => pebble(face, along, y, radius, color))

  const wear = (face, along, y, width, height, color) => {
    const inner = facePlane(y) - 0.007
    if (face === 'front') box(group, [width, height, 0.03], [along, y, inner], color, [0, 0, 0], false)
    else if (face === 'back') box(group, [width, height, 0.03], [along, y, -inner], color, [0, 0, 0], false)
    else if (face === 'west') box(group, [0.03, height, width], [-inner, y, along], color, [0, 0, 0], false)
    else box(group, [0.03, height, width], [inner, y, along], color, [0, 0, 0], false)
  }
  const WEAR = [
    ['front', -3.30, -0.82, 0.62, 0.20], ['front', 1.15, -0.28, 0.50, 0.16],
    ['front', 4.35, 0.30, 0.42, 0.14], ['front', -0.20, -0.30, 0.06, 0.38],
    ['front', 2.70, 0.30, 0.05, 0.38], ['west', 2.60, -0.86, 0.70, 0.18],
    ['west', -4.40, -0.72, 0.45, 0.15], ['west', -1.40, -0.30, 0.55, 0.16],
    ['west', -2.90, 0.30, 0.07, 0.40], ['west', 3.30, -0.28, 0.05, 0.36],
    ['back', -3.10, -0.80, 0.50, 0.14], ['back', -2.40, 0.30, 0.06, 0.38],
    ['east', 3.90, -0.22, 0.45, 0.14], ['east', 5.00, -0.86, 0.50, 0.18],
    ['east', 4.40, 0.30, 0.45, 0.14],
  ]
  WEAR.forEach(([face, along, y, width, height], index) =>
    wear(face, along, y, width, height, index % 3 === 2 ? '#a9b8b2' : p.concreteDark))

  return group
}
