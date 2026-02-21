import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

const SEGMENTS = 72
const SPHERE_GRID_LONGITUDE = 12
const SPHERE_GRID_LATITUDE = 24

/** テクスチャ中央 (u=0.5) を正面 (+Z) に向ける回転（transition で unwrap 時にも適用するため export） */
export const SPHERE_GRID_ROTATION_Y = -Math.PI / 2

export const SIZE_CONFIG = {
  sphereRadius: 70,
  planeWidth: 8,
  planeHeight: 4,
  unwrap: {
    sphereScale: 0.04,
    spherePositionX: -4,
    planePositionX: 4,
    cameraZ: 8
  }
}

export type SceneContext = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  canvas: HTMLCanvasElement
  sphere: THREE.Mesh
  sphereWireframe: THREE.LineSegments
  sphereEquator: THREE.LineLoop
  /** 赤道〜直上緯線の距離を等間隔で示す定規（平行なら全長一致） */
  sphereEquatorRulers: THREE.LineSegments
  /** 検証用: 回転なしの別球体＋同じロジックのグリッド（頂点ずれの比較用） */
  testSphere: THREE.Group
  plane: THREE.Mesh
  planeGrid: THREE.LineSegments
  planeEquator: THREE.Line
  planeMaterial: THREE.MeshBasicMaterial
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

/**
 * 赤道と一番近い緯線の距離を、等間隔の phi で測る線（定規）。
 * 平行なら全ての線の長さが一致する。表示用に黄色で描く。
 */
function createEquatorToFirstLatRulers(
  geometry: THREE.SphereGeometry,
  segmentsLat: number,
  numRulers: number
): THREE.LineSegments {
  const pos = geometry.getAttribute("position")
  const { radius, widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const iyEquator = Math.round(heightSegments / 2)
  const iyFirst = Math.round((1 / segmentsLat) * heightSegments)
  if (iyFirst <= 0 || iyFirst >= heightSegments) {
    return new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: 0xffff00 }))
  }
  const yFirst = pos.getY(iyFirst * W)
  const RFirst = Math.sqrt(Math.max(0, radius * radius - yFirst * yFirst))
  const positions: number[] = []
  const lengths: number[] = []
  for (let k = 0; k < numRulers; k++) {
    const ix = Math.round((k / numRulers) * widthSegments) % (widthSegments + 1)
    const iEq = iyEquator * W + ix
    const xEq = pos.getX(iEq)
    const yEq = pos.getY(iEq)
    const zEq = pos.getZ(iEq)
    const phi = (ix / widthSegments) * Math.PI * 2
    const xLat = -RFirst * Math.cos(phi)
    const zLat = RFirst * Math.sin(phi)
    positions.push(xEq, yEq, zEq, xLat, yFirst, zLat)
    const len = Math.hypot(xLat - xEq, yFirst - yEq, zLat - zEq)
    lengths.push(len)
  }
  const minL = Math.min(...lengths)
  const maxL = Math.max(...lengths)
  const equal = maxL - minL < 1e-6
  if (typeof console !== "undefined" && console.log) {
    console.log(
      "[定規] 赤道〜直上緯線の距離:",
      lengths.map((l) => l.toFixed(6)).join(", "),
      equal ? "→ 等距離" : `→ ばらつきあり (min=${minL.toFixed(6)}, max=${maxL.toFixed(6)})`
    )
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0xddcc00, linewidth: 2, depthWrite: false })
  )
}

/** 赤道: ジオメトリの中央リング（heightSegments/2）をそのまま取得 */
function createSphereEquatorFromGeometry(geometry: THREE.SphereGeometry): THREE.LineLoop {
  const pos = geometry.getAttribute("position")
  const { widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const iyEquator = Math.round(heightSegments / 2) // 垂直方向のど真ん中
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

  const texture = new THREE.TextureLoader().load("/panorama2.jpg")
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

  const sphereEquator = createSphereEquatorFromGeometry(sphereGeometry)
  sphereEquator.visible = false
  sphere.add(sphereEquator)

  const sphereEquatorRulers = createEquatorToFirstLatRulers(sphereGeometry, SPHERE_GRID_LATITUDE, 12)
  sphereEquatorRulers.visible = false
  sphere.add(sphereEquatorRulers)

  // --- 検証用: 別球体（回転なし・同じグリッドロジックで頂点ずれを比較）---
  const testRadius = 1
  const testGeometry = new THREE.SphereGeometry(testRadius, SEGMENTS, SEGMENTS)
  const testMesh = new THREE.Mesh(
    testGeometry,
    new THREE.MeshBasicMaterial({ color: 0xe0e0e0, side: THREE.DoubleSide })
  )
  const testGrid = createSphereGridFromGeometry(testGeometry, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  const testEquator = createSphereEquatorFromGeometry(testGeometry)
  const testEquatorRulers = createEquatorToFirstLatRulers(testGeometry, SPHERE_GRID_LATITUDE, 12)
  const testSphere = new THREE.Group()
  testSphere.add(testMesh)
  testSphere.add(testGrid)
  testSphere.add(testEquator)
  testSphere.add(testEquatorRulers)
  testSphere.position.set(3, 0, 0) // unwrap 時カメラから見て本球の右
  testSphere.scale.setScalar(SIZE_CONFIG.sphereRadius * 0.04 / testRadius) // 本球と同程度の見かけの大きさ
  testSphere.visible = false
  scene.add(testSphere)

  // --- 平面 ---
  const planeGeometry = new THREE.PlaneGeometry(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SEGMENTS, Math.round(SEGMENTS / 2))
  const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.position.set(SIZE_CONFIG.unwrap.planePositionX, 0, 0)
  plane.visible = false
  scene.add(plane)

  const planeGrid = createPlaneGrid(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  planeGrid.visible = false
  plane.add(planeGrid)

  const planeEquator = createPlaneEquator(SIZE_CONFIG.planeWidth)
  plane.add(planeEquator)

  scene.add(new THREE.AmbientLight(0xffffff, 1.0))

  return {
    scene, camera, renderer, controls, canvas: renderer.domElement,
    sphere, sphereWireframe, sphereEquator, sphereEquatorRulers, testSphere,
    plane, planeGrid, planeEquator, planeMaterial
  }
}