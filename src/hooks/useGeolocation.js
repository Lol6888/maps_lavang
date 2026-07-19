import { useEffect, useRef, useState } from 'react'

const MAX_ACCURACY_M = 30 // sai số lớn hơn mức này thì không cập nhật vị trí
const DEADZONE_M = 2 // di chuyển dưới mức này thì bỏ qua (chống rung)
const SMOOTH_ALPHA = 0.4 // hệ số làm mượt (EMA)

export function distMeters(a, b) {
  const R = 6371000
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(s))
}

// Theo dõi GPS: enableHighAccuracy + lọc sai số + deadzone + làm mượt EMA.
// state.status: 'idle' | 'watching' | 'denied' | 'unavailable'
// state.position: { lat, lng, accuracy, heading, stale }
export function useGeolocation(enabled, mock) {
  const [state, setState] = useState({ status: 'idle', position: null })
  const lastRef = useRef(null)

  useEffect(() => {
    if (!enabled) return
    // Chế độ giả lập vị trí (?mock=lat,lng) để thử/demo khi không ở tại chỗ
    if (mock) {
      setState({
        status: 'watching',
        position: { lat: mock.lat, lng: mock.lng, accuracy: 8, heading: null, stale: false },
      })
      return
    }
    if (!('geolocation' in navigator)) {
      setState({ status: 'unavailable', position: null })
      return
    }
    setState((s) => ({ ...s, status: 'watching' }))

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude: lat, longitude: lng, accuracy, heading, speed } = pos.coords
        const raw = { lat, lng }
        const last = lastRef.current

        // Tín hiệu quá kém: giữ vị trí cũ, chỉ đánh dấu "mờ"
        if (accuracy > MAX_ACCURACY_M) {
          setState((s) => ({
            status: 'watching',
            position: s.position ? { ...s.position, accuracy, stale: true } : null,
          }))
          return
        }

        let next = raw
        if (last) {
          if (distMeters(last, raw) < DEADZONE_M) {
            // Đứng yên: chỉ cập nhật accuracy/heading
            setState({
              status: 'watching',
              position: { ...last, accuracy, heading: normHeading(heading, speed), stale: false },
            })
            return
          }
          next = {
            lat: last.lat + (raw.lat - last.lat) * SMOOTH_ALPHA,
            lng: last.lng + (raw.lng - last.lng) * SMOOTH_ALPHA,
          }
        }
        lastRef.current = next
        setState({
          status: 'watching',
          position: { ...next, accuracy, heading: normHeading(heading, speed), stale: false },
        })
      },
      (err) => {
        setState({ status: err.code === err.PERMISSION_DENIED ? 'denied' : 'unavailable', position: null })
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    )
    return () => navigator.geolocation.clearWatch(id)
  }, [enabled, mock])

  return state
}

function normHeading(heading, speed) {
  // heading chỉ tin được khi đang thực sự di chuyển
  if (heading == null || Number.isNaN(heading)) return null
  if (speed != null && speed < 0.5) return null
  return heading
}
