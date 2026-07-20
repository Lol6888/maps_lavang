// Nén ảnh sơ đồ vùng cho web (public/map/region.webp).
// Giữ nguyên hình dán khuôn viên trong sơ đồ: ở mức zoom xa app ẩn lớp artwork
// georeference và để sơ đồ tự thể hiện khuôn viên bằng hình dán này (đúng tinh
// thần poster chỉ đường); zoom gần mới hiện artwork chuẩn + vệ tinh.
// Chạy: npm i -D sharp && node scripts/gen-region.mjs
import sharp from 'sharp'

await sharp('assets-src/map no label.webp')
  .webp({ quality: 82 })
  .toFile('public/map/region.webp')
console.log('đã ghi public/map/region.webp')
