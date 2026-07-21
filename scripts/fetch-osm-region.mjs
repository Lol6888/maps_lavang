// Tải dữ liệu OSM quanh La Vang để tự render bản đồ nền.
// Chạy: node scripts/fetch-osm-region.mjs  -> ghi assets-src/osm-region.json
import { writeFileSync } from 'node:fs'
import { BBOX } from './region-bbox.mjs'

const q = `[out:json][timeout:240];
(
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["highway"];
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["waterway"~"river|stream|canal"];
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["natural"="water"];
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["landuse"~"forest|farmland|meadow|orchard|residential|industrial|cemetery"];
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["natural"="wood"];
  way(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["railway"="rail"];
  node(${BBOX.s},${BBOX.w},${BBOX.n},${BBOX.e})["place"~"town|village|hamlet|suburb|city"];
);
(._;>;);
out body;`

const MIRRORS = [
  'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

let json = null
for (const url of MIRRORS) {
  try {
    console.error('thử', url)
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'maps-lavang/0.1 (basemap render, one-off)',
      },
      body: 'data=' + encodeURIComponent(q),
    })
    if (!res.ok) { console.error('  HTTP', res.status); continue }
    json = await res.json()
    break
  } catch (e) { console.error('  lỗi:', e.message) }
}
if (!json) { console.error('mọi mirror đều thất bại'); process.exit(1) }

writeFileSync('assets-src/osm-region.json', JSON.stringify(json))
const ways = json.elements.filter((e) => e.type === 'way').length
const nodes = json.elements.filter((e) => e.type === 'node').length
console.log(`đã ghi assets-src/osm-region.json — ${ways} way, ${nodes} node`)
