// Sơ đồ vùng quanh La Vang (assets-src/map no label.webp -> public/map/region.webp).
//
// LƯU Ý ĐỘ CHÍNH XÁC: sơ đồ này là poster chỉ đường, KHÔNG đúng tỉ lệ toàn cục —
// hành lang phía đông (Lê Lợi đoạn gần khuôn viên, Liên Xã, bãi đỗ xe) đúng thực địa,
// nhưng phần phía bắc lên Cầu Trắng bị nén ~2 lần và lệch hướng ~19°.
// Georeference vì thế fit theo 2 neo gần khuôn viên (giao Lê Lợi×Liên Xã và đầu đông
// Liên Xã, đối chiếu OSM; scale 2.058 m/px, xoay 1.03°) để GPS chính xác ở vành đai
// đỗ xe / đi bộ vào; phần bắc chỉ mang tính minh họa. Xem scratchpad fit-region2.mjs.
export const REGION = {
  url: '/map/region.webp',
  // góc canvas: trên-trái, trên-phải, dưới-trái (lat, lng)
  topleft: [16.7435305, 107.1626485],
  topright: [16.744652, 107.2275336],
  bottomleft: [16.699245, 107.1634728],
}

// Dưới mức zoom này coi là "tầm nhìn vùng": hiện nhãn chú thích đường/địa danh
// và chỉ giữ POI nhóm Đi lại (31 marker ở tầm này sẽ đè chồng lên nhau).
export const REGION_SWAP_ZOOM = 15.75

// Hộp giới hạn pan/zoom (theo uv khung khuôn viên) — nội tiếp canvas sơ đồ đã xoay,
// để zoom-out hết mức viewport vẫn nằm trọn trong nền, không lộ mép.
// Canvas nghiêng nên phải đánh đổi: hộp này ưu tiên giữ Cầu Trắng (bắc) và sông
// Thạch Hãn (tây) trong tầm nhìn. Tính bằng scratchpad safebox-labels.mjs.
export const REGION_SAFE = { u0: -5.2, u1: 4.0, v0: -0.25, v1: 5.68 }

// Nhãn chú thích vẽ đè lên sơ đồ khi zoom xa (sơ đồ gốc không có chữ).
// Vị trí theo TỌA ĐỘ HÌNH VẼ trên sơ đồ (đổi từ px canvas qua fit) — nhãn phục vụ
// đọc sơ đồ, không phải vị trí GPS thật (phần bắc sơ đồ bị nén ~2 lần).
export const REGION_LABELS = [
  // Khuôn viên: đặt theo uv thật (0.5, 1.18) — ngay dưới artwork, không phải theo sơ đồ
  { id: 'trung-tam', text: 'Trung tâm Thánh Mẫu La Vang', kind: 'place', u: 0.5, v: 1.18 },
  { id: 'cau-trang', text: 'Cầu Trắng', kind: 'place', u: -0.744, v: 5.554 },
  { id: 'song-thach-han', text: 'Sông Thạch Hãn', kind: 'water', u: 3.869, v: 4.509 },
  { id: 'le-loi-1', text: 'Đ. Lê Lợi', kind: 'road', u: 0.015, v: 4.143 },
  { id: 'le-loi-2', text: 'Đ. Lê Lợi (một chiều)', kind: 'road', u: 0.719, v: 2.103 },
  { id: 'le-duan', text: 'Đ. Lê Duẩn · QL 1A', kind: 'road', u: -3.037, v: 3.61 },
  { id: 'lien-xa', text: 'Đ. Liên Xã (một chiều)', kind: 'road', u: -2.619, v: 1.287 },
]
