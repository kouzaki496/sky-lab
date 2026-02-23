import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"
import { SIZE_CONFIG, SPHERE_GRID_ROTATION_Y, CENTER_X } from "../config"
import type { SceneContext } from "../config"
import {
  createSphereMeridiansFromGeometry,
  createSphereGridFromGeometry,
  createSphereEquatorFromGeometry,
  createPlaneGrid,
  createPlaneEquator,
  SPHERE_GRID_LONGITUDE,
  SPHERE_GRID_LATITUDE
} from "./grid"
import { createGoreUnwrapMesh, createSphereToGoreMorphMesh, createUnfoldMesh } from "./goreMesh"

export type { SceneContext } from "../config"
export { SIZE_CONFIG, SPHERE_GRID_ROTATION_Y, UNWRAP_FRONT_DIRECTION } from "../config"

const SEGMENTS = 72

export function createScene(): SceneContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000)
  camera.position.set(CENTER_X, 0, 0.1)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.rotateSpeed = -0.25
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.minPolarAngle = 0.001
  controls.maxPolarAngle = Math.PI - 0.001

  const texture = new THREE.TextureLoader().load("/panorama.jpg")
  texture.colorSpace = THREE.SRGBColorSpace

  // 球体
  const sphereGeometry = new THREE.SphereGeometry(SIZE_CONFIG.sphereRadius, SEGMENTS, SEGMENTS)
  const sphereMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.BackSide })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  sphere.rotation.y = SPHERE_GRID_ROTATION_Y
  scene.add(sphere)

  const sphereOuterMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.FrontSide,
    transparent: true,
    opacity: 0.28
  })
  const sphereOuter = new THREE.Mesh(sphereGeometry, sphereOuterMaterial)
  sphere.add(sphereOuter)

  const sphereWireframe = createSphereGridFromGeometry(sphereGeometry, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  sphereWireframe.visible = false
  sphere.add(sphereWireframe)

  const sphereMeridians = createSphereMeridiansFromGeometry(sphereGeometry, SPHERE_GRID_LONGITUDE)
  sphereMeridians.visible = false
  sphere.add(sphereMeridians)

  const sphereEquator = createSphereEquatorFromGeometry(sphereGeometry)
  sphereEquator.visible = false
  sphere.add(sphereEquator)

  // 平面
  const planeGeometry = new THREE.PlaneGeometry(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SEGMENTS, Math.round(SEGMENTS / 2))
  const planeMaterial = new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, opacity: 0 })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.position.set(CENTER_X, SIZE_CONFIG.unwrap.planePositionY, 0)
  plane.visible = false
  scene.add(plane)

  const planeGrid = createPlaneGrid(SIZE_CONFIG.planeWidth, SIZE_CONFIG.planeHeight, SPHERE_GRID_LONGITUDE, SPHERE_GRID_LATITUDE)
  planeGrid.visible = false
  plane.add(planeGrid)

  const planeEquator = createPlaneEquator(SIZE_CONFIG.planeWidth)
  plane.add(planeEquator)

  const goreMesh = createGoreUnwrapMesh(texture, SPHERE_GRID_LONGITUDE, 24)
  goreMesh.position.set(CENTER_X, SIZE_CONFIG.unwrap.planePositionY, 0)
  goreMesh.visible = false
  scene.add(goreMesh)

  const goreMorphMesh = createSphereToGoreMorphMesh(texture, SPHERE_GRID_LONGITUDE, 24)
  goreMorphMesh.visible = false
  goreMorphMesh.morphTargetInfluences = [0, 0, 0]
  scene.add(goreMorphMesh)

  const unfoldMesh = createUnfoldMesh(texture)
  unfoldMesh.position.set(CENTER_X, SIZE_CONFIG.unwrap.planePositionY, 0)
  unfoldMesh.visible = false
  unfoldMesh.morphTargetInfluences = [1]
  scene.add(unfoldMesh)

  scene.add(new THREE.AmbientLight(0xffffff, 1.0))

  return {
    scene, camera, renderer, controls, canvas: renderer.domElement,
    sphere, sphereWireframe, sphereMeridians, sphereEquator,
    plane, planeGrid, planeEquator, planeMaterial,
    goreMesh, goreMorphMesh, unfoldMesh
  }
}
