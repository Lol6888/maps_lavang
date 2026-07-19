// Trích các icon Material Design cần dùng thành component React (path inline).
// Nhúng thẳng vào bundle nên chạy được offline, nhẹ hơn nhiều so với tải cả font icon.
// Chạy: npm i -D @material-design-icons/svg && node scripts/gen-icons.mjs
import { readFileSync, writeFileSync } from 'node:fs'

const SRC = 'node_modules/@material-design-icons/svg/filled'

const ICONS = [
  // giao diện
  'search', 'arrow_back', 'close', 'my_location', 'navigation', 'directions_walk',
  'layers', 'park', 'map', 'place', 'more_vert', 'info',
  // chế độ căn chỉnh
  'expand_more', 'expand_less', 'content_copy', 'save', 'restart_alt',
  'open_with', 'center_focus_strong', 'tune',
  // địa điểm
  'church', 'water_drop', 'castle', 'account_balance', 'wc', 'battery_charging_full',
  'medical_services', 'restaurant', 'hotel', 'celebration', 'cottage', 'shield',
  'support_agent', 'meeting_room', 'apartment', 'groups',
]

const toPascal = (s) => s.split('_').map((w) => w[0].toUpperCase() + w.slice(1)).join('')

const parts = []
for (const name of ICONS) {
  const svg = readFileSync(`${SRC}/${name}.svg`, 'utf8')
  const paths = [...svg.matchAll(/<path[^>]*\sd="([^"]+)"/g)].map((m) => m[1])
  if (!paths.length) throw new Error(`Không đọc được path của icon: ${name}`)
  const d = paths.join(' ')
  parts.push(`  ${toPascal(name)}: '${d}',`)
}

writeFileSync('src/components/iconPaths.js',
`// TỰ SINH bởi scripts/gen-icons.mjs — đừng sửa tay.
// Icon Material Design (Apache License 2.0), viewBox 0 0 24 24.
export const ICON_PATHS = {
${parts.join('\n')}
}
`)
console.log(`Đã ghi ${ICONS.length} icon vào src/components/iconPaths.js`)
