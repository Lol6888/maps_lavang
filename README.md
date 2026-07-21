# Bản đồ La Vang

Web app bản đồ tương tác cho Trung tâm hành hương Đức Mẹ La Vang (Hải Phú, Hải Lăng, Quảng Trị): bản đồ vẽ tay georeference chính xác + vị trí GPS real-time + các điểm tiện ích/hành hương.

## Chạy dev

```bash
npm install
npm run dev
```

## Luồng sử dụng

1. **Màn hình chọn địa điểm** — 4 phân khu thu gọn được (mặc định đóng hết để thấy toàn cảnh trong một màn hình), mỗi phân khu hiện số địa điểm và khoảng cách gần nhất; mở ra là lưới 2 cột. Ô tìm kiếm tự mở các phân khu có kết quả. Khi đã có GPS, mỗi ô hiện khoảng cách và tự sắp theo gần → xa.
2. **Chế độ dẫn đường** — chọn một thẻ, bản đồ vẽ đường đi bộ từ chỗ user đang đứng tới đích, kèm quãng đường và số phút đi bộ; tới nơi (<15m) báo "Bạn đã tới nơi".
3. **Bản đồ tổng quan** — nút "Xem toàn bộ bản đồ" (hoặc 🗺️ khi đang dẫn đường) để xem tự do mọi điểm, lọc theo danh mục, chạm marker → "Chỉ đường tới đây".
4. **Bật/tắt lớp cây** — nút 🌳/🚫 ở mọi chế độ bản đồ, tắt cây để nhìn rõ lối đi.

## Giao diện

Theo ngôn ngữ thiết kế Material / Google Maps: ô tìm kiếm dạng pill có bóng, chip lọc,
bottom sheet có tay kéo, nút bo tròn, thang độ nổi (elevation). Tuyến đường vẽ màu `#4285f4`
viền `#185abc` như Google Maps.

**Hai bề mặt, hai bảng màu — cố ý:**

- *Trang chủ* là bề mặt thương hiệu: nền giấy ấm `#f4f3f0`, thẻ trắng, chữ mực navy `#16283f`,
  nút chính navy `#0d1f38` — nối tiếp trang bìa. Tiêu đề phân khu dùng Roboto Slab.
- *Bản đồ* là bề mặt công cụ: giữ xanh Google cho tuyến đường và nút chỉ đường, vì xanh =
  dẫn đường là quy ước ai cũng hiểu.

Màu 4 danh mục là bảng trầm (`#7d6029` vàng kim, `#3f5c78` lam đá, `#6b5744` nâu đá,
`#9c4a3c` đỏ gạch) thay cho bảng rực của Google — 4 màu bão hòa cao đứng cạnh nhau trông
như app tiện ích, không hợp với nơi hành hương. Mọi cặp màu/nền đã kiểm tra đạt WCAG AA
(thấp nhất 5.29:1).

**Marker trên bản đồ dùng nền trắng + viền/icon màu danh mục**, không tô đặc: màu trầm tô đặc
sẽ chìm vào ảnh vệ tinh. Điểm đang chọn thì đảo lại — tô đặc màu danh mục, icon trắng, to hơn.
Tương tự, chip lọc nằm trên bản đồ phải chồng lớp tint lên nền trắng đặc
(`linear-gradient(var(--c-bg), var(--c-bg)), #fff`), để tint trong suốt là chip biến mất.

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
- **Bản đồ nền vùng — TỰ RENDER từ OpenStreetMap** (`scripts/fetch-osm-region.mjs` →
  `scripts/render-basemap.mjs` → `public/map/region.webp` + `src/data/region-labels.js`):
  phủ 12.8×13.9 km quanh La Vang ở 3.2 m/px (4000×4351px, ~650KB), phong cách bản đồ đường
  như Google Maps nhưng dùng chất giấy kem cho liền mạch với artwork khuôn viên.
  - **Vì sao tự render**: tile Google cấm lấy bằng URL trực tiếp; tile bên thứ ba khác thì
    vướng chuyện cache/offline. Tự render từ OSM (ODbL) chỉ cần ghi công
    `© OpenStreetMap contributors`, chạy offline, kiểm soát hoàn toàn phong cách + phạm vi.
  - **Georeference chính xác north-up** — khác hẳn poster vẽ tay dùng trước đó (poster nén
    phần bắc ~2 lần, lệch ~19°, fit toàn cục cho residual 600–1000m). Nhờ vậy mọi điểm trong
    khung đều đặt được đúng chỗ, kể cả Cầu Trắng (trước phải bỏ vì rơi ngoài canvas 1.2km).
  - **Tuyến chỉ dẫn**: Lê Lợi + Liên Xã (đường xe vào La Vang) vẽ đậm màu xanh như poster gốc;
    quốc lộ theo thang màu cam của bản đồ đường. Viền đỏ khuôn viên vẽ khít lớp artwork.
  - **Chữ KHÔNG nướng vào ảnh**: ảnh hiển thị ở tỉ lệ 0.25×–1.2× tùy zoom nên chữ nướng sẵn sẽ
    lúc bé lúc to. Nhãn xuất ra `region-labels.js` để app vẽ bằng DOM (luôn sắc nét), lọc theo
    `minZoom` để tránh chữ chồng chữ: thành phố luôn hiện, thị trấn từ z13.5, tên đường từ z14,
    làng từ z14.75. Nhãn rơi vào trong khuôn viên bị bỏ (artwork đã thể hiện rõ chỗ đó).
  - **Zoom-out không bao giờ lộ mép nền**: canvas nghiêng ~15° trong khung hiển thị nên vùng
    an toàn là hộp NỘI TIẾP hình bình hành đó (`REGION_SAFE` ≈ 7.1×12.5 km, tính bằng
    `scratchpad/safebox2.mjs`), không phải hình bao. `minZoom` tính động bằng
    `map.getBoundsZoom(bounds)` theo kích thước màn hình và cập nhật khi `resize`;
    `maxBoundsViscosity: 1.0` chặn cứng không cho kéo bật ra.
  - POI ngoài khuôn viên lưu bằng uv ngoài [0,1] (phép affine ngoại suy được): Điểm đón trả
    khách (tọa độ OSM thật), Bãi đỗ xe khách (chưa có ground truth OSM — đo thực địa rồi chỉnh
    bằng `?editpoi=1`). Dưới `REGION_SWAP_ZOOM = 15.75` chỉ giữ POI nhóm Đi lại vì 31 marker
    ở tầm nhìn vùng sẽ đè chồng nhau.
  - Chỉ đường tới điểm ngoài mặt nạ lối đi → đường chim bay nét đứt + ghi chú, không giả vờ
    biết lối đi thật.
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

## Lưu ý bản quyền

Không dùng tile của bên thứ ba nào trong bản người dùng thấy:

- **Artwork khuôn viên** — tài sản của dự án.
- **Bản đồ nền vùng** — tự render từ dữ liệu **OpenStreetMap** (ODbL). Ảnh render ra là
  *Produced Work* theo ODbL nên chỉ cần **ghi công** `© OpenStreetMap contributors` — dòng này
  hiển thị ở góc dưới bản đồ và **là bắt buộc, đừng xoá**.
- **Không dùng tile Google** vì lấy bằng URL trực tiếp là vi phạm điều khoản của Google.

Ngoại lệ duy nhất: chế độ debug `?calibrate=1` nạp **tile sống Esri World Imagery** làm lớp tham
chiếu để căn ảnh. Đây là cách dùng tile tiêu chuẩn (không lưu lại, không phát hành lại) và người
dùng cuối không bao giờ thấy màn này.

Cập nhật bản đồ nền khi OSM có dữ liệu mới:
```bash
node scripts/fetch-osm-region.mjs && node scripts/render-basemap.mjs
```

## Lưu ý độ chính xác

Ảnh là bản vẽ lại nghệ thuật: vị trí tâm các công trình chuẩn theo phép fit, nhưng kích thước một số công trình bị phóng to ~8% so với thực tế (hồ, Thánh Đường) → sai số tối đa ~5–7m ở mép các công trình lớn, nằm trong nhiễu GPS ngoài trời. GPS trong nhà (Thánh Đường) sẽ lệch — chấp nhận được theo thiết kế.
