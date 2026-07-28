// Mặt nạ lối đi bộ từ street.webp — Felix vẽ 2 loại đường:
//   TÍM (61,68,156)  = đường chính, rộng
//   ĐỎ  (235,29,36)  = đường nhỏ
// Xuất 2 mặt nạ: ALL (tím ∪ đỏ, để đi được + tìm đường ngắn nhất) và MAIN (chỉ tím,
// để ưu tiên khi chọn "đi đường chính"). Chạy: node scripts/gen-mask.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const SRC = 'G:/MAPS LAVANG/assets-src/map 24072026/street.webp'
const GW = 360
const M_PER_PX = 0.2257

const isPurple = (r, g, b) => b > 120 && r < 115 && g < 115 && b - r > 55 && b - g > 55
const isRed = (r, g, b) => r > 185 && g < 80 && b < 80 && r - g > 120 && r - b > 115

const { data, info } = await sharp(SRC).ensureAlpha().raw().toBuffer({ resolveWithObject: true })
const FW = info.width, FH = info.height, C = info.channels
const H = Math.round((GW * FH) / FW), W = GW
console.log('grid', W, 'x', H)

const purple = new Uint8Array(W * H), red = new Uint8Array(W * H)
const TITLE_V = 0.06
for (let fy = 0; fy < FH; fy++) {
  if (fy / FH < TITLE_V) continue
  for (let fx = 0; fx < FW; fx++) {
    const i = (fy * FW + fx) * C
    if (data[i + 3] < 128) continue
    const r = data[i], g = data[i + 1], b = data[i + 2]
    const gi = Math.min(H - 1, Math.floor((fy / FH) * H)) * W + Math.min(W - 1, Math.floor((fx / FW) * W))
    if (isPurple(r, g, b)) purple[gi] = 1
    else if (isRed(r, g, b)) red[gi] = 1
  }
}
console.log('ô tím:', count(purple), '| ô đỏ:', count(red))

// Nở thành hành lang
let mainM = dilate(dilate(purple, 1), 1)
let allM = dilate(dilate(orOf(purple, red), 1), 1)

// Bắc cầu nút thắt chéo trên ALL
let bridged = 0
for (let y = 0; y < H - 1; y++) for (let x = 0; x < W - 1; x++) {
  const a = allM[y * W + x], b = allM[(y + 1) * W + x + 1]
  const c = allM[y * W + x + 1], d = allM[(y + 1) * W + x]
  if (a && b && !c && !d) { allM[y * W + x + 1] = 1; bridged++ }
  else if (c && d && !a && !b) { allM[y * W + x] = 1; bridged++ }
}

// Giữ thành phần liên thông lớn nhất của ALL; MAIN giao với thành phần đó
const { labels, sizes } = components(allM)
let best = 0, bestSize = 0
for (const [lbl, sz] of sizes) if (sz > bestSize) { bestSize = sz; best = lbl }
const all = new Uint8Array(W * H), main = new Uint8Array(W * H)
for (let i = 0; i < W * H; i++) {
  all[i] = labels[i] === best ? 1 : 0
  main[i] = all[i] && mainM[i] ? 1 : 0
}
console.log('ALL lớn nhất:', bestSize, '| MAIN trong đó:', count(main), '| số cụm:', sizes.size)

writeFileSync('G:/MAPS LAVANG/src/data/walkmask.js',
`// Mặt nạ lối đi bộ từ street.webp (xem scripts/gen-mask.mjs).
// Lưới ${W}x${H}; mỗi ô ~${(2302 / W * M_PER_PX).toFixed(2)}m. ALL = mọi lối đi; MAIN = đường chính (tím).
export const MASK_W = ${W}
export const MASK_H = ${H}
const PACKED_ALL = '${pack(all)}'
const PACKED_MAIN = '${pack(main)}'

let _all = null, _main = null
function unpack(s) {
  const bin = atob(s), bits = new Uint8Array(MASK_W * MASK_H)
  for (let i = 0; i < bits.length; i++) bits[i] = (bin.charCodeAt(i >> 3) >> (i & 7)) & 1
  return bits
}
export function getWalkMask() { return _all || (_all = unpack(PACKED_ALL)) }
export function getMainMask() { return _main || (_main = unpack(PACKED_MAIN)) }
`)
console.log('đã ghi walkmask.js')

// Ảnh kiểm chứng: ALL xanh lá, MAIN đỏ
const VW = 720
const base = await sharp(SRC).ensureAlpha().flatten({ background: '#333' }).resize({ width: VW }).toBuffer()
const meta = await sharp(base).metadata()
const raw = await sharp(base).raw().toBuffer()
const ch = raw.length / (meta.width * meta.height)
const ov = Buffer.from(raw)
for (let y = 0; y < meta.height; y++) for (let x = 0; x < meta.width; x++) {
  const gi = Math.min(H - 1, Math.floor((y / meta.height) * H)) * W + Math.min(W - 1, Math.floor((x / meta.width) * W))
  const o = (y * meta.width + x) * ch
  if (main[gi]) { ov[o] = 255; ov[o + 1] = 40; ov[o + 2] = 40 }
  else if (all[gi]) { ov[o] = 40; ov[o + 1] = 255; ov[o + 2] = 40 }
}
await sharp(ov, { raw: { width: meta.width, height: meta.height, channels: ch } }).png().toFile('scripts/mask-check.png')
console.log('đã ghi mask-check.png (đỏ=chính, xanh=nhỏ)')

function count(a) { let n = 0; for (const v of a) n += v; return n }
function orOf(a, b) { const o = new Uint8Array(a.length); for (let i = 0; i < a.length; i++) o[i] = a[i] || b[i] ? 1 : 0; return o }
function pack(bits) { const bytes = new Uint8Array(Math.ceil(bits.length / 8)); for (let i = 0; i < bits.length; i++) if (bits[i]) bytes[i >> 3] |= 1 << (i & 7); return Buffer.from(bytes).toString('base64') }
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
