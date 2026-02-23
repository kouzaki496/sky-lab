import * as THREE from "three"

/** 球体の経線（北極→南極の半円）。ジオメトリの列を ix 固定でつなぐ。 */
export function createSphereMeridiansFromGeometry(
  geometry: THREE.SphereGeometry,
  segmentsLon: number
): THREE.LineSegments {
  const pos = geometry.getAttribute("position")
  const { widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const positions: number[] = []
  const step = Math.max(1, Math.floor((widthSegments + 1) / segmentsLon))

  for (let ix = 0; ix <= widthSegments; ix += step) {
    for (let iy = 0; iy < heightSegments; iy++) {
      const i0 = iy * W + ix
      const i1 = (iy + 1) * W + ix
      positions.push(
        pos.getX(i0), pos.getY(i0), pos.getZ(i0),
        pos.getX(i1), pos.getY(i1), pos.getZ(i1)
      )
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38, depthWrite: false })
  )
}

/** 球体の緯線（赤道に平行な円）。y=const の円周を x,z で描く。 */
export function createSphereGridFromGeometry(
  geometry: THREE.SphereGeometry,
  _segmentsLog: number,
  segmentsLat: number
): THREE.LineSegments {
  const pos = geometry.getAttribute("position")
  const { radius, widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const positions: number[] = []
  const parallelSteps = 64

  for (let j = 1; j < segmentsLat; j++) {
    const iy = Math.round((j / segmentsLat) * heightSegments)
    if (iy <= 0 || iy >= heightSegments) continue
    const idx = iy * W
    const yRow = pos.getY(idx)
    const R = Math.sqrt(Math.max(0, radius * radius - yRow * yRow))
    for (let i = 0; i < parallelSteps; i++) {
      const phi0 = (i / parallelSteps) * Math.PI * 2
      const phi1 = ((i + 1) / parallelSteps) * Math.PI * 2
      const x0 = -R * Math.cos(phi0)
      const z0 = R * Math.sin(phi0)
      const x1 = -R * Math.cos(phi1)
      const z1 = R * Math.sin(phi1)
      positions.push(x0, yRow, z0, x1, yRow, z1)
    }
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(
    geo,
    new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38, depthWrite: false })
  )
}

/** 球体の赤道（1本の線ループ）。 */
export function createSphereEquatorFromGeometry(geometry: THREE.SphereGeometry): THREE.LineLoop {
  const pos = geometry.getAttribute("position")
  const { widthSegments, heightSegments } = geometry.parameters
  const W = widthSegments + 1
  const iyEquator = Math.round(heightSegments / 2)
  const positions: number[] = []

  for (let ix = 0; ix <= widthSegments; ix++) {
    const i = iyEquator * W + ix
    positions.push(pos.getX(i), pos.getY(i), pos.getZ(i))
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineLoop(
    geo,
    new THREE.LineBasicMaterial({ color: 0xcc3333, linewidth: 2, depthWrite: false })
  )
}

/** 平面のグリッド線。 */
export function createPlaneGrid(w: number, h: number, segX: number, segY: number): THREE.LineSegments {
  const hw = w / 2, hh = h / 2, positions: number[] = [], z = 0.002
  for (let i = 0; i <= segX; i++) {
    const x = -hw + (w * i) / segX
    positions.push(x, -hh, z, x, hh, z)
  }
  for (let j = 0; j <= segY; j++) {
    const y = -hh + (h * j) / segY
    positions.push(-hw, y, z, hw, y, z)
  }
  const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute(positions, 3))
  return new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.38 }))
}

/** 平面の赤道 */
export function createPlaneEquator(width: number): THREE.Line {
  const hw = width / 2, z = 0.003
  const geo = new THREE.BufferGeometry().setAttribute("position", new THREE.Float32BufferAttribute([-hw, 0, z, hw, 0, z], 3))
  return new THREE.Line(geo, new THREE.LineBasicMaterial({ color: 0xcc3333, linewidth: 2 }))
}

export const SPHERE_GRID_LONGITUDE = 12
export const SPHERE_GRID_LATITUDE = 24
