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

// --- 矢印ボタンで視点移動（上下左右＋奥・手前） ---
const PAN_SPEED = 0.08
const activePan = {
  up: false,
  down: false,
  left: false,
  right: false,
  forward: false,
  back: false
}
const _dir = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()

type PanDir = "up" | "down" | "left" | "right" | "forward" | "back"

function setupArrowPad(): void {
  const pad = document.getElementById("arrow-pad")
  if (!pad) return

  const arrows: Record<PanDir, string> = {
    up: "M12 19V5m0 0l-6 6m6-6l6 6",
    down: "M12 5v14m0 0l6-6m-6 6l-6-6",
    left: "M5 12h14m0 0l-6-6m6 6l-6 6",
    right: "M19 12H5m0 0l6-6m-6 6l6-6",
    // 奥＝視点方向へ（丸＋上矢印）、手前＝手前へ（丸＋下矢印）
    forward: "M12 20a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M12 14V7l3 3",
    back: "M12 4a3 3 0 1 0 0 6 3 3 0 0 0 0-6z M12 10v7l3-3"
  }
  const labels: Record<PanDir, string> = {
    up: "上へ移動",
    down: "下へ移動",
    left: "左へ移動",
    right: "右へ移動",
    forward: "奥へ移動",
    back: "手前へ移動"
  }

  // レイアウト: 1行目=奥, 2=上, 3=左・右, 4=下, 5=手前
  const layout: { dir: PanDir; gridColumn: number; gridRow: number }[] = [
    { dir: "forward", gridColumn: 2, gridRow: 1 },
    { dir: "up", gridColumn: 2, gridRow: 2 },
    { dir: "left", gridColumn: 1, gridRow: 3 },
    { dir: "right", gridColumn: 3, gridRow: 3 },
    { dir: "down", gridColumn: 2, gridRow: 4 },
    { dir: "back", gridColumn: 2, gridRow: 5 }
  ]
  layout.forEach(({ dir, gridColumn, gridRow }) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "arrow-pad-btn"
    btn.setAttribute("aria-label", labels[dir])
    btn.style.gridColumn = String(gridColumn)
    btn.style.gridRow = String(gridRow)
    btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${arrows[dir]}"/></svg>`
    const setActive = (v: boolean) => {
      activePan[dir] = v
    }
    btn.addEventListener("pointerdown", (e) => {
      e.preventDefault()
      setActive(true)
      ;(e.currentTarget as HTMLElement).setPointerCapture((e as PointerEvent).pointerId)
    })
    btn.addEventListener("pointerup", (e) => {
      e.preventDefault()
      setActive(false)
      ;(e.currentTarget as HTMLElement).releasePointerCapture((e as PointerEvent).pointerId)
    })
    btn.addEventListener("pointerleave", () => setActive(false))
    btn.addEventListener("contextmenu", (e) => e.preventDefault())
    pad.appendChild(btn)
  })
}

function updatePan(): void {
  const any =
    activePan.up ||
    activePan.down ||
    activePan.left ||
    activePan.right ||
    activePan.forward ||
    activePan.back
  if (!any) return

  _dir.subVectors(controls.target, camera.position).normalize()
  _right.crossVectors(_dir, new THREE.Vector3(0, 1, 0)).normalize()
  _up.crossVectors(_right, _dir).normalize()

  if (activePan.right) {
    camera.position.addScaledVector(_right, PAN_SPEED)
    controls.target.addScaledVector(_right, PAN_SPEED)
  }
  if (activePan.left) {
    camera.position.addScaledVector(_right, -PAN_SPEED)
    controls.target.addScaledVector(_right, -PAN_SPEED)
  }
  if (activePan.up) {
    camera.position.addScaledVector(_up, PAN_SPEED)
    controls.target.addScaledVector(_up, PAN_SPEED)
  }
  if (activePan.down) {
    camera.position.addScaledVector(_up, -PAN_SPEED)
    controls.target.addScaledVector(_up, -PAN_SPEED)
  }
  if (activePan.forward) {
    camera.position.addScaledVector(_dir, PAN_SPEED)
    controls.target.addScaledVector(_dir, PAN_SPEED)
  }
  if (activePan.back) {
    camera.position.addScaledVector(_dir, -PAN_SPEED)
    controls.target.addScaledVector(_dir, -PAN_SPEED)
  }
}

setupArrowPad()
setupResetButton()

function resetCamera(): void {
  camera.position.copy(DEMO3D_CAMERA_POSITION)
  controls.target.copy(DEMO3D_TARGET)
  camera.lookAt(DEMO3D_TARGET)
}

function setupResetButton(): void {
  const wrap = document.getElementById("demo3d-reset-wrap")
  if (!wrap) return
  const btn = document.createElement("button")
  btn.type = "button"
  btn.className = "arrow-pad-btn demo3d-reset-btn"
  btn.setAttribute("aria-label", "視点をリセット")
  btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>`
  btn.addEventListener("click", resetCamera)
  wrap.appendChild(btn)
}

function animate(): void {
  requestAnimationFrame(animate)
  updatePan()
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
