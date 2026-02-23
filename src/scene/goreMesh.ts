import * as THREE from "three"
import { SIZE_CONFIG } from "../config"

/** ゴア型の静的な展開図 */
export function createGoreUnwrapMesh(texture: THREE.Texture, numGores: number, latSteps: number): THREE.Mesh {
  const totalW = SIZE_CONFIG.planeWidth
  const totalH = SIZE_CONFIG.planeHeight
  const goreW = totalW / numGores
  const positions: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const z = 0.001

  for (let g = 0; g < numGores; g++) {
    const xOffset = (g - (numGores - 1) / 2) * goreW
    for (let j = 0; j <= latSteps; j++) {
      const v = j / latSteps
      const t = v * Math.PI
      const halfW = (goreW / 2) * Math.sin(t)
      const y = totalH / 2 - v * totalH
      positions.push(xOffset - halfW, y, z, xOffset + halfW, y, z)
      uvs.push(g / numGores, 1 - v, (g + 1) / numGores, 1 - v)
    }
  }
  for (let g = 0; g < numGores; g++) {
    for (let j = 0; j < latSteps; j++) {
      const a = (g * (latSteps + 1) + j) * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.computeVertexNormals()
  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  return new THREE.Mesh(geo, mat)
}

const GORE_MERIDIAN_EMPHASIS = 0.05
const GORE_EQUATOR_PEEL_ANGLE = (55 * Math.PI) / 180
const GORE_EQUATOR_RING_V_SCALE = 1.14
const GORE_FLAT_V_SCALE = 1.12

/** ベクトルを原点を通る軸まわりに回転（ロドリゲスの公式）。 */
function rotateAroundAxis(vx: number, vy: number, vz: number, ax: number, ay: number, az: number, angle: number): [number, number, number] {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const dot = ax * vx + ay * vy + az * vz
  const crossX = ay * vz - az * vy
  const crossY = az * vx - ax * vz
  const crossZ = ax * vy - ay * vx
  return [
    vx * c + crossX * s + ax * dot * (1 - c),
    vy * c + crossY * s + ay * dot * (1 - c),
    vz * c + crossZ * s + az * dot * (1 - c)
  ]
}

/** メッシュに scale 1.4 をかけるので、球半径は (シーン球の見た目) / 1.4 にして展開時も大きさが変わらないようにする */
const GORE_MORPH_SCALE = 1.4

/** 球→経線強調→赤道はがれ（円状）→平面の 3 段階 morph。 */
export function createSphereToGoreMorphMesh(
  texture: THREE.Texture,
  numGores: number,
  latSteps: number
): THREE.Mesh {
  const totalW = SIZE_CONFIG.planeWidth / GORE_MORPH_SCALE
  const totalH = SIZE_CONFIG.planeHeight / GORE_MORPH_SCALE
  const goreW = totalW / numGores
  const r = (SIZE_CONFIG.sphereRadius * SIZE_CONFIG.unwrap.sphereScale) / GORE_MORPH_SCALE
  const positions: number[] = []
  const positionsSlit: number[] = []
  const positionsEquatorRing: number[] = []
  const positionsFlat: number[] = []
  const uvs: number[] = []
  const indices: number[] = []
  const z = 0.001

  for (let g = 0; g < numGores; g++) {
    const xOffset = (g - (numGores - 1) / 2) * goreW
    const phiCenter = ((g + 0.5) / numGores) * Math.PI * 2
    const ax = Math.sin(phiCenter)
    const ay = 0
    const az = Math.cos(phiCenter)
    for (let j = 0; j <= latSteps; j++) {
      const v = j / latSteps
      const theta = v * Math.PI
      const phiL = (g / numGores) * Math.PI * 2
      const phiR = ((g + 1) / numGores) * Math.PI * 2
      const xL = -r * Math.sin(theta) * Math.cos(phiL)
      const yL = r * Math.cos(theta)
      const zL = r * Math.sin(theta) * Math.sin(phiL)
      const xR = -r * Math.sin(theta) * Math.cos(phiR)
      const yR = r * Math.cos(theta)
      const zR = r * Math.sin(theta) * Math.sin(phiR)
      positions.push(xL, yL, zL, xR, yR, zR)
      const nL = Math.sqrt(xL * xL + yL * yL + zL * zL) || 1
      const nR = Math.sqrt(xR * xR + yR * yR + zR * zR) || 1
      const push = GORE_MERIDIAN_EMPHASIS
      const sLx = xL + (xL / nL) * push
      const sLy = yL + (yL / nL) * push
      const sLz = zL + (zL / nL) * push
      const sRx = xR + (xR / nR) * push
      const sRy = yR + (yR / nR) * push
      const sRz = zR + (zR / nR) * push
      positionsSlit.push(sLx, sLy, sLz, sRx, sRy, sRz)
      const peelAngle =
        v < 0.5
          ? ((0.5 - v) / 0.5) * GORE_EQUATOR_PEEL_ANGLE
          : -((v - 0.5) / 0.5) * GORE_EQUATOR_PEEL_ANGLE
      const [eLx, eLy, eLz] = rotateAroundAxis(sLx, sLy, sLz, ax, ay, az, peelAngle)
      const [eRx, eRy, eRz] = rotateAroundAxis(sRx, sRy, sRz, ax, ay, az, peelAngle)
      positionsEquatorRing.push(eLx, eLy * GORE_EQUATOR_RING_V_SCALE, eLz, eRx, eRy * GORE_EQUATOR_RING_V_SCALE, eRz)
      const t = v * Math.PI
      const halfW = (goreW / 2) * Math.sin(t)
      const yFlat = (totalH / 2 - v * totalH) * GORE_FLAT_V_SCALE
      positionsFlat.push(xOffset - halfW, yFlat, z, xOffset + halfW, yFlat, z)
      uvs.push(g / numGores, 1 - v, (g + 1) / numGores, 1 - v)
    }
  }
  // 球の「内側」が正面になるよう巻き順を反転（本球は BackSide で内側表示のため、ゴアも内側に見せる）
  for (let g = 0; g < numGores; g++) {
    for (let j = 0; j < latSteps; j++) {
      const a = (g * (latSteps + 1) + j) * 2
      const b = a + 1
      const c = a + 2
      const d = a + 3
      indices.push(a, b, c, b, d, c)
    }
  }

  const positionsM1: number[] = []
  const positionsM2: number[] = []
  for (let i = 0; i < positions.length; i++) {
    positionsM1.push(positions[i] + (positionsEquatorRing[i] - positionsSlit[i]))
    positionsM2.push(positions[i] + (positionsFlat[i] - positionsEquatorRing[i]))
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.setAttribute("morphTarget0", new THREE.Float32BufferAttribute(positionsSlit, 3))
  geo.setAttribute("morphTarget1", new THREE.Float32BufferAttribute(positionsM1, 3))
  geo.setAttribute("morphTarget2", new THREE.Float32BufferAttribute(positionsM2, 3))
  geo.morphAttributes.position = [
    geo.getAttribute("morphTarget0") as THREE.BufferAttribute,
    geo.getAttribute("morphTarget1") as THREE.BufferAttribute,
    geo.getAttribute("morphTarget2") as THREE.BufferAttribute
  ]
  geo.computeVertexNormals()
  // DoubleSide: 球は内側・平面は表のどちらからでも見える（同一インデックスで球は内側・平面は裏が正面になるため）
  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(GORE_MORPH_SCALE)
  mesh.frustumCulled = false
  return mesh
}

const UNFOLD_LON = 12
const UNFOLD_LAT = 8

/** 球と矩形を morphTarget で補間するメッシュ（未使用）。 */
export function createUnfoldMesh(texture: THREE.Texture): THREE.Mesh {
  const W = UNFOLD_LON + 1
  const H = UNFOLD_LAT + 1
  const r = 2
  const flatW = SIZE_CONFIG.planeWidth / 1.4
  const flatH = SIZE_CONFIG.planeHeight / 1.4
  const positions: number[] = []
  const positionsFlat: number[] = []
  const uvs: number[] = []
  const indices: number[] = []

  for (let j = 0; j < H; j++) {
    const theta = (j / UNFOLD_LAT) * Math.PI
    for (let i = 0; i < W; i++) {
      const phi = (i / UNFOLD_LON) * Math.PI * 2
      const x = -r * Math.sin(theta) * Math.cos(phi)
      const y = r * Math.cos(theta)
      const z = r * Math.sin(theta) * Math.sin(phi)
      positions.push(x, y, z)
      const fx = (i / UNFOLD_LON - 0.5) * flatW
      const fy = (j / UNFOLD_LAT - 0.5) * flatH
      positionsFlat.push(fx, fy, 0.001)
      uvs.push(i / UNFOLD_LON, j / UNFOLD_LAT)
    }
  }
  for (let j = 0; j < UNFOLD_LAT; j++) {
    for (let i = 0; i < UNFOLD_LON; i++) {
      const a = j * W + i
      const b = a + 1
      const c = a + W
      const d = c + 1
      indices.push(a, c, b, b, c, d)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2))
  geo.setIndex(indices)
  geo.setAttribute("morphTarget0", new THREE.Float32BufferAttribute(positionsFlat, 3))
  geo.morphAttributes.position = [geo.getAttribute("morphTarget0") as THREE.BufferAttribute]
  geo.computeVertexNormals()

  const mat = new THREE.MeshBasicMaterial({
    map: texture.clone(),
    side: THREE.DoubleSide
  })
  const mesh = new THREE.Mesh(geo, mat)
  mesh.scale.setScalar(1.4)
  mesh.frustumCulled = false
  return mesh
}
