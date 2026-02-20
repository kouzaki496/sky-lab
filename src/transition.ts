import type { SceneContext } from "./scene"

const DURATION = 1800

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
  ctx.plane.visible = false
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
  ctx.plane.visible = true
  ctx.planeMaterial.opacity = 1
  ctx.sphere.scale.setScalar(0.04)
  ctx.sphere.position.set(-3, 0, 0)
  ctx.plane.position.set(3, 0, 0)
  ctx.camera.position.set(0, 0, 8)
  ctx.controls.target.set(0, 0, 0)
  ctx.camera.lookAt(0, 0, 0)
  onModeChange()
}

export function updateTransition(t: TransitionContext): void {
  if (!transitioning) return
  const { ctx } = t
  const { camera, sphere, plane, controls, planeMaterial } = ctx
  const elapsed = performance.now() - transitionStart
  const timeT = Math.min(elapsed / DURATION, 1)
  const s = easeInOutCubic(timeT)

  if (mode === "world") {
    camera.position.set(0, 0, 0.1 + 7.9 * s)
    sphere.scale.setScalar(1 - 0.96 * s)
    sphere.position.set(-3 * s, 0, 0)
    plane.position.set(3, 0, 0)
    controls.target.set(0, 0, 0)
    if (s < 0.35) {
      plane.visible = false
      planeMaterial.opacity = 0
    } else {
      plane.visible = true
      planeMaterial.opacity = Math.min(1, (s - 0.35) / 0.45)
    }
    if (timeT >= 1) {
      transitioning = false
      setUnwrap(t)
    }
  } else {
    camera.position.set(0, 0, 0.1 + 7.9 * (1 - s))
    sphere.scale.setScalar(0.04 + 0.96 * s)
    sphere.position.set(-3 * (1 - s), 0, 0)
    controls.target.set(0, 0, 0)
    if (s < 0.02) {
      plane.visible = true
      planeMaterial.opacity = 1
    } else if (s < 0.3) {
      plane.visible = true
      planeMaterial.opacity = Math.max(0, 1 - (s - 0.12) / 0.2)
    } else {
      plane.visible = false
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
