import * as THREE from "three"

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

// 球体ジオメトリ
const geometry = new THREE.SphereGeometry(1, 64, 64)

// マテリアル（少し立体感を出す）
const material = new THREE.MeshStandardMaterial({
  color: 0x4a90e2,
  roughness: 0.3,
  metalness: 0.1
})

const sphere = new THREE.Mesh(geometry, material)
scene.add(sphere)

// ライト
const light = new THREE.DirectionalLight(0xffffff, 1)
light.position.set(5, 5, 5)
scene.add(light)

const ambient = new THREE.AmbientLight(0xffffff, 0.4)
scene.add(ambient)

// リサイズ対応
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// アニメーション
function animate() {
  requestAnimationFrame(animate)
  sphere.rotation.y += 0.005
  renderer.render(scene, camera)
}

// 回転が分かるようにワイヤーフレームを重ねる
const wireframe = new THREE.WireframeGeometry(geometry)
const line = new THREE.LineSegments(wireframe, new THREE.LineBasicMaterial({ color: 0x000000 }))
sphere.add(line)

animate()
