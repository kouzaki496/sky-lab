import type { SceneContext } from "./scene"
import { SIZE_CONFIG, SPHERE_GRID_ROTATION_Y } from "./scene"

const DURATION = 1800
const U = SIZE_CONFIG.unwrap

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export type Mode = "world" | "unwrap"

export type TransitionContext = {
  ctx: SceneContext
  onModeChange: () => void
}

let mode: Mode = "world"
let transitioning = false
let transitionStart = 0

export function getMode(): Mode {
  return mode
}

export function isTransitioning(): boolean {
  return transitioning
}

export function startToUnwrap(): void {
  if (mode === "unwrap" || transitioning) return
  transitioning = true
  transitionStart = performance.now()
}

export function startToWorld(): void {
  if (mode === "world" || transitioning) return
  transitioning = true
  transitionStart = performance.now()
}

function setWorld(t: TransitionContext): void {
  const { ctx, onModeChange } = t
  mode = "world"
  ctx.controls.enabled = true
  ctx.sphereWireframe.visible = false
  ctx.sphereMeridians.visible = false
  ctx.sphereEquator.visible = false
  ctx.plane.visible = false
  ctx.planeGrid.visible = false
  ctx.planeMaterial.opacity = 0
  ctx.sphere.scale.setScalar(1)
  ctx.sphere.position.set(0, 0, 0)
  ctx.sphere.rotation.set(0, 0, 0)
  ctx.camera.position.set(0, 0, 0.1)
  ctx.controls.target.set(0, 0, 0)
  ctx.camera.lookAt(0, 0, 0)
  onModeChange()
}

function setUnwrap(t: TransitionContext): void {
  const { ctx, onModeChange } = t
  mode = "unwrap"
  ctx.controls.enabled = false
  ctx.sphereWireframe.visible = true
  ctx.sphereMeridians.visible = true
  ctx.sphereEquator.visible = true
  ctx.plane.visible = true
  ctx.planeGrid.visible = true
  ctx.planeMaterial.opacity = 1
  ctx.sphere.scale.setScalar(U.sphereScale)
  ctx.sphere.position.set(0, U.spherePositionY, 0)
  const { sphere, camera } = ctx
  const viewDir = camera.position.clone().multiplyScalar(-1).normalize()
  const invQuat = sphere.quaternion.clone().invert()
  const objDir = viewDir.clone().applyQuaternion(invQuat)
  const front = UNWRAP_FRONT_DIRECTION.clone()
  sphere.quaternion.setFromUnitVectors(objDir, front)
  sphere.rotation.setFromQuaternion(sphere.quaternion)
  ctx.plane.position.set(0, U.planePositionY, 0)
  ctx.camera.position.set(0, 0, U.cameraZ)
  ctx.controls.target.set(0, 0, 0)
  ctx.camera.lookAt(0, 0, 0)
  onModeChange()
}

export function updateTransition(t: TransitionContext): void {
  if (!transitioning) return
  const { ctx } = t
  const { camera, sphere, plane, planeGrid, controls, planeMaterial } = ctx
  const elapsed = performance.now() - transitionStart
  const timeT = Math.min(elapsed / DURATION, 1)
  const s = easeInOutCubic(timeT)

  if (mode === "world") {
    camera.position.set(0, 0, 0.1 + (U.cameraZ - 0.1) * s)
    sphere.scale.setScalar(1 - (1 - U.sphereScale) * s)
    sphere.position.set(0, U.spherePositionY * s, 0)
    plane.position.set(0, U.planePositionY, 0)
    controls.target.set(0, 0, 0)
    if (s < 0.35) {
      plane.visible = false
      planeGrid.visible = false
      planeMaterial.opacity = 0
    } else {
      plane.visible = true
      planeGrid.visible = true
      planeMaterial.opacity = Math.min(1, (s - 0.35) / 0.45)
    }
    if (timeT >= 1) {
      transitioning = false
      setUnwrap(t)
    }
  } else {
    camera.position.set(0, 0, 0.1 + (U.cameraZ - 0.1) * (1 - s))
    sphere.scale.setScalar(U.sphereScale + (1 - U.sphereScale) * s)
    sphere.position.set(0, U.spherePositionY * (1 - s), 0)
    sphere.rotation.set(sphere.rotation.x * (1 - s), sphere.rotation.y * (1 - s), 0)
    controls.target.set(0, 0, 0)
    if (s < 0.02) {
      plane.visible = true
      planeGrid.visible = true
      planeMaterial.opacity = 1
    } else if (s < 0.3) {
      plane.visible = true
      planeGrid.visible = true
      planeMaterial.opacity = Math.max(0, 1 - (s - 0.12) / 0.2)
    } else {
      plane.visible = false
      planeGrid.visible = false
      planeMaterial.opacity = 0
    }
    if (timeT >= 1) {
      transitioning = false
      setWorld(t)
    }
  }
}

export function initTransition(t: TransitionContext): void {
  setWorld(t)
}
