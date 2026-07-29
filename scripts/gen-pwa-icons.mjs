// Sinh icon PWA (navy + thánh giá vàng) cho cài ra màn hình chính.
// Chạy: node scripts/gen-pwa-icons.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const NAVY = '#0F2C67'
const GOLD = '#C5A059'

// Nền đầy màu (an toàn cho maskable) + thánh giá vàng canh giữa + vòng viền mảnh.
const svg = (r = 96) => `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${r}" fill="${NAVY}"/>
  <circle cx="256" cy="256" r="176" fill="none" stroke="${GOLD}" stroke-width="10" opacity="0.55"/>
  <g fill="${GOLD}">
    <rect x="235" y="120" width="42" height="272" rx="8"/>
    <rect x="168" y="196" width="176" height="42" rx="8"/>
  </g>
</svg>`

// maskable: bo góc 0 (nền tràn viền) để icon không bị cắt khi hệ điều hành bo tròn.
const out = [
  ['public/pwa-192.png', 192, 96],
  ['public/pwa-512.png', 512, 96],
  ['public/maskable-512.png', 512, 0],
  ['public/apple-touch-icon.png', 180, 40],
]
for (const [path, size, r] of out) {
  await sharp(Buffer.from(svg(r))).resize(size, size).png().toFile('G:/MAPS LAVANG/' + path)
  console.log('->', path, size)
}
writeFileSync('G:/MAPS LAVANG/public/favicon.svg', svg(96))
console.log('-> public/favicon.svg')
