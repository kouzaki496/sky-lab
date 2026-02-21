import * as THREE from "three"
import type { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

/** テクスチャ中央を正面 (+Z) に向ける Y 回転。unwrap 時の向き計算で参照。 */
export const SPHERE_GRID_ROTATION_Y = -Math.PI / 2

export const SIZE_CONFIG = {
  sphereRadius: 70,
  planeWidth: 6,
  planeHeight: 3,
  unwrap: {
    sphereScale: 0.04,
    spherePositionY: 1.5,
    planePositionY: -3,
    cameraZ: 8
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
