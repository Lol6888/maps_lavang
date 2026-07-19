# Bản đồ La Vang

Web app bản đồ tương tác cho Trung tâm hành hương Đức Mẹ La Vang (Hải Phú, Hải Lăng, Quảng Trị): bản đồ vẽ tay georeference chính xác + vị trí GPS real-time + các điểm tiện ích/hành hương.

## Chạy dev

```bash
npm install
npm run dev
```

## Luồng sử dụng

1. **Màn hình chọn địa điểm** — thẻ (card) các địa điểm gom theo danh mục, có ô tìm kiếm. Khi đã có GPS, mỗi thẻ hiện khoảng cách và các thẻ tự sắp theo gần → xa.
2. **Chế độ dẫn đường** — chọn một thẻ, bản đồ vẽ đường đi bộ từ chỗ user đang đứng tới đích, kèm quãng đường và số phút đi bộ; tới nơi (<15m) báo "Bạn đã tới nơi".
3. **Bản đồ tổng quan** — nút "Xem toàn bộ bản đồ" (hoặc 🗺️ khi đang dẫn đường) để xem tự do mọi điểm, lọc theo danh mục, chạm marker → "Chỉ đường tới đây".
4. **Bật/tắt lớp cây** — nút 🌳/🚫 ở mọi chế độ bản đồ, tắt cây để nhìn rõ lối đi.

## Giao diện

Theo ngôn ngữ thiết kế Material / Google Maps: ô tìm kiếm dạng pill có bóng, chip lọc,
bottom sheet có tay kéo, nút tonal/filled bo tròn, thang độ nổi (elevation) và bảng màu Google
(`#1a73e8`, `#ea4335`, `#188038`, `#5f6368`, `#dadce0`). Tuyến đường vẽ màu `#4285f4` viền `#185abc`
như Google Maps.

- **Font: Roboto**, self-host qua `@fontsource/roboto` — chỉ nạp subset `latin` + `vietnamese`
  ở 3 độ đậm (400/500/700). Không dùng Google Sans vì đó là font độc quyền của Google,
  không cấp phép cho bên thứ ba. Riêng tiêu đề trang bìa dùng **Roboto Slab 600** (1 độ đậm)
  cho cảm giác trang nghiêm.
- **Trang bìa**: ảnh Vương Cung Thánh Đường (`assets-src/vctd.jpg` → crop `public/img/hero.webp`)
  đặt thành dải ảnh phía trên, phần chữ nằm trên nền sẫm `#0d1f38` bên dưới — cố ý không
  overlay chữ lên ảnh vì chữ căn giữa sẽ che đúng tháp cổ. Ô tìm kiếm nổi đè lên mép dải sẫm.
  Đổi ảnh bìa: crop lại bằng
  `ffmpeg -i assets-src/vctd.jpg -vf "crop=1750:1000:150:330,scale=1400:-1" public/img/hero.webp`.
- **Icon: Material Design Icons** (Apache 2.0). `scripts/gen-icons.mjs` trích path SVG của
  đúng 28 icon cần dùng vào `src/components/iconPaths.js` (~5KB) thay vì tải cả font icon (~300KB).
  Thêm icon: sửa mảng `ICONS` trong script rồi chạy `npm i -D @material-design-icons/svg && node scripts/gen-icons.mjs`.
- **Không gọi CDN**: font và icon nằm trong bundle, chạy được khi mạng nghẽn hoặc offline.

## Kiến trúc

- **React + Vite + Leaflet** (không dùng react-leaflet).
- Ảnh bản đồ vẽ lại (7843×13934) được **georeference** vào tọa độ thật bằng 3 điểm neo lấy từ OSM (Vương Cung Thánh Đường, Tháp chuông, hồ trái) — fit similarity transform, residual ≤ 2.1m, validate với 5 điểm độc lập sai số ≤ ~7m. Xem `src/map/calibration.js`.
- **Khung hiển thị "campus-up"**: ảnh gốc xoay ~194° so với hướng Bắc. Để artwork hiển thị thẳng đứng như thiết kế, chế độ thường vẽ mọi thứ trong khung giả đặt ảnh thẳng trục; tọa độ GPS thật được đổi qua (u,v) của khung thật rồi chiếu vào khung hiển thị (`realToDisplay`). Mũi tên heading được trừ góc xoay khuôn viên (~165.6°).
- **Ảnh vệ tinh nền** (`scripts/gen-backdrop.mjs` → `public/map/backdrop.webp` + `src/data/backdrop.js`):
  vùng 2800×2800m quanh khuôn viên, ghép từ tile **Esri World Imagery** ở zoom 16 (~2.3 m/px, 210KB).
  Không dùng tile sống vì chế độ thường xoay bản đồ campus-up còn tile luôn hướng Bắc — sẽ lệch ~194°.
  Ảnh tĩnh được đặt qua đúng phép biến đổi thật→hiển thị nên xoay khớp artwork, và chạy được offline.
  `minZoom` 15.75 và giới hạn pan ±900m×±1150m giữ khung hình luôn nằm trong vùng an toàn của ảnh nền
  (ảnh nền là hình vuông bị xoay nên vùng an toàn nhỏ hơn hình bao của nó).
  Nguồn ảnh phải được ghi công trên giao diện — xem lưu ý bản quyền bên dưới.
- **POI** lưu theo tọa độ ảnh `(u, v) ∈ [0,1]` trong `src/data/pois.js` — bám vào ảnh, không phụ thuộc calibration.
- **GPS** (`src/hooks/useGeolocation.js`): `watchPosition` + `enableHighAccuracy`, bỏ qua fix có accuracy > 30m (chỉ làm mờ marker), deadzone 2m, làm mượt EMA, vòng tròn accuracy, heading khi đang di chuyển.
- **Chỉ đường** (`src/map/router.js` + `src/data/walkmask.js`): mặt nạ lối đi bộ được **trích tự động từ chính ảnh bản đồ** — lối lát gạch trong khuôn viên là màu be ấm (`sat 0.05–0.32`, `r−b 12–48`), còn vùng ngoài khuôn viên trong ảnh là xám thật nên bị loại; sau đó lấy thành phần liên thông lớn nhất (lưới 320×569, mỗi ô ~1.2m). A* 8 hướng cấm cắt góc chéo, rút gọn bằng line-of-sight.
  - **Snap đa nguồn**: khi user (hoặc POI) đứng trong tòa nhà / trên bãi cỏ, router không chọn ô lối đi *gần nhất* mà xét mọi cửa ra trong bán kính rồi chọn cặp cho **tổng quãng đường ngắn nhất** (đi ngoài lối đi tính hệ số 1.4). Nhờ vậy đứng trong Thánh Đường thì tuyến ra quảng trường phía nam thay vì vòng sườn tây (532m thay vì 707m).
  - Sinh lại mặt nạ: `npm i -D sharp && node scripts/gen-mask.mjs` — ghi đè `src/data/walkmask.js` và xuất kèm `scripts/mask-check.png` để soi mặt nạ chồng lên bản đồ.

## Các chế độ (URL param)

| URL | Chức năng |
|---|---|
| `/` | Bản đồ chính (mobile-first) |
| `/?calibrate=1` | Căn chỉnh ảnh với vệ tinh Esri: kéo 3 góc TL/TR/BL, kéo ✥ để dời cả ảnh, copy JSON → dán vào `DEFAULT_CALIBRATION` |
| `/?editpoi=1` | Chạm bản đồ để lấy `(u, v)` cho POI mới (copy vào clipboard) |
| `/?mock=16.7054,107.1959` | Giả lập vị trí để thử/demo luồng chỉ đường khi không ở tại La Vang |

## Assets

- `assets-src/` — ảnh gốc độ phân giải đầy đủ (2 lớp: có cây / không cây) + ảnh tham chiếu vị trí POI.
- `public/map/` — bản downscale 2048/4096px cho web (tạo bằng ffmpeg).

## Lưu ý bản quyền ảnh vệ tinh

Ảnh nền lấy từ **Esri World Imagery**, KHÔNG phải Google Maps — lấy tile Google bằng URL
trực tiếp là vi phạm điều khoản của Google.

App đang **lưu sẵn (cache) tile Esri vào repo** dưới dạng một ảnh tĩnh. Dùng tile sống kèm ghi công
là cách dùng phổ thông và rõ ràng được phép; còn xuất/lưu tile ra file thì Esri có dịch vụ riêng
cho việc đó (*World Imagery (for Export)*). **Trước khi phát hành chính thức nên kiểm tra lại điều khoản
hoặc đổi sang nguồn có giấy phép dứt khoát** (ví dụ ESA Sentinel-2 cloudless, CC BY 4.0) — chỉ cần
đổi `URL` trong `scripts/gen-backdrop.mjs` rồi chạy lại, phần còn lại không phải sửa.

Dòng ghi công `Ảnh vệ tinh: Esri, Maxar, Earthstar Geographics` hiển thị ở góc dưới bản đồ và
là bắt buộc — đừng xoá.

## Lưu ý độ chính xác

Ảnh là bản vẽ lại nghệ thuật: vị trí tâm các công trình chuẩn theo phép fit, nhưng kích thước một số công trình bị phóng to ~8% so với thực tế (hồ, Thánh Đường) → sai số tối đa ~5–7m ở mép các công trình lớn, nằm trong nhiễu GPS ngoài trời. GPS trong nhà (Thánh Đường) sẽ lệch — chấp nhận được theo thiết kế.
