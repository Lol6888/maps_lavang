// Tự render bản đồ nền từ dữ liệu OSM, phong cách bản đồ đường (như Google Maps)
// nhưng dùng chất giấy kem + lớp chỉ dẫn của poster La Vang.
//
// Vì sao tự render thay vì lấy tile sẵn: tile Google cấm lấy bằng URL trực tiếp; tile bên
// thứ ba khác thì vướng chuyện cache/offline. Tự render từ OSM (ODbL) chỉ cần ghi công
// "© OpenStreetMap contributors", chạy offline, ta kiểm soát hoàn toàn phong cách + phạm vi,
// và georeference chính xác north-up nên không méo như poster vẽ tay.
//
// Chữ KHÔNG vẽ vào ảnh: ảnh hiển thị ở tỉ lệ 0.25x–1.2x tùy zoom nên chữ nướng sẵn sẽ lúc
// bé lúc to. Nhãn xuất ra src/data/region-labels.js để app vẽ bằng DOM, luôn sắc nét.
//
// Chạy: node scripts/fetch-osm-region.mjs && node scripts/render-basemap.mjs
import { readFileSync, writeFileSync } from 'node:fs'
import sharp from 'sharp'
import { BBOX } from './region-bbox.mjs'

const OUT_IMG = 'public/map/region.webp'
const TARGET_W = 4000

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
console.log(`canvas ${W}x${H}px | ${mPerPx.toFixed(2)} m/px`)

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

// ---- Bảng màu (nền theo bản đồ đường, lớp chỉ dẫn theo poster) ----
const C = {
  land: '#f7f4e4', farmland: '#f3efdb', meadow: '#eaf0d8', residential: '#efece0',
  forest: '#d9e6cd', water: '#8fc9ec',
  minorCasing: '#dcd7c0', minor: '#fffdf3',
  tertiaryCasing: '#d8cfae', tertiary: '#fffdf0',
  secondaryCasing: '#e3d29a', secondary: '#fdf3cf',
  trunkCasing: '#e5ae55', trunk: '#fbd68d',
  rail: '#c2beb0',
  routeRed: '#e3000f',      // QL 1A / Lê Duẩn — tuyến đỏ của poster
  routeGreen: '#00a05a',    // Lê Lợi / Liên Xã — tuyến một chiều vào La Vang
  arrowRed: '#ff3ea5',      // mũi tên hồng trên tuyến đỏ
  parking: '#e59331', parkingEdge: '#b4600f',
  junction: '#ffe000', junctionEdge: '#7a5b00',
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
const routeGreenPts = [] // Lê Lợi + Liên Xã (polyline gốc, để đặt mũi tên)
const routeRedPts = []   // Quốc lộ 1 + Lê Duẩn
const riverPts = []

// Tuyến một chiều vào La Vang chỉ định bằng way ID, KHÔNG lọc theo tên:
// OSM có hai đường cùng tên "Lê Lợi" (đường hành hương ở nam và một đường khác
// trong thị xã Quảng Trị cách 3km), còn "Liên Xã" thì có cả nhánh tây mà poster
// không tô. Lọc theo tên sẽ vẽ nhầm cả hai thứ đó.
const ROUTE_GREEN_WAYS = new Set([
  314836876, 314836877, 718097632, 305408021, // Lê Lợi: Cầu Trắng -> La Vang
  718069926, 305408022,                        // Liên Xã: La Vang -> QL 1A (nhánh đông)
])
// Giao Lê Lợi × Quốc lộ 1 — chính là Cầu Trắng (node 3208793351)
const CAU_TRANG = [16.740095, 107.192115]

const isRed = (t) => t.name === 'Quốc lộ 1' || t.name === 'Lê Duẩn'

for (const w of ways) {
  const t = w.tags || {}
  const pts = simplify(coords(w))
  if (pts.length < 2) continue

  if (t.natural === 'water') { areas.water.push(d(pts, true)); continue }
  if (t.waterway) {
    waterLines.push({ d: d(pts, false), big: t.waterway === 'river' })
    if (/Thạch Hãn/i.test(t.name || '')) riverPts.push(pts)
    continue
  }
  if (t.railway === 'rail') { rails.push(d(pts, false)); continue }
  if (t.natural === 'wood' || t.landuse === 'forest') { areas.forest.push(d(pts, true)); continue }
  if (t.landuse === 'farmland' || t.landuse === 'orchard') { areas.farmland.push(d(pts, true)); continue }
  if (t.landuse === 'meadow') { areas.meadow.push(d(pts, true)); continue }
  if (['residential', 'industrial', 'cemetery'].includes(t.landuse)) { areas.residential.push(d(pts, true)); continue }
  if (t.highway) {
    const idx = ROAD_CLASSES.findIndex((c) => c.match.test(t.highway))
    if (idx >= 0) roadsByClass[idx].push(d(pts, isClosed(w)))
    if (ROUTE_GREEN_WAYS.has(w.id)) routeGreenPts.push(pts)
    else if (isRed(t)) routeRedPts.push(pts)
  }
}

const strokeLayer = (paths, stroke, width, extra = '') =>
  paths.length
    ? `<g fill="none" stroke="${stroke}" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round"${extra}>${
        paths.map((p) => `<path d="${p}"/>`).join('')
      }</g>`
    : ''
const fillLayer = (paths, fill) =>
  paths.length ? `<g fill="${fill}">${paths.map((p) => `<path d="${p}"/>`).join('')}</g>` : ''

const roadLayers = []
for (let i = ROAD_CLASSES.length - 1; i >= 0; i--) {
  const c = ROAD_CLASSES[i]
  if (c.stroke && c.casing) roadLayers.push(strokeLayer(roadsByClass[i], c.stroke, c.casing))
}
for (let i = ROAD_CLASSES.length - 1; i >= 0; i--) {
  const c = ROAD_CLASSES[i]
  roadLayers.push(strokeLayer(roadsByClass[i], c.fill, c.w))
}

// ---- Mũi tên chiều đi ----
// Hướng đi lấy theo tiếp tuyến cục bộ, lật sao cho cùng chiều với vector hành trình
// mong muốn -> không phụ thuộc thứ tự node của OSM.
function arrows(polys, travel, color, everyPx = 330, size = 15) {
  const out = []
  const [tx, ty] = travel
  for (const pts of polys) {
    let acc = everyPx * 0.55
    for (let i = 1; i < pts.length; i++) {
      const [ax, ay] = pts[i - 1], [bx, by] = pts[i]
      let dx = bx - ax, dy = by - ay
      const seg = Math.hypot(dx, dy)
      if (seg < 1e-6) continue
      acc += seg
      if (acc < everyPx) continue
      acc = 0
      // lật tiếp tuyến cho khớp chiều hành trình
      if (dx * tx + dy * ty < 0) { dx = -dx; dy = -dy }
      const ang = (Math.atan2(dy, dx) * 180) / Math.PI
      const cx = (ax + bx) / 2, cy = (ay + by) / 2
      out.push(
        `<path d="M${-size * 0.55},${-size * 0.62} L${size * 0.75},0 L${-size * 0.55},${size * 0.62} Z" ` +
        `transform="translate(${cx.toFixed(1)},${cy.toFixed(1)}) rotate(${ang.toFixed(1)})" ` +
        `fill="${color}" stroke="#fff" stroke-width="2.5" stroke-linejoin="round"/>`
      )
    }
  }
  return out.join('')
}

// Vòng lưu thông theo poster: QL1A đi về hướng tây bắc (lên Cầu Trắng) -> Lê Lợi xuôi nam
// (một chiều) -> La Vang -> Liên Xã sang đông (một chiều) -> nhập lại QL1A.
const arrowsRed = arrows(routeRedPts, [-0.75, -0.66], C.arrowRed, 300, 17)
const greenSouth = routeGreenPts.filter((p) => Math.abs(p[p.length - 1][1] - p[0][1]) >= Math.abs(p[p.length - 1][0] - p[0][0]))
const greenEast = routeGreenPts.filter((p) => Math.abs(p[p.length - 1][1] - p[0][1]) < Math.abs(p[p.length - 1][0] - p[0][0]))
const arrowsGreen = arrows(greenSouth, [0, 1], C.routeGreen, 300, 15) + arrows(greenEast, [1, 0], C.routeGreen, 300, 15)

// ---- Bãi đỗ xe khách: chưa có trong OSM, dựng từ poster (cần đo thực địa) ----
const PARKING = { lat: 16.7126655, lng: 107.2061077, wM: 190, hM: 70, bearingDeg: 72 }
const parkingPoly = (() => {
  const [cx, cy] = px(PARKING.lng, PARKING.lat)
  const wpx = PARKING.wM / mPerPx / 2, hpx = PARKING.hM / mPerPx / 2
  const th = (PARKING.bearingDeg * Math.PI) / 180
  const ca = Math.cos(th), sa = Math.sin(th)
  return [[-wpx, -hpx], [wpx, -hpx], [wpx, hpx], [-wpx, hpx]]
    .map(([x, y]) => [cx + x * ca - y * sa, cy + x * sa + y * ca])
})()

// ---- Chấm vàng giao lộ ----
const JUNCTIONS = [
  CAU_TRANG,                   // Lê Lợi × QL 1A
  [16.710181, 107.194709],     // Lê Lợi × Liên Xã — điểm đón trả khách
  [16.716075, 107.212915],     // Liên Xã × QL 1A
  [PARKING.lat, PARKING.lng],  // cổng bãi đỗ
]
const junctionDots = JUNCTIONS.map(([lat, lng]) => {
  const [x, y] = px(lng, lat)
  return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="13" fill="${C.junction}" stroke="${C.junctionEdge}" stroke-width="3.5"/>`
}).join('')

// ---- Viền khuôn viên ----
const p1 = px(CAL.topleft[1], CAL.topleft[0])
const p2 = px(CAL.topright[1], CAL.topright[0])
const p3 = px(CAL.bottomleft[1], CAL.bottomleft[0])
const c4 = [p1, p2, [p2[0] + p3[0] - p1[0], p2[1] + p3[1] - p1[1]], p3]

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
<path d="${d(parkingPoly, true)}" fill="${C.parking}" stroke="${C.parkingEdge}" stroke-width="3"/>
${strokeLayer(routeRedPts.map((p) => d(p, false)), '#ffffff', 17)}
${strokeLayer(routeRedPts.map((p) => d(p, false)), C.routeRed, 11)}
${strokeLayer(routeGreenPts.map((p) => d(p, false)), '#ffffff', 15)}
${strokeLayer(routeGreenPts.map((p) => d(p, false)), C.routeGreen, 9)}
${arrowsRed}
${arrowsGreen}
<path d="${d(c4, true)}" fill="none" stroke="${C.campusEdge}" stroke-width="5"/>
${junctionDots}
</svg>`

writeFileSync('assets-src/basemap.svg', svg)
console.log('SVG:', (svg.length / 1024 / 1024).toFixed(1), 'MB')
await sharp(Buffer.from(svg), { limitInputPixels: false }).webp({ quality: 82 }).toFile(OUT_IMG)
console.log('đã ghi', OUT_IMG)

// ================= NHÃN (app vẽ bằng DOM) =================
const labels = []
// Chốt chặn: nhãn phải nằm trong canvas (chừa lề), nếu không sẽ trôi ngoài nền
const MARGIN = 0.004
const add = (text, kind, lat, lng, minZoom) => {
  if (lat < BBOX.s + MARGIN || lat > BBOX.n - MARGIN || lng < BBOX.w + MARGIN || lng > BBOX.e - MARGIN) {
    console.warn(`  bỏ nhãn ngoài canvas: ${text} (${lat.toFixed(4)}, ${lng.toFixed(4)})`)
    return
  }
  labels.push({ text, kind, lat: Number(lat.toFixed(6)), lng: Number(lng.toFixed(6)), minZoom })
}

// Địa danh từ OSM — bỏ nhãn rơi vào trong khuôn viên (artwork đã thể hiện rõ)
const ctl = { x: mx(CAL.topleft[1]), y: my(CAL.topleft[0]) }
const ctr = { x: mx(CAL.topright[1]), y: my(CAL.topright[0]) }
const cbl = { x: mx(CAL.bottomleft[1]), y: my(CAL.bottomleft[0]) }
const inCampus = (lat, lng) => {
  const ax = ctr.x - ctl.x, ay = ctr.y - ctl.y
  const bx = cbl.x - ctl.x, by = cbl.y - ctl.y
  const qx = mx(lng) - ctl.x, qy = my(lat) - ctl.y
  const det = ax * by - ay * bx
  const u = (qx * by - qy * bx) / det
  const v = (ax * qy - ay * qx) / det
  return u > -0.08 && u < 1.08 && v > -0.05 && v < 1.05
}
for (const el of osm.elements) {
  if (el.type !== 'node' || !el.tags?.place || !el.tags.name) continue
  if (inCampus(el.lat, el.lon)) continue
  const p = el.tags.place
  const rank = p === 'city' ? 0 : p === 'town' ? 1 : p === 'suburb' ? 2 : 3
  add(el.tags.name, rank <= 1 ? 'town' : 'village', el.lat, el.lon, rank === 0 ? 0 : rank === 1 ? 13.5 : 14.75)
}

// Lấy điểm trên tuyến theo tỉ lệ dọc đường (0..1 tính từ đầu nam/tây).
// Với Lê Lợi / Liên Xã phải lọc theo way ID (xem ROUTE_GREEN_WAYS) chứ không theo tên.
const nodesOf = (name) => {
  const segs = ways.filter(
    (w) => w.tags?.name === name && w.tags.highway &&
      (!['Lê Lợi', 'Liên Xã'].includes(name) || ROUTE_GREEN_WAYS.has(w.id))
  )
  const all = []
  for (const w of segs) all.push(...w.nodes.map((id) => nodes.get(id)).filter(Boolean))
  return all
}
const alongLat = (name, frac) => {
  const ns = nodesOf(name).sort((a, b) => a.lat - b.lat)
  return ns.length ? ns[Math.min(ns.length - 1, Math.round(frac * (ns.length - 1)))] : null
}
const alongLon = (name, frac) => {
  const ns = nodesOf(name).sort((a, b) => a.lon - b.lon)
  return ns.length ? ns[Math.min(ns.length - 1, Math.round(frac * (ns.length - 1)))] : null
}

// Tên đường
for (const [name, text, frac, kind] of [
  ['Lê Lợi', 'Đ. LÊ LỢI', 0.75, 'road'],
  ['Lê Lợi', 'Đ. LÊ LỢI', 0.25, 'road'],
  ['Liên Xã', 'Đ. LIÊN XÃ', 0.35, 'road'],
  ['Lê Duẩn', 'Đ. LÊ DUẨN', 0.8, 'road'],
  ['Lê Duẩn', 'Đ. LÊ DUẨN', 0.25, 'road'],
]) {
  const n = kind === 'road' && name === 'Liên Xã' ? alongLon(name, frac) : alongLat(name, frac)
  if (n) add(text, 'road', n.lat, n.lon, 14)
}

// Biển số quốc lộ
for (const frac of [0.12, 0.5, 0.88]) {
  const n = alongLat('Quốc lộ 1', frac)
  if (n) add('QL 1A', 'shield', n.lat, n.lon, 13.5)
}

// Nhãn "đường một chiều"
{
  const a = alongLat('Lê Lợi', 0.62)
  if (a) add('ĐƯỜNG MỘT CHIỀU', 'oneway', a.lat, a.lon, 14.25)
  const b = alongLon('Liên Xã', 0.42)
  if (b) add('ĐƯỜNG MỘT CHIỀU', 'oneway', b.lat, b.lon, 14.25)
}

// Sông
for (const pts of riverPts.slice(0, 1)) void pts
{
  const riverWays = ways.filter((w) => /Thạch Hãn/i.test(w.tags?.name || '') && w.tags?.waterway)
  const rn = []
  for (const w of riverWays) rn.push(...w.nodes.map((id) => nodes.get(id)).filter(Boolean))
  rn.sort((a, b) => b.lat - a.lat)
  for (const f of [0.3, 0.7]) {
    const n = rn[Math.round(f * (rn.length - 1))]
    if (n) add('SÔNG THẠCH HÃN', 'river', n.lat, n.lon, 13.5)
  }
}

// Mốc chỉ dẫn
add('CẦU TRẮNG', 'place', CAU_TRANG[0], CAU_TRANG[1], 13.5)
add('ĐIỂM ĐÓN TRẢ KHÁCH', 'place', 16.710181, 107.194709, 14.5)
add('BÃI ĐỖ XE KHÁCH', 'place', PARKING.lat, PARKING.lng, 14)

const r7 = (v) => Number(v.toFixed(7))
const nw = inv(X0, Y1), ne = inv(X1, Y1), sw = inv(X0, Y0)
writeFileSync('src/data/region-labels.js',
`// TỰ SINH bởi scripts/render-basemap.mjs — đừng sửa tay.
// Nhãn vẽ bằng DOM (không nướng vào ảnh) để chữ luôn sắc nét ở mọi mức zoom.
// Nguồn địa danh/đường: © OpenStreetMap contributors (ODbL).
export const REGION_BOUNDS = {
  topleft: [${r7(nw.lat)}, ${r7(nw.lng)}],
  topright: [${r7(ne.lat)}, ${r7(ne.lng)}],
  bottomleft: [${r7(sw.lat)}, ${r7(sw.lng)}],
}

export const OSM_LABELS = ${JSON.stringify(labels, null, 1)}
`)
console.log(`đã ghi src/data/region-labels.js — ${labels.length} nhãn`)
