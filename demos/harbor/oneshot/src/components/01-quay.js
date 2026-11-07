// 01-quay.js — L-shaped harbour quay deck and yellow-black hazard markings.
// Owned by artist-01-quay. First pass: authored source only, the author did not
// run a renderer or a browser; visual acceptance happens outside this workspace.
export function create(ctx) {
  const { THREE, palette: p, mat, mesh, box, cylinder, sphere, beam, curve, line, label, animate, rand } = ctx

  const group = new THREE.Group()
  group.name = '01-quay-deck'

  const DECK_Y = 0.8 // fixed top of the concrete land
  const GAP = 0.022 // nominal expansion-joint width

  // --- shared wet-surface materials: transparent, so helpers skip ink outlines ---
  const haloMat = mat('#a9c4bc', { transparent: true, opacity: 0.14, depthWrite: false })
  const wetMat = mat(p.water, { transparent: true, opacity: 0.46, depthWrite: false })
  const sheenMat = mat(p.foam, { transparent: true, opacity: 0.5, depthWrite: false })
  const stainMat = mat('#9db9b2', { transparent: true, opacity: 0.12, depthWrite: false })
  const scuffMat = mat('#e2e7dd', { transparent: true, opacity: 0.2, depthWrite: false })

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
  // 4. Soft rain puddles: a wide damp halo, the teal water skin and one glint.
  //    Kept flush with the deck so the ripples module can sit on top of them.
  // ---------------------------------------------------------------------------
  const puddle = (x, z, rx, rz) => {
    const halo = cylinder(group, 1, 1, 0.006, [x, DECK_Y + 0.0005, z], haloMat, 20)
    halo.scale.set(rx * 1.5, 1, rz * 1.55)
    const body = cylinder(group, 1, 1, 0.008, [x, DECK_Y + 0.0035, z], wetMat, 20)
    body.scale.set(rx, 1, rz)
    const glint = cylinder(group, 1, 1, 0.005, [x + rx * 0.28, DECK_Y + 0.0085, z - rz * 0.22], sheenMat, 14)
    glint.scale.set(rx * 0.34, 1, rz * 0.3)
  }
  puddle(1.15, 3.55, 0.62, 0.32)
  puddle(3.85, 4.55, 0.5, 0.3)
  puddle(-0.55, 3.35, 0.4, 0.25)
  puddle(5.1, 3.3, 0.32, 0.2)
  puddle(-2.85, -1.2, 0.5, 0.27)
  puddle(-2.7, -3.6, 0.38, 0.22)

  // Broad damp stains, water marks and two rain-polished scuff streaks.
  const stain = (x, z, rx, rz, rot) => {
    const disc = cylinder(group, 1, 1, 0.008, [x, DECK_Y + 0.0018, z], stainMat, 22)
    disc.scale.set(rx, 1, rz)
    disc.rotation.y = rot
  }
  stain(1.8, 5.0, 1.9, 0.95, 0.2)
  stain(2.9, 5.2, 1.0, 0.65, -0.16)
  stain(4.5, 5.35, 0.8, 0.5, 0.1)

  const scuff = (x, z, rx, rz, rot) => {
    const disc = cylinder(group, 1, 1, 0.006, [x, DECK_Y + 0.0025, z], scuffMat, 16)
    disc.scale.set(rx, 1, rz)
    disc.rotation.y = rot
  }
  scuff(2.2, 4.35, 1.3, 0.09, 0.06)
  scuff(-2.55, 0.35, 0.9, 0.08, -0.08)
  scuff(0.6, 5.35, 1.0, 0.07, -0.04)

  return group
}
