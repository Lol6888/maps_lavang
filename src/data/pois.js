// POI lưu theo tọa độ ảnh (u,v ∈ [0,1], gốc trên-trái) của ảnh nội khu mới
// (assets-src/map 24072026, 2302×3368). Vị trí đo trực tiếp từ chấm marker trên
// "map label.webp" (scripts scratchpad nm-newdots/nm-orange), sai số dưới 1 dot.
// icon: tên trong src/components/iconPaths.js (Material Design).

export const CATEGORIES = {
  hanhhuong: { label: 'Hành hương', color: '#7d6029', icon: 'Church' },       // vàng kim
  tienich: { label: 'Tiện ích', color: '#3f5c78', icon: 'LocalDrink' },       // lam đá
  toanha: { label: 'Tòa nhà & khu vực', color: '#6b5744', icon: 'Domain' },   // nâu đá
  hotro: { label: 'Hỗ trợ & y tế', color: '#9c4a3c', icon: 'LocalHospital' }, // đỏ gạch
  giaothong: { label: 'Đi lại & đỗ xe', color: '#3a5f43', icon: 'DirectionsBus' }, // lục thẫm
}

// prominent: true = điểm nổi bật, hiện title ngay ở zoom mặc định (theo danh sách Felix).
export const POIS = [
  // --- Hành hương ---
  { id: 'duc-me-suoi', name: 'Đức Mẹ Suối', icon: 'Water', cat: 'hanhhuong', u: 0.5381, v: 0.1227, prominent: true },
  { id: 'vuong-cung-thanh-duong', name: 'Vương Cung Thánh Đường', icon: 'Church', cat: 'hanhhuong', u: 0.528, v: 0.3024, prominent: true },
  { id: 'khu-tu-dao', name: 'Quảng trường các thánh tử đạo', icon: 'AccountBalance', cat: 'hanhhuong', u: 0.236, v: 0.4914, prominent: true },
  { id: 'linh-dai', name: 'Linh đài', icon: 'Church', cat: 'hanhhuong', u: 0.3445, v: 0.4898, hero: true },
  { id: 'nha-chau-thanh-the', name: 'Nhà Chầu Thánh Thể', icon: 'Church', cat: 'hanhhuong', u: 0.3015, v: 0.5212, prominent: true },
  { id: 'thap-co', name: 'Tháp cổ', icon: 'AccountBalance', cat: 'hanhhuong', u: 0.524, v: 0.4599, prominent: true },
  { id: 'nha-nguyen', name: 'Nhà nguyện', icon: 'Church', cat: 'hanhhuong', u: 0.3726, v: 0.547, prominent: true },
  { id: 'gieng-duc-me', name: 'Giếng Đức Mẹ', icon: 'WaterDrop', cat: 'hanhhuong', u: 0.4439, v: 0.5482 },
  { id: 'duc-me-ban-on', name: 'Đức Mẹ Ban Ơn', icon: 'Church', cat: 'hanhhuong', u: 0.5892, v: 0.5446 },
  { id: 'khu-giai-toi', name: 'Nơi lãnh nhận bí tích hòa giải', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.3092, v: 0.8231, prominent: true },
  // Xin lễ · xin khấn (4 điểm) — bổ sung từ map label add
  { id: 'xin-le-1', name: 'Xin lễ · xin khấn (Linh đài)', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.318, v: 0.4509, prominent: true },
  { id: 'xin-le-2', name: 'Xin lễ · xin khấn (Nhà hành hương)', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.7074, v: 0.4776, prominent: true },
  { id: 'xin-le-3', name: 'Xin lễ · xin khấn (Nhà nguyện)', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.3354, v: 0.522, prominent: true },
  { id: 'xin-le-4', name: 'Xin lễ · xin khấn (Giếng Đức Mẹ)', icon: 'VolunteerActivism', cat: 'hanhhuong', u: 0.4038, v: 0.5334, prominent: true },

  // --- Tòa nhà & khu vực ---
  { id: 'nha-trung-tam', name: 'Nhà trung tâm', icon: 'Domain', cat: 'toanha', u: 0.7972, v: 0.4256, prominent: true },
  { id: 'nha-hanh-huong', name: 'Nhà hành hương', icon: 'Hotel', cat: 'toanha', u: 0.7598, v: 0.535, prominent: true },
  { id: 'nha-tien-che-1', name: 'Nhà tiền chế 1', icon: 'NightShelter', cat: 'toanha', u: 0.7691, v: 0.6923 },
  { id: 'nha-tien-che-2', name: 'Nhà tiền chế 2', icon: 'NightShelter', cat: 'toanha', u: 0.2471, v: 0.6827 },
  { id: 'dao-gioi-tre', name: 'Đảo giới trẻ', icon: 'Groups', cat: 'toanha', u: 0.6835, v: 0.8134, prominent: true },
  { id: 'cong-phu-1', name: 'Cổng phụ 1', icon: 'DoorFront', cat: 'toanha', u: 0.2331, v: 0.5634 },
  { id: 'cong-phu-2', name: 'Cổng phụ 2', icon: 'DoorFront', cat: 'toanha', u: 0.7831, v: 0.573 },
  { id: 'cong-phu-3', name: 'Cổng phụ 3', icon: 'DoorFront', cat: 'toanha', u: 0.7879, v: 0.371 },
  { id: 'cong-phu-4', name: 'Cổng phụ 4', icon: 'DoorFront', cat: 'toanha', u: 0.2454, v: 0.365 },

  // --- Hỗ trợ & y tế ---
  { id: 'trai-trat-tu', name: 'Trại trật tự trung tâm', icon: 'Shield', cat: 'hotro', u: 0.6695, v: 0.5482, prominent: true },
  { id: 'trai-y-te', name: 'Nhà Y Tế', icon: 'LocalHospital', cat: 'hotro', u: 0.7457, v: 0.6066, prominent: true },
  { id: 'ban-ken-trong', name: 'Ban kèn trống', icon: 'MusicNote', cat: 'hotro', u: 0.6959, v: 0.3474, prominent: true },
  { id: 'trai-tntt', name: 'Trại TNTT', icon: 'Diversity3', cat: 'hotro', u: 0.6959, v: 0.3974, prominent: true },

  // --- Tiện ích: nhà vệ sinh ---
  { id: 'nha-ve-sinh-1', name: 'Nhà vệ sinh 1', icon: 'Wc', cat: 'tienich', u: 0.219, v: 0.6354, prominent: true },
  { id: 'nha-ve-sinh-2', name: 'Nhà vệ sinh 2', icon: 'Wc', cat: 'tienich', u: 0.802, v: 0.6066, prominent: true },
  { id: 'nha-ve-sinh-3', name: 'Nhà vệ sinh 3', icon: 'Wc', cat: 'tienich', u: 0.8161, v: 0.4801, prominent: true },
  { id: 'nha-ve-sinh-4', name: 'Nhà vệ sinh 4', icon: 'Wc', cat: 'tienich', u: 0.8021, v: 0.2831, prominent: true },
  { id: 'nha-ve-sinh-5', name: 'Nhà vệ sinh 5', icon: 'Wc', cat: 'tienich', u: 0.2219, v: 0.3288, prominent: true },
  { id: 'nha-ve-sinh-6', name: 'Nhà vệ sinh 6', icon: 'Wc', cat: 'tienich', u: 0.2313, v: 0.5376, prominent: true },

  // --- Tiện ích: sạc điện thoại ---
  { id: 'sac-1', name: 'Sạc điện thoại 1', icon: 'ChargingStation', cat: 'tienich', u: 0.3015, v: 0.7202 },
  { id: 'sac-2', name: 'Sạc điện thoại 2', icon: 'ChargingStation', cat: 'tienich', u: 0.6105, v: 0.725 },
  { id: 'sac-3', name: 'Sạc điện thoại 3', icon: 'ChargingStation', cat: 'tienich', u: 0.5751, v: 0.6688 },
  { id: 'sac-4', name: 'Sạc điện thoại 4', icon: 'ChargingStation', cat: 'tienich', u: 0.6835, v: 0.6311 },
  { id: 'sac-5', name: 'Sạc điện thoại 5', icon: 'ChargingStation', cat: 'tienich', u: 0.6469, v: 0.5634 },
  { id: 'sac-6', name: 'Sạc điện thoại 6', icon: 'ChargingStation', cat: 'tienich', u: 0.3232, v: 0.6066 },
  { id: 'sac-7', name: 'Sạc điện thoại 7', icon: 'ChargingStation', cat: 'tienich', u: 0.3803, v: 0.4256 },

  // --- Tiện ích: nước & thức ăn ---
  { id: 'phat-nuoc-1', name: 'Điểm phát nước 1', icon: 'LocalDrink', cat: 'tienich', u: 0.3662, v: 0.8693, prominent: true },
  { id: 'phat-nuoc-2', name: 'Điểm phát nước 2', icon: 'LocalDrink', cat: 'tienich', u: 0.5381, v: 0.85, prominent: true },
  { id: 'phat-nuoc-3', name: 'Điểm phát nước 3', icon: 'LocalDrink', cat: 'tienich', u: 0.458, v: 0.7057, prominent: true },
  { id: 'diem-thuc-pham-4', name: 'Điểm thực phẩm và nước 4', icon: 'Restaurant', cat: 'tienich', u: 0.5772, v: 0.6138, prominent: true },

  // --- Quầy lưu niệm ---
  { id: 'quay-luu-niem-1', name: 'Quầy lưu niệm 1', icon: 'Storefront', cat: 'tienich', u: 0.800, v: 0.461, prominent: true },
  { id: 'quay-luu-niem-2', name: 'Quầy lưu niệm 2', icon: 'Storefront', cat: 'tienich', u: 0.800, v: 0.505, prominent: true },

  // --- Đi lại & đỗ xe ---
  { id: 'cong-chinh', name: 'Cổng chính (Điểm đón trả khách)', icon: 'DirectionsBus', cat: 'giaothong', u: 0.4998, v: 0.9216, prominent: true },
  // Bãi đỗ xe nằm ngoài khuôn viên (uv ngoài [0,1] — hợp lệ). Cần đo thực địa chỉnh lại.
  { id: 'bai-do-xe', name: 'Bãi đỗ xe khách', icon: 'LocalParking', cat: 'giaothong', u: -1.8872, v: 0.8968 },
]
