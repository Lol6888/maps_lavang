// Tự render bản đồ nền từ dữ liệu OSM, phong cách bản đồ đường (như Google Maps)
// nhưng dùng chất giấy kem của poster La Vang cho liền mạch với artwork khuôn viên.
//
// Vì sao tự render thay vì lấy tile sẵn: tile Google cấm lấy bằng URL trực tiếp; tile bên
// thứ ba khác thì vướng chuyện cache/offline. Tự render từ OSM (ODbL) chỉ cần ghi công
// "© OpenStreetMap contributors", chạy offline, ta kiểm soát hoàn toàn phong cách + phạm vi,
// và georeference chính xác north-up nên không còn méo như poster vẽ tay.
//
// Chữ KHÔNG vẽ vào ảnh: ảnh hiển thị ở tỉ lệ 0.25x–1.2x tùy zoom nên chữ nướng sẵn sẽ lúc
// bé lúc to. Nhãn được xuất ra src/data/region-labels.js để app vẽ bằng DOM, luôn sắc nét.
//
// Chạy: node scripts/fetch-osm-region.mjs && node scripts/render-basemap.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { BBOX } from './region-bbox.mjs'

const OUT_IMG = 'public/map/region.webp'
const TARGET_W = 4000

// Khuôn viên (khớp DEFAULT_CALIBRATION trong src/map/calibration.js)
const CAL = {
  topleft: [16.7049431, 107.198059],
  topright: [16.7040609, 107.1945134],
  bottomleft: [16.7110141, 107.1964329],
}

// ---- Chiếu Web Mercator ----
const R = 6378137
const mx = (lng) => (R * lng * Math.PI) / 180
const my = (lat) => R * Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))
const inv = (x, y) => ({
  lng: (x / R) * (180 / Math.PI),
  lat: ((2 * Math.atan(Math.exp(y / R)) - Math.PI / 2) * 180) / Math.PI,
})
const X0 = mx(BBOX.w), X1 = mx(BBOX.e)
const Y1 = my(BBOX.n), Y0 = my(BBOX.s)
const W = TARGET_W
const H = Math.round(((Y1 - Y0) / (X1 - X0)) * W)
const SCALE = W / (X1 - X0)
const px = (lng, lat) => [(mx(lng) - X0) * SCALE, (Y1 - my(lat)) * SCALE]
const mPerPx = ((X1 - X0) / W) * Math.cos((16.7 * Math.PI) / 180)
console.log(`canvas ${W}x${H}px | ${mPerPx.toFixed(2)} m/px | ${((X1 - X0) * Math.cos((16.7 * Math.PI) / 180) / 1000).toFixed(1)}km ngang`)

// ---- Đọc OSM ----
const osm = JSON.parse(readFileSync('assets-src/osm-region.json'))
const nodes = new Map()
for (const el of osm.elements) if (el.type === 'node') nodes.set(el.id, el)
const ways = osm.elements.filter((e) => e.type === 'way')

const coords = (w) => w.nodes.map((id) => nodes.get(id)).filter(Boolean).map((n) => px(n.lon, n.lat))
const isClosed = (w) => w.nodes.length > 3 && w.nodes[0] === w.nodes[w.nodes.length - 1]
const simplify = (pts, tol = 1) => {
  if (pts.length < 3) return pts
  const out = [pts[0]]
  for (let i = 1; i < pts.length - 1; i++) {
    const [ax, ay] = out[out.length - 1]
    if (Math.hypot(pts[i][0] - ax, pts[i][1] - ay) >= tol) out.push(pts[i])
  }
  out.push(pts[pts.length - 1])
  return out
}
const d = (pts, close) =>
  'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join('L') + (close ? 'Z' : '')

// ---- Bảng màu ----
const C = {
  land: '#f7f4e4',
  farmland: '#f3efdb',
  meadow: '#eaf0d8',
  residential: '#efece0',
  forest: '#d9e6cd',
  water: '#8fc9ec',
  minorCasing: '#dcd7c0',
  minor: '#fffdf3',
  tertiaryCasing: '#d8cfae',
  tertiary: '#fffdf0',
  secondaryCasing: '#e3d29a',
  secondary: '#fdf3cf',
  trunkCasing: '#e5ae55',
  trunk: '#fbd68d',
  rail: '#c2beb0',
  routeAccess: '#0e9f6e',  // tuyến hành hương (xanh, như poster)
  campusEdge: '#c62828',
}

const ROAD_CLASSES = [
  { match: /^(motorway|trunk|primary)(_link)?$/, w: 10, casing: 14, fill: C.trunk, stroke: C.trunkCasing },
  { match: /^(secondary)(_link)?$/, w: 8, casing: 11.5, fill: C.secondary, stroke: C.secondaryCasing },
  { match: /^(tertiary)(_link)?$/, w: 6.5, casing: 9.5, fill: C.tertiary, stroke: C.tertiaryCasing },
  { match: /^(unclassified|residential|living_street)$/, w: 4.5, casing: 7, fill: C.minor, stroke: C.minorCasing },
  { match: /^(service|track|road)$/, w: 2.4, casing: 0, fill: C.minorCasing, stroke: null },
  { match: /^(path|footway|pedestrian|cycleway|steps)$/, w: 1.6, casing: 0, fill: '#cfc9b0', stroke: null },
]

// ---- Gom hình ----
const areas = { forest: [], farmland: [], meadow: [], residential: [], water: [] }
const roadsByClass = ROAD_CLASSES.map(() => [])
const waterLines = []
const rails = []
const accessRoute = [] // Lê Lợi + Liên Xã: tuyến xe vào La Vang

for (const w of ways) {
  const t = w.tags || {}
  const pts = simplify(coords(w))
  if (pts.length < 2) continue

  if (t.natural === 'water') { areas.water.push(d(pts, true)); continue }
  if (t.waterway) { waterLines.push({ d: d(pts, false), big: t.waterway === 'river' }); continue }
  if (t.railway === 'rail') { rails.push(d(pts, false)); continue }
  if (t.natural === 'wood' || t.landuse === 'forest') { areas.forest.push(d(pts, true)); continue }
  if (t.landuse === 'farmland' || t.landuse === 'orchard') { areas.farmland.push(d(pts, true)); continue }
  if (t.landuse === 'meadow') { areas.meadow.push(d(pts, true)); continue }
  if (['residential', 'industrial', 'cemetery'].includes(t.landuse)) { areas.residential.push(d(pts, true)); continue }
  if (t.highway) {
    const idx = ROAD_CLASSES.findIndex((c) => c.match.test(t.highway))
    if (idx >= 0) roadsByClass[idx].push(d(pts, isClosed(w)))
    if (t.name === 'Lê Lợi' || t.name === 'Liên Xã') accessRoute.push(d(pts, false))
  }
}

const fillLayer = (paths, fill) =>
  paths.length ? `<g fill="${fill}">${paths.map((p) => `<path d="${p}"/>`).join('')}</g>` : ''
const strokeLayer = (paths, stroke, width, extra = '') =>
  paths.length
    ? `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}>${
        paths.map((p) => `<path d="${p}"/>`).join('')
      }</g>`
    : ''

// Viền tất cả các cấp trước, rồi lõi — để giao lộ nối liền mạch
const roadLayers = []
for (let i = ROAD_CLASSES.length - 1; i >= 0; i--) {
  const c = ROAD_CLASSES[i]
  if (c.stroke && c.casing) roadLayers.push(strokeLayer(roadsByClass[i], c.stroke, c.casing))
}
for (let i = ROAD_CLASSES.length - 1; i >= 0; i--) {
  const c = ROAD_CLASSES[i]
  roadLayers.push(strokeLayer(roadsByClass[i], c.fill, c.w))
}

// Viền khuôn viên (artwork sẽ nằm đúng khít bên trong)
const c4 = [
  px(CAL.topleft[1], CAL.topleft[0]),
  px(CAL.topright[1], CAL.topright[0]),
  [
    px(CAL.topright[1], CAL.topright[0])[0] + px(CAL.bottomleft[1], CAL.bottomleft[0])[0] - px(CAL.topleft[1], CAL.topleft[0])[0],
    px(CAL.topright[1], CAL.topright[0])[1] + px(CAL.bottomleft[1], CAL.bottomleft[0])[1] - px(CAL.topleft[1], CAL.topleft[0])[1],
  ],
  px(CAL.bottomleft[1], CAL.bottomleft[0]),
]

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
<rect width="${W}" height="${H}" fill="${C.land}"/>
${fillLayer(areas.farmland, C.farmland)}
${fillLayer(areas.meadow, C.meadow)}
${fillLayer(areas.residential, C.residential)}
${fillLayer(areas.forest, C.forest)}
${fillLayer(areas.water, C.water)}
<g fill="none" stroke="${C.water}" stroke-linecap="round">${
  waterLines.map((w) => `<path d="${w.d}" stroke-width="${w.big ? 11 : 3.5}"/>`).join('')
}</g>
${strokeLayer(rails, C.rail, 3, ' stroke-dasharray="12 7"')}
${roadLayers.join('\n')}
${strokeLayer(accessRoute, '#ffffff', 13)}
${strokeLayer(accessRoute, C.routeAccess, 7)}
<path d="${d(c4, true)}" fill="none" stroke="${C.campusEdge}" stroke-width="5"/>
</svg>`

writeFileSync('assets-src/basemap.svg', svg)
console.log('SVG:', (svg.length / 1024 / 1024).toFixed(1), 'MB')

await sharp(Buffer.from(svg), { limitInputPixels: false })
  .webp({ quality: 82 })
  .toFile(OUT_IMG)
console.log('đã ghi', OUT_IMG)

// ---- Nhãn: xuất ra để app vẽ bằng DOM ----
// minZoom = mức zoom tối thiểu để nhãn xuất hiện (tránh chữ chồng chữ khi nhìn xa)
// Nhãn rơi vào trong khuôn viên thì bỏ: artwork đã thể hiện rõ chỗ đó rồi
const ctl = { x: mx(CAL.topleft[1]), y: my(CAL.topleft[0]) }
const ctr = { x: mx(CAL.topright[1]), y: my(CAL.topright[0]) }
const cbl = { x: mx(CAL.bottomleft[1]), y: my(CAL.bottomleft[0]) }
const inCampus = (lat, lng) => {
  const ax = ctr.x - ctl.x, ay = ctr.y - ctl.y
  const bx = cbl.x - ctl.x, by = cbl.y - ctl.y
  const px2 = mx(lng) - ctl.x, py2 = my(lat) - ctl.y
  const det = ax * by - ay * bx
  const u = (px2 * by - py2 * bx) / det
  const v = (ax * py2 - ay * px2) / det
  return u > -0.08 && u < 1.08 && v > -0.05 && v < 1.05
}

const labels = []
for (const el of osm.elements) {
  if (el.type !== 'node' || !el.tags?.place || !el.tags.name) continue
  if (inCampus(el.lat, el.lon)) continue
  const p = el.tags.place
  const rank = p === 'city' ? 0 : p === 'town' ? 1 : p === 'suburb' ? 2 : 3
  labels.push({
    text: el.tags.name,
    kind: rank <= 1 ? 'town' : 'village',
    lat: Number(el.lat.toFixed(6)),
    lng: Number(el.lon.toFixed(6)),
    minZoom: rank === 0 ? 0 : rank === 1 ? 13.5 : 14.75,
  })
}

// Nhãn đường: đặt ở giữa đoạn dài nhất của mỗi tên
const ROAD_LABELS = ['Quốc lộ 1', 'Quốc lộ 49C', 'Lê Duẩn', 'Lê Lợi', 'Liên Xã', 'Đường tỉnh 579']
for (const name of ROAD_LABELS) {
  const segs = ways.filter((w) => w.tags?.name === name && w.tags.highway)
  if (!segs.length) continue
  let best = null
  for (const w of segs) {
    const ns = w.nodes.map((id) => nodes.get(id)).filter(Boolean)
    if (ns.length < 2) continue
    const a = ns[0], b = ns[ns.length - 1]
    const len = Math.hypot((b.lat - a.lat) * 111, (b.lon - a.lon) * 106.6)
    if (!best || len > best.len) best = { len, ns }
  }
  if (!best) continue
  const mid = best.ns[Math.floor(best.ns.length / 2)]
  labels.push({
    text: name,
    kind: 'road',
    lat: Number(mid.lat.toFixed(6)),
    lng: Number(mid.lon.toFixed(6)),
    minZoom: 14,
  })
}

const r7 = (v) => Number(v.toFixed(7))
const nw = inv(X0, Y1), ne = inv(X1, Y1), sw = inv(X0, Y0)
writeFileSync('src/data/region-labels.js',
`// TỰ SINH bởi scripts/render-basemap.mjs — đừng sửa tay.
// Nhãn vẽ bằng DOM (không nướng vào ảnh) để chữ luôn sắc nét ở mọi mức zoom.
// Nguồn: © OpenStreetMap contributors (ODbL).
export const REGION_BOUNDS = {
  topleft: [${r7(nw.lat)}, ${r7(nw.lng)}],
  topright: [${r7(ne.lat)}, ${r7(ne.lng)}],
  bottomleft: [${r7(sw.lat)}, ${r7(sw.lng)}],
}

export const OSM_LABELS = ${JSON.stringify(labels, null, 1)}
`)
console.log(`đã ghi src/data/region-labels.js — ${labels.length} nhãn`)
console.log('BOUNDS =', JSON.stringify({ nw, ne, sw }))
