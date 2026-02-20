import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

// シーン
const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

// カメラ
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.set(0, 0, 0.1) // 最初から球の内側（パノラマ視点）

// レンダラー
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const canvas = renderer.domElement
canvas.style.touchAction = "none"
canvas.style.cursor = "grab"

// カメラ操作
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableZoom = false
controls.enablePan = false
controls.enableDamping = true
controls.dampingFactor = 0.05
controls.rotateSpeed = -0.25
controls.enableZoom = false
controls.enablePan = false
controls.touches.TWO = THREE.TOUCH.ROTATE

// 球体ジオメトリ
const geometry = new THREE.SphereGeometry(50, 64, 64)

// テクスチャ読込
const texture = new THREE.TextureLoader().load("/panorama2.jpg")

texture.colorSpace = THREE.SRGBColorSpace
texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

const material = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.BackSide
})

const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

// ライト
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

const ambient = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambient)

// 平面ジオメトリ（2:1 = 経度:緯度の展開用）
const planeGeometry = new THREE.PlaneGeometry(4, 2)
const planeMaterial = new THREE.MeshBasicMaterial({
  map: texture,
  side: THREE.DoubleSide
})
const plane = new THREE.Mesh(planeGeometry, planeMaterial)
plane.position.set(3, 0, 0)
plane.visible = false
planeMaterial.transparent = true
planeMaterial.opacity = 0
scene.add(plane)

let mode = "world"
let transitioning = false
let transitionStart = 0
const DURATION = 1800 // ms

// easeInOutCubic: 最初と最後がゆっくり
function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

// World → Unwrap: カメラが引き、球が縮んで左へ、平面が右に現れる
function startToUnwrap() {
  if (mode === "unwrap" || transitioning) return
  transitioning = true
  transitionStart = performance.now()
}

// Unwrap → World: カメラが中へ、球が中央で大きく、平面が消える
function startToWorld() {
  if (mode === "world" || transitioning) return
  transitioning = true
  transitionStart = performance.now()
}

function updateTransition() {
  if (!transitioning) return
  const elapsed = performance.now() - transitionStart
  const t = Math.min(elapsed / DURATION, 1)
  const s = easeInOutCubic(t)

  if (mode === "world") {
    // → Unwrap
    camera.position.set(0, 0, 0.1 + 7.9 * s)
    sphere.scale.setScalar(1 - 0.96 * s)
    sphere.position.set(-3 * s, 0, 0)
    plane.visible = true
    planeMaterial.opacity = s
    plane.position.set(3, 0, 0)
    controls.target.set(0, 0, 0)
    if (t >= 1) {
      transitioning = false
      setUnwrap()
    }
  } else {
    // → World
    camera.position.set(0, 0, 0.1 + 7.9 * (1 - s))
    sphere.scale.setScalar(0.04 + 0.96 * (1 - s))
    sphere.position.set(-3 * (1 - s), 0, 0)
    planeMaterial.opacity = 1 - s
    controls.target.set(0, 0, 0)
    if (t >= 1) {
      transitioning = false
      setWorld()
    }
  }
}

// 初期状態: パノラマ（球の内側）
function setWorld() {
  mode = "world"
  plane.visible = false
  planeMaterial.opacity = 0
  sphere.scale.setScalar(1)
  sphere.position.set(0, 0, 0)
  camera.position.set(0, 0, 0.1)
  controls.target.set(0, 0, 0)
  camera.lookAt(0, 0, 0)
}

function setUnwrap() {
  mode = "unwrap"
  plane.visible = true
  planeMaterial.opacity = 1
  sphere.scale.setScalar(0.04)
  sphere.position.set(-3, 0, 0)
  plane.position.set(3, 0, 0)
  camera.position.set(0, 0, 8)
  controls.target.set(0, 0, 0)
  camera.lookAt(0, 0, 0)
}

// World モード時はカメラを球の内側（半径0.1）に固定
const _worldDir = new THREE.Vector3()
function clampCameraInSphere() {
  if (mode !== "world" || transitioning) return
  _worldDir.subVectors(camera.position, controls.target)
  const len = _worldDir.length()
  if (len < 1e-6) _worldDir.set(0, 0, 1)
  else _worldDir.normalize()
  camera.position.copy(controls.target).add(_worldDir.multiplyScalar(0.1))
  camera.lookAt(controls.target)
}

function animate() {
  requestAnimationFrame(animate)
  updateTransition()
  controls.update()
  clampCameraInSphere()
  renderer.render(scene, camera)
}

// リサイズ対応
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener("keydown", (e) => {
  if (e.key === "1") startToWorld()
  if (e.key === "2") startToUnwrap()
})

setWorld()
animate()
