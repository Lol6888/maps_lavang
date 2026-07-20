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

// Dưới mức zoom này: ẩn artwork + vệ tinh, chỉ hiện sơ đồ vùng (hình dán khuôn viên
// trong sơ đồ làm đại diện); từ mức này trở lên: artwork chuẩn + vệ tinh như cũ.
export const REGION_SWAP_ZOOM = 15.75
