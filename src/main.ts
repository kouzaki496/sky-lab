import * as THREE from "three"
import { createScene } from "./scene"
import {
  getMode,
  isTransitioning,
  startToWorld,
  startToUnwrap,
  updateTransition,
  initTransition,
  isGoreView,
  type TransitionContext
} from "./transition"
import { createUVMarker } from "./uvMarker"
import {
  updateGoreUnfoldAnimation,
  updateGoreFoldAnimation,
  toggleGoreView
} from "./goreAnimation"

const ctx = createScene()
const { scene, camera, renderer, controls, canvas, sphere } = ctx

function updateModeButton(): void {
  const m = getMode()
  const btn = document.getElementById("btn-mode")
  if (btn) {
    if (m === "world") {
      btn.textContent = "展開"
      btn.setAttribute("aria-label", "展開して球と平面を表示")
    } else {
      btn.textContent = "360°"
      btn.setAttribute("aria-label", "パノラマで見る")
    }
  }
  const btnUnfold = document.getElementById("btn-unfold")
  if (btnUnfold) {
    btnUnfold.style.display = m === "unwrap" ? "" : "none"
    btnUnfold.textContent = isGoreView(ctx) ? "戻る" : "経線で展開"
    btnUnfold.setAttribute("aria-label", isGoreView(ctx) ? "球と平面に戻る" : "ゴア型の展開図を表示")
  }
}

const transitionContext: TransitionContext = { ctx, onModeChange: updateModeButton }
const uvMarker = createUVMarker(ctx, getMode)

// --- 360°モード: カメラを球内に固定し OrbitControls の内部状態を同期 ---
const _worldDir = new THREE.Vector3()
const _orbitOffset = new THREE.Vector3()
function clampCameraInSphere(): void {
  if (getMode() !== "world" || isTransitioning()) return
  _worldDir.subVectors(camera.position, controls.target)
  const len = _worldDir.length()
  if (len < 1e-6) _worldDir.set(0, 0, 1)
  else _worldDir.normalize()
  camera.position.copy(controls.target).add(_worldDir.multiplyScalar(0.1))
  camera.lookAt(controls.target)
  const ctrl = controls as unknown as { _quat: THREE.Quaternion; _spherical: THREE.Spherical }
  if (ctrl._quat && ctrl._spherical) {
    _orbitOffset.subVectors(camera.position, controls.target)
    _orbitOffset.applyQuaternion(ctrl._quat)
    ctrl._spherical.setFromVector3(_orbitOffset)
  }
}

let sphereDrag = false
let uvPointDrag = false
let lastPointerClientX = 0
let lastPointerClientY = 0
let prevPointerX = 0
let prevPointerY = 0
const ROTATE_SPEED = 0.005

const _sphereRight = new THREE.Vector3()
const _sphereUp = new THREE.Vector3()
const _quatY = new THREE.Quaternion()
const _quatTilt = new THREE.Quaternion()
const _quatTiltInv = new THREE.Quaternion()

// --- 展開モード: 球ドラッグはクォータニオンで回転（上下反転防止） ---
canvas.addEventListener("pointerdown", (e) => {
  if (getMode() !== "unwrap" || isTransitioning()) return
  uvMarker.setMouseFromEvent(e)
  if (uvMarker.getUvLineVisible() && uvMarker.pickUVOnPlane()) {
    uvPointDrag = true
    lastPointerClientX = e.clientX
    lastPointerClientY = e.clientY
  } else {
    sphereDrag = true
    prevPointerX = e.clientX
    prevPointerY = e.clientY
  }
})
canvas.addEventListener("pointermove", (e) => {
  if (getMode() !== "unwrap") return
  if (uvPointDrag) {
    lastPointerClientX = e.clientX
    lastPointerClientY = e.clientY
  } else if (sphereDrag) {
    const dx = (e.clientX - prevPointerX) * ROTATE_SPEED
    const dy = -(e.clientY - prevPointerY) * ROTATE_SPEED
    _quatY.setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx)
    sphere.quaternion.premultiply(_quatY)
    _sphereRight.set(1, 0, 0).applyQuaternion(sphere.quaternion)
    _quatTilt.setFromAxisAngle(_sphereRight, dy)
    sphere.quaternion.premultiply(_quatTilt)
    _sphereUp.set(0, 1, 0).applyQuaternion(sphere.quaternion)
    if (_sphereUp.y < 0) {
      _quatTiltInv.copy(_quatTilt).invert()
      sphere.quaternion.premultiply(_quatTiltInv)
    }
    sphere.quaternion.normalize()
    prevPointerX = e.clientX
    prevPointerY = e.clientY
  }
})
canvas.addEventListener("pointerup", () => {
  sphereDrag = false
  uvPointDrag = false
})
canvas.addEventListener("pointerleave", () => {
  sphereDrag = false
  uvPointDrag = false
})

function animate(): void {
  requestAnimationFrame(animate)
  updateTransition(transitionContext)
  updateGoreUnfoldAnimation(ctx, updateModeButton)
  updateGoreFoldAnimation(ctx, updateModeButton)
  uvMarker.updateUVLine(
    uvPointDrag ? { clientX: lastPointerClientX, clientY: lastPointerClientY } : undefined
  )
  if (controls.enabled) controls.update()
  clampCameraInSphere()
  renderer.render(scene, camera)
}

window.addEventListener("resize", () => {
  const rect = canvas.getBoundingClientRect()
  const w = rect.width
  const h = rect.height
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
})

window.addEventListener("keydown", (e) => {
  if (e.key === "1") startToWorld()
  if (e.key === "2") startToUnwrap()
})

document.getElementById("btn-mode")?.addEventListener("click", () => {
  if (getMode() === "world") startToUnwrap()
  else startToWorld()
})

document.getElementById("btn-uv-line")?.addEventListener("click", () => {
  const visible = !uvMarker.getUvLineVisible()
  uvMarker.setUvLineVisible(visible)
  const btn = document.getElementById("btn-uv-line")
  if (btn) btn.setAttribute("aria-pressed", String(visible))
})

document.getElementById("btn-unfold")?.addEventListener("click", () => toggleGoreView(ctx))

// --- 起動 ---
initTransition(transitionContext)
animate()
