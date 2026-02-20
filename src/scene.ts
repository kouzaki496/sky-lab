import * as THREE from "three"
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js"

export type SceneContext = {
  scene: THREE.Scene
  camera: THREE.PerspectiveCamera
  renderer: THREE.WebGLRenderer
  controls: OrbitControls
  canvas: HTMLCanvasElement
  sphere: THREE.Mesh
  plane: THREE.Mesh
  planeMaterial: THREE.MeshBasicMaterial
}

export function createScene(): SceneContext {
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0xffffff)

  const camera = new THREE.PerspectiveCamera(
    75,
    window.innerWidth / window.innerHeight,
    0.1,
    1000
  )
  camera.position.set(0, 0, 0.1)

  const renderer = new THREE.WebGLRenderer({ antialias: true })
  renderer.setSize(window.innerWidth, window.innerHeight)
  document.body.appendChild(renderer.domElement)

  const canvas = renderer.domElement
  canvas.style.touchAction = "none"
  canvas.style.cursor = "grab"

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableZoom = false
  controls.enablePan = false
  controls.enableDamping = true
  controls.dampingFactor = 0.05
  controls.rotateSpeed = -0.25
  controls.touches.TWO = THREE.TOUCH.ROTATE

  const texture = new THREE.TextureLoader().load("/panorama2.jpg")
  texture.colorSpace = THREE.SRGBColorSpace
  texture.anisotropy = renderer.capabilities.getMaxAnisotropy()

  const sphereGeometry = new THREE.SphereGeometry(50, 64, 64)
  const sphereMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.BackSide
  })
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  scene.add(sphere)

  const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
  directionalLight.position.set(5, 5, 5)
  scene.add(directionalLight)
  const ambientLight = new THREE.AmbientLight(0xffffff, 0.4)
  scene.add(ambientLight)

  const planeGeometry = new THREE.PlaneGeometry(4, 2)
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0
  })
  const plane = new THREE.Mesh(planeGeometry, planeMaterial)
  plane.position.set(3, 0, 0)
  plane.visible = false
  scene.add(plane)

  return {
    scene,
    camera,
    renderer,
    controls,
    canvas,
    sphere,
    plane,
    planeMaterial
  }
}
