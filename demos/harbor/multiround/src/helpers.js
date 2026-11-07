import * as THREE from 'three'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'

export const palette = Object.freeze({ concrete: '#c3cfcb', concreteLight: '#e0e5dc', concreteDark: '#849f9b', water: '#79c4bc',
  deep: '#316e77', foam: '#e0f4e8', hull: '#f5f3df', rust: '#aa7755', metal: '#4d6766', yellow: '#ead17d', orange: '#c77d5c',
  rope: '#a17b57', blue: '#7da9bd', green: '#7a9f83', gold: '#efdf9f', dark: '#355659', glass: '#add3ca' })

export function createHelpers(scene) {
  const updates = [], registry = new Map(), materials = new Map(), geometries = new Map(), textures = new Map()
  // Round 2: the four toon steps are pulled down a little at the dark end so the
  // pale concrete, the sea-glass water and the boat hulls stop reading as one
  // flat ivory field. The ramp is only a scalar light multiplier, so every
  // module keeps its authored colour.
  const ramp = new THREE.DataTexture(new Uint8Array([92, 148, 198, 240]), 4, 1, THREE.RedFormat)
  ramp.minFilter = THREE.NearestFilter; ramp.magFilter = THREE.NearestFilter; ramp.needsUpdate = true
  const mat = (color = palette.concrete, options = {}) => {
    const key = JSON.stringify([color, options])
    if (!materials.has(key)) materials.set(key, new THREE.MeshToonMaterial({ color, gradientMap: ramp, ...options }))
    return materials.get(key)
  }
  // A slightly cooler, a touch stronger ink keeps small props readable in the
  // high-key field without turning the low-poly cylinders into a cage of lines.
  const outlineMaterial = new THREE.LineBasicMaterial({ color: '#436b67', transparent: true, opacity: .28, depthWrite: false })
  const cached = (key, factory) => {
    if (!geometries.has(key)) geometries.set(key, factory())
    return geometries.get(key)
  }
  // Ink edges are derived from a geometry, so identical geometries share one
  // EdgesGeometry instead of building and storing one per mesh.
  const edgeGeometry = source => cached('edges:' + source.uuid, () => new THREE.EdgesGeometry(source, 32))
  const outline = mesh => {
    const edges = new THREE.LineSegments(edgeGeometry(mesh.geometry), outlineMaterial)
    edges.name = 'fine-ink-outline'; mesh.add(edges); return mesh
  }
  const mesh = (parent, geometry, color, position = [0, 0, 0], rotation = [0, 0, 0], ink = true) => {
    const material = color?.isMaterial ? color : mat(color)
    const object = new THREE.Mesh(geometry, material)
    object.position.fromArray(position); object.rotation.set(...rotation); object.castShadow = !material.transparent; object.receiveShadow = true
    parent.add(object); if (ink && !material.transparent) outline(object)
    return object
  }
  const box = (parent, size, position, color = palette.concrete, rotation = [0, 0, 0], ink = true) =>
    mesh(parent, cached('box:' + size.join(','), () => new THREE.BoxGeometry(...size)), color, position, rotation, ink)
  const cylinder = (parent, top, bottom, height, position, color = palette.metal, segments = 14) =>
    mesh(parent, cached(`cyl:${top}|${bottom}|${height}|${segments}`, () => new THREE.CylinderGeometry(top, bottom, height, segments)), color, position)
  const sphere = (parent, radius, position, color = palette.foam, segments = 10) =>
    mesh(parent, cached(`sph:${radius}|${segments}`, () => new THREE.SphereGeometry(radius, segments, Math.max(5, Math.floor(segments / 2)))), color, position, [0, 0, 0], false)
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
    const key = [text, color, background].join('|')
    if (!textures.has(key)) {
      const canvas = document.createElement('canvas'); canvas.width = 768; canvas.height = 256
      const c = canvas.getContext('2d'); c.fillStyle = background; c.fillRect(0, 0, 768, 256)
      c.fillStyle = color; c.font = 'bold 72px "Yu Gothic", "Microsoft YaHei", sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'
      c.fillText(text, 384, 128, 730)
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace
      textures.set(key, texture)
    }
    return mesh(parent, cached('label:' + width, () => new THREE.PlaneGeometry(width, width / 3)),
      new THREE.MeshBasicMaterial({ map: textures.get(key), side: THREE.DoubleSide }), position, rotation, false)
  }
  let seed = 18720
  const rand = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296 }
  const animate = (object, fn) => { object.userData.dynamic = true; updates.push(fn); return object }

  // --------------------------------------------------------------- batching
  // Round 2 performance pass: everything that no animate() callback can move is
  // baked into one draw call per material (plus one merged ink-line batch).
  // Safety rules:
  //  * anything carrying userData.dynamic (set by animate()) and every ancestor
  //    or descendant of it stays exactly as authored, so boats, rain, flags,
  //    gulls, fish, clouds and the water surface keep their motion;
  //  * invisible subtrees, transparent / custom / multi-material meshes,
  //    non-merged children, registry-shared objects and objects with custom
  //    userData are skipped;
  //  * geometry is grouped by attribute signature and index mode, so mixed
  //    primitives never force an incompatible merge;
  //  * a mesh is only removed when its ink children were merged too, world
  //    transforms and castShadow/receiveShadow are baked, materials are reused;
  //  * merging happens before any removal, so a failure leaves the authored
  //    scene fully intact and rendering.
  const batchStatic = (root, options = {}) => {
    const result = { ok: false, batches: 0, meshes: 0, mergedMeshes: 0, inks: 0,
      skippedDynamic: 0, skippedOpaque: 0, error: null }
    if (!root || options.disabled) return result
    let groups
    try {
      root.updateMatrixWorld(true)
      const rootInverse = new THREE.Matrix4().copy(root.matrixWorld).invert()
      const offset = new THREE.Matrix4()
      const dynamic = new Set()
      root.traverse(object => { if (object.userData && object.userData.dynamic) dynamic.add(object) })
      // registry entries may be touched by other modules at runtime
      const shared = new Set()
      for (const value of registry.values()) if (value && value.isObject3D) value.traverse(object => shared.add(object))
      const moving = object => { for (let node = object; node; node = node.parent) if (dynamic.has(node)) return true; return false }
      const hidden = object => { for (let node = object; node; node = node.parent) if (node.visible === false) return true; return false }
      const isInk = object => object.isLineSegments && object.material === outlineMaterial
      const signature = geometry => {
        const names = Object.keys(geometry.attributes).sort()
        const attrs = names.map(name => `${name}:${geometry.attributes[name].itemSize}:${geometry.attributes[name].normalized ? 1 : 0}`)
        return attrs.join(',') + '|i' + (geometry.index ? 1 : 0)
      }
      const mergeList = list => {
        const parts = list.map(member => {
          const part = member.geometry.clone()
          part.applyMatrix4(offset.copy(rootInverse).multiply(member.matrixWorld))
          return part
        })
        try { return mergeGeometries(parts, false) } finally { parts.forEach(part => part.dispose()) }
      }

      // pass 1: ink outlines (they are LineSegments children of their mesh)
      const inks = new Map()
      root.traverse(object => {
        if (object === root || !isInk(object)) return
        if (moving(object) || hidden(object) || shared.has(object)) { result.skippedDynamic++; return }
        // Underwater ink stays per-object so it is still tinted by the water
        // surface; above the water it is grouped into spatial cells so the ink
        // keeps blending roughly back-to-front with glass, water and rain.
        if (object.matrixWorld.elements[13] < 0.25) { result.skippedOpaque++; return }
        const cell = Math.floor((object.matrixWorld.elements[12] + 6) / 4) + ':' + Math.floor((object.matrixWorld.elements[14] + 6) / 4)
        const key = cell + '|' + signature(object.geometry)
        if (!inks.has(key)) inks.set(key, [])
        inks.get(key).push(object)
      })
      const inkBatches = [], mergedInk = new Set()
      for (const list of inks.values()) {
        if (list.length < 2) continue
        const merged = mergeList(list)
        if (!merged) continue
        merged.computeBoundingSphere()
        inkBatches.push({ object: new THREE.LineSegments(merged, outlineMaterial), members: list })
        list.forEach(member => mergedInk.add(member))
        result.inks += list.length
      }

      // pass 2: opaque static meshes, only when no authored child has to stay
      const meshes = new Map()
      root.traverse(object => {
        if (object === root || !object.isMesh) return
        result.meshes++
        if (moving(object)) { result.skippedDynamic++; return }
        if (hidden(object) || shared.has(object)) { result.skippedOpaque++; return }
        if (Array.isArray(object.material) || object.material.transparent || object.material.opacity < 1 || object.material.vertexColors) { result.skippedOpaque++; return }
        if (object.material.isShaderMaterial) { result.skippedOpaque++; return }
        if (object.renderOrder !== 0 || object.layers.mask !== 1) { result.skippedOpaque++; return }
        if (object.isInstancedMesh || object.isSkinnedMesh || !object.geometry || !object.geometry.isBufferGeometry) { result.skippedOpaque++; return }
        if (object.geometry.isInstancedBufferGeometry || Object.keys(object.geometry.morphAttributes || {}).length) { result.skippedOpaque++; return }
        if (object.geometry.drawRange.count !== Infinity) { result.skippedOpaque++; return }
        if (Object.keys(object.userData || {}).length) { result.skippedOpaque++; return }
        if (!object.children.every(child => isInk(child) && mergedInk.has(child))) { result.skippedOpaque++; return }
        const key = object.material.uuid + '|' + signature(object.geometry)
        if (!meshes.has(key)) meshes.set(key, [])
        meshes.get(key).push(object)
      })
      groups = inkBatches.slice()
      for (const list of meshes.values()) {
        if (list.length < 2) continue
        const merged = mergeList(list)
        if (!merged) { result.skippedOpaque += list.length; continue }
        merged.computeBoundingBox(); merged.computeBoundingSphere()
        const batch = new THREE.Mesh(merged, list[0].material)
        batch.name = 'static-batch'
        batch.castShadow = list.some(member => member.castShadow); batch.receiveShadow = true
        groups.push({ object: batch, members: list })
        result.mergedMeshes += list.length
      }
    } catch (error) {
      result.error = String(error)
      return result
    }
    try {
      for (const { object, members } of groups) {
        root.add(object)
        for (const member of members) member.removeFromParent()
      }
      result.batches = groups.length
      result.ok = true
    } catch (error) {
      result.error = String(error)
    }
    return result
  }

  return { THREE, scene, palette, mat, mesh, box, cylinder, sphere, beam, curve, line, label, outline, rand, animate, batchStatic, updates, registry }
}
