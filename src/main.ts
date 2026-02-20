import * as THREE from "three"
import { createScene } from "./scene"
import {
  getMode,
  isTransitioning,
  startToWorld,
  startToUnwrap,
  updateTransition,
  initTransition,
  type TransitionContext
} from "./transition"

const ctx = createScene()
const { scene, camera, renderer, controls, canvas, sphere } = ctx

function updateModeButton(): void {
  const btn = document.getElementById("btn-mode")
  if (!btn) return
  if (getMode() === "world") {
    btn.textContent = "展開"
    btn.setAttribute("aria-label", "展開して球と平面を表示")
  } else {
    btn.textContent = "360°"
    btn.setAttribute("aria-label", "パノラマで見る")
  }
}

const transitionContext: TransitionContext = { ctx, onModeChange: updateModeButton }

const _worldDir = new THREE.Vector3()
function clampCameraInSphere(): void {
  if (getMode() !== "world" || isTransitioning()) return
  _worldDir.subVectors(camera.position, controls.target)
  const len = _worldDir.length()
  if (len < 1e-6) _worldDir.set(0, 0, 1)
  else _worldDir.normalize()
  camera.position.copy(controls.target).add(_worldDir.multiplyScalar(0.1))
  camera.lookAt(controls.target)
}

let sphereDrag = false
let prevPointerX = 0
let prevPointerY = 0
const ROTATE_SPEED = 0.005

canvas.addEventListener("pointerdown", (e) => {
  if (getMode() !== "unwrap" || isTransitioning()) return
  sphereDrag = true
  prevPointerX = e.clientX
  prevPointerY = e.clientY
})
canvas.addEventListener("pointermove", (e) => {
  if (!sphereDrag || getMode() !== "unwrap") return
  sphere.rotation.y += (e.clientX - prevPointerX) * ROTATE_SPEED
  sphere.rotation.x -= (e.clientY - prevPointerY) * ROTATE_SPEED
  sphere.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, sphere.rotation.x))
  prevPointerX = e.clientX
  prevPointerY = e.clientY
})
canvas.addEventListener("pointerup", () => { sphereDrag = false })
canvas.addEventListener("pointerleave", () => { sphereDrag = false })

function animate(): void {
  requestAnimationFrame(animate)
  updateTransition(transitionContext)
  if (controls.enabled) controls.update()
  clampCameraInSphere()
  renderer.render(scene, camera)
}

window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

window.addEventListener("keydown", (e) => {
  if (e.key === "1") startToWorld()
  if (e.key === "2") startToUnwrap()
})

document.getElementById("btn-mode")?.addEventListener("click", () => {
  if (getMode() === "world") startToUnwrap()
  else startToWorld()
})

initTransition(transitionContext)
animate()
