import * as THREE from "three"

/**
 * 360°と3Dの違いを見せるための簡易3Dシーン。
 * 視点を動かすと手前・奥のオブジェクトの相対位置が変わり（パララックス）、
 * 360°パノラマでは得られない「本当の3D」を体験できる。
 */
export function createDemo3DScene(): THREE.Group {
  const group = new THREE.Group()

  const colors = [0x3498db, 0xe74c3c, 0x2ecc71, 0xf39c12, 0x9b59b6]
  const mat = (i: number) =>
    new THREE.MeshBasicMaterial({ color: colors[i % colors.length] })

  // 手前〜奥に配置した立方体（視点移動でパララックスが分かりやすい）
  const positions: [number, number, number][] = [
    [0, 0, -2],
    [-1.2, 0.3, -3],
    [1, -0.2, -3.5],
    [0, 0.5, -5],
    [-0.8, -0.3, -4]
  ]
  const scales = [0.4, 0.5, 0.35, 0.6, 0.45]
  const geo = new THREE.BoxGeometry(1, 1, 1)
  positions.forEach((pos, i) => {
    const m = new THREE.Mesh(geo, mat(i))
    m.position.set(pos[0], pos[1], pos[2])
    m.scale.setScalar(scales[i])
    group.add(m)
  })

  // 床っぽい平面（奥行きの目安）
  const floorGeo = new THREE.PlaneGeometry(8, 6)
  const floorMat = new THREE.MeshBasicMaterial({
    color: 0xecf0f1,
    side: THREE.DoubleSide
  })
  const floor = new THREE.Mesh(floorGeo, floorMat)
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -0.6
  floor.position.z = -3.5
  group.add(floor)

  return group
}

/** 3Dデモ用の初期カメラ位置（target はシーン中心付近） */
export const DEMO3D_CAMERA_POSITION = new THREE.Vector3(0, 0, 1.5)
export const DEMO3D_TARGET = new THREE.Vector3(0, 0, -3)
