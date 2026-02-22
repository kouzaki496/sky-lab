import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import {
  createDemo3DScene,
  DEMO3D_CAMERA_POSITION,
  DEMO3D_TARGET
} from "./scene/demo3D"

const scene = new THREE.Scene()
scene.background = new THREE.Color(0xffffff)

const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
)
camera.position.copy(DEMO3D_CAMERA_POSITION)
camera.lookAt(DEMO3D_TARGET)

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.copy(DEMO3D_TARGET)
controls.enablePan = true
controls.enableZoom = true
controls.rotateSpeed = -0.25
controls.minPolarAngle = 0.001
controls.maxPolarAngle = Math.PI - 0.001

const demoScene = createDemo3DScene()
scene.add(demoScene)
scene.add(new THREE.AmbientLight(0xffffff, 1.0))

function animate(): void {
  requestAnimationFrame(animate)
  controls.update()
  renderer.render(scene, camera)
}

window.addEventListener("resize", () => {
  const w = window.innerWidth
  const h = window.innerHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
})

animate()
