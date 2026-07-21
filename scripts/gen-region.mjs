// Chuẩn bị sơ đồ vùng cho web (public/map/region.webp).
//
// XÓA hình dán khuôn viên (ô viền đỏ) khỏi raster: hình dán này bị vẽ to gấp ~2 lần
// và xoay ~5° thay vì 14.4° như thực địa. Lớp artwork khuôn viên đã georeference
// chuẩn được vẽ đè lên đúng vị trí thật, nên nếu giữ hình dán thì viền đỏ của nó
// lòi ra quanh artwork thành "hai khuôn viên lệch nhau".
// Vùng xóa được tô lại bằng màu giấy nền; các tuyến đường đều kết thúc ở rìa
// khuôn viên nên không bị cắt mất đoạn nào.
//
// Chạy: npm i -D sharp && node scripts/gen-region.mjs
import sharp from 'sharp'

const SRC = 'assets-src/map no label.webp'
const OUT = 'public/map/region.webp'

// Hình chữ nhật hình dán, đo bằng PCA trên pixel viền đỏ
// (xem scratchpad/measure-region.mjs)
const RECT = {
  cx: 1667.4, cy: 1993.4,
  angleDeg: 84.81,
  halfA: 376.7 / 2,
  halfB: 246.6 / 2,
  // Hình dán không phải chữ nhật hoàn hảo (có mấu lồi ~135px theo trục ngắn),
  // margin 18 phủ hết cả mấu lẫn mép răng cưa.
  margin: 18,
}
const PAPER = [255, 253, 234] // màu giấy nền của sơ đồ

const { data, info } = await sharp(SRC).raw().toBuffer({ resolveWithObject: true })
const { width: W, height: H, channels: C } = info

const th = (RECT.angleDeg * Math.PI) / 180
const ca = Math.cos(th), sa = Math.sin(th)
let n = 0
for (let y = 0; y < H; y++) {
  for (let x = 0; x < W; x++) {
    const dx = x - RECT.cx, dy = y - RECT.cy
    const a = dx * ca + dy * sa
    const b = -dx * sa + dy * ca
    if (Math.abs(a) <= RECT.halfA + RECT.margin && Math.abs(b) <= RECT.halfB + RECT.margin) {
      const i = (y * W + x) * C
      data[i] = PAPER[0]; data[i + 1] = PAPER[1]; data[i + 2] = PAPER[2]
      if (C === 4) data[i + 3] = 255
      n++
    }
  }
}
console.log('đã xóa', n, 'px hình dán khuôn viên')

await sharp(data, { raw: { width: W, height: H, channels: C } })
  .webp({ quality: 82 })
  .toFile(OUT)
console.log('đã ghi', OUT)
