import * as THREE from "three"
import type { SceneContext } from "../config"
import { SIZE_CONFIG, UNWRAP_FRONT_DIRECTION, CENTER_X } from "../config"
import {
  getMode,
  setMode,
  getTransitioning,
  setTransitioning,
  getTransitionStart,
  setTransitionStart,
  getGoreView,
  setGoreViewState
} from "../state"

export type { Mode } from "../state"
export { getMode } from "../state"
export type TransitionContext = {
  ctx: SceneContext
  onModeChange: () => void
  /** 360°モードに切り替わった直後に呼ぶ（展開モードのサブ状態をオフにする） */
  onEnterWorld?: () => void
}

const DURATION = 1800
const U = SIZE_CONFIG.unwrap

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

export function isTransitioning(): boolean {
  return getTransitioning()
}

export function startToUnwrap(): void {
  if (getMode() === "unwrap" || getTransitioning()) return
  setTransitioning(true)
  setTransitionStart(performance.now())
}

export function startToWorld(): void {
  if (getMode() === "world" || getTransitioning()) return
  setTransitioning(true)
  setTransitionStart(performance.now())
}

function setWorld(t: TransitionContext): void {
  const { ctx, onModeChange, onEnterWorld } = t
  setMode("world")
  ctx.controls.enabled = true
  ctx.sphereWireframe.visible = false
  ctx.sphereMeridians.visible = false
  ctx.sphereEquator.visible = false
  ctx.plane.visible = false
  ctx.planeGrid.visible = false
  ctx.goreMesh.visible = false
  ctx.goreMorphMesh.visible = false
  ctx.sphere.visible = true
  ctx.planeMaterial.opacity = 0
  ctx.sphere.scale.setScalar(1)
  ctx.sphere.position.set(CENTER_X, 0, 0)
  ctx.sphere.rotation.set(0, 0, 0)
  ctx.camera.position.set(CENTER_X, 0, 0.1)
  ctx.controls.target.set(CENTER_X, 0, 0)
  ctx.camera.lookAt(CENTER_X, 0, 0)
  const ctrl = ctx.controls as unknown as { _quat: THREE.Quaternion; _spherical: THREE.Spherical }
  if (ctrl._quat && ctrl._spherical) {
    const offset = new THREE.Vector3().subVectors(ctx.camera.position, ctx.controls.target)
    offset.applyQuaternion(ctrl._quat)
    ctrl._spherical.setFromVector3(offset)
  }
  onEnterWorld?.()
  onModeChange()
}

/** ゴア表示かどうか（state を参照） */
export function isGoreView(_ctx?: SceneContext): boolean {
  return getGoreView()
}

/** ゴア表示の切り替え。state を更新し、シーンの表示を同期する。 */
export function setGoreView(ctx: SceneContext, show: boolean): void {
  setGoreViewState(show)
  ctx.goreMesh.visible = false
  ctx.goreMesh.position.set(CENTER_X, U.planePositionY, 0)
  ctx.plane.visible = true
  ctx.planeGrid.visible = true
  if (show) {
    ctx.sphere.visible = false
  } else {
    ctx.sphere.visible = true
    ctx.goreMorphMesh.visible = false
  }
}

function setUnwrap(t: TransitionContext): void {
  const { ctx, onModeChange } = t
  setMode("unwrap")
  ctx.controls.enabled = false
  ctx.sphereWireframe.visible = true
  ctx.sphereMeridians.visible = true
  ctx.sphereEquator.visible = true
  ctx.plane.visible = true
  ctx.planeGrid.visible = true
  ctx.goreMesh.visible = false
  ctx.goreMorphMesh.visible = false
  ctx.planeMaterial.opacity = 1
  ctx.sphere.visible = true
  ctx.sphere.scale.setScalar(U.sphereScale)
  ctx.sphere.position.set(CENTER_X, U.spherePositionY, 0)
  const { sphere, camera } = ctx
  const viewDir = camera.position.clone().multiplyScalar(-1).normalize()
  const invQuat = sphere.quaternion.clone().invert()
  const objDir = viewDir.clone().applyQuaternion(invQuat)
  const front = UNWRAP_FRONT_DIRECTION.clone()
  sphere.quaternion.setFromUnitVectors(objDir, front)
  const sphereUp = new THREE.Vector3(0, 1, 0).applyQuaternion(sphere.quaternion)
  if (sphereUp.y < 0) {
    const flip = new THREE.Quaternion().setFromAxisAngle(front, Math.PI)
    sphere.quaternion.premultiply(flip)
  }
  sphere.rotation.setFromQuaternion(sphere.quaternion)
  ctx.plane.position.set(CENTER_X, U.planePositionY, 0)
  ctx.camera.position.set(CENTER_X, 0, U.cameraZ)
  ctx.controls.target.set(CENTER_X, 0, 0)
  ctx.camera.lookAt(CENTER_X, 0, 0)
  onModeChange()
}

export function updateTransition(t: TransitionContext): void {
  if (!getTransitioning()) return
  const { ctx } = t
  const { camera, sphere, plane, planeGrid, controls, planeMaterial } = ctx
  const elapsed = performance.now() - getTransitionStart()
  const timeT = Math.min(elapsed / DURATION, 1)
  const s = easeInOutCubic(timeT)

  if (getMode() === "world") {
    camera.position.set(CENTER_X, 0, 0.1 + (U.cameraZ - 0.1) * s)
    sphere.scale.setScalar(1 - (1 - U.sphereScale) * s)
    sphere.position.set(CENTER_X, U.spherePositionY * s, 0)
    plane.position.set(CENTER_X, U.planePositionY, 0)
    controls.target.set(CENTER_X, 0, 0)
    if (s < 0.35) {
      plane.visible = false
      planeGrid.visible = false
      ctx.goreMesh.visible = false
      planeMaterial.opacity = 0
    } else {
      plane.visible = true
      planeGrid.visible = true
      ctx.goreMesh.visible = false
      planeMaterial.opacity = Math.min(1, (s - 0.35) / 0.45)
    }
    if (timeT >= 1) {
      setTransitioning(false)
      setUnwrap(t)
    }
  } else {
    camera.position.set(CENTER_X, 0, 0.1 + (U.cameraZ - 0.1) * (1 - s))
    sphere.scale.setScalar(U.sphereScale + (1 - U.sphereScale) * s)
    sphere.position.set(CENTER_X, U.spherePositionY * (1 - s), 0)
    sphere.rotation.set(sphere.rotation.x * (1 - s), sphere.rotation.y * (1 - s), 0)
    controls.target.set(CENTER_X, 0, 0)
    if (s < 0.02) {
      plane.visible = true
      planeGrid.visible = true
      ctx.goreMesh.visible = false
      planeMaterial.opacity = 1
    } else if (s < 0.3) {
      plane.visible = true
      planeGrid.visible = true
      ctx.goreMesh.visible = false
      planeMaterial.opacity = Math.max(0, 1 - (s - 0.12) / 0.2)
    } else {
      plane.visible = false
      planeGrid.visible = false
      ctx.goreMesh.visible = false
      planeMaterial.opacity = 0
    }
    if (timeT >= 1) {
      setTransitioning(false)
      setWorld(t)
    }
  }
}

export function initTransition(t: TransitionContext): void {
  setWorld(t)
}
