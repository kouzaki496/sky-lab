import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

const SEGMENTS = 72
const SPHERE_GRID_LONGITUDE = 12
const SPHERE_GRID_LATITUDE = 24

/** テクスチャ中央 (u=0.5) を正面 (+Z) に向ける回転（transition で unwrap 時にも適用するため export） */
export const SPHERE_GRID_ROTATION_Y = -Math.PI / 2

export const SIZE_CONFIG = {
  sphereRadius: 70,
  planeWidth: 6,
  planeHeight: 3,
  unwrap: {
    sphereScale: 0.04,
    spherePositionY: 1.5,
    planePositionY: -3,
    cameraZ: 8
  }
}

export const UNWRAP_FRONT_DIRECTION = new THREE.Vector3(
  0,
  -SIZE_CONFIG.unwrap.spherePositionY,
  SIZE_CONFIG.unwrap.cameraZ
).normalize()

export type SceneContext = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  canvas: HTMLCanvasElement
  sphere: THREE.Mesh
  sphereWireframe: THREE.LineSegments
  sphereMeridians: THREE.LineSegments
  sphereEquator: THREE.LineLoop
  plane: THREE.Mesh
  planeGrid: THREE.LineSegments
  planeEquator: THREE.Line
  planeMaterial: THREE.MeshBasicMaterial
  goreMesh: THREE.Mesh
  goreMorphMesh: THREE.Mesh
  unfoldMesh: THREE.Mesh
}

/**
 * 球体の経線: 北極から南極へ、一定の方位角に沿った半円。
 * ジオメトリの「列」の頂点を ix 固定で iy を 0..heightSegments につなぐ。
 */
function createSphereMeridiansFromGeometry(
  geometry: THREE.SphereGeometry,
  segmentsLon: number
): THREE.LineSegments {
  const pos = geometry.getAttribute("position")
  const { widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const positions: number[] = []
  const step = Math.max(1, Math.floor((widthSegments + 1) / segmentsLon))

  for (let ix = 0; ix <= widthSegments; ix += step) {
    for (let iy = 0; iy < heightSegments; iy++) {
      const i0 = iy * W + ix
      const i1 = (iy + 1) * W + ix
      positions.push(
        pos.getX(i0), pos.getY(i0), pos.getZ(i0),
        pos.getX(i1), pos.getY(i1), pos.getZ(i1)
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38, depthWrite: false })
  )
}

/**
 * 球体グリッド: 緯線のみ。ジオメトリの「行」の y を使い、平面 y=const に円を描く（赤道と平行）
 * 円の半径 R = sqrt(r² - y²)、Three.js の x,z の向き: x=-R*cos(phi), z=R*sin(phi)
 */
function createSphereGridFromGeometry(
  geometry: THREE.SphereGeometry,
  _segmentsLog: number,
  segmentsLat: number
): THREE.LineSegments {
  const pos = geometry.getAttribute("position")
  const { radius, widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const positions: number[] = []
  const parallelSteps = 64

  for (let j = 1; j < segmentsLat; j++) {
    const iy = Math.round((j / segmentsLat) * heightSegments)
    if (iy <= 0 || iy >= heightSegments) continue
    const idx = iy * W
    const yRow = pos.getY(idx)
    const R = Math.sqrt(Math.max(0, radius * radius - yRow * yRow))
    for (let i = 0; i < parallelSteps; i++) {
      const phi0 = (i / parallelSteps) * Math.PI * 2
      const phi1 = ((i + 1) / parallelSteps) * Math.PI * 2
      const x0 = -R * Math.cos(phi0)
      const z0 = R * Math.sin(phi0)
      const x1 = -R * Math.cos(phi1)
      const z1 = R * Math.sin(phi1)
      positions.push(x0, yRow, z0, x1, yRow, z1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38, depthWrite: false })
  )
}

/** 赤道 **/
function createSphereEquatorFromGeometry(geometry: THREE.SphereGeometry): THREE.LineLoop {
  const pos = geometry.getAttribute("position")
  const { widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const iyEquator = Math.round(heightSegments / 2)
  const positions: number[] = []

  for (let ix = 0; ix <= widthSegments; ix++) {
    const i = iyEquator * W + ix
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineLoop(
    geo,
    new THREE.LineBasicMaterial({ color: 0xcc3333, linewidth: 2, depthWrite: false })
  )
}

/** 平面用グリッド */
function createPlaneGrid(w: number, h: number, segX: number, segY: number): THREE.LineSegments {
  const hw = w / 2, hh = h / 2, positions: number[] = [], z = 0.002
  for (let i = 0; i <= segX; i++) {
    const x = -hw + (w * i) / segX
    positions.push(x, -hh, z, x, hh, z)
  }
  for (let j = 0; j <= segY; j++) {
    const y = -hh + (h * j) / segY
    positions.push(-hw, y, z, hw, y, z)
  }
  const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38 }))
}

/** 平面の赤道 */
function createPlaneEquator(width: number): THREE.Line {
  const hw = width / 2, z = 0.003
  const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-hw, 0, z, hw, 0, z], 3))
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xcc3333, linewidth: 2 }))
}

/** 橙の皮（ゴア）型の展開図。各片は上下で尖り中央で幅最大、横に並べる。 */
function createGoreUnwrapMesh(texture: THREE.Texture, numGores: number, latSteps: number): THREE.Mesh {
  const totalW = SIZE_CONFIG.planeWidth
  const totalH = SIZE_CONFIG.planeHeight
  const goreW = totalW / numGores
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const z = 0.001

  for (let g = 0; g < numGores; g++) {
    const xOffset = (g - (numGores - 1) / 2) * goreW
    for (let j = 0; j <= latSteps; j++) {
      const v = j / latSteps
      const t = v * Math.PI
      const halfW = (goreW / 2) * Math.sin(t)
      const y = totalH / 2 - v * totalH
      positions.push(xOffset - halfW, y, z, xOffset + halfW, y, z)
      uvs.push(g / numGores, 1 - v, (g + 1) / numGores, 1 - v)
    }
  }
  for (let g = 0; g < numGores; g++) {
    for (let j = 0; j < latSteps; j++) {
      const a = (g * (latSteps + 1) + j) * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  return new THREE.Mesh(geo, mat)
}

/** 経線を強調するだけ（切れ目は作らない）。法線方向に少し押し出して稜線に見せる */
const GORE_MERIDIAN_EMPHASIS = 0.05
/** 赤道を接着したまま上下をはがす角度（ラジアン） */
const GORE_EQUATOR_PEEL_ANGLE = (55 * Math.PI) / 180
/** はがれ状態の縦方向スケール（縦が縮んで見えるのを補正） */
const GORE_EQUATOR_RING_V_SCALE = 1.14
/** 平面展開時の高さスケール（同様に縦縮みを補正） */
const GORE_FLAT_V_SCALE = 1.12

/** ベクトル v を原点を通る軸 ax まわりに angle ラジアン回転 */
function rotateAroundAxis(vx: number, vy: number, vz: number, ax: number, ay: number, az: number, angle: number): [number, number, number] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dot = ax * vx + ay * vy + az * vz
  const crossX = ay * vz - az * vy
  const crossY = az * vx - ax * vz
  const crossZ = ax * vy - ay * vx
  return [
    vx * c + crossX * s + ax * dot * (1 - c),
    vy * c + crossY * s + ay * dot * (1 - c),
    vz * c + crossZ * s + az * dot * (1 - c)
  ]
}

/** 3段階: 球体 → 経線強調 → 赤道で接着・上下はがれ（円状） → 平面。3つの morphTarget で補間。 */
function createSphereToGoreMorphMesh(
  texture: THREE.Texture,
  numGores: number,
  latSteps: number
): THREE.Mesh {
  const totalW = SIZE_CONFIG.planeWidth / 1.4
  const totalH = SIZE_CONFIG.planeHeight / 1.4
  const goreW = totalW / numGores
  const r = 2
  const positions: number[] = []
  const positionsSlit: number[] = []
  const positionsEquatorRing: number[] = []
  const positionsFlat: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const z = 0.001

  for (let g = 0; g < numGores; g++) {
    const xOffset = (g - (numGores - 1) / 2) * goreW
    const phiCenter = ((g + 0.5) / numGores) * Math.PI * 2
    const ax = Math.sin(phiCenter)
    const ay = 0
    const az = Math.cos(phiCenter)
    for (let j = 0; j <= latSteps; j++) {
      const v = j / latSteps
      const theta = v * Math.PI
      const phiL = (g / numGores) * Math.PI * 2
      const phiR = ((g + 1) / numGores) * Math.PI * 2
      const xL = -r * Math.sin(theta) * Math.cos(phiL)
      const yL = r * Math.cos(theta)
      const zL = r * Math.sin(theta) * Math.sin(phiL)
      const xR = -r * Math.sin(theta) * Math.cos(phiR)
      const yR = r * Math.cos(theta)
      const zR = r * Math.sin(theta) * Math.sin(phiR)
      positions.push(xL, yL, zL, xR, yR, zR)
      const nL = Math.sqrt(xL * xL + yL * yL + zL * zL) || 1
      const nR = Math.sqrt(xR * xR + yR * yR + zR * zR) || 1
      const push = GORE_MERIDIAN_EMPHASIS
      const sLx = xL + (xL / nL) * push
      const sLy = yL + (yL / nL) * push
      const sLz = zL + (zL / nL) * push
      const sRx = xR + (xR / nR) * push
      const sRy = yR + (yR / nR) * push
      const sRz = zR + (zR / nR) * push
      positionsSlit.push(sLx, sLy, sLz, sRx, sRy, sRz)
      const peelAngle =
        v < 0.5
          ? ((0.5 - v) / 0.5) * GORE_EQUATOR_PEEL_ANGLE
          : -((v - 0.5) / 0.5) * GORE_EQUATOR_PEEL_ANGLE
      const [eLx, eLy, eLz] = rotateAroundAxis(sLx, sLy, sLz, ax, ay, az, peelAngle)
      const [eRx, eRy, eRz] = rotateAroundAxis(sRx, sRy, sRz, ax, ay, az, peelAngle)
      positionsEquatorRing.push(eLx, eLy * GORE_EQUATOR_RING_V_SCALE, eLz, eRx, eRy * GORE_EQUATOR_RING_V_SCALE, eRz)
      const t = v * Math.PI
      const halfW = (goreW / 2) * Math.sin(t)
      const yFlat = (totalH / 2 - v * totalH) * GORE_FLAT_V_SCALE
      positionsFlat.push(xOffset - halfW, yFlat, z, xOffset + halfW, yFlat, z)
      uvs.push(g / numGores, 1 - v, (g + 1) / numGores, 1 - v)
    }
  }
  for (let g = 0; g < numGores; g++) {
    for (let j = 0; j < latSteps; j++) {
      const a = (g * (latSteps + 1) + j) * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const positionsM1: number[] = []
  const positionsM2: number[] = []
  for (let i = 0; i < positions.length; i++) {
    positionsM1.push(positions[i] + (positionsEquatorRing[i] - positionsSlit[i]))
    positionsM2.push(positions[i] + (positionsFlat[i] - positionsEquatorRing[i]))
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.setAttribute("morphTarget0", new THREE.Float32BufferAttribute(positionsSlit, 3))
  geo.setAttribute("morphTarget1", new THREE.Float32BufferAttribute(positionsM1, 3))
  geo.setAttribute("morphTarget2", new THREE.Float32BufferAttribute(positionsM2, 3))
  geo.morphAttributes.position = [
    geo.getAttribute("morphTarget0") as THREE.BufferAttribute,
    geo.getAttribute("morphTarget1") as THREE.BufferAttribute,
    geo.getAttribute("morphTarget2") as THREE.BufferAttribute
  ]
  geo.computeVertexNormals()
  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(1.4)
  mesh.frustumCulled = false
  return mesh
}

const UNFOLD_LON = 12
const UNFOLD_LAT = 8

/**
 * 経線に沿って球→平面に開くモーフメッシュ。
 * 球（1枚の経線で切った形）と矩形が同じトポロジーで、morphTarget で補間。
 */
function createUnfoldMesh(texture: THREE.Texture): THREE.Mesh {
  const W = UNFOLD_LON + 1
  const H = UNFOLD_LAT + 1
  const r = 2
  const flatW = SIZE_CONFIG.planeWidth / 1.4
  const flatH = SIZE_CONFIG.planeHeight / 1.4
  const positions: number[] = []
  const positionsFlat: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let j = 0; j < H; j++) {
    const theta = (j / UNFOLD_LAT) * Math.PI
    for (let i = 0; i < W; i++) {
      const phi = (i / UNFOLD_LON) * Math.PI * 2
      const x = -r * Math.sin(theta) * Math.cos(phi)
      const y = r * Math.cos(theta)
      const z = r * Math.sin(theta) * Math.sin(phi)
      positions.push(x, y, z)
      const fx = (i / UNFOLD_LON - 0.5) * flatW
      const fy = (j / UNFOLD_LAT - 0.5) * flatH
      positionsFlat.push(fx, fy, 0.001)
      uvs.push(i / UNFOLD_LON, j / UNFOLD_LAT)
    }
  }
  for (let j = 0; j < UNFOLD_LAT; j++) {
    for (let i = 0; i < UNFOLD_LON; i++) {
      const a = j * W + i
      const b = a + 1
      const c = a + W
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.setAttribute("morphTarget0", new THREE.Float32BufferAttribute(positionsFlat, 3))
  geo.morphAttributes.position = [geo.getAttribute("morphTarget0") as THREE.BufferAttribute]
  geo.computeVertexNormals()

  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(1.4)
  mesh.frustumCulled = false
  return mesh
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(0, 0, 0.1)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.rotateSpeed = -0.25

  const texture = new THREE.TextureLoader().load("/panorama.jpg")
  texture.colorSpace = THREE.SRGBColorSpace

  // --- 球体 ---
  const sphereGeometry = new THREE.SphereGeometry(SIZE_CONFIG.sphereRadius, SEGMENTS, SEGMENTS)
  const sphereMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)

  // テクスチャ中央を正面に向ける
  sphere.rotation.y = SPHERE_GRID_ROTATION_Y
  scene.add(sphere)

  const sphereWireframe = createSphereGridFromGeometry(sphereGeometry, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  sphereWireframe.visible = false
  sphere.add(sphereWireframe)

  const sphereMeridians = createSphereMeridiansFromGeometry(sphereGeometry, SPHERE_GRID_LONGITUDE)
  sphereMeridians.visible = false
  sphere.add(sphereMeridians)

  const sphereEquator = createSphereEquatorFromGeometry(sphereGeometry)
  sphereEquator.visible = false
  sphere.add(sphereEquator)

  // --- 平面 ---
  const planeGeometry = new THREE.PlaneGeometry(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SEGMENTS, Math.round(SEGMENTS / 2))
  const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.position.set(0, SIZE_CONFIG.unwrap.planePositionY, 0)
  plane.visible = false
  scene.add(plane)

  const planeGrid = createPlaneGrid(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  planeGrid.visible = false
  plane.add(planeGrid)

  const planeEquator = createPlaneEquator(SIZE_CONFIG.planeWidth)
  plane.add(planeEquator)

  const goreMesh = createGoreUnwrapMesh(texture, SPHERE_GRID_LONGITUDE, 24)
  goreMesh.position.set(0, SIZE_CONFIG.unwrap.planePositionY, 0)
  goreMesh.visible = false
  scene.add(goreMesh)

  const goreMorphMesh = createSphereToGoreMorphMesh(texture, SPHERE_GRID_LONGITUDE, 24)
  goreMorphMesh.visible = false
  goreMorphMesh.morphTargetInfluences = [0, 0, 0]
  scene.add(goreMorphMesh)

  const unfoldMesh = createUnfoldMesh(texture)
  unfoldMesh.position.set(0, SIZE_CONFIG.unwrap.planePositionY, 0)
  unfoldMesh.visible = false
  unfoldMesh.morphTargetInfluences = [1]
  scene.add(unfoldMesh)

  scene.add(new THREE.AmbientLight(0xffffff, 1.0))

  return {
    scene, camera, renderer, controls, canvas: renderer.domElement,
    sphere, sphereWireframe, sphereMeridians, sphereEquator,
    plane, planeGrid, planeEquator, planeMaterial,
    goreMesh, goreMorphMesh, unfoldMesh
  }
}