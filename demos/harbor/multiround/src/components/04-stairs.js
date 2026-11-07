// src/components/04-stairs.js — 低平台与入水台阶 (low landing + water-entry stairs)
// Owner: artist-04-stairs · first-pass authored source only. No browser build or render was run.
// Front-quay concrete stairs from the quay lip (.80) down to the waterline, plus a lower boarding
// platform on their east side. Stays inside x[3.5,5.8] / z[1.4,3.8], adds no water slab, and keeps
// the umbrella spot near x4.7,z3.6 clear. Everything is plain three.js geometry via the shared helpers.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx
  const group = new THREE.Group()
  group.name = '04-stairs-lower-platform'

  // ---- weathering accents, kept inside the shared high-key concrete / sea-glass palette ----
  const stone = mat('#c6d1cc')
  const stoneWorn = mat('#ccd7cf')
  const paint = mat('#e7ecdf')
  const wet = mat('#90a7a1')
  const wetDeep = mat('#6f8b88')
  const sunk = mat('#9db4ab')
  const algae = mat('#84a18b')
  const sheen = mat('#dff0e7', { transparent: true, opacity: 0.3, depthWrite: false })
  const foamMat = mat(p.foam, { transparent: true, opacity: 0.72, depthWrite: false })

  // ---- stair rhythm: 6 treads / 5 real risers; the worn lip sits just under the quay top ----
  const BOTTOM = -1.56                  // the stair mass reads as a solid foundation down to the seabed
  const W = 1.16
  const x0 = 3.6, x1 = x0 + W, cx = x0 + W / 2
  const zTop = 2.42, zBot = 1.7         // run in front of the quay face at z = 2.4
  const yTop = 0.782, yBot = 0.144      // lowest tread dips a few mm under the water (.15)
  const treads = 6
  const treadD = (zTop - zBot) / treads
  const drop = (yTop - yBot) / (treads - 1)
  const slope = (yTop - yBot) / (zTop - zBot)
  const yAt = i => yTop - drop * i
  const zFace = i => zTop - treadD * (i + 1)

  for (let i = 0; i < treads; i++) {
    const top = yAt(i), h = top - BOTTOM
    box(group, [W, h, treadD], [cx, BOTTOM + h / 2, zFace(i) + treadD / 2], i === 0 ? stoneWorn : i % 2 ? stone : p.concrete)
    // wet nosing where boots leave each tread and rain water pools
    box(group, [W - 0.02, 0.013, 0.028], [cx, top + 0.0065, zFace(i) + 0.015], wet, [0, 0, 0], false)
    // soft rain sheen pulled back from the edge
    box(group, [W - 0.18, 0.006, 0.05], [cx, top + 0.003, zFace(i) + 0.062], sheen, [0, 0, 0], false)
    // darker damp band on the exposed part of each riser
    if (i < treads - 1) {
      const lower = yAt(i + 1)
      box(group, [W - 0.04, (top - lower) * 0.46, 0.006], [cx, (top + lower) / 2, zFace(i) - 0.004], wetDeep, [0, 0, 0], false)
    }
    // faded painted edge line on the two upper treads
    if (i < 2) box(group, [W - 0.1, 0.004, 0.014], [cx, top + 0.007, zFace(i) + 0.045], paint, [0, 0, 0], false)
  }

  // ---- wet seam against the quay face, half step below the waterline, waterline staining ----
  box(group, [W - 0.03, 0.005, 0.05], [cx, yTop + 0.0025, 2.388], wetDeep, [0, 0, 0], false)
  const subTop = yBot - 0.1
  box(group, [W - 0.08, 0.26, 0.14], [cx, subTop - 0.13, zBot - 0.07], sunk)
  box(group, [W - 0.05, 0.09, 0.005], [cx, yBot - 0.045, zBot - 0.003], algae, [0, 0, 0], false)
  for (const sx of [x0 - 0.004, x1 + 0.004]) {
    box(group, [0.008, 0.1, 0.46], [sx, 0.15, 1.97], wetDeep, [0, 0, 0], false)
    box(group, [0.007, 0.05, 0.3], [sx, 0.09, 1.83], algae, [0, 0, 0], false)
  }

  // ---- cheek walls; the east one opens where the boarding platform begins ----
  const curb = (xc, za, zb) => {
    const dz = za - zb, dy = slope * dz, midZ = (za + zb) / 2
    box(group, [0.09, 0.11, Math.hypot(dz, dy)], [xc, yTop - slope * (zTop - midZ) + 0.05, midZ],
      stoneWorn, [-Math.atan2(dy, dz), 0, 0])
  }
  curb(x0 - 0.048, zTop, zBot)
  curb(x1 + 0.048, zTop, 2.0)
  curb(x1 + 0.048, 1.82, zBot)

  // ---- steel handhold rings bolted to the top riser, with rust blooms at the bolts ----
  const grabRing = new THREE.TorusGeometry(0.046, 0.012, 8, 16)
  for (const rx of [cx - 0.4, cx + 0.4]) {
    mesh(group, grabRing, p.metal, [rx, 0.718, zFace(0) - 0.0125], [0, 0, 0], false)
    for (const side of [-1, 1]) sphere(group, 0.013, [rx + side * 0.052, 0.718, zFace(0) - 0.004], p.rust, 6)
  }

  // ---- lower boarding platform, deck flush with the fifth tread, east of the stair foot ----
  const px0 = 4.86, px1 = 5.66, pz0 = 1.5, pz1 = 2.41
  const pcx = (px0 + px1) / 2, pcz = (pz0 + pz1) / 2, pd = pz1 - pz0
  const deckTop = yAt(4)
  box(group, [px1 - px0, 0.1, pd], [pcx, deckTop - 0.05, pcz], stone)
  box(group, [0.62, 0.008, 0.7], [pcx, deckTop + 0.004, pcz + 0.02], wet, [0, 0, 0], false)
  box(group, [0.26, 0.006, 0.26], [pcx - 0.08, deckTop + 0.008, pcz - 0.16], sheen, [0, 0, 0], false)
  // transition plate bridging the cheek-wall opening onto the stairs
  box(group, [0.18, 0.05, 0.12], [4.8, deckTop - 0.019, 1.89], stoneWorn)
  // deck framing and piles down into the water
  for (const sx of [px0 + 0.07, px1 - 0.07]) box(group, [0.07, 0.1, pd - 0.06], [sx, deckTop - 0.13, pcz], p.concreteDark)
  for (const sz of [pz0 + 0.08, pz1 - 0.11]) box(group, [px1 - px0 - 0.06, 0.08, 0.08], [pcx, deckTop - 0.135, sz], p.concreteDark)
  for (const sx of [px0 + 0.08, px1 - 0.08]) {
    for (const sz of [pz0 + 0.09, pz1 - 0.11]) cylinder(group, 0.056, 0.07, 1.664, [sx, -0.729, sz], p.concreteDark, 10)
  }
  // worn rubber fenders on the open water faces
  box(group, [0.028, 0.13, pd - 0.08], [px1 + 0.012, deckTop - 0.095, pcz], p.dark, [0, 0, 0], false)
  box(group, [px1 - px0 - 0.08, 0.13, 0.028], [pcx, deckTop - 0.095, pz0 - 0.012], p.dark, [0, 0, 0], false)
  // cast cleat and a short faded painter loop off the east edge
  for (const ox of [-0.075, 0.075]) cylinder(group, 0.024, 0.028, 0.06, [5.46 + ox, deckTop + 0.03, 1.66], p.metal, 8)
  mesh(group, new THREE.CylinderGeometry(0.028, 0.028, 0.2, 10), p.metal, [5.46, deckTop + 0.082, 1.66], [0, 0, Math.PI / 2])
  curve(group, [[5.46, deckTop + 0.07, 1.66], [5.6, 0.31, 1.63], [5.7, 0.19, 1.55], [5.69, 0.04, 1.45]], p.orange, 0.016)
  // flat tie-down ring set into the deck near the quay side
  mesh(group, new THREE.TorusGeometry(0.058, 0.012, 8, 16), p.metal, [px0 + 0.14, deckTop + 0.008, pz1 - 0.12], [Math.PI / 2, 0, 0], false)

  // ---- thin foam lines lapping the lowest tread and the platform foot ----
  const lapA = curve(group, [[3.64, 0.156, 1.76], [3.9, 0.151, 1.71], [4.2, 0.155, 1.69], [4.48, 0.15, 1.72], [4.7, 0.156, 1.75]], foamMat, 0.007)
  const lapB = curve(group, [[4.94, 0.154, 1.54], [5.16, 0.149, 1.47], [5.4, 0.154, 1.46], [5.62, 0.15, 1.5]], foamMat, 0.007)
  animate(lapA, t => { lapA.position.y = Math.sin(t * 1.15) * 0.005 })
  animate(lapB, t => { lapB.position.y = Math.sin(t * 0.95 + 1.7) * 0.006 })

  return group
}
