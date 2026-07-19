import { uvToLatLng } from './calibration.js'
import { distMeters } from '../hooks/useGeolocation.js'

const WALK_SPEED_MPS = 1.25 // tốc độ đi bộ trung bình trong khuôn viên

export function poiLatLng(cal, poi) {
  return uvToLatLng(cal, poi.u, poi.v)
}

// Khoảng cách chim bay từ vị trí thật (lat/lng) tới POI
export function straightDistance(cal, poi, pos) {
  const ll = poiLatLng(cal, poi)
  return distMeters(pos, { lat: ll.lat, lng: ll.lng })
}

// Độ dài đường đi (mét) của chuỗi điểm (u,v)
export function routeLength(cal, path) {
  let total = 0
  for (let i = 1; i < path.length; i++) {
    const a = uvToLatLng(cal, path[i - 1].u, path[i - 1].v)
    const b = uvToLatLng(cal, path[i].u, path[i].v)
    total += distMeters({ lat: a.lat, lng: a.lng }, { lat: b.lat, lng: b.lng })
  }
  return total
}

export function formatDistance(m) {
  if (m == null) return null
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${Math.round(m)} m`
}

export function walkMinutes(m) {
  return Math.max(1, Math.round(m / WALK_SPEED_MPS / 60))
}
