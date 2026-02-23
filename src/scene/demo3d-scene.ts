import * as THREE from "three"

/**
 * 3Dデモ用シーン。
 * - 宇宙空間（背景色・星点）＋薄いグリッド
 * - 太陽系惑星（球体＋土星の輪）。惑星は public のテクスチャ画像を貼り付け。太陽はemissive で発光
 */
export const DEMO3D_SPACE_BACKGROUND = new THREE.Color(0x050510)

const PLANETS = [
  { name: "Sun", radius: 2.2, distance: 0, offsetY: 0, offsetZ: 0 },
  { name: "Mercury", radius: 0.18, distance: 4, offsetY: 0, offsetZ: 0 },
  { name: "Venus", radius: 0.28, distance: 6, offsetY: 0, offsetZ: 0 },
  { name: "Earth", radius: 0.3, distance: 8, offsetY: 0, offsetZ: 0 },
  { name: "Mars", radius: 0.2, distance: 10, offsetY: 0, offsetZ: 0 },
  { name: "Jupiter", radius: 0.7, distance: 16, offsetY: 0, offsetZ: 0},
  { name: "Saturn", radius: 0.58, distance: 22, offsetY: 0, offsetZ: 0 },
  { name: "Uranus", radius: 0.38, distance: 28, offsetY: 0, offsetZ: 0 },
  { name: "Neptune", radius: 0.36, distance: 34, offsetY: 0, offsetZ: 0 }
]

const BASE = import.meta.env.BASE_URL
const PLANET_TEXTURE_PATHS: Record<string, string> = {
  Mercury: BASE + "mercury.jpg",
  Venus: BASE + "venus.jpg",
  Earth: BASE + "earth.jpg",
  Mars: BASE + "mars.jpg",
  Jupiter: BASE + "jupiter.jpg",
  Saturn: BASE + "saturn.jpg",
  Uranus: BASE + "uranus.jpg",
  Neptune: BASE + "neptune.png"
}

/** 輪がある惑星の輪パラメータ（内径・外径は惑星半径比。inner > 1 で惑星と輪の間に隙間） */
const RING_CONFIG: Record<string, { inner: number; outer: number; color: number; opacity: number }> = {
  Saturn: { inner: 1.45, outer: 2.35, color: 0xccaa55, opacity: 0.75 },
  Uranus: { inner: 1.08, outer: 1.82, color: 0x334455, opacity: 0.4 },
}

export function createDemo3DScene(): THREE.Group {
  const group = new THREE.Group()

  const gridSize = 80
  const gridDivisions = 80
  const gridHelper = new THREE.GridHelper(
    gridSize,
    gridDivisions,
    0x333355,
    0x1a1a2e
  )
  gridHelper.position.y = -10
  gridHelper.material.opacity = 0.4
  gridHelper.material.transparent = true
  gridHelper.material.depthWrite = false
  group.add(gridHelper)

  const starCount = 600
  const starRadius = 0.12
  const starSphereGeo = new THREE.SphereGeometry(starRadius, 8, 8)
  const starMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.95
  })
  const stars = new THREE.InstancedMesh(starSphereGeo, starMat, starCount)
  const starMatrix = new THREE.Matrix4()
  for (let i = 0; i < starCount; i++) {
    starMatrix.setPosition(
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 120,
      (Math.random() - 0.5) * 120
    )
    stars.setMatrixAt(i, starMatrix)
  }
  stars.instanceMatrix.needsUpdate = true
  group.add(stars)

  const textureLoader = new THREE.TextureLoader()
  const sphereGeo = new THREE.SphereGeometry(1, 48, 48)
  for (const p of PLANETS) {
    const isSun = p.name === "Sun"
    const texturePath = PLANET_TEXTURE_PATHS[p.name]
    const tex = texturePath
      ? textureLoader.load(texturePath, (t) => {
          t.colorSpace = THREE.SRGBColorSpace
        })
      : null
    const mat = new THREE.MeshPhongMaterial({
      color: tex ? 0xffffff : 0x888888,
      map: tex ?? undefined,
      emissive: isSun ? 0xffaa33 : 0x111111,
      emissiveIntensity: isSun ? 0.85 : 0,
      specular: isSun ? 0xffdd88 : 0x222244,
      shininess: isSun ? 12 : 35,
      flatShading: false
    })
    const mesh = new THREE.Mesh(sphereGeo, mat)
    mesh.scale.setScalar(p.radius)
    mesh.position.set(p.distance, p.offsetY, p.offsetZ)
    mesh.userData.name = p.name
    if (!isSun) {
      mesh.castShadow = true
      mesh.receiveShadow = true
    }
    group.add(mesh)

    const ringConfig = RING_CONFIG[p.name]
    if (ringConfig) {
      const ring = new THREE.RingGeometry(ringConfig.inner, ringConfig.outer, 48)
      const ringMat = new THREE.MeshPhongMaterial({
        color: ringConfig.color,
        specular: 0x332211,
        shininess: 15,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: ringConfig.opacity
      })
      const ringMesh = new THREE.Mesh(ring, ringMat)
      ringMesh.position.copy(mesh.position)
      ringMesh.rotation.x = Math.PI / 2.5
      ringMesh.scale.setScalar(p.radius)
      ringMesh.castShadow = true
      ringMesh.receiveShadow = true
      group.add(ringMesh)
    }
  }

  return group
}

export const DEMO3D_CAMERA_POSITION = new THREE.Vector3(0, 12, 28)
export const DEMO3D_TARGET = new THREE.Vector3(10, 0, 0)
export const DEMO3D_BOUNDS = {
  min: new THREE.Vector3(-25, -25, -25),
  max: new THREE.Vector3(45, 25, 45)
}
