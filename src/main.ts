import * as THREE from "three"
import { createScene, SIZE_CONFIG } from "./scene"
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
const { scene, camera, renderer, controls, canvas, sphere, plane } = ctx

const uvPoint = { u: 0.5, v: 0.5 }
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
const planeIntersect = new THREE.Vector3()
const W = SIZE_CONFIG.planeWidth
const H = SIZE_CONFIG.planeHeight

function setMouseFromEvent(e: PointerEvent): void {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
}

function setMouseFromClient(clientX: number, clientY: number): void {
  const rect = canvas.getBoundingClientRect()
  mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1
}

function planeUVToWorld(u: number, v: number, out: THREE.Vector3): void {
  const w = SIZE_CONFIG.planeWidth
  const h = SIZE_CONFIG.planeHeight
  const local = new THREE.Vector3((u - 0.5) * w, (v - 0.5) * h, 0.002)
  out.copy(local).applyMatrix4(plane.matrixWorld)
}

function sphereUVToWorld(u: number, v: number, out: THREE.Vector3): void {
  const r = SIZE_CONFIG.sphereRadius
  const phi = u * Math.PI * 2
  const theta = (1 - v) * Math.PI
  const x = -r * Math.sin(theta) * Math.cos(phi)
  const y = r * Math.cos(theta)
  const z = r * Math.sin(theta) * Math.sin(phi)
  out.set(x, y, z).applyMatrix4(sphere.matrixWorld)
}

const uvLineGeometry = new THREE.BufferGeometry().setAttribute(
  "position",
  new THREE.Float32BufferAttribute([0, 0, 0, 0, 0, 0], 3)
)
const uvLine = new THREE.Line(
  uvLineGeometry,
  new THREE.LineBasicMaterial({
    color: 0xff0000,
    depthTest: false,
    depthWrite: false
  })
)
uvLine.renderOrder = 1
uvLine.visible = false
scene.add(uvLine)

const MARKER_RADIUS_WORLD = 0.12
const POINTER_RADIUS = MARKER_RADIUS_WORLD
const SPHERE_MARKER_RADIUS = MARKER_RADIUS_WORLD / SIZE_CONFIG.unwrap.sphereScale
const markerFillMaterial = new THREE.MeshBasicMaterial({
  color: 0xff0000,
  transparent: true,
  opacity: 0.4,
  side: THREE.DoubleSide
})
const markerLineMaterial = new THREE.LineBasicMaterial({ color: 0xcc0000 })
const pointerPoints: number[] = []
for (let i = 0; i <= 24; i++) {
  const t = (i / 24) * Math.PI * 2
  pointerPoints.push(Math.cos(t) * POINTER_RADIUS, Math.sin(t) * POINTER_RADIUS, 0)
}
const uvPointerGroup = new THREE.Group()
const uvPointerFill = new THREE.Mesh(
  new THREE.CircleGeometry(POINTER_RADIUS, 32),
  markerFillMaterial.clone()
)
uvPointerFill.position.z = 0.002
uvPointerGroup.add(uvPointerFill)
const uvPointerLine = new THREE.LineLoop(
  new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(pointerPoints, 3)),
  markerLineMaterial.clone()
)
uvPointerLine.position.z = 0.003
uvPointerGroup.add(uvPointerLine)
uvPointerGroup.visible = false
plane.add(uvPointerGroup)

const sphereMarkerPoints: number[] = []
for (let i = 0; i <= 24; i++) {
  const t = (i / 24) * Math.PI * 2
  sphereMarkerPoints.push(Math.cos(t) * SPHERE_MARKER_RADIUS, Math.sin(t) * SPHERE_MARKER_RADIUS, 0)
}
const sphereMarkerGroup = new THREE.Group()
const sphereMarkerFill = new THREE.Mesh(
  new THREE.CircleGeometry(SPHERE_MARKER_RADIUS, 32),
  markerFillMaterial.clone()
)
sphereMarkerGroup.add(sphereMarkerFill)
const sphereMarkerLine = new THREE.LineLoop(
  new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(sphereMarkerPoints, 3)),
  markerLineMaterial.clone()
)
sphereMarkerGroup.add(sphereMarkerLine)
sphereMarkerGroup.visible = false
sphere.add(sphereMarkerGroup)

const _sphereLocal = new THREE.Vector3()
const _sphereNormal = new THREE.Vector3()
let uvLineVisible = false
function updateUVLine(): void {
  if (!uvLineVisible || getMode() !== "unwrap") {
    uvLine.visible = false
    uvPointerGroup.visible = false
    sphereMarkerGroup.visible = false
    return
  }
  if (uvPointDrag) {
    setMouseFromClient(lastPointerClientX, lastPointerClientY)
    const target = pickUVOnPlaneResult()
    if (target) {
      uvPoint.u += (target.u - uvPoint.u) * UV_SMOOTH
      uvPoint.v += (target.v - uvPoint.v) * UV_SMOOTH
    }
  }
  uvPointerGroup.position.set((uvPoint.u - 0.5) * W, (uvPoint.v - 0.5) * H, 0)
  uvPointerGroup.visible = true
  const planePoint = new THREE.Vector3()
  const spherePoint = new THREE.Vector3()
  planeUVToWorld(uvPoint.u, uvPoint.v, planePoint)
  sphereUVToWorld(uvPoint.u, uvPoint.v, spherePoint)
  sphere.worldToLocal(_sphereLocal.copy(spherePoint))
  sphereMarkerGroup.position.copy(_sphereLocal)
  _sphereNormal.copy(_sphereLocal).normalize()
  sphereMarkerGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), _sphereNormal)
  sphereMarkerGroup.visible = true
  const pos = uvLineGeometry.attributes.position as THREE.BufferAttribute
  const arr = pos.array as Float32Array
  arr[0] = planePoint.x
  arr[1] = planePoint.y
  arr[2] = planePoint.z
  arr[3] = spherePoint.x
  arr[4] = spherePoint.y
  arr[5] = spherePoint.z
  pos.needsUpdate = true
  uvLine.visible = true
}

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
let uvPointDrag = false
let lastPointerClientX = 0
let lastPointerClientY = 0
let prevPointerX = 0
let prevPointerY = 0
const ROTATE_SPEED = 0.005
const UV_SMOOTH = 0.4

canvas.addEventListener("pointerdown", (e) => {
  if (getMode() !== "unwrap" || isTransitioning()) return
  setMouseFromEvent(e)
  if (uvLineVisible && pickUVOnPlane()) {
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
    sphere.rotation.y += (e.clientX - prevPointerX) * ROTATE_SPEED
    sphere.rotation.x -= (e.clientY - prevPointerY) * ROTATE_SPEED
    sphere.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, sphere.rotation.x))
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
  updateUVLine()
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

function pickUVOnPlane(): boolean {
  const r = pickUVOnPlaneResult()
  if (!r) return false
  uvPoint.u = r.u
  uvPoint.v = r.v
  return true
}

function pickUVOnPlaneResult(): { u: number; v: number } | null {
  raycaster.setFromCamera(mouse, camera)
  const hits = raycaster.intersectObject(plane, false)
  if (hits.length === 0) return null
  const hit = hits[0]
  if (hit.uv) {
    return {
      u: Math.max(0, Math.min(1, hit.uv.x)),
      v: Math.max(0, Math.min(1, hit.uv.y))
    }
  }
  plane.worldToLocal(planeIntersect.copy(hit.point))
  return {
    u: Math.max(0, Math.min(1, planeIntersect.x / W + 0.5)),
    v: Math.max(0, Math.min(1, planeIntersect.y / H + 0.5))
  }
}

document.getElementById("btn-uv-line")?.addEventListener("click", () => {
  uvLineVisible = !uvLineVisible
  const btn = document.getElementById("btn-uv-line")
  if (btn) btn.setAttribute("aria-pressed", String(uvLineVisible))
})

initTransition(transitionContext)
animate()
