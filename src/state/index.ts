/**
 * 各モードの状態を一括管理するストア。
 * 360° / 展開 / ゴア表示 / UV対応線 の表示状態を保持する。
 */

export type Mode = "world" | "unwrap"

let mode: Mode = "world"
let transitioning = false
let transitionStart = 0
let goreView = false
let uvLineVisible = false

// --- メインモード (360° / 展開) ---
export function getMode(): Mode {
  return mode
}

export function setMode(m: Mode): void {
  mode = m
}

export function getTransitioning(): boolean {
  return transitioning
}

export function setTransitioning(v: boolean): void {
  transitioning = v
}

export function getTransitionStart(): number {
  return transitionStart
}

export function setTransitionStart(n: number): void {
  transitionStart = n
}

// --- 展開モード内: ゴア表示 (経線で展開) ---
export function getGoreView(): boolean {
  return goreView
}

export function setGoreViewState(v: boolean): void {
  goreView = v
}

// --- 展開モード内: UV対応線の表示 ---
export function getUvLineVisible(): boolean {
  return uvLineVisible
}

export function setUvLineVisibleState(v: boolean): void {
  uvLineVisible = v
}

/** 360°に切り替えるときに展開モードのサブ状態をリセット */
export function resetUnwrapState(): void {
  goreView = false
  uvLineVisible = false
}
