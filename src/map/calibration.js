import L from 'leaflet'

// ---- Căn chỉnh ảnh bản đồ vào tọa độ thật ----
// Ảnh được neo bằng 3 điểm: góc trên-trái, trên-phải, dưới-trái (theo ảnh gốc).
// Chỉnh trong chế độ ?calibrate=1 rồi dán JSON xuất ra vào DEFAULT_CALIBRATION.

export const IMAGE_SIZE = { width: 2302, height: 3368 }

// Ảnh nội khu mới (assets-src/map 24072026). Georeference bằng cách khớp 3 đặc
// trưng (mái basilica + 2 hồ) với ảnh cũ (fit similarity residual ≤ 1.0m) rồi
// chuyển qua calibration cũ (đã fit từ OSM, residual ≤ 2.1m). Xem scratchpad
// nm-fit2.mjs + nm-cal.mjs.
export const DEFAULT_CALIBRATION = {
  topleft: [16.7044956, 107.1987944],
  topright: [16.7033275, 107.1940767],
  bottomleft: [16.7111479, 107.1970214],
}

const LS_KEY = 'lavang-calibration'

export function loadCalibration() {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (raw) {
      const c = JSON.parse(raw)
      if (c.topleft && c.topright && c.bottomleft) return c
    }
  } catch { /* ignore */ }
  return DEFAULT_CALIBRATION
}

export function saveCalibration(cal) {
  localStorage.setItem(LS_KEY, JSON.stringify(cal))
}

export function clearCalibration() {
  localStorage.removeItem(LS_KEY)
}

// ---- Chuyển đổi tọa độ ảnh (u,v ∈ [0,1]) <-> lat/lng ----
// Tính trong không gian chiếu EPSG:3857 để phép affine chính xác khi ảnh xoay.
const proj = L.CRS.EPSG3857

function projected(cal) {
  const tl = proj.project(L.latLng(cal.topleft))
  const tr = proj.project(L.latLng(cal.topright))
  const bl = proj.project(L.latLng(cal.bottomleft))
  return { tl, tr, bl }
}

export function uvToLatLng(cal, u, v) {
  const { tl, tr, bl } = projected(cal)
  const x = tl.x + (tr.x - tl.x) * u + (bl.x - tl.x) * v
  const y = tl.y + (tr.y - tl.y) * u + (bl.y - tl.y) * v
  return proj.unproject(L.point(x, y))
}

export function latLngToUv(cal, latlng) {
  const { tl, tr, bl } = projected(cal)
  const p = proj.project(L.latLng(latlng))
  const ax = tr.x - tl.x, ay = tr.y - tl.y
  const bx = bl.x - tl.x, by = bl.y - tl.y
  const px = p.x - tl.x, py = p.y - tl.y
  const det = ax * by - ay * bx
  if (det === 0) return { u: 0, v: 0 }
  return {
    u: (px * by - py * bx) / det,
    v: (ax * py - ay * px) / det,
  }
}

// Tâm khuôn viên (u=0.5, v=0.5)
export function campusCenter(cal) {
  return uvToLatLng(cal, 0.5, 0.5)
}

// ---- Khung hiển thị "campus-up" ----
// Ảnh gốc xoay ~194° so với Bắc. Để artwork luôn thẳng đứng như thiết kế,
// chế độ thường vẽ mọi thứ trong một khung "giả" đặt ảnh thẳng trục,
// cùng tâm và cùng kích thước Mercator với khung thật. GPS lat/lng thật
// được đổi qua (u,v) của khung thật rồi chiếu vào khung hiển thị.

export function displayCalFrom(cal) {
  const { tl, tr, bl } = projected(cal)
  const w = Math.hypot(tr.x - tl.x, tr.y - tl.y)
  const h = Math.hypot(bl.x - tl.x, bl.y - tl.y)
  const c = proj.project(campusCenter(cal))
  const ll = (x, y) => {
    const p = proj.unproject(L.point(x, y))
    return [p.lat, p.lng]
  }
  // Mercator y tăng về bắc; hàng trên của ảnh hiển thị ở phía bắc khung giả
  return {
    topleft: ll(c.x - w / 2, c.y + h / 2),
    topright: ll(c.x + w / 2, c.y + h / 2),
    bottomleft: ll(c.x - w / 2, c.y - h / 2),
  }
}

// Hướng thật (bearing độ) của "trục đứng ảnh" — dùng để xoay mũi tên heading.
// Ảnh-up = từ bottomleft nhìn lên topleft.
export function campusBearing(cal) {
  const { tl, bl } = projected(cal)
  const dx = tl.x - bl.x
  const dy = tl.y - bl.y
  // Mercator: y tăng lên bắc; bearing = atan2(đông, bắc)
  let brg = (Math.atan2(dx, dy) * 180) / Math.PI
  return (brg + 360) % 360
}

// GPS thật -> tọa độ trong khung hiển thị
export function realToDisplay(cal, displayCal, latlng) {
  const { u, v } = latLngToUv(cal, latlng)
  return { latlng: uvToLatLng(displayCal, u, v), u, v }
}
