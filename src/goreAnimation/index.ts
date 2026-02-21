import type { SceneContext } from "../config"
import { SIZE_CONFIG, CENTER_X } from "../config"
import { getMode, isGoreView, setGoreView } from "../transition"

const U = SIZE_CONFIG.unwrap
const GORE_SLIT_MS = 700
const GORE_EQUATOR_PEEL_MS = 800
const GORE_SPREAD_MS = 900
const GORE_UNFOLD_DURATION = GORE_SLIT_MS + GORE_EQUATOR_PEEL_MS + GORE_SPREAD_MS

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}

let goreUnfoldStart: number | null = null
let goreFoldStart: number | null = null

/** ゴアアニメーションを中断し、展開モードのサブ状態をオフにする（モード切替時用） */
export function resetGoreAnimation(ctx: SceneContext): void {
  goreUnfoldStart = null
  goreFoldStart = null
  ctx.goreMorphMesh.visible = false
  ctx.sphere.visible = true
  ctx.goreMesh.visible = false
  setGoreView(ctx, false)
}

export function startGoreUnfoldAnimation(ctx: SceneContext): void {
  if (getMode() !== "unwrap" || isGoreView(ctx) || goreUnfoldStart !== null || goreFoldStart !== null) return
  const { goreMorphMesh, sphere } = ctx
  goreMorphMesh.visible = true
  goreMorphMesh.position.set(CENTER_X, U.spherePositionY, 0)
  goreMorphMesh.morphTargetInfluences![0] = 0
  goreMorphMesh.morphTargetInfluences![1] = 0
  goreMorphMesh.morphTargetInfluences![2] = 0
  sphere.visible = false
  ctx.goreMesh.visible = false
  goreUnfoldStart = performance.now()
}

export function updateGoreUnfoldAnimation(ctx: SceneContext, onModeChange: () => void): void {
  if (goreUnfoldStart === null) return
  const { goreMorphMesh } = ctx
  const elapsed = performance.now() - goreUnfoldStart
  const inf = goreMorphMesh.morphTargetInfluences!
  if (elapsed < GORE_SLIT_MS) {
    const t = elapsed / GORE_SLIT_MS
    inf[0] = easeInOutCubic(t)
    inf[1] = 0
    inf[2] = 0
    goreMorphMesh.position.y = U.spherePositionY
  } else if (elapsed < GORE_SLIT_MS + GORE_EQUATOR_PEEL_MS) {
    inf[0] = 1
    const t = (elapsed - GORE_SLIT_MS) / GORE_EQUATOR_PEEL_MS
    inf[1] = easeInOutCubic(t)
    inf[2] = 0
    goreMorphMesh.position.y = U.spherePositionY
  } else if (elapsed < GORE_UNFOLD_DURATION) {
    inf[0] = 1
    inf[1] = 1
    const t = (elapsed - GORE_SLIT_MS - GORE_EQUATOR_PEEL_MS) / GORE_SPREAD_MS
    const s = easeInOutCubic(t)
    inf[2] = s
    goreMorphMesh.position.y = U.spherePositionY
  } else {
    goreUnfoldStart = null
    goreMorphMesh.morphTargetInfluences![0] = 1
    goreMorphMesh.morphTargetInfluences![1] = 1
    goreMorphMesh.morphTargetInfluences![2] = 1
    setGoreView(ctx, true)
    onModeChange()
  }
}

export function startGoreFoldAnimation(ctx: SceneContext): void {
  if (getMode() !== "unwrap" || !isGoreView(ctx) || goreUnfoldStart !== null || goreFoldStart !== null) return
  const { goreMorphMesh, sphere } = ctx
  goreMorphMesh.visible = true
  goreMorphMesh.position.set(CENTER_X, U.spherePositionY, 0)
  goreMorphMesh.morphTargetInfluences![0] = 1
  goreMorphMesh.morphTargetInfluences![1] = 1
  goreMorphMesh.morphTargetInfluences![2] = 1
  sphere.visible = false
  ctx.goreMesh.visible = false
  goreFoldStart = performance.now()
}

export function updateGoreFoldAnimation(ctx: SceneContext, onModeChange: () => void): void {
  if (goreFoldStart === null) return
  const { goreMorphMesh, sphere } = ctx
  const elapsed = performance.now() - goreFoldStart
  const inf = goreMorphMesh.morphTargetInfluences!
  if (elapsed < GORE_SPREAD_MS) {
    const t = elapsed / GORE_SPREAD_MS
    inf[2] = 1 - easeInOutCubic(t)
    inf[0] = 1
    inf[1] = 1
    goreMorphMesh.position.y = U.spherePositionY
  } else if (elapsed < GORE_SPREAD_MS + GORE_EQUATOR_PEEL_MS) {
    const t = (elapsed - GORE_SPREAD_MS) / GORE_EQUATOR_PEEL_MS
    inf[1] = 1 - easeInOutCubic(t)
    inf[2] = 0
    inf[0] = 1
    goreMorphMesh.position.y = U.spherePositionY
  } else if (elapsed < GORE_UNFOLD_DURATION) {
    const t = (elapsed - GORE_SPREAD_MS - GORE_EQUATOR_PEEL_MS) / GORE_SLIT_MS
    inf[0] = 1 - easeInOutCubic(t)
    inf[1] = 0
    inf[2] = 0
    goreMorphMesh.position.y = U.spherePositionY
  } else {
    goreFoldStart = null
    goreMorphMesh.morphTargetInfluences![0] = 0
    goreMorphMesh.morphTargetInfluences![1] = 0
    goreMorphMesh.morphTargetInfluences![2] = 0
    goreMorphMesh.visible = false
    sphere.visible = true
    setGoreView(ctx, false)
    onModeChange()
  }
}

export function toggleGoreView(ctx: SceneContext): void {
  if (getMode() !== "unwrap") return
  if (isGoreView(ctx)) {
    startGoreFoldAnimation(ctx)
  } else {
    startGoreUnfoldAnimation(ctx)
  }
}
