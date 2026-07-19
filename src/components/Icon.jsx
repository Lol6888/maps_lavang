import { ICON_PATHS } from './iconPaths.js'

// Icon Material Design, path nhúng sẵn (xem scripts/gen-icons.mjs).
export default function Icon({ name, size = 24, className, style }) {
  const d = ICON_PATHS[name]
  if (!d) return null
  return (
    <svg
      className={className}
      style={style}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      focusable="false"
    >
      <path d={d} />
    </svg>
  )
}

// Bản chuỗi HTML, dùng cho divIcon của Leaflet.
export function iconSvg(name, { size = 24, color = 'currentColor' } = {}) {
  const d = ICON_PATHS[name]
  if (!d) return ''
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${color}" aria-hidden="true"><path d="${d}"/></svg>`
}
