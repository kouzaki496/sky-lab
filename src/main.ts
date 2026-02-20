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
camera.position.z = 3

// レンダラー
const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

// カメラ操作
const controls = new OrbitControls(camera, renderer.domElement)
controls.enableZoom = false
controls.enablePan = false

// 球体ジオメトリ
const geometry = new THREE.SphereGeometry(50, 64, 64)

// テクスチャ読込
const texture = new THREE.TextureLoader().load("/panorama2.jpg")

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

// アニメーション
function animate() {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

animate()

// リサイズ対応
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
