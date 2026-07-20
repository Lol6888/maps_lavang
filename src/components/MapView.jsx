import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { rotatedImageOverlay } from '../map/RotatedImageOverlay.js'
import {
  uvToLatLng, latLngToUv, campusCenter,
  displayCalFrom, campusBearing, realToDisplay,
} from '../map/calibration.js'
import { CATEGORIES } from '../data/pois.js'
import { BACKDROP } from '../data/backdrop.js'
import { REGION, REGION_SWAP_ZOOM } from '../data/region.js'
import { iconSvg } from './Icon.jsx'

const MAP_URLS = {
  tree: '/map/base-tree-4096.webp',
  notree: '/map/base-notree-4096.webp',
}

const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export default function MapView({
  mode, // 'normal' | 'calibrate' | 'editpoi'
  layer, // 'tree' | 'notree' | 'none'
  overlayOpacity,
  cal,
  onCalChange,
  pois,
  selectedPoiId,
  onSelectPoi,
  position, // { lat, lng, accuracy, heading, stale } | null
  follow,
  onUserInteract,
  route, // [{u, v}] | null — đường đi bộ tới đích
  routeDashed, // true = đường chim bay (nét đứt), không phải lối đi thật
  fitKey, // đổi giá trị này để zoom vừa khít đường đi
}) {
  // Chế độ thường vẽ trong khung "campus-up"; calibrate vẽ trong khung thật
  const displayCal = useMemo(() => displayCalFrom(cal), [cal])
  const frame = mode === 'calibrate' ? cal : displayCal

  // Zoom xa: ẩn artwork + vệ tinh, chỉ hiện sơ đồ vùng
  const [lowZoom, setLowZoom] = useState(false)

  const divRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const satRef = useRef(null)
  const poiLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const accCircleRef = useRef(null)
  const cornerMarkersRef = useRef(null)
  const routeLayerRef = useRef(null)
  const backdropRef = useRef(null)
  const regionRef = useRef(null)
  const handlersRef = useRef({})

  // Góc các ảnh nền (tọa độ thật) đưa sang khung đang hiển thị
  const toDisplayCorners = (src) => {
    const toDisplay = (ll) => {
      const { u, v } = latLngToUv(cal, ll)
      const p = uvToLatLng(frame, u, v)
      return [p.lat, p.lng]
    }
    return {
      topleft: toDisplay(src.topleft),
      topright: toDisplay(src.topright),
      bottomleft: toDisplay(src.bottomleft),
    }
  }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const backdropCorners = useMemo(() => toDisplayCorners(BACKDROP), [cal, frame])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const regionCorners = useMemo(() => toDisplayCorners(REGION), [cal, frame])

  // callbacks/props mới nhất cho các listener gắn 1 lần
  handlersRef.current = { onSelectPoi, onUserInteract, onCalChange, cal, frame, mode }

  // ---- Khởi tạo map (1 lần) ----
  useEffect(() => {
    const map = L.map(divRef.current, {
      zoomControl: false,
      attributionControl: false,
      minZoom: 13.5,
      maxZoom: 21,
      zoomSnap: 0.25,
    })
    // Sơ đồ vùng (340) dưới vệ tinh (350), cả hai dưới ảnh bản đồ (overlayPane 400)
    map.createPane('regionPane').style.zIndex = 340
    map.createPane('backdropPane').style.zIndex = 350
    map.on('zoomend', () => setLowZoom(map.getZoom() < REGION_SWAP_ZOOM))
    map.setView(campusCenter(frame), 16.5)
    map.on('dragstart', () => handlersRef.current.onUserInteract?.())
    map.on('click', (e) => {
      const h = handlersRef.current
      if (h.mode === 'editpoi') {
        const { u, v } = latLngToUv(h.frame, e.latlng)
        const txt = `u: ${u.toFixed(4)}, v: ${v.toFixed(4)}`
        console.log('[editpoi]', txt)
        navigator.clipboard?.writeText(txt).catch(() => {})
      } else {
        h.onSelectPoi?.(null)
      }
    })
    poiLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => {
      map.remove()
      // Phải xoá hết ref: các effect dùng ref để biết layer đã tạo hay chưa,
      // ref cũ sót lại sẽ khiến layer không bao giờ được thêm vào map mới.
      mapRef.current = null
      overlayRef.current = null
      satRef.current = null
      backdropRef.current = null
      regionRef.current = null
      routeLayerRef.current = null
      userMarkerRef.current = null
      accCircleRef.current = null
      cornerMarkersRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ---- Lớp vệ tinh (chỉ khi calibrate) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode === 'calibrate') {
      if (!satRef.current) {
        satRef.current = L.tileLayer(ESRI_SAT, { maxZoom: 21, maxNativeZoom: 19 }).addTo(map)
      }
    } else if (satRef.current) {
      map.removeLayer(satRef.current)
      satRef.current = null
    }
  }, [mode])

  // ---- Sơ đồ vùng (luôn hiện ở chế độ thường, nằm dưới cùng) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode === 'calibrate') {
      if (regionRef.current) { map.removeLayer(regionRef.current); regionRef.current = null }
      return
    }
    if (!regionRef.current) {
      regionRef.current = rotatedImageOverlay(
        REGION.url,
        regionCorners.topleft, regionCorners.topright, regionCorners.bottomleft,
        { pane: 'regionPane' }
      ).addTo(map)
    } else {
      regionRef.current.setCorners(
        regionCorners.topleft, regionCorners.topright, regionCorners.bottomleft
      )
    }
  }, [mode, regionCorners])

  // ---- Ảnh vệ tinh nền (chế độ thường, chỉ khi zoom gần) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode === 'calibrate' || lowZoom) {
      if (backdropRef.current) {
        map.removeLayer(backdropRef.current)
        backdropRef.current = null
      }
      return
    }
    if (!backdropRef.current) {
      backdropRef.current = rotatedImageOverlay(
        BACKDROP.url,
        backdropCorners.topleft, backdropCorners.topright, backdropCorners.bottomleft,
        { pane: 'backdropPane' }
      ).addTo(map)
    } else {
      backdropRef.current.setCorners(
        backdropCorners.topleft, backdropCorners.topright, backdropCorners.bottomleft
      )
    }
  }, [mode, backdropCorners, lowZoom])

  // ---- Ảnh bản đồ overlay (ẩn khi zoom xa — sơ đồ vùng tự thể hiện khuôn viên) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (overlayRef.current) {
      map.removeLayer(overlayRef.current)
      overlayRef.current = null
    }
    if (layer !== 'none' && !(mode === 'normal' && lowZoom)) {
      overlayRef.current = rotatedImageOverlay(
        MAP_URLS[layer], frame.topleft, frame.topright, frame.bottomleft,
        { opacity: overlayOpacity }
      ).addTo(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer, lowZoom, mode])

  // corners/opacity thay đổi → cập nhật overlay hiện có
  useEffect(() => {
    overlayRef.current?.setCorners(frame.topleft, frame.topright, frame.bottomleft)
  }, [frame])
  useEffect(() => {
    overlayRef.current?.setOpacity(overlayOpacity)
  }, [overlayOpacity])

  // ---- Giới hạn pan (chế độ thường) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode === 'normal') {
      // Cho pan tới hết sơ đồ vùng (~6.9 x 4.9 km)
      const b = regionCorners
      const fourth = [
        b.topright[0] + b.bottomleft[0] - b.topleft[0],
        b.topright[1] + b.bottomleft[1] - b.topleft[1],
      ]
      map.setMaxBounds(
        L.latLngBounds([b.topleft, b.topright, b.bottomleft, fourth]).pad(0.02)
      )
    } else {
      map.setMaxBounds(null)
    }
  }, [mode, regionCorners])

  // ---- POI markers ----
  useEffect(() => {
    const group = poiLayerRef.current
    if (!group) return
    group.clearLayers()
    // Zoom xa: khuôn viên chỉ còn ~340px, 29 marker sẽ đè nhau — chỉ giữ nhóm
    // đi lại (bãi đỗ xe, đón trả khách) là thứ người ta cần ở tầm nhìn vùng.
    const visible = lowZoom
      ? pois.filter((p) => p.cat === 'giaothong' || p.id === selectedPoiId)
      : pois
    for (const poi of visible) {
      const color = CATEGORIES[poi.cat]?.color || '#5f6368'
      const selected = poi.id === selectedPoiId
      const icon = L.divIcon({
        className: '',
        html: `<div class="poi-marker${selected ? ' poi-selected' : ''}" style="--c:${color}">${
          iconSvg(poi.icon, { size: selected ? 24 : 17, color: selected ? '#fff' : color })
        }</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      const m = L.marker(uvToLatLng(frame, poi.u, poi.v), { icon, title: poi.name })
      m.on('click', () => handlersRef.current.onSelectPoi?.(poi))
      group.addLayer(m)
    }
  }, [pois, frame, selectedPoiId, lowZoom])

  // Pan tới POI được chọn
  useEffect(() => {
    const map = mapRef.current
    if (!map || !selectedPoiId) return
    const poi = pois.find((p) => p.id === selectedPoiId)
    if (poi) map.panTo(uvToLatLng(frame, poi.u, poi.v))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPoiId])

  // ---- Đường đi ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (routeLayerRef.current) {
      map.removeLayer(routeLayerRef.current)
      routeLayerRef.current = null
    }
    if (!route || route.length < 2) return
    const latlngs = route.map((p) => uvToLatLng(frame, p.u, p.v))
    const style = { lineCap: 'round', lineJoin: 'round', interactive: false }
    const lines = routeDashed
      ? [L.polyline(latlngs, { ...style, color: '#4285f4', weight: 5, dashArray: '2 12', opacity: 0.9 })]
      : [
          L.polyline(latlngs, { ...style, color: '#185abc', weight: 11, opacity: 0.9 }),
          L.polyline(latlngs, { ...style, color: '#4285f4', weight: 7 }),
        ]
    routeLayerRef.current = L.layerGroup([
      ...lines,
      L.circleMarker(latlngs[latlngs.length - 1], {
        radius: 7, color: '#fff', weight: 3, fillColor: '#ea4335', fillOpacity: 1, interactive: false,
      }),
    ]).addTo(map)
  }, [route, routeDashed, frame])

  // Zoom vừa khít đường đi khi đổi đích
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitKey || !route || route.length < 2) return
    const b = L.latLngBounds(route.map((p) => uvToLatLng(frame, p.u, p.v)))
    map.fitBounds(b, { padding: [70, 90], maxZoom: 19 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitKey])

  // ---- Vị trí người dùng ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (!position) {
      if (userMarkerRef.current) { map.removeLayer(userMarkerRef.current); userMarkerRef.current = null }
      if (accCircleRef.current) { map.removeLayer(accCircleRef.current); accCircleRef.current = null }
      return
    }
    // Đổi GPS thật sang khung hiển thị (chế độ thường); calibrate vẽ thẳng
    const raw = L.latLng(position.lat, position.lng)
    const ll = mode === 'calibrate' ? raw : realToDisplay(cal, displayCal, raw).latlng
    // Mũi tên heading: trừ đi góc xoay của khung ảnh
    const hasHeading = position.heading != null
    const dispHeading = hasHeading
      ? (mode === 'calibrate' ? position.heading : (position.heading - campusBearing(cal) + 360) % 360)
      : 0
    const html = `<div class="user-marker${position.stale ? ' user-stale' : ''}">
        <div class="user-dot"></div>
        ${hasHeading ? `<div class="user-arrow" style="transform: rotate(${dispHeading}deg)"></div>` : ''}
      </div>`
    const icon = L.divIcon({ className: '', html, iconSize: [36, 36], iconAnchor: [18, 18] })
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.marker(ll, { icon, zIndexOffset: 1000, interactive: false }).addTo(map)
    } else {
      userMarkerRef.current.setLatLng(ll)
      userMarkerRef.current.setIcon(icon)
    }
    if (!accCircleRef.current) {
      accCircleRef.current = L.circle(ll, {
        radius: position.accuracy,
        color: '#4285f4', weight: 1, opacity: 0.35,
        fillColor: '#4285f4', fillOpacity: 0.12, interactive: false,
      }).addTo(map)
    } else {
      accCircleRef.current.setLatLng(ll)
      accCircleRef.current.setRadius(position.accuracy)
    }
    if (follow && !position.stale) map.panTo(ll)
  }, [position, follow, mode, cal, displayCal])

  // ---- Chế độ calibrate: 3 góc + tay nắm di chuyển toàn bộ ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode !== 'calibrate') {
      if (cornerMarkersRef.current) {
        cornerMarkersRef.current.forEach((m) => map.removeLayer(m))
        cornerMarkersRef.current = null
      }
      return
    }
    if (cornerMarkersRef.current) {
      // cập nhật vị trí theo cal mới (khi kéo marker khác)
      const [tl, tr, bl, center] = cornerMarkersRef.current
      const c = handlersRef.current.cal
      tl.setLatLng(c.topleft); tr.setLatLng(c.topright); bl.setLatLng(c.bottomleft)
      center.setLatLng(campusCenter(c))
      return
    }

    const mk = (latlng, cls, label) =>
      L.marker(latlng, {
        draggable: true,
        zIndexOffset: 2000,
        icon: L.divIcon({ className: '', html: `<div class="cal-handle ${cls}">${label}</div>`, iconSize: [28, 28], iconAnchor: [14, 14] }),
      }).addTo(map)

    const c0 = handlersRef.current.cal
    const tl = mk(c0.topleft, 'cal-corner', 'TL')
    const tr = mk(c0.topright, 'cal-corner', 'TR')
    const bl = mk(c0.bottomleft, 'cal-corner', 'BL')
    const center = mk(campusCenter(c0), 'cal-center', iconSvg('OpenWith', { size: 18, color: '#fff' }))

    const emit = (next) => handlersRef.current.onCalChange?.(next)
    const ll = (m) => { const p = m.getLatLng(); return [p.lat, p.lng] }

    tl.on('drag', () => emit({ ...handlersRef.current.cal, topleft: ll(tl) }))
    tr.on('drag', () => emit({ ...handlersRef.current.cal, topright: ll(tr) }))
    bl.on('drag', () => emit({ ...handlersRef.current.cal, bottomleft: ll(bl) }))

    let dragStart = null
    center.on('dragstart', () => {
      dragStart = { at: center.getLatLng(), cal: handlersRef.current.cal }
    })
    center.on('drag', () => {
      if (!dragStart) return
      const proj = L.CRS.EPSG3857
      const a = proj.project(dragStart.at)
      const b = proj.project(center.getLatLng())
      const dx = b.x - a.x, dy = b.y - a.y
      const shift = (pt) => {
        const p = proj.project(L.latLng(pt))
        const q = proj.unproject(L.point(p.x + dx, p.y + dy))
        return [q.lat, q.lng]
      }
      emit({
        topleft: shift(dragStart.cal.topleft),
        topright: shift(dragStart.cal.topright),
        bottomleft: shift(dragStart.cal.bottomleft),
      })
    })
    center.on('dragend', () => { dragStart = null })

    cornerMarkersRef.current = [tl, tr, bl, center]
  }, [mode, cal])

  return <div ref={divRef} className="map-root" />
}
