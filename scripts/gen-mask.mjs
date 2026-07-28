// Mặt nạ lối đi bộ, sinh từ MẠNG ĐƯỜNG ĐỎ Felix vẽ trong street.webp.
// Cách này chính xác hơn nhiều so với đoán màu mặt lát: đường đi đúng như chỉ dẫn.
// Chạy: npm i -D sharp && node scripts/gen-mask.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'G:/MAPS LAVANG/assets-src/map 24072026/street.webp'
const GW = 360 // lưới routing rộng hơn để bắt được nét đường mảnh
const M_PER_PX = 0.2257 // scale ảnh (nm-fit2)

// Đường vẽ tay là đỏ tươi thuần; loại chữ tiêu đề (nằm trên cùng) và mái ngói nâu-đỏ.
const isRed = (r, g, b) => r > 185 && g < 80 && b < 80 && r - g > 120 && r - b > 115

// Đọc full-res, phát hiện đỏ, gộp xuống lưới theo kiểu MAX (giữ nét mảnh không bị pha loãng)
const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const FW = info.width, FH = info.height, C = info.channels
const H = Math.round((GW * FH) / FW)
const W = GW
console.log('grid', W, 'x', H)

const walk = new Uint8Array(W * H)
const TITLE_V = 0.06 // bỏ dải tiêu đề đỏ trên cùng
for (let fy = 0; fy < FH; fy++) {
  if (fy / FH < TITLE_V) continue
  for (let fx = 0; fx < FW; fx++) {
    const i = (fy * FW + fx) * C
    if (data[i + 3] < 128) continue
    if (isRed(data[i], data[i + 1], data[i + 2])) {
      const gx = Math.min(W - 1, Math.floor((fx / FW) * W))
      const gy = Math.min(H - 1, Math.floor((fy / FH) * H))
      walk[gy * W + gx] = 1
    }
  }
}
console.log('ô có đường:', count(walk))

// Nở để đường thành hành lang đi được (~2-3 ô), nối các nét liền mạch
let m = dilate(walk, 1)
m = dilate(m, 1)
console.log('sau khi nở:', count(m))

// Bắc cầu nút thắt chéo (A* cấm cắt góc)
let bridged = 0
for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
  const a = m[y * W + x], b = m[(y + 1) * W + x + 1]
  const c = m[y * W + x + 1], d = m[(y + 1) * W + x]
  if (a && b && !c && !d) { m[y * W + x + 1] = 1; bridged++ }
  else if (c && d && !a && !b) { m[y * W + x] = 1; bridged++ }
}
console.log('bắc cầu:', bridged)

// Giữ thành phần liên thông lớn nhất (4-liên thông, khớp A*)
const { labels, sizes } = components(m)
let best = 0, bestSize = 0
for (const [lbl, sz] of sizes) if (sz > bestSize) { bestSize = sz; best = lbl }
const main = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) main[i] = labels[i] === best ? 1 : 0
console.log('thành phần lớn nhất:', bestSize, '/', count(m), '| số cụm:', sizes.size)

// Xuất bitpack + base64
const bytes = new Uint8Array(Math.ceil((W * H) / 8))
for (let i = 0; i < W * H; i++) if (main[i]) bytes[i >> 3] |= 1 << (i & 7)
writeFileSync('G:/MAPS LAVANG/src/data/walkmask.js',
`// Mặt nạ lối đi bộ, sinh từ mạng đường đỏ trong street.webp (xem scripts/gen-mask.mjs).
// Lưới ${W}x${H} phủ toàn ảnh; mỗi ô ~${(2302 / W * M_PER_PX).toFixed(2)}m. Bit 1 = đi được.
export const MASK_W = ${W}
export const MASK_H = ${H}
const PACKED = '${Buffer.from(bytes).toString('base64')}'

let cache = null
export function getWalkMask() {
  if (cache) return cache
  const bin = atob(PACKED)
  const bits = new Uint8Array(MASK_W * MASK_H)
  for (let i = 0; i < bits.length; i++) bits[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1
  cache = bits
  return bits
}
`)

// Ảnh kiểm chứng: mask chồng lên street.webp
const VW = 720
const base = await sharp(SRC).ensureAlpha().flatten({ background: '#333' }).resize({ width: VW }).toBuffer()
const meta = await sharp(base).metadata()
const raw = await sharp(base).raw().toBuffer()
const ov = Buffer.from(raw)
for (let y = 0; y < meta.height; y++) for (let x = 0; x < meta.width; x++) {
  const gi = Math.min(H - 1, Math.floor((y / meta.height) * H)) * W + Math.min(W - 1, Math.floor((x / meta.width) * W))
  if (main[gi]) { const o = (y * meta.width + x) * (raw.length / (meta.width * meta.height)); ov[o + 2] = 255 }
}
await sharp(ov, { raw: { width: meta.width, height: meta.height, channels: raw.length / (meta.width * meta.height) } })
  .png().toFile('scripts/mask-check.png')
console.log('đã ghi mask-check.png')

function count(a) { let n = 0; for (const v of a) n += v; return n }
function dilate(src, rad) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 0
    for (let dy = -rad; dy <= rad && !v; dy++) for (let dx = -rad; dx <= rad && !v; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx >= 0 && nx < W && ny >= 0 && ny < H && src[ny * W + nx]) v = 1
    }
    out[y * W + x] = v
  }
  return out
}
function components(src) {
  const labels = new Int32Array(W * H); const sizes = new Map(); let next = 1; const stack = []
  for (let i = 0; i < W * H; i++) {
    if (!src[i] || labels[i]) continue
    const lbl = next++; stack.push(i); labels[i] = lbl; let sz = 0
    while (stack.length) {
      const p = stack.pop(); sz++
      const px = p % W, py = (p / W) | 0
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = px + dx, ny = py + dy
        if (nx < 0 || nx >= W || ny < 0 || ny >= H) continue
        const q = ny * W + nx
        if (src[q] && !labels[q]) { labels[q] = lbl; stack.push(q) }
      }
    }
    sizes.set(lbl, sz)
  }
  return { labels, sizes }
}
