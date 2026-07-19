# Bản đồ La Vang

Web app bản đồ tương tác cho Trung tâm hành hương Đức Mẹ La Vang (Hải Phú, Hải Lăng, Quảng Trị): bản đồ vẽ tay georeference chính xác + vị trí GPS real-time + các điểm tiện ích/hành hương.

## Chạy dev

```bash
npm install
npm run dev
```

## Kiến trúc

- **React + Vite + Leaflet** (không dùng react-leaflet).
- Ảnh bản đồ vẽ lại (7843×13934) được **georeference** vào tọa độ thật bằng 3 điểm neo lấy từ OSM (Vương Cung Thánh Đường, Tháp chuông, hồ trái) — fit similarity transform, residual ≤ 2.1m, validate với 5 điểm độc lập sai số ≤ ~7m. Xem `src/map/calibration.js`.
- **Khung hiển thị "campus-up"**: ảnh gốc xoay ~194° so với hướng Bắc. Để artwork hiển thị thẳng đứng như thiết kế, chế độ thường vẽ mọi thứ trong khung giả đặt ảnh thẳng trục; tọa độ GPS thật được đổi qua (u,v) của khung thật rồi chiếu vào khung hiển thị (`realToDisplay`). Mũi tên heading được trừ góc xoay khuôn viên (~165.6°).
- **POI** lưu theo tọa độ ảnh `(u, v) ∈ [0,1]` trong `src/data/pois.js` — bám vào ảnh, không phụ thuộc calibration.
- **GPS** (`src/hooks/useGeolocation.js`): `watchPosition` + `enableHighAccuracy`, bỏ qua fix có accuracy > 30m (chỉ làm mờ marker), deadzone 2m, làm mượt EMA, vòng tròn accuracy, heading khi đang di chuyển.

## Các chế độ (URL param)

| URL | Chức năng |
|---|---|
| `/` | Bản đồ chính (mobile-first) |
| `/?calibrate=1` | Căn chỉnh ảnh với vệ tinh Esri: kéo 3 góc TL/TR/BL, kéo ✥ để dời cả ảnh, copy JSON → dán vào `DEFAULT_CALIBRATION` |
| `/?editpoi=1` | Chạm bản đồ để lấy `(u, v)` cho POI mới (copy vào clipboard) |

## Assets

- `assets-src/` — ảnh gốc độ phân giải đầy đủ (2 lớp: có cây / không cây) + ảnh tham chiếu vị trí POI.
- `public/map/` — bản downscale 2048/4096px cho web (tạo bằng ffmpeg).

## Lưu ý độ chính xác

Ảnh là bản vẽ lại nghệ thuật: vị trí tâm các công trình chuẩn theo phép fit, nhưng kích thước một số công trình bị phóng to ~8% so với thực tế (hồ, Thánh Đường) → sai số tối đa ~5–7m ở mép các công trình lớn, nằm trong nhiễu GPS ngoài trời. GPS trong nhà (Thánh Đường) sẽ lệch — chấp nhận được theo thiết kế.
