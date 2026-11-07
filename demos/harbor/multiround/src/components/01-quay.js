// 01-quay.js — L-shaped harbour quay deck and yellow-black hazard markings.
// Owned by artist-01-quay. First pass: authored source only, the author did not
// run a renderer or a browser; visual acceptance happens outside this workspace.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '01-quay-deck'

  const DECK_Y = 0.8 // fixed top of the concrete land
  const GAP = 0.022 // nominal expansion-joint width

  // --- shared wet-surface materials: transparent, so helpers skip ink outlines.
  //     Round-4 decals are flat silhouettes seen from above, so DoubleSide keeps
  //     them visible whichever way a triangulated outline happens to wind. ---
  const haloMat = mat('#a9c4bc', { transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide })
  const wetMat = mat(p.water, { transparent: true, opacity: 0.44, depthWrite: false, side: THREE.DoubleSide })
  const sheenMat = mat(p.foam, { transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide })
  const stainMat = mat('#9db9b2', { transparent: true, opacity: 0.11, depthWrite: false, side: THREE.DoubleSide })
  const scuffMat = mat('#e2e7dd', { transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide })

  const tones = ['#c9d4cd', '#d7ded3', '#bfccc6', '#d1dad0', '#c4d0c9', '#dce0d5', '#cdd7cd']
  const jointShadow = '#6c8783'

  // ---------------------------------------------------------------------------
  // 1. L-shaped slab field: the left leg x[-6,-1.7] z[-6,6] and the front leg
  //    x[-1.7,6] z[2.4,6] meet at x = -1.72. The ocean corner (x > -1.7 and
  //    z < 2.4) is deliberately left open — no rectangular floor over the water.
  //    Interior grid lines are inset and jittered so the joints stay irregular.
  // ---------------------------------------------------------------------------
  const jitter = (amount) => (rand() - 0.5) * amount
  const slabSets = [
    {
      xs: [-5.99, -3.86, -1.72],
      zs: [-5.99, -4.45, -2.9, -1.35, 0.1, 1.25, 2.42, 4.2, 5.99],
      softX: [-3.86],
      softZ: [-4.45, -2.9, -1.35, 0.1, 1.25, 2.42, 4.2]
    },
    {
      xs: [-1.72, 0.35, 2.5, 4.3, 5.99],
      zs: [2.42, 4.2, 5.99],
      softX: [0.35, 2.5, 4.3],
      softZ: [4.2]
    }
  ]
  const laySlabs = ({ xs, zs, softX, softZ }) => {
    for (let cx = 0; cx < xs.length - 1; cx++) {
      for (let cz = 0; cz < zs.length - 1; cz++) {
        const x0 = xs[cx], x1 = xs[cx + 1], z0 = zs[cz], z1 = zs[cz + 1]
        const a = x0 + (softX.includes(x0) ? GAP * 0.5 + jitter(0.012) : 0)
        const b = x1 - (softX.includes(x1) ? GAP * 0.5 + jitter(0.012) : 0)
        const c = z0 + (softZ.includes(z0) ? GAP * 0.5 + jitter(0.012) : 0)
        const d = z1 - (softZ.includes(z1) ? GAP * 0.5 + jitter(0.012) : 0)
        const top = DECK_Y + (rand() < 0.4 ? 0 : -0.0015 - 0.002 * rand())
        const tone = tones[Math.floor(rand() * tones.length)]
        box(group, [b - a, 0.36, d - c], [(a + b) * 0.5, top - 0.18, (c + d) * 0.5], tone)
      }
    }
  }
  slabSets.forEach(laySlabs)

  // Dark backing slab 6 mm smaller than the tiles: it only shows through the open
  // joints, so the deck reads as one thick cast platform instead of floating plates.
  const bed = (x0, x1, z0, z1) => box(group,
    [x1 - x0 - 0.012, 0.34, z1 - z0 - 0.012],
    [(x0 + x1) * 0.5, DECK_Y - 0.192, (z0 + z1) * 0.5], jointShadow, [0, 0, 0], false)
  bed(-5.99, -1.72, -5.99, 5.99)
  bed(-1.72, 5.99, 2.42, 5.99)

  // Hairline repair seams, waxed with rain: they never line up with the grid.
  box(group, [1.55, 0.004, 0.016], [0.9, DECK_Y + 0.0015, 4.05], '#8fa8a2', [0, 0.05, 0], false)
  box(group, [1.1, 0.004, 0.014], [3.2, DECK_Y + 0.0015, 4.2], '#8fa8a2', [0, -0.07, 0], false)
  box(group, [0.95, 0.004, 0.014], [-2.4, DECK_Y + 0.0015, 1.6], '#8fa8a2', [0, 0.12, 0], false)

  // ---------------------------------------------------------------------------
  // 2. Raised wheel curb along both waterfront edges (z = 2.4 and x = -1.7).
  //    It overhangs the deck edge by ~1 cm so no face lands on the sea-wall plane.
  // ---------------------------------------------------------------------------
  box(group, [7.83, 0.13, 0.14], [2.075, 0.835, 2.46], p.concreteLight) // front edge, z = 2.4
  box(group, [0.15, 0.13, 8.38], [-1.765, 0.835, -1.8], p.concreteLight) // left edge, x = -1.7
  box(group, [7.83, 0.008, 0.14], [2.075, 0.904, 2.46], '#b3c2bb', [0, 0, 0], false) // wet curb cap
  box(group, [0.15, 0.008, 8.38], [-1.765, 0.904, -1.8], '#b3c2bb', [0, 0, 0], false)

  // ---------------------------------------------------------------------------
  // 3. Sharp yellow-black diagonal hazard bands painted just inside the curb.
  //    One 45-degree canvas tile is repeated along both bands; the pattern is
  //    seamless because the stripe period divides the 128 px tile.
  // ---------------------------------------------------------------------------
  const hazardTile = 0.42
  const hazardTexture = (() => {
    const size = 128, period = 32
    const canvas = document.createElement('canvas')
    canvas.width = canvas.height = size
    const paint = canvas.getContext('2d')
    const pixels = paint.createImageData(size, size)
    const yellow = [234, 209, 125], dark = [53, 86, 89]
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        const stripe = (((x + y) % period) + period) % period < period * 0.5
        const colour = stripe ? yellow : dark
        pixels.data[i] = colour[0]
        pixels.data[i + 1] = colour[1]
        pixels.data[i + 2] = colour[2]
        pixels.data[i + 3] = 255
      }
    }
    paint.putImageData(pixels, 0, 0)
    const texture = new THREE.CanvasTexture(canvas)
    texture.colorSpace = THREE.SRGBColorSpace
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping
    texture.magFilter = THREE.NearestFilter
    return texture
  })()
  const hazardMaterial = new THREE.MeshToonMaterial({ map: hazardTexture })
  const hazardBand = (length, width, [x, z], alongZ) => {
    const plane = new THREE.PlaneGeometry(length, width)
    const uv = plane.attributes.uv
    for (let i = 0; i < uv.count; i++) {
      uv.setXY(i, uv.getX(i) * length / hazardTile, uv.getY(i) * width / hazardTile)
    }
    uv.needsUpdate = true
    const band = mesh(group, plane, hazardMaterial, [x, DECK_Y + 0.0035, z],
      alongZ ? [-Math.PI / 2, 0, Math.PI / 2] : [-Math.PI / 2, 0, 0], false)
    band.castShadow = false
    return band
  }
  hazardBand(8.09, 0.26, [1.945, 2.66], false) // along the front edge, z = 2.4
  hazardBand(8.52, 0.26, [-1.97, -1.73], true) // along the left edge, x = -1.7

  // Worn paint: pale concrete showing through the stripes.
  const chipped = (x, z, w, d, rot) => box(group, [w, 0.004, d], [x, DECK_Y + 0.0058, z], '#d3dbd2', [0, rot, 0], false)
  chipped(1.55, 2.665, 0.36, 0.1, 0.38)
  chipped(3.35, 2.66, 0.2, 0.075, -0.5)
  chipped(-1.97, -2.5, 0.1, 0.3, 0.2)
  chipped(-1.965, 0.75, 0.085, 0.18, -0.3)

  // ---------------------------------------------------------------------------
  // 4. Wet apron, round 4: the clean oval decals read as stamped circles, so the
  //    green marks are now irregular flat silhouettes, and each wet layer shares
  //    one mesh instead of one mesh per blob (24 decal meshes in round 3, 5 here).
  //    No layer of 07-ripples or 14-wires is repainted: only this file's own
  //    puddles are reshaped. Everything stays inside the ±6 plinth: a wobbled
  //    blob reaches r * 1.39 at most and every outline below is sized on that.
  // ---------------------------------------------------------------------------
  const Y_DAMP = 0.8016
  const Y_RIM = 0.8026
  const Y_WATER = 0.8042
  const Y_GLINT = 0.8056
  const Y_REFLECT = 0.807
  const Y_SCUFF = 0.8082

  // Outline in deck coordinates. The plane is laid flat by a -90° rotation about
  // X, so local +y maps to world -z; the outline is traced counter-clockwise in
  // plane space on purpose (DoubleSide still guards the winding).
  const blob = (cx, cz, rx, rz, seed, wobble = 0.16, steps = 22) => {
    const shape = new THREE.Shape()
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2
      const w = 1 + Math.sin(a * 3 + seed) * wobble +
        Math.sin(a * 5 - seed * 1.7) * wobble * 0.5 +
        Math.cos(a * 2 + seed * 2.3) * wobble * 0.45
      const lx = cx + Math.cos(a) * rx * w
      const ly = -cz + Math.sin(a) * rz * w
      if (i === 0) shape.moveTo(lx, ly)
      else shape.lineTo(lx, ly)
    }
    return shape
  }
  const patch = points => {
    const shape = new THREE.Shape()
    points.forEach(([x, z], index) => index === 0 ? shape.moveTo(x, -z) : shape.lineTo(x, -z))
    return shape
  }
  const decal = (shapes, material, y) =>
    mesh(group, new THREE.ShapeGeometry(shapes), material, [0, y, 0], [-Math.PI / 2, 0, 0], false)

  // Soft damp rims, nudged off centre so the old concentric ring cannot return.
  decal([
    blob(3.89, 4.27, 0.6, 0.35, 1.7, 0.18),
    blob(1.34, 3.57, 0.67, 0.38, 4.1, 0.18),
    blob(-0.26, 3.17, 0.35, 0.22, 2.6, 0.18),
    blob(-2.96, -1.43, 0.58, 0.35, 6.2, 0.18),
    blob(-2.86, -3.53, 0.46, 0.3, 3.3, 0.18)
  ], haloMat, Y_RIM)

  // Five unruly puddles, no two alike, all inside the plinth.
  decal([
    blob(3.85, 4.3, 0.52, 0.3, 1.7),
    blob(1.3, 3.6, 0.58, 0.33, 4.1),
    blob(-0.3, 3.2, 0.3, 0.19, 2.6),
    blob(-3.0, -1.4, 0.5, 0.3, 6.2),
    blob(-2.9, -3.5, 0.4, 0.26, 3.3)
  ], wetMat, Y_WATER)

  // One thin off-centre glint per puddle instead of a centred inner oval.
  decal([
    blob(3.98, 4.2, 0.17, 0.07, 10.7, 0.1),
    blob(1.44, 3.5, 0.2, 0.08, 13.1, 0.1),
    blob(-0.24, 3.15, 0.1, 0.05, 11.6, 0.1),
    blob(-2.92, -1.5, 0.16, 0.07, 15.2, 0.1),
    blob(-2.84, -3.56, 0.13, 0.06, 12.3, 0.1)
  ], sheenMat, Y_GLINT)

  // Wide damp sheets: same three corners of the apron, now irregular outlines
  // (z <= 5.895, x <= 5.396, |x| <= 4.532, i.e. inside the ±6 plinth).
  decal([
    blob(1.55, 4.95, 1.35, 0.68, 8.2, 0.2),
    blob(4.45, 3.6, 0.7, 0.45, 2.4, 0.18),
    blob(-3.35, 3.3, 0.85, 0.45, 5.6, 0.2)
  ], stainMat, Y_DAMP)

  // Rain-polished scuff streaks: thin quads inside the same shared mesh.
  decal([
    patch([[1.6, 4.31], [2.8, 4.38], [2.8, 4.44], [1.6, 4.37]]),
    patch([[-3.0, 0.3], [-2.2, 0.36], [-2.2, 0.42], [-3.0, 0.36]]),
    patch([[0.15, 5.32], [1.15, 5.28], [1.15, 5.34], [0.15, 5.38]])
  ], scuffMat, Y_SCUFF)

  // ---------------------------------------------------------------------------
  // 5. Local reflections, flat paint only: no mirrored hull geometry and no
  //    reflection camera. Three colour-block meshes pick up the three hulls
  //    moored along the edges, the warm lamp the overhead wires actually clamp
  //    to, and a pair of rope/bollard slivers. Three draw calls in total.
  // ---------------------------------------------------------------------------
  const hullRefl = new THREE.MeshBasicMaterial({ color: '#f1f3e6', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })
  const lampRefl = new THREE.MeshBasicMaterial({ color: '#f2e5b6', transparent: true, opacity: 0.2, depthWrite: false, side: THREE.DoubleSide })
  const darkRefl = new THREE.MeshBasicMaterial({ color: '#3f605e', transparent: true, opacity: 0.14, depthWrite: false, side: THREE.DoubleSide })
  decal([
    patch([[1.42, 2.85], [1.86, 2.85], [1.78, 3.42], [1.52, 3.42]]), // 09-boat-b stern quarter
    patch([[3.18, 2.85], [3.72, 2.85], [3.62, 3.62], [3.32, 3.62]]), // 10-boat-c stern
    patch([[-2.22, -1.45], [-2.52, -1.55], [-2.46, -3.55], [-2.18, -3.43]]) // 11-boat-d hull
  ], hullRefl, Y_REFLECT)
  decal([
    patch([[-3.09, 4.42], [-2.91, 4.42], [-2.95, 5.05], [-3.05, 5.05]]) // lamp head at (-3.0, 4.8)
  ], lampRefl, Y_REFLECT)
  decal([
    patch([[0.92, 2.86], [1.02, 2.86], [0.98, 3.5], [0.9, 3.5]]),
    patch([[4.32, 2.86], [4.42, 2.86], [4.4, 3.4], [4.32, 3.4]]),
    patch([[-2.16, 0.15], [-2.16, -0.45], [-2.22, -0.43], [-2.22, 0.17]])
  ], darkRefl, Y_REFLECT + 0.0006)

  return group
}
