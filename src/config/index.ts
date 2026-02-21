import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

/** テクスチャ中央を正面 (+Z) に向ける Y 回転。unwrap 時の向き計算で参照。 */
export const SPHERE_GRID_ROTATION_Y = -Math.PI / 2

/** 球体・平面を左右中央に配置する X 位置 */
export const CENTER_X = 0

/** 小さいディスプレイでも全体が収まるよう、展開モードのレイアウトをコンパクトにしている */
export const SIZE_CONFIG = {
  sphereRadius: 60,
  planeWidth: 4,
  planeHeight: 2,
  unwrap: {
    sphereScale: 0.032,
    spherePositionY: 1,
    planePositionY: -2.2,
    cameraZ: 6
  }
}

export const UNWRAP_FRONT_DIRECTION = new THREE.Vector3(
  0,
  -SIZE_CONFIG.unwrap.spherePositionY,
  SIZE_CONFIG.unwrap.cameraZ
).normalize()

export type SceneContext = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  canvas: HTMLCanvasElement
  sphere: THREE.Mesh
  sphereWireframe: THREE.LineSegments
  sphereMeridians: THREE.LineSegments
  sphereEquator: THREE.LineLoop
  plane: THREE.Mesh
  planeGrid: THREE.LineSegments
  planeEquator: THREE.Line
  planeMaterial: THREE.MeshBasicMaterial
  goreMesh: THREE.Mesh
  goreMorphMesh: THREE.Mesh
  unfoldMesh: THREE.Mesh
}
