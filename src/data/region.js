import { REGION_BOUNDS, OSM_LABELS } from './region-labels.js'

// Bản đồ nền vùng quanh La Vang — TỰ RENDER từ dữ liệu OpenStreetMap
// (scripts/fetch-osm-region.mjs + scripts/render-basemap.mjs), phong cách bản đồ đường
// như Google Maps nhưng dùng chất giấy kem cho liền mạch với artwork khuôn viên.
//
// Không dùng tile Google (cấm lấy bằng URL trực tiếp) cũng không cache tile bên thứ ba.
// Tự render nên: chạy offline, kiểm soát hoàn toàn phong cách + phạm vi, và georeference
// chính xác north-up — khác hẳn poster vẽ tay trước đây bị nén ~2 lần ở phần bắc.
export const REGION = {
  url: '/map/region.webp',
  ...REGION_BOUNDS, // 12.8 x 13.9 km, 3.2 m/px
  attribution: '© OpenStreetMap contributors',
}

// Dưới mức zoom này coi là "tầm nhìn vùng": chỉ giữ POI nhóm Đi lại
// (31 marker ở tầm này sẽ đè chồng lên nhau).
export const REGION_SWAP_ZOOM = 15.75

// Hộp giới hạn pan/zoom (theo uv khung khuôn viên) — nội tiếp canvas nền đã xoay ~15°
// trong khung hiển thị, để zoom-out hết mức viewport vẫn nằm trọn trong nền.
// Tính bằng scratchpad/safebox2.mjs. Tương đương ~7.1 x 12.5 km.
export const REGION_SAFE = { u0: -9.94, u1: 8.14, v0: -7.04, v1: 10.92 }

// Nhãn vẽ bằng DOM (không nướng vào ảnh) nên luôn sắc nét ở mọi mức zoom.
// minZoom = mức zoom tối thiểu để nhãn hiện ra, tránh chữ chồng chữ khi nhìn xa.
export const REGION_LABELS = [
  { text: 'TRUNG TÂM THÁNH MẪU LA VANG', kind: 'shrine', u: 0.5, v: 1.16, minZoom: 0 },
  ...OSM_LABELS,
]
