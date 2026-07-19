// POI lưu theo tọa độ ảnh (u,v ∈ [0,1], gốc trên-trái) — bám vào ảnh bản đồ,
// không phụ thuộc kết quả calibrate. Chỉnh vị trí bằng chế độ ?editpoi=1 (click để lấy u,v).
// Vị trí ban đầu ước lượng từ ảnh nhãn assets-src/poi-reference.jpeg.
// icon: tên trong src/components/iconPaths.js (Material Design).

// Bảng màu trầm, hòa với trang bìa (navy #0d1f38 + vàng kim) thay vì bảng màu
// rực của Google. Cả 4 màu đều đủ tối để icon trắng và chữ trên nền trắng đạt
// tương phản AA, và đều nổi trên ảnh vệ tinh khi làm marker.
export const CATEGORIES = {
  hanhhuong: { label: 'Hành hương', color: '#7d6029', icon: 'Church' },       // vàng kim
  tienich: { label: 'Tiện ích', color: '#3f5c78', icon: 'LocalDrink' },       // lam đá
  toanha: { label: 'Tòa nhà & khu vực', color: '#6b5744', icon: 'Domain' },   // nâu đá
  hotro: { label: 'Hỗ trợ & y tế', color: '#9c4a3c', icon: 'LocalHospital' }, // đỏ gạch
}

export const POIS = [
  // --- Hành hương ---
  { id: 'duc-me-suoi', name: 'Đức Mẹ Suối', icon: 'Water', cat: 'hanhhuong', u: 0.577, v: 0.019 },
  { id: 'vuong-cung-thanh-duong', name: 'Vương Cung Thánh Đường', icon: 'Church', cat: 'hanhhuong', u: 0.547, v: 0.164 },
  { id: 'linh-dai', name: 'Linh đài Đức Mẹ La Vang', icon: 'Church', cat: 'hanhhuong', u: 0.329, v: 0.436 },
  { id: 'thap-co', name: 'Tháp cổ', icon: 'AccountBalance', cat: 'hanhhuong', u: 0.53, v: 0.4146 },
  { id: 'tuong-dai-tu-dao', name: 'Tượng đài các thánh tử đạo', icon: 'AccountBalance', cat: 'hanhhuong', u: 0.178, v: 0.437 },
  { id: 'nha-nguyen', name: 'Nhà Nguyện', icon: 'Church', cat: 'hanhhuong', u: 0.341, v: 0.497 },
  { id: 'gieng-nuoc', name: 'Giếng Nước Đức Mẹ', icon: 'WaterDrop', cat: 'hanhhuong', u: 0.439, v: 0.507 },
  { id: 'khu-giai-toi', name: 'Khu vực Giải Tội', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.322, v: 0.812 },

  // --- Tòa nhà & khu vực ---
  { id: 'cong-chinh', name: 'Cổng chính', icon: 'DoorFront', cat: 'toanha', u: 0.509, v: 0.914 },
  { id: 'nha-trung-tam', name: 'Nhà trung tâm', icon: 'Domain', cat: 'toanha', u: 0.824, v: 0.37 },
  { id: 'nha-hanh-huong', name: 'Nhà hành hương', icon: 'Hotel', cat: 'toanha', u: 0.872, v: 0.476 },
  { id: 'khu-gioi-tre', name: 'Khu vực giới trẻ', icon: 'Groups', cat: 'toanha', u: 0.72, v: 0.814 },
  { id: 'nha-tien-che-trai', name: 'Nhà tiền chế (trái)', icon: 'NightShelter', cat: 'toanha', u: 0.167, v: 0.619 },
  { id: 'nha-tien-che-phai', name: 'Nhà tiền chế (phải)', icon: 'NightShelter', cat: 'toanha', u: 0.861, v: 0.622 },

  // --- Hỗ trợ ---
  { id: 'ban-tiep-tan', name: 'Ban tiếp tân', icon: 'Info', cat: 'hotro', u: 0.778, v: 0.425 },
  { id: 'trai-trat-tu', name: 'Trại trật tự trung tâm', icon: 'Shield', cat: 'hotro', u: 0.677, v: 0.5 },
  { id: 'ban-y-te', name: 'Ban y tế', icon: 'LocalHospital', cat: 'hotro', u: 0.824, v: 0.547 },

  // --- Tiện ích: toilet ---
  { id: 'toilet-tl', name: 'Toilet (gần Thánh Đường, trái)', icon: 'Wc', cat: 'tienich', u: 0.13, v: 0.257 },
  { id: 'toilet-tr', name: 'Toilet (gần Thánh Đường, phải)', icon: 'Wc', cat: 'tienich', u: 0.91, v: 0.256 },
  { id: 'toilet-r1', name: 'Toilet (khu nhà hành hương)', icon: 'Wc', cat: 'tienich', u: 0.929, v: 0.4225 },
  { id: 'toilet-r2', name: 'Toilet (gần ban y tế)', icon: 'Wc', cat: 'tienich', u: 0.929, v: 0.564 },
  { id: 'toilet-l', name: 'Toilet (khu trại, trái)', icon: 'Wc', cat: 'tienich', u: 0.122, v: 0.605 },

  // --- Tiện ích: nước & thức ăn ---
  // WaterDrop dành cho nước thánh; nước uống dùng LocalDrink cho khỏi lẫn
  { id: 'phat-nuoc-thuc-an', name: 'Điểm phát nước và thức ăn', icon: 'Restaurant', cat: 'tienich', u: 0.672, v: 0.586 },
  { id: 'phat-nuoc-trai', name: 'Điểm phát nước (khu trại trái)', icon: 'LocalDrink', cat: 'tienich', u: 0.408, v: 0.691 },
  { id: 'phat-nuoc-dao', name: 'Điểm phát nước (đảo trái)', icon: 'LocalDrink', cat: 'tienich', u: 0.292, v: 0.849 },
  { id: 'phat-nuoc-giua', name: 'Điểm phát nước (trục chính)', icon: 'LocalDrink', cat: 'tienich', u: 0.533, v: 0.831 },

  // --- Tiện ích: sạc điện thoại ---
  { id: 'sac-1', name: 'Sạc điện thoại (khu trại trên)', icon: 'ChargingStation', cat: 'tienich', u: 0.263, v: 0.5525 },
  { id: 'sac-2', name: 'Sạc điện thoại (khu trại dưới, trái)', icon: 'ChargingStation', cat: 'tienich', u: 0.258, v: 0.691 },
  { id: 'sac-3', name: 'Sạc điện thoại (khu trại dưới, phải)', icon: 'ChargingStation', cat: 'tienich', u: 0.732, v: 0.691 },
]
