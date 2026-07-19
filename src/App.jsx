import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import HomeScreen from './components/HomeScreen.jsx'
import Icon from './components/Icon.jsx'
import { CATEGORIES, POIS } from './data/pois.js'
import { MASK_W, MASK_H } from './data/walkmask.js'
import { findRoute } from './map/router.js'
import { useGeolocation } from './hooks/useGeolocation.js'
import { routeLength, straightDistance, formatDistance, walkMinutes } from './map/geo.js'
import {
  loadCalibration, saveCalibration, clearCalibration,
  DEFAULT_CALIBRATION, latLngToUv,
} from './map/calibration.js'

const params = new URLSearchParams(window.location.search)
const MODE = params.has('calibrate') ? 'calibrate' : params.has('editpoi') ? 'editpoi' : 'normal'
const ARRIVED_M = 15

// ?mock=16.7069,107.1954 — giả lập vị trí để thử/demo khi không ở tại chỗ
const MOCK_POS = (() => {
  const raw = params.get('mock')
  if (!raw) return null
  const [lat, lng] = raw.split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
})()

export default function App() {
  const [cal, setCal] = useState(loadCalibration)
  const [screen, setScreen] = useState(MODE === 'normal' ? 'home' : 'map')
  const [destination, setDestination] = useState(null)
  const [layer, setLayer] = useState('tree')
  const [overlayOpacity, setOverlayOpacity] = useState(MODE === 'calibrate' ? 0.7 : 1)
  const [activeCats, setActiveCats] = useState(() => new Set(Object.keys(CATEGORIES)))
  const [selectedPoi, setSelectedPoi] = useState(null)
  const [follow, setFollow] = useState(false)

  // Ứng dụng dẫn đường: cần vị trí ngay từ đầu để xếp danh sách theo khoảng cách
  const geo = useGeolocation(MODE !== 'calibrate', MOCK_POS)
  const pos = geo.position

  // Vị trí người dùng trong hệ tọa độ ảnh
  const userUV = useMemo(() => (pos ? latLngToUv(cal, { lat: pos.lat, lng: pos.lng }) : null), [pos, cal])
  const insideCampus =
    userUV && userUV.u > -0.03 && userUV.u < 1.03 && userUV.v > -0.03 && userUV.v < 1.03

  // Chỉ tính lại đường đi khi người dùng đổi ô lưới (~1.2m)
  const userCellKey = userUV ? `${Math.round(userUV.u * MASK_W)},${Math.round(userUV.v * MASK_H)}` : null

  const routeInfo = useMemo(() => {
    if (!destination || !userUV || !insideCampus) return null
    const r = findRoute({ u: userUV.u, v: userUV.v }, { u: destination.u, v: destination.v })
    if (!r) return null
    return { path: r.path, meters: routeLength(cal, r.path) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, userCellKey, insideCampus, cal])

  const arrived = routeInfo && routeInfo.meters < ARRIVED_M

  const visiblePois = useMemo(() => {
    if (MODE === 'calibrate') return []
    if (destination) return [destination]
    return POIS.filter((p) => activeCats.has(p.cat))
  }, [activeCats, destination])

  // Vào chế độ dẫn đường thì thôi bám theo vị trí, để zoom vừa khít đường đi
  useEffect(() => {
    if (destination) setFollow(false)
  }, [destination])

  const goHome = () => {
    setDestination(null)
    setSelectedPoi(null)
    setScreen('home')
  }
  const pickDestination = (poi) => {
    setSelectedPoi(null)
    setDestination(poi)
    setScreen('map')
  }
  const showOverview = () => {
    setDestination(null)
    setScreen('map')
  }

  const toggleCat = (key) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (MODE === 'normal' && screen === 'home') {
    return (
      <HomeScreen
        cal={cal}
        position={pos}
        geoStatus={geo.status}
        onPick={pickDestination}
        onOverview={showOverview}
      />
    )
  }

  const guiding = MODE === 'normal' && !!destination
  const appClass = `app${guiding ? ' guiding' : ''}${!guiding && selectedPoi ? ' has-sheet' : ''}`

  return (
    <div className={appClass}>
      <MapView
        mode={MODE}
        layer={layer}
        overlayOpacity={overlayOpacity}
        cal={cal}
        onCalChange={setCal}
        pois={visiblePois}
        selectedPoiId={selectedPoi?.id ?? destination?.id ?? null}
        onSelectPoi={setSelectedPoi}
        position={pos}
        follow={follow}
        onUserInteract={() => setFollow(false)}
        route={routeInfo?.path ?? null}
        fitKey={destination?.id ?? null}
      />

      {MODE === 'normal' && (
        <>
          <div className="map-top">
            <div className="top-pill">
              <button className="icon-btn" onClick={goHome} aria-label="Quay lại danh sách">
                <Icon name="ArrowBack" size={22} />
              </button>
              <div className="pill-text">
                <div className="pill-title">{guiding ? destination.name : 'Bản đồ tổng quan'}</div>
                {guiding && <div className="pill-sub">Đi bộ từ vị trí của bạn</div>}
              </div>
              {guiding && (
                <button className="icon-btn" onClick={showOverview} aria-label="Xem toàn bộ bản đồ">
                  <Icon name="Map" size={22} />
                </button>
              )}
            </div>

            {!guiding && (
              <div className="chips">
                {Object.entries(CATEGORIES).map(([key, c]) => (
                  <button
                    key={key}
                    className={`chip${activeCats.has(key) ? ' chip-on' : ''}`}
                    style={{ '--c': c.color }}
                    onClick={() => toggleCat(key)}
                  >
                    <Icon name={c.icon} size={18} />
                    {c.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="fabs">
            <button
              className={`fab${layer === 'notree' ? ' fab-on' : ''}`}
              title={layer === 'tree' ? 'Ẩn cây để xem rõ lối đi' : 'Hiện cây'}
              onClick={() => setLayer((l) => (l === 'tree' ? 'notree' : 'tree'))}
            >
              <Icon name={layer === 'tree' ? 'Park' : 'Layers'} size={22} />
            </button>
            <button
              className={`fab${follow ? ' fab-on' : ''}`}
              title="Vị trí của tôi"
              onClick={() => setFollow((f) => !f)}
            >
              <Icon name={follow ? 'MyLocation' : 'Navigation'} size={22} />
            </button>
          </div>

          <Banners geo={geo} pos={pos} insideCampus={insideCampus} guiding={guiding} routeInfo={routeInfo} />

          {guiding && (
            <GuideCard
              routeInfo={routeInfo}
              arrived={arrived}
              hasPosition={!!pos}
              insideCampus={insideCampus}
            />
          )}

          {!guiding && selectedPoi && (
            <PlaceSheet
              poi={selectedPoi}
              cal={cal}
              pos={pos}
              onClose={() => setSelectedPoi(null)}
              onRoute={() => pickDestination(selectedPoi)}
            />
          )}
        </>
      )}

      {MODE === 'calibrate' && (
        <CalibratePanel
          cal={cal}
          layer={layer}
          setLayer={setLayer}
          opacity={overlayOpacity}
          setOpacity={setOverlayOpacity}
          onSave={() => saveCalibration(cal)}
          onClear={() => { clearCalibration(); setCal(DEFAULT_CALIBRATION) }}
        />
      )}

      {MODE === 'editpoi' && (
        <div className="banner">Chế độ lấy tọa độ POI: chạm vào bản đồ → u,v được copy vào clipboard.</div>
      )}
    </div>
  )
}

function GuideCard({ routeInfo, arrived, hasPosition, insideCampus }) {
  return (
    <div className="guide-card">
      <div className="sheet-handle" />
      <div className="guide-row">
        <span className="guide-mode">
          <Icon name="DirectionsWalk" size={24} />
        </span>
        <div className="guide-info">
          {arrived ? (
            <div className="guide-time arrived">Bạn đã tới nơi</div>
          ) : routeInfo ? (
            <>
              <div className="guide-time">{walkMinutes(routeInfo.meters)} phút</div>
              <div className="guide-dist">{formatDistance(routeInfo.meters)} · đi bộ</div>
            </>
          ) : (
            <div className="guide-wait">
              {!hasPosition
                ? 'Đang chờ vị trí GPS…'
                : !insideCampus
                  ? 'Bạn đang ở ngoài khuôn viên'
                  : 'Chưa tìm được lối đi'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function PlaceSheet({ poi, cal, pos, onClose, onRoute }) {
  const cat = CATEGORIES[poi.cat]
  return (
    <div className="sheet">
      <div className="sheet-handle" />
      <div className="sheet-head">
        <div className="sheet-title">
          <div className="sheet-name">{poi.name}</div>
          <div className="sheet-meta">
            {pos ? (
              <>
                <b>{formatDistance(straightDistance(cal, poi, pos))}</b> · {cat.label}
              </>
            ) : (
              cat.label
            )}
          </div>
        </div>
        <button className="icon-btn" onClick={onClose} aria-label="Đóng">
          <Icon name="Close" size={22} />
        </button>
      </div>
      <div className="sheet-actions">
        <button className="btn-filled" onClick={onRoute}>
          <Icon name="DirectionsWalk" size={20} />
          Chỉ đường
        </button>
      </div>
    </div>
  )
}

function Banners({ geo, pos, insideCampus, guiding, routeInfo }) {
  const items = []
  if (geo.status === 'denied')
    items.push(['warn', 'Bạn đã từ chối quyền vị trí. Hãy bật lại quyền Vị trí cho trang này trong cài đặt trình duyệt.'])
  else if (geo.status === 'unavailable') items.push(['warn', 'Thiết bị không lấy được vị trí GPS.'])
  else if (!pos) items.push(['', 'Đang dò tín hiệu GPS…'])
  else if (pos.stale) items.push(['', `Tín hiệu GPS yếu (±${Math.round(pos.accuracy)}m) — vị trí có thể lệch.`])

  if (pos && !insideCampus)
    items.push(['', 'Bạn đang ở ngoài Trung tâm hành hương La Vang.'])
  else if (guiding && pos && insideCampus && !routeInfo)
    items.push(['warn', 'Không tìm được lối đi bộ tới điểm này.'])

  return items.map(([kind, text], i) => (
    <div key={i} className={`banner${kind ? ` banner-${kind}` : ''}`} style={{ '--i': i }}>
      {text}
    </div>
  ))
}

function CalibratePanel({ cal, layer, setLayer, opacity, setOpacity, onSave, onClear }) {
  const json = JSON.stringify(cal, null, 2)
  return (
    <div className="cal-panel">
      <div className="cal-title">Căn chỉnh bản đồ</div>
      <div className="cal-help">
        Kéo <b>TL / TR / BL</b> để khớp ảnh với vệ tinh. Kéo <b>✥</b> để dời toàn bộ.
      </div>
      <label className="cal-row">
        Độ mờ ảnh: {Math.round(opacity * 100)}%
        <input type="range" min="0.2" max="1" step="0.05" value={opacity}
          onChange={(e) => setOpacity(Number(e.target.value))} />
      </label>
      <div className="cal-row cal-layers">
        {['tree', 'notree', 'none'].map((l) => (
          <button key={l} className={`chip${layer === l ? ' chip-on' : ''}`} onClick={() => setLayer(l)}>
            {l === 'tree' ? 'Có cây' : l === 'notree' ? 'Không cây' : 'Ẩn ảnh'}
          </button>
        ))}
      </div>
      <div className="cal-row cal-actions">
        <button className="btn" onClick={() => navigator.clipboard?.writeText(json)}>Copy JSON</button>
        <button className="btn btn-primary" onClick={onSave}>Lưu vào máy</button>
        <button className="btn" onClick={onClear}>Xóa / mặc định</button>
      </div>
      <pre className="cal-json">{json}</pre>
    </div>
  )
}
