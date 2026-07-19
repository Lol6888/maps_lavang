import { useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import { CATEGORIES, POIS } from './data/pois.js'
import { useGeolocation, distMeters } from './hooks/useGeolocation.js'
import {
  loadCalibration, saveCalibration, clearCalibration,
  DEFAULT_CALIBRATION, campusCenter, uvToLatLng,
} from './map/calibration.js'

const params = new URLSearchParams(window.location.search)
const MODE = params.has('calibrate') ? 'calibrate' : params.has('editpoi') ? 'editpoi' : 'normal'
const OUT_OF_CAMPUS_M = 1500

export default function App() {
  const [cal, setCal] = useState(loadCalibration)
  const [layer, setLayer] = useState('tree')
  const [overlayOpacity, setOverlayOpacity] = useState(MODE === 'calibrate' ? 0.7 : 1)
  const [activeCats, setActiveCats] = useState(() => new Set(Object.keys(CATEGORIES)))
  const [selectedPoi, setSelectedPoi] = useState(null)
  const [geoEnabled, setGeoEnabled] = useState(false)
  const [follow, setFollow] = useState(false)

  const geo = useGeolocation(geoEnabled)
  const pos = geo.position

  const visiblePois = useMemo(
    () => (MODE === 'calibrate' ? [] : POIS.filter((p) => activeCats.has(p.cat))),
    [activeCats]
  )

  const outOfCampus = useMemo(() => {
    if (!pos) return false
    const c = campusCenter(cal)
    return distMeters(pos, { lat: c.lat, lng: c.lng }) > OUT_OF_CAMPUS_M
  }, [pos, cal])

  const toggleCat = (key) => {
    setActiveCats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const onLocate = () => {
    if (!geoEnabled) {
      setGeoEnabled(true)
      setFollow(true)
    } else {
      setFollow((f) => !f)
    }
  }

  return (
    <div className="app">
      <MapView
        mode={MODE}
        layer={layer}
        overlayOpacity={overlayOpacity}
        cal={cal}
        onCalChange={setCal}
        pois={visiblePois}
        selectedPoiId={selectedPoi?.id ?? null}
        onSelectPoi={setSelectedPoi}
        position={pos}
        follow={follow}
        onUserInteract={() => setFollow(false)}
      />

      {MODE === 'normal' && (
        <>
          <header className="topbar">
            <h1>Bản đồ La Vang</h1>
            <div className="chips">
              {Object.entries(CATEGORIES).map(([key, c]) => (
                <button
                  key={key}
                  className={`chip${activeCats.has(key) ? ' chip-on' : ''}`}
                  style={{ '--c': c.color }}
                  onClick={() => toggleCat(key)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </header>

          <div className="fabs">
            <button
              className={`fab layer-fab`}
              title="Đổi lớp bản đồ"
              onClick={() => setLayer((l) => (l === 'tree' ? 'notree' : 'tree'))}
            >
              {layer === 'tree' ? '🌳' : '🗺️'}
            </button>
            <button
              className={`fab locate-fab${follow ? ' fab-on' : ''}`}
              title="Vị trí của tôi"
              onClick={onLocate}
            >
              ➤
            </button>
          </div>

          {geo.status === 'denied' && (
            <div className="banner banner-warn">
              Bạn đã từ chối quyền vị trí. Hãy bật lại quyền Vị trí cho trang này trong cài đặt trình duyệt.
            </div>
          )}
          {geo.status === 'unavailable' && (
            <div className="banner banner-warn">Thiết bị không lấy được vị trí GPS.</div>
          )}
          {geo.status === 'watching' && !pos && (
            <div className="banner">Đang dò tín hiệu GPS…</div>
          )}
          {pos?.stale && (
            <div className="banner">Tín hiệu GPS yếu (±{Math.round(pos.accuracy)}m) — vị trí có thể lệch.</div>
          )}
          {outOfCampus && (
            <div className="banner">Bạn đang ở ngoài khu vực Trung tâm hành hương La Vang.</div>
          )}

          {selectedPoi && (
            <div className="sheet">
              <div className="sheet-head">
                <span className="sheet-icon" style={{ '--c': CATEGORIES[selectedPoi.cat].color }}>
                  {selectedPoi.icon}
                </span>
                <div>
                  <div className="sheet-name">{selectedPoi.name}</div>
                  <div className="sheet-cat">{CATEGORIES[selectedPoi.cat].label}</div>
                </div>
                <button className="sheet-close" onClick={() => setSelectedPoi(null)}>✕</button>
              </div>
              {pos && <SheetDistance cal={cal} poi={selectedPoi} pos={pos} />}
            </div>
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

function SheetDistance({ cal, poi, pos }) {
  const ll = uvToLatLng(cal, poi.u, poi.v)
  const d = distMeters(pos, { lat: ll.lat, lng: ll.lng })
  const txt = d >= 1000 ? `${(d / 1000).toFixed(1)} km` : `${Math.round(d)} m`
  return <div className="sheet-dist">📍 Cách bạn khoảng {txt}</div>
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
