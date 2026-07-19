// Ghép tile vệ tinh quanh khuôn viên thành MỘT ảnh nền tĩnh.
// Lý do không dùng tile sống: chế độ thường xoay bản đồ cho Thánh Đường hướng lên
// (khung "campus-up"), còn tile luôn hướng Bắc — ghép tile sống sẽ lệch ~194°.
// Ảnh tĩnh thì đặt qua đúng phép biến đổi thật→hiển thị nên xoay khớp artwork,
// và chạy được offline khi mạng nghẽn dịp lễ.
//
// Chạy: npm i -D sharp && node scripts/gen-backdrop.mjs
import sharp from 'sharp'
import { writeFileSync } from 'node:fs'

const Z = 16 // ~2.3 m/px ở vĩ độ này — đủ cho lúc zoom nhỏ
const SIZE_M = 2800 // cạnh vùng phủ (mét thật)
const TILE = 256
const URL = (z, x, y) =>
  `https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/${z}/${y}/${x}`

// Khớp với DEFAULT_CALIBRATION trong src/map/calibration.js
const CAL = {
  topleft: [16.7049431, 107.198059],
  topright: [16.7040609, 107.1945134],
  bottomleft: [16.7110141, 107.1964329],
}

const R = 6378137
const merc = (lat, lng) => ({
  x: (R * lng * Math.PI) / 180,
  y: R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360)),
})
const unmerc = (x, y) => ({
  lng: (x / R) * (180 / Math.PI),
  lat: ((2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180) / Math.PI,
})

// Tâm khuôn viên = uv(0.5, 0.5) trong khung thật
const tl = merc(...CAL.topleft)
const tr = merc(...CAL.topright)
const bl = merc(...CAL.bottomleft)
const center = {
  x: tl.x + (tr.x - tl.x) * 0.5 + (bl.x - tl.x) * 0.5,
  y: tl.y + (tr.y - tl.y) * 0.5 + (bl.y - tl.y) * 0.5,
}
const centerLL = unmerc(center.x, center.y)
console.log('tâm khuôn viên:', centerLL.lat.toFixed(6), centerLL.lng.toFixed(6))

// Mercator phóng đại 1/cos(lat) so với mét thật
const half = SIZE_M / 2 / Math.cos((centerLL.lat * Math.PI) / 180)
const box = {
  minX: center.x - half, maxX: center.x + half,
  minY: center.y - half, maxY: center.y + half,
}

// Mercator -> pixel toàn cầu ở mức zoom Z
const WORLD = 20037508.342789244
const scale = (TILE * 2 ** Z) / (2 * WORLD)
const toPx = (x, y) => ({ px: (x + WORLD) * scale, py: (WORLD - y) * scale })

const p0 = toPx(box.minX, box.maxY) // góc trên-trái (bắc-tây)
const p1 = toPx(box.maxX, box.minY) // góc dưới-phải (nam-đông)
const outW = Math.round(p1.px - p0.px)
const outH = Math.round(p1.py - p0.py)
console.log(`ảnh ra: ${outW}x${outH}px @ z${Z} (~${(SIZE_M / outW).toFixed(2)} m/px)`)

const tx0 = Math.floor(p0.px / TILE), tx1 = Math.floor((p1.px - 1) / TILE)
const ty0 = Math.floor(p0.py / TILE), ty1 = Math.floor((p1.py - 1) / TILE)
const nTiles = (tx1 - tx0 + 1) * (ty1 - ty0 + 1)
console.log(`tải ${nTiles} tile (x ${tx0}..${tx1}, y ${ty0}..${ty1})`)

const jobs = []
for (let ty = ty0; ty <= ty1; ty++) {
  for (let tx = tx0; tx <= tx1; tx++) jobs.push({ tx, ty })
}

// Tải tuần tự theo lô nhỏ cho lịch sự với máy chủ
const tiles = []
const BATCH = 6
for (let i = 0; i < jobs.length; i += BATCH) {
  const chunk = jobs.slice(i, i + BATCH)
  const got = await Promise.all(chunk.map(async ({ tx, ty }) => {
    const res = await fetch(URL(Z, tx, ty), {
      headers: { 'User-Agent': 'maps-lavang-backdrop/0.1 (one-off asset build)' },
    })
    if (!res.ok) throw new Error(`tile ${Z}/${tx}/${ty} -> HTTP ${res.status}`)
    return { tx, ty, buf: Buffer.from(await res.arrayBuffer()) }
  }))
  tiles.push(...got)
  process.stdout.write(`\r  ${tiles.length}/${nTiles}`)
}
console.log('\ntải xong, đang ghép…')

const canvasW = (tx1 - tx0 + 1) * TILE
const canvasH = (ty1 - ty0 + 1) * TILE
const composite = tiles.map(({ tx, ty, buf }) => ({
  input: buf,
  left: (tx - tx0) * TILE,
  top: (ty - ty0) * TILE,
}))

const stitched = await sharp({
  create: { width: canvasW, height: canvasH, channels: 3, background: '#000' },
})
  .composite(composite)
  .png()
  .toBuffer()

await sharp(stitched)
  .extract({
    left: Math.round(p0.px - tx0 * TILE),
    top: Math.round(p0.py - ty0 * TILE),
    width: outW,
    height: outH,
  })
  .webp({ quality: 72 })
  .toFile('public/map/backdrop.webp')

// Góc của ảnh nền trong tọa độ THẬT (khung ảnh nền hướng Bắc)
const nw = unmerc(box.minX, box.maxY)
const ne = unmerc(box.maxX, box.maxY)
const sw = unmerc(box.minX, box.minY)
const r6 = (n) => Number(n.toFixed(6))

writeFileSync('src/data/backdrop.js',
`// TỰ SINH bởi scripts/gen-backdrop.mjs — đừng sửa tay.
// Ảnh vệ tinh nền quanh khuôn viên, ghép từ Esri World Imagery ở mức zoom ${Z}.
// Đây là hình chữ nhật hướng Bắc trong tọa độ THẬT; lúc vẽ sẽ được đưa qua
// phép biến đổi thật→hiển thị để xoay khớp với ảnh bản đồ.
export const BACKDROP = {
  url: '/map/backdrop.webp',
  // góc theo khung ảnh nền: trên-trái, trên-phải, dưới-trái (lat, lng)
  topleft: [${r6(nw.lat)}, ${r6(nw.lng)}],
  topright: [${r6(ne.lat)}, ${r6(ne.lng)}],
  bottomleft: [${r6(sw.lat)}, ${r6(sw.lng)}],
  attribution: 'Ảnh vệ tinh: Esri, Maxar, Earthstar Geographics',
}
`)
console.log('đã ghi public/map/backdrop.webp và src/data/backdrop.js')
