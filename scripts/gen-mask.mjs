import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'G:/MAPS LAVANG/assets-src/map 24072026/map no tree.webp'
const M_PER_PX = 0.2257 // scale ảnh mới (từ nm-fit2: new->old 4.5319 × 0.0498)
const GW = 320 // chiều rộng lưới routing

const { data, info } = await sharp(SRC).ensureAlpha().resize({ width: GW }).raw().toBuffer({ resolveWithObject: true })
const W = info.width, H = info.height, C = info.channels
console.log('grid', W, 'x', H, '=', W * H, 'cells')

// ---- Phân loại "đi được" trên ảnh photographic mới ----
// Lối đi lát gạch/bê tông: sáng, ít bão hòa, KHÔNG xanh cỏ, KHÔNG xanh nước.
// Vùng trong suốt (bleed ngoài khuôn viên) bị loại theo alpha.
const walk = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  const r = data[i * C], g = data[i * C + 1], b = data[i * C + 2], a = data[i * C + 3]
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b)
  const sat = mx === 0 ? 0 : (mx - mn) / mx
  walk[i] = a > 128 && mx >= 150 && sat <= 0.26 && (g - r) < 14 && (b - r) < 20 ? 1 : 0
}
console.log('sau phân loại:', count(walk))

// ---- Morphology: CHỈ closing (nở rồi co cùng mức) ----
// Bridge các khe hở/đứt đoạn (đường bị bóng cây, gạch đổi màu) nhưng GIỮ các lối
// đi hẹp 1 ô (~1.6m). Trước đây có thêm opening làm xóa mất lối hẹp -> đứt mạng
// -> tuyến đi vòng xa. Closing radius 2 bridge được khe ~6m.
let m = dilate(walk, 1)
m = dilate(m, 1)
m = erode(m, 1)
m = erode(m, 1)
console.log('sau morphology (closing 2):', count(m))

// ---- Bắc cầu các nút thắt chéo ----
// A* cấm cắt góc, nên 2 ô chỉ dính nhau theo đường chéo là không đi qua được.
// Lấp 1 ô kề trực giao để chỗ đó thành 4-liên thông.
let bridged = 0
for (let y = 0; y < H - 1; y++) {
  for (let x = 0; x < W - 1; x++) {
    const a = m[y * W + x], b = m[(y + 1) * W + x + 1]
    const c = m[y * W + x + 1], d = m[(y + 1) * W + x]
    if (a && b && !c && !d) { m[y * W + x + 1] = 1; bridged++ }
    else if (c && d && !a && !b) { m[y * W + x] = 1; bridged++ }
  }
}
console.log('bắc cầu nút thắt chéo:', bridged, '| sau đó:', count(m))

// ---- Giữ thành phần liên thông lớn nhất (mạng lối đi chính), 4-liên thông ----
const { labels, sizes } = components(m)
let best = 0, bestSize = 0
for (const [lbl, sz] of sizes) if (sz > bestSize) { bestSize = sz; best = lbl }
const main = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) main[i] = labels[i] === best ? 1 : 0
console.log('thành phần lớn nhất:', bestSize, '/ tổng', count(m), '| số cụm:', sizes.size)
console.log('5 cụm lớn nhất:', [...sizes.values()].sort((a, b) => b - a).slice(0, 5))

// ---- Xuất: bitpack + base64 ----
const bytes = new Uint8Array(Math.ceil((W * H) / 8))
for (let i = 0; i < W * H; i++) if (main[i]) bytes[i >> 3] |= 1 << (i & 7)
const b64 = Buffer.from(bytes).toString('base64')
console.log('mask base64:', b64.length, 'bytes')

writeFileSync('G:/MAPS LAVANG/src/data/walkmask.js',
`// Mặt nạ lối đi bộ, sinh tự động từ "map no tree" (xem scripts/gen-mask.mjs).
// Lưới ${W}x${H} phủ toàn ảnh; mỗi ô ~${(2302 / W * M_PER_PX).toFixed(2)}m. Bit 1 = đi được.
// Phân loại theo màu mặt lát be ấm, giữ thành phần liên thông lớn nhất.
export const MASK_W = ${W}
export const MASK_H = ${H}
const PACKED = '${b64}'

let cache = null
export function getWalkMask() {
  if (cache) return cache
  const bin = atob(PACKED)
  const bits = new Uint8Array(MASK_W * MASK_H)
  for (let i = 0; i < bits.length; i++) {
    bits[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1
  }
  cache = bits
  return bits
}
`)

// ---- Ảnh kiểm chứng: mask đỏ chồng lên bản đồ ----
const VW = 640
const base = await sharp(SRC).ensureAlpha().flatten({ background: '#3a3a3a' }).resize({ width: VW }).toBuffer()
const meta = await sharp(base).metadata()
const ov = Buffer.alloc(meta.width * meta.height * 4)
for (let y = 0; y < meta.height; y++) {
  for (let x = 0; x < meta.width; x++) {
    const gi = Math.floor((y / meta.height) * H) * W + Math.floor((x / meta.width) * W)
    const o = (y * meta.width + x) * 4
    if (main[gi]) { ov[o] = 255; ov[o + 1] = 0; ov[o + 2] = 0; ov[o + 3] = 150 }
  }
}
await sharp(base)
  .composite([{ input: ov, raw: { width: meta.width, height: meta.height, channels: 4 } }])
  .png()
  .toFile('scripts/mask-check.png')
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
function erode(src, rad) {
  const out = new Uint8Array(W * H)
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let v = 1
    for (let dy = -rad; dy <= rad && v; dy++) for (let dx = -rad; dx <= rad && v; dx++) {
      const nx = x + dx, ny = y + dy
      if (nx < 0 || nx >= W || ny < 0 || ny >= H || !src[ny * W + nx]) v = 0
    }
    out[y * W + x] = v
  }
  return out
}
function components(src) {
  const labels = new Int32Array(W * H)
  const sizes = new Map()
  let next = 1
  const stack = []
  for (let i = 0; i < W * H; i++) {
    if (!src[i] || labels[i]) continue
    const lbl = next++
    stack.push(i)
    labels[i] = lbl
    let sz = 0
    while (stack.length) {
      const p = stack.pop()
      sz++
      const px = p % W, py = (p / W) | 0
      // 4-liên thông: khớp đúng với khả năng di chuyển của A*
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
