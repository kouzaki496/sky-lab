import * as THREE from "three"

/**
 * 3Dデモ用シーン: 宇宙空間 ＋ 薄いグリッド ＋ 太陽系順の惑星。
 * 視点移動でパララックスを体験できる。
 */

/** 宇宙空間の背景色 */
export const DEMO3D_SPACE_BACKGROUND = new THREE.Color(0x050510)

/** 太陽系の惑星データ（太陽から順）。距離・半径は視覚用にスケール済み */
const PLANETS = [
  { name: "Sun", radius: 2.2, distance: 0, color: 0xffdd44 },
  { name: "Mercury", radius: 0.18, distance: 4, color: 0x8c7853 },
  { name: "Venus", radius: 0.28, distance: 6, color: 0xe6c229 },
  { name: "Earth", radius: 0.3, distance: 8, color: 0x2a4d8f },
  { name: "Mars", radius: 0.2, distance: 10, color: 0xb84d3a },
  { name: "Jupiter", radius: 0.7, distance: 16, color: 0xc88b3a },
  { name: "Saturn", radius: 0.58, distance: 22, color: 0xddbb66 },
  { name: "Uranus", radius: 0.38, distance: 28, color: 0x7bb8c7 },
  { name: "Neptune", radius: 0.36, distance: 34, color: 0x4166b4 }
]

export function createDemo3DScene(): THREE.Group {
  const group = new THREE.Group()

  // --- 薄いグリッド（XZ平面、宇宙空間の目安） ---
  const gridSize = 80
  const gridDivisions = 80
  const gridHelper = new THREE.GridHelper(
    gridSize,
    gridDivisions,
    0x333355,
    0x1a1a2e
  )
  gridHelper.position.y = -20
  gridHelper.material.opacity = 0.4
  gridHelper.material.transparent = true
  gridHelper.material.depthWrite = false
  group.add(gridHelper)

  // --- 星の点（簡易パーティクル） ---
  const starCount = 600
  const starGeo = new THREE.BufferGeometry()
  const starPositions = new Float32Array(starCount * 3)
  for (let i = 0; i < starCount * 3; i += 3) {
    starPositions[i] = (Math.random() - 0.5) * 120
    starPositions[i + 1] = (Math.random() - 0.5) * 120
    starPositions[i + 2] = (Math.random() - 0.5) * 120
  }
  starGeo.setAttribute("position", new THREE.BufferAttribute(starPositions, 3))
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.35,
    transparent: true,
    opacity: 0.9,
    sizeAttenuation: true
  })
  const stars = new THREE.Points(starGeo, starMat)
  group.add(stars)

  // --- 太陽系順に並んだ惑星（球体・立体感のある質感） ---
  const sphereGeo = new THREE.SphereGeometry(1, 48, 48)
  let saturnPosition: THREE.Vector3 | null = null
  for (const p of PLANETS) {
    const isSun = p.name === "Sun"
    const mat = new THREE.MeshPhongMaterial({
      color: p.color,
      emissive: isSun ? 0xffaa33 : 0x111111,
      emissiveIntensity: isSun ? 0.85 : 0,
      specular: isSun ? 0xffdd88 : 0x222244,
      shininess: isSun ? 12 : 35,
      flatShading: false
    })
    const mesh = new THREE.Mesh(sphereGeo, mat)
    mesh.scale.setScalar(p.radius)
    mesh.position.set(p.distance, 0, 0)
    mesh.userData.name = p.name
    group.add(mesh)
    if (p.name === "Saturn") saturnPosition = mesh.position.clone()
  }

  // 土星の環（薄い質感）
  if (saturnPosition) {
    const ringGeo = new THREE.RingGeometry(0.75, 1.1, 48)
    const ringMat = new THREE.MeshPhongMaterial({
      color: 0xccaa55,
      specular: 0x332211,
      shininess: 15,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.75
    })
    const saturnRing = new THREE.Mesh(ringGeo, ringMat)
    saturnRing.position.copy(saturnPosition)
    saturnRing.rotation.x = Math.PI / 2.5
    saturnRing.scale.setScalar(0.58)
    group.add(saturnRing)
  }

  return group
}

/** 3Dデモ用の初期カメラ位置（太陽〜地球付近が見える位置） */
export const DEMO3D_CAMERA_POSITION = new THREE.Vector3(0, 12, 28)
export const DEMO3D_TARGET = new THREE.Vector3(10, 0, 0)

/** カメラ・ターゲットの移動可能範囲（宇宙空間の端） */
export const DEMO3D_BOUNDS = {
  min: new THREE.Vector3(-25, -25, -25),
  max: new THREE.Vector3(45, 25, 45)
}
