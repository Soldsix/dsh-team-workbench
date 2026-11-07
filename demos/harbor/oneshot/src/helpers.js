import * as THREE from 'three'

export const palette = Object.freeze({ concrete: '#c3cfcb', concreteLight: '#e0e5dc', concreteDark: '#849f9b', water: '#79c4bc',
  deep: '#316e77', foam: '#e0f4e8', hull: '#f5f3df', rust: '#aa7755', metal: '#4d6766', yellow: '#ead17d', orange: '#c77d5c',
  rope: '#a17b57', blue: '#7da9bd', green: '#7a9f83', gold: '#efdf9f', dark: '#355659', glass: '#add3ca' })

export function createHelpers(scene) {
  const updates = [], registry = new Map(), materials = new Map(), geometries = new Map()
  const ramp = new THREE.DataTexture(new Uint8Array([110, 166, 212, 248]), 4, 1, THREE.RedFormat)
  ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true
  const mat = (color = palette.concrete, options = {}) => {
    const key = JSON.stringify([color, options])
    if (!materials.has(key)) materials.set(key, new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...options }))
    return materials.get(key)
  }
  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#4c7370', transparent: true, opacity: .23, depthWrite: false })
  const outline = mesh => {
    const edges = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, 32), outlineMaterial)
    edges.name = 'fine-ink-outline'; mesh.add(edges); return mesh
  }
  const mesh = (parent, geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], ink = true) => {
    const material = color?.isMaterial ? color : mat(color)
    const object = new THREE.Mesh(geometry, material)
    object.position.fromArray(position); object.rotation.set(...rotation); object.castShadow = !material.transparent; object.receiveShadow = true
    parent.add(object); if (ink && !material.transparent) outline(object)
    return object
  }
  const box = (parent, size, position, color = palette.concrete, rotation = [0, 0, 0], ink = true) => {
    const key = 'box:' + size.join(','); if (!geometries.has(key)) geometries.set(key, new THREE.BoxGeometry(...size))
    return mesh(parent, geometries.get(key), color, position, rotation, ink)
  }
  const cylinder = (parent, top, bottom, height, position, color = palette.metal, segments = 14) =>
    mesh(parent, new THREE.CylinderGeometry(top, bottom, height, segments), color, position)
  const sphere = (parent, radius, position, color = palette.foam, segments = 10) =>
    mesh(parent, new THREE.SphereGeometry(radius, segments, Math.max(5, Math.floor(segments / 2))), color, position, [0, 0, 0], false)
  const beam = (parent, a, b, width, color = palette.metal) => {
    const start = new THREE.Vector3(...a), end = new THREE.Vector3(...b)
    const result = box(parent, [width, start.distanceTo(end), width], start.clone().add(end).multiplyScalar(.5).toArray(), color)
    result.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), end.sub(start).normalize()); return result
  }
  const curve = (parent, points, color = palette.rope, radius = .018) => mesh(parent,
    new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points.map(p => new THREE.Vector3(...p))), 24, radius, 5, false), color, [0, 0, 0], [0, 0, 0], false)
  const line = (parent, points, color = palette.deep, opacity = .5) => {
    const result = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points.map(p => new THREE.Vector3(...p))),
      new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: false }))
    parent.add(result); return result
  }
  const label = (parent, text, width, position, rotation = [0, 0, 0], color = '#547775', background = '#e6e5cb') => {
    const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256
    const c = canvas.getContext('2d'); c.fillStyle = background; c.fillRect(0, 0, 768, 256)
    c.fillStyle = color; c.font = 'bold 72px "Yu Gothic", "Microsoft YaHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
    c.fillText(text, 384, 128, 730)
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
    return mesh(parent, new THREE.PlaneGeometry(width, width / 3), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), position, rotation, false)
  }
  let seed = 18720
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
  const animate = (object, fn) => { object.userData.dynamic = true; updates.push(fn); return object }
  return { THREE, scene, palette, mat, mesh, box, cylinder, sphere, beam, curve, line, label, outline, rand, animate, updates, registry }
}
