import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import { rotatedImageOverlay } from '../map/RotatedImageOverlay.js'
import {
  uvToLatLng, latLngToUv, campusCenter,
  displayCalFrom, campusBearing, realToDisplay,
} from '../map/calibration.js'
import { CATEGORIES } from '../data/pois.js'
import { REGION, REGION_LABELS } from '../data/region.js'
import { iconSvg } from './Icon.jsx'

// Điểm mốc để canh khung "đường đến La Vang" (chế độ region): Cầu Trắng,
// giao Liên Xã × QL 1A, điểm đón trả khách — cùng khuôn viên.
const GUIDE_POINTS = [
  [16.740095, 107.192115],
  [16.716075, 107.212915],
  [16.710181, 107.194709],
]

const MAP_URLS = {
  tree: '/map/base-tree-4096.webp',
  notree: '/map/base-notree-4096.webp',
}

const ESRI_SAT = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

export default function MapView({
  mode, // 'normal' | 'calibrate' | 'editpoi'
  viewMode, // 'campus' (zoom tự do) | 'region' (đường vào, khóa zoom)
  layer, // 'tree' | 'notree' | 'none'
  overlayOpacity,
  cal,
  onCalChange,
  pois,
  selectedPoiId,
  onSelectPoi,
  onMapTap, // chạm nền ở chế độ region → vào khu hành hương
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

  const [zoom, setZoom] = useState(16.5)
  const lowZoom = viewMode === 'region'

  const divRef = useRef(null)
  const mapRef = useRef(null)
  const overlayRef = useRef(null)
  const satRef = useRef(null)
  const poiLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const accCircleRef = useRef(null)
  const cornerMarkersRef = useRef(null)
  const routeLayerRef = useRef(null)
  const regionRef = useRef(null)
  const labelLayerRef = useRef(null)
  const handlersRef = useRef({})

  // Góc sơ đồ vùng (tọa độ thật) đưa sang khung đang hiển thị
  const regionCorners = useMemo(() => {
    const toDisplay = (ll) => {
      const { u, v } = latLngToUv(cal, ll)
      const p = uvToLatLng(frame, u, v)
      return [p.lat, p.lng]
    }
    return {
      topleft: toDisplay(REGION.topleft),
      topright: toDisplay(REGION.topright),
      bottomleft: toDisplay(REGION.bottomleft),
    }
  }, [cal, frame])

  // callbacks/props mới nhất cho các listener gắn 1 lần
  handlersRef.current = { onSelectPoi, onUserInteract, onCalChange, onMapTap, cal, frame, mode, viewMode }

  // ---- Khởi tạo map (1 lần) ----
  useEffect(() => {
    const map = L.map(divRef.current, {
      zoomControl: false,
      attributionControl: false,
      maxZoom: 21,
      zoomSnap: 0.25,
      // Chặn cứng tại maxBounds — không cho kéo bật ra ngoài lộ mép nền
      maxBoundsViscosity: 1.0,
    })
    // Sơ đồ vùng nằm dưới ảnh bản đồ (overlayPane có zIndex 400)
    map.createPane('regionPane').style.zIndex = 340
    map.on('zoomend', () => setZoom(map.getZoom()))
    map.setView(campusCenter(frame), 16.5)
    map.on('dragstart', () => handlersRef.current.onUserInteract?.())
    map.on('click', (e) => {
      const h = handlersRef.current
      if (h.mode === 'editpoi') {
        const { u, v } = latLngToUv(h.frame, e.latlng)
        const txt = `u: ${u.toFixed(4)}, v: ${v.toFixed(4)}`
        console.log('[editpoi]', txt)
        navigator.clipboard?.writeText(txt).catch(() => {})
      } else if (h.viewMode === 'region' && h.onMapTap) {
        h.onMapTap()
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
      regionRef.current = null
      labelLayerRef.current = null
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

  // ---- Nhãn địa danh / tên đường trên bản đồ nền ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (labelLayerRef.current) {
      map.removeLayer(labelLayerRef.current)
      labelLayerRef.current = null
    }
    // Nhãn địa danh chỉ hiện ở chế độ "đường đến La Vang" (region)
    if (mode !== 'normal' || viewMode !== 'region') return
    // Nhãn khuôn viên lưu theo uv; nhãn từ OSM lưu theo lat/lng thật
    const place = (lb) =>
      lb.u !== undefined
        ? uvToLatLng(frame, lb.u, lb.v)
        : (() => {
            const { u, v } = latLngToUv(cal, { lat: lb.lat, lng: lb.lng })
            return uvToLatLng(frame, u, v)
          })()
    // Ưu tiên khi tránh chồng: mốc chỉ dẫn > quốc lộ > một chiều > tên đường > thị trấn > sông > làng
    const PRIO = { shrine: 100, place: 90, shield: 80, oneway: 70, road: 55, town: 50, river: 45, village: 25 }
    // Ước lượng kích thước nhãn (px) để tính chồng lấn theo layer-point (ổn định,
    // không phụ thuộc thời điểm render như đo getBoundingClientRect).
    const SIZE = {
      shrine: { fs: 12, px: 24, lines: 2 }, place: { fs: 11, px: 22 },
      shield: { fs: 11, px: 22 }, oneway: { fs: 9.5, px: 18 },
      road: { fs: 10.5, px: 6 }, town: { fs: 12.5, px: 8 },
      river: { fs: 11, px: 10 }, village: { fs: 10.5, px: 6 },
    }
    const z = map.getZoom()
    // Bỏ nhãn làng cho gọn (poster chỉ dẫn chỉ cần đường + mốc chính + thị trấn)
    const shown = REGION_LABELS
      .filter((lb) => lb.kind !== 'village')
      .map((lb) => ({ lb, prio: PRIO[lb.kind] ?? 40 }))
      .sort((a, b) => b.prio - a.prio)

    const placedRects = []
    const kept = []
    for (const { lb } of shown) {
      const p = map.project(place(lb), z)
      const s = SIZE[lb.kind] || SIZE.village
      const w = Math.min(lb.text.length * s.fs * 0.56 + s.px, s.lines ? 150 : 999)
      const h = s.fs * (s.lines || 1) + 10
      const rect = { left: p.x - w / 2, right: p.x + w / 2, top: p.y - h / 2, bottom: p.y + h / 2 }
      const hit = placedRects.some((r) =>
        !(rect.right + 5 < r.left || rect.left - 5 > r.right || rect.bottom + 5 < r.top || rect.top - 5 > r.bottom))
      if (!hit) { placedRects.push(rect); kept.push(lb) }
    }

    labelLayerRef.current = L.layerGroup(
      kept.map((lb) =>
        L.marker(place(lb), {
          interactive: false, keyboard: false,
          icon: L.divIcon({
            className: '',
            html: `<div class="region-label region-label-${lb.kind}">${lb.text}</div>`,
            iconSize: [220, 20], iconAnchor: [110, 10],
          }),
        })
      )
    ).addTo(map)
  }, [mode, viewMode, zoom, frame, cal])

  // ---- Ảnh bản đồ khuôn viên (luôn hiện — hình dán trong sơ đồ đã bị xóa) ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (overlayRef.current) {
      map.removeLayer(overlayRef.current)
      overlayRef.current = null
    }
    if (layer !== 'none') {
      overlayRef.current = rotatedImageOverlay(
        MAP_URLS[layer], frame.topleft, frame.topright, frame.bottomleft,
        { opacity: overlayOpacity }
      ).addTo(map)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [layer])

  // corners/opacity thay đổi → cập nhật overlay hiện có
  useEffect(() => {
    overlayRef.current?.setCorners(frame.topleft, frame.topright, frame.bottomleft)
  }, [frame])
  useEffect(() => {
    overlayRef.current?.setOpacity(overlayOpacity)
  }, [overlayOpacity])

  // ---- Điều khiển khung nhìn theo 2 chế độ ----
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    if (mode !== 'normal') { map.setMaxBounds(null); map.setMinZoom(13); map.setMaxZoom(21); return }

    if (viewMode === 'region') {
      // Khóa zoom: canh khít khung "đường đến La Vang" — gồm cả 4 góc khuôn viên
      // (để không bị cắt), các mốc đường vào và bãi đỗ xe.
      const toDisp = (ll) => {
        const { u, v } = latLngToUv(cal, { lat: ll[0], lng: ll[1] })
        return uvToLatLng(frame, u, v)
      }
      const b = L.latLngBounds([
        uvToLatLng(frame, 0, 0), uvToLatLng(frame, 1, 0),
        uvToLatLng(frame, 0, 1), uvToLatLng(frame, 1, 1),
        uvToLatLng(frame, -1.8872, 0.8968), // bãi đỗ xe
        ...GUIDE_POINTS.map(toDisp),
      ]).pad(0.06)
      // Nới min/maxZoom trước khi tính, nếu không getBoundsZoom bị kẹp ở minZoom
      // của campus (~16.75) và không zoom xa ra được để thấy hết vùng.
      map.setMinZoom(1); map.setMaxZoom(21)
      const pad = L.point(30, 30)
      const z = map.getBoundsZoom(b, false, pad)
      map.setMinZoom(z); map.setMaxZoom(z)
      map.setMaxBounds(b.pad(0.3))
      map.setView(b.getCenter(), z, { animate: false })
      return
    }

    // Campus: zoom tự do, không zoom xa quá khỏi khuôn viên.
    const core = L.latLngBounds([
      uvToLatLng(frame, 0.03, 0.03), uvToLatLng(frame, 0.97, 0.03),
      uvToLatLng(frame, 0.03, 0.97), uvToLatLng(frame, 0.97, 0.97),
    ])
    const apply = () => {
      const zmin = map.getBoundsZoom(core) // zoom nhỏ nhất còn thấy hết khuôn viên
      map.setMinZoom(zmin); map.setMaxZoom(21)
      map.setMaxBounds(L.latLngBounds(
        uvToLatLng(frame, -0.2, -0.15), uvToLatLng(frame, 1.2, 1.15)
      ))
    }
    apply()
    map.fitBounds(core, { animate: false })
    map.on('resize', apply)
    return () => map.off('resize', apply)
  }, [mode, viewMode, frame, cal])

  // ---- POI markers ----
  useEffect(() => {
    const group = poiLayerRef.current
    if (!group) return
    group.clearLayers()
    // Ở chế độ region chỉ hiện nhãn chỉ dẫn (đã đủ), ẩn hết marker POI cho gọn.
    const visible = lowZoom ? [] : pois
    const map = mapRef.current

    // Chọn POI kèm chữ: luôn hiện chấm. Ở zoom mặc định chỉ ĐIỂM NỔI BẬT mới có
    // title; zoom gần (>= REVEAL_ZOOM) thì điểm thường cũng hiện dần (né chồng).
    const REVEAL_ZOOM = 18.3
    const CAT_PRIO = { hanhhuong: 5, toanha: 4, hotro: 4, giaothong: 3, tienich: 2 }
    const z = map ? map.getZoom() : 17
    const ranked = visible
      .filter((poi) => poi.id === selectedPoiId || poi.prominent || z >= REVEAL_ZOOM)
      .map((poi) => ({
        poi,
        prio: (poi.id === selectedPoiId ? 1000 : 0) + (poi.prominent ? 100 : 0) + (CAT_PRIO[poi.cat] ?? 1),
      }))
      .sort((a, b) => b.prio - a.prio)
    const tagRects = []
    const withTag = new Set()
    for (const { poi } of ranked) {
      if (!map) break
      const p = map.project(uvToLatLng(frame, poi.u, poi.v), z)
      const w = poi.name.length * 6.4 + 44 // chấm + chữ (px)
      const rect = { left: p.x - 16, right: p.x + w - 16, top: p.y - 12, bottom: p.y + 12 }
      const hit = tagRects.some((r) =>
        !(rect.right + 3 < r.left || rect.left - 3 > r.right || rect.bottom + 2 < r.top || rect.top - 2 > r.bottom))
      if (!hit || poi.id === selectedPoiId) { tagRects.push(rect); withTag.add(poi.id) }
    }

    for (const poi of visible) {
      const color = CATEGORIES[poi.cat]?.color || '#5f6368'
      const selected = poi.id === selectedPoiId
      const tag = withTag.has(poi.id)
      const icon = L.divIcon({
        className: '',
        html: `<div class="poi-chip${selected ? ' sel' : ''}" style="--c:${color}">
            <span class="poi-dot">${iconSvg(poi.icon, { size: 17, color: selected ? '#fff' : color })}</span>
            ${tag ? `<span class="poi-tag">${poi.name}</span>` : ''}
          </div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 15],
      })
      // Marker CÓ title phải nằm trên lớp chấm-không-title để pill không bị đè.
      // (Leaflet xếp z theo vĩ độ; +offset lớn đẩy pill lên trên mọi chấm.)
      const zOff = selected ? 20000 : tag ? 10000 : 0
      const m = L.marker(uvToLatLng(frame, poi.u, poi.v), { icon, title: poi.name, zIndexOffset: zOff })
      m.on('click', () => handlersRef.current.onSelectPoi?.(poi))
      group.addLayer(m)
    }
  }, [pois, frame, selectedPoiId, lowZoom, zoom])

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
