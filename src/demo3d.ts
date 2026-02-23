import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js"
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js"
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js"
import {
  createDemo3DScene,
  DEMO3D_CAMERA_POSITION,
  DEMO3D_TARGET,
  DEMO3D_BOUNDS,
  DEMO3D_SPACE_BACKGROUND
} from "./scene/demo3D"

const scene = new THREE.Scene()
scene.background = DEMO3D_SPACE_BACKGROUND.clone()

const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 1000)
camera.position.copy(DEMO3D_CAMERA_POSITION)
camera.lookAt(DEMO3D_TARGET)

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false })
renderer.shadowMap.enabled = true
renderer.shadowMap.type = THREE.PCFSoftShadowMap
document.body.appendChild(renderer.domElement)

const composer = new EffectComposer(renderer)
composer.addPass(new RenderPass(scene, camera))
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(window.innerWidth, window.innerHeight),
  0.9,
  0.4,
  0.35
)
composer.addPass(bloomPass)

function setSizeFromCanvas(): void {
  const canvas = renderer.domElement
  let w = canvas.clientWidth
  let h = canvas.clientHeight
  if (w === 0 || h === 0) {
    w = window.innerWidth
    h = window.innerHeight
  }
  if (w === 0 || h === 0) return
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
  composer.setSize(w, h)
  composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  bloomPass.resolution.set(w, h)
}
setSizeFromCanvas()

const controls = new OrbitControls(camera, renderer.domElement)
controls.target.copy(DEMO3D_TARGET)
controls.enablePan = true
controls.enableZoom = true
controls.rotateSpeed = -0.55
controls.panSpeed = 0.8
controls.zoomSpeed = 1.4
controls.enableDamping = true
controls.dampingFactor = 0.08
controls.minPolarAngle = 0.001
controls.maxPolarAngle = Math.PI - 0.001

const demoScene = createDemo3DScene()
scene.add(demoScene)

const SUN_POSITION = new THREE.Vector3(0, 0, 0)
const sunLight = new THREE.DirectionalLight(0xfff5e6, 1.0)
sunLight.position.copy(SUN_POSITION)
sunLight.target.position.set(40, 0, 0)
scene.add(sunLight)
scene.add(sunLight.target)
scene.add(new THREE.AmbientLight(0x445577, 0.35))
const fillLight = new THREE.DirectionalLight(0x6688aa, 0.2)
fillLight.position.set(20, 5, -10)
fillLight.target.position.set(0, 0, 0)
scene.add(fillLight)
scene.add(fillLight.target)

const PAN_ACCEL = 0.018
const PAN_DAMPING = 0.92
const PAN_MAX_SPEED = 0.35
const activePan = {
  up: false,
  down: false,
  left: false,
  right: false,
  forward: false,
  back: false
}
const panVelocity = new THREE.Vector3(0, 0, 0)
const _dir = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3()

type PanDir = "up" | "down" | "left" | "right" | "forward" | "back"

const ARROW_ROTATE: Record<PanDir, number> = {
  up: 0,
  down: 180,
  left: -90,
  right: 90,
  forward: 90,
  back: -90
}

function setupArrowPad(): void {
  const pad = document.getElementById("arrow-pad")
  if (!pad) return
  const labels: Record<PanDir, string> = {
    up: "上へ移動",
    down: "下へ移動",
    left: "左へ移動",
    right: "右へ移動",
    forward: "奥へ移動",
    back: "手前へ移動"
  }
  // 配置: 空 上 前 / 左 リセット 右 / 後 下 空（3x3）
  const layout: { dir: PanDir; gridColumn: number; gridRow: number }[] = [
    { dir: "up", gridColumn: 2, gridRow: 1 },
    { dir: "forward", gridColumn: 3, gridRow: 1 },
    { dir: "left", gridColumn: 1, gridRow: 2 },
    { dir: "right", gridColumn: 3, gridRow: 2 },
    { dir: "back", gridColumn: 1, gridRow: 3 },
    { dir: "down", gridColumn: 2, gridRow: 3 }
  ]
  layout.forEach(({ dir, gridColumn, gridRow }) => {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `arrow-pad-btn arrow-pad-btn--${dir}`
    btn.setAttribute("aria-label", labels[dir])
    btn.style.gridColumn = String(gridColumn)
    btn.style.gridRow = String(gridRow)
    const img = document.createElement("img")
    img.src = dir === "forward" || dir === "back" ? "/icon_arrow2.png" : "/icon_arrow.png"
    img.alt = ""
    img.style.transform = `rotate(${ARROW_ROTATE[dir]}deg)`
    btn.appendChild(img)
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

  // 中央にリセットボタン
  const resetBtn = document.createElement("button")
  resetBtn.type = "button"
  resetBtn.className = "arrow-pad-btn demo3d-reset-btn"
  resetBtn.setAttribute("aria-label", "視点をリセット")
  resetBtn.style.gridColumn = "2"
  resetBtn.style.gridRow = "2"
  const resetImg = document.createElement("img")
  resetImg.src = "/icon_reload.png"
  resetImg.alt = ""
  resetBtn.appendChild(resetImg)
  resetBtn.addEventListener("click", resetCamera)
  pad.appendChild(resetBtn)
}

function updatePan(): void {
  _dir.subVectors(controls.target, camera.position).normalize()
  _right.crossVectors(_dir, new THREE.Vector3(0, 1, 0)).normalize()
  _up.crossVectors(_right, _dir).normalize()
  if (activePan.right) panVelocity.addScaledVector(_right, PAN_ACCEL)
  if (activePan.left) panVelocity.addScaledVector(_right, -PAN_ACCEL)
  if (activePan.up) panVelocity.addScaledVector(_up, PAN_ACCEL)
  if (activePan.down) panVelocity.addScaledVector(_up, -PAN_ACCEL)
  if (activePan.forward) panVelocity.addScaledVector(_dir, PAN_ACCEL)
  if (activePan.back) panVelocity.addScaledVector(_dir, -PAN_ACCEL)
  panVelocity.multiplyScalar(PAN_DAMPING)
  if (panVelocity.lengthSq() > PAN_MAX_SPEED * PAN_MAX_SPEED) {
    panVelocity.normalize().multiplyScalar(PAN_MAX_SPEED)
  }
  camera.position.add(panVelocity)
  controls.target.add(panVelocity)
  clampToBounds()
}

function clampToBounds(): void {
  const { min, max } = DEMO3D_BOUNDS
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, min.x, max.x)
  camera.position.y = THREE.MathUtils.clamp(camera.position.y, min.y, max.y)
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, min.z, max.z)
  controls.target.x = THREE.MathUtils.clamp(controls.target.x, min.x, max.x)
  controls.target.y = THREE.MathUtils.clamp(controls.target.y, min.y, max.y)
  controls.target.z = THREE.MathUtils.clamp(controls.target.z, min.z, max.z)
}

setupArrowPad()

function resetCamera(): void {
  camera.position.copy(DEMO3D_CAMERA_POSITION)
  controls.target.copy(DEMO3D_TARGET)
  camera.lookAt(DEMO3D_TARGET)
}


function animate(): void {
  requestAnimationFrame(animate)
  updatePan()
  controls.update()
  clampToBounds()
  composer.render()
}

window.addEventListener("resize", () => {
  setSizeFromCanvas()
})

animate()
