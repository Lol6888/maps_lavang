// TỰ SINH bởi scripts/gen-backdrop.mjs — đừng sửa tay.
// Ảnh vệ tinh nền quanh khuôn viên, ghép từ Esri World Imagery ở mức zoom 16.
// Đây là hình chữ nhật hướng Bắc trong tọa độ THẬT; lúc vẽ sẽ được đưa qua
// phép biến đổi thật→hiển thị để xoay khớp với ảnh bản đồ.
export const BACKDROP = {
  url: '/map/backdrop.webp',
  // góc theo khung ảnh nền: trên-trái, trên-phải, dưới-trái (lat, lng)
  topleft: [16.720114, 107.182342],
  topright: [16.720114, 107.208604],
  bottomleft: [16.694961, 107.182342],
  attribution: 'Ảnh vệ tinh: Esri, Maxar, Earthstar Geographics',
}
