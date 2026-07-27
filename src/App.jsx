import { useEffect, useMemo, useState } from 'react'
import MapView from './components/MapView.jsx'
import PlacesPanel from './components/PlacesPanel.jsx'
import DetailPopup from './components/DetailPopup.jsx'
import Splash from './components/Splash.jsx'
import Icon from './components/Icon.jsx'
import { CATEGORIES, POIS } from './data/pois.js'
import { REGION } from './data/region.js'
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

const MOCK_POS = (() => {
  const raw = params.get('mock')
  if (!raw) return null
  const [lat, lng] = raw.split(',').map(Number)
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null
})()

export default function App() {
  const [cal, setCal] = useState(loadCalibration)
  // 'splash' → 'campus' (nội khu, zoom tự do) ↔ 'region' (đường vào, khóa zoom)
  const [screen, setScreen] = useState(MODE === 'normal' ? 'splash' : 'campus')
  const [destination, setDestination] = useState(null)
  const [detailPoi, setDetailPoi] = useState(null)
  const [showPlaces, setShowPlaces] = useState(false)
  const [layer, setLayer] = useState('tree')
  const [overlayOpacity, setOverlayOpacity] = useState(MODE === 'calibrate' ? 0.7 : 1)
  const [follow, setFollow] = useState(false)

  const geo = useGeolocation(MODE !== 'calibrate', MOCK_POS)
  const pos = geo.position

  const userUV = useMemo(() => (pos ? latLngToUv(cal, { lat: pos.lat, lng: pos.lng }) : null), [pos, cal])
  const insideCampus =
    userUV && userUV.u > -0.03 && userUV.u < 1.03 && userUV.v > -0.03 && userUV.v < 1.03
  const userCellKey = userUV ? `${Math.round(userUV.u * MASK_W)},${Math.round(userUV.v * MASK_H)}` : null

  const routeInfo = useMemo(() => {
    if (!destination || !userUV) return null
    const inRange = (t) => t.u > -0.05 && t.u < 1.05 && t.v > -0.05 && t.v < 1.05
    if (!inRange(userUV) || !inRange(destination)) {
      return {
        path: [{ u: userUV.u, v: userUV.v }, { u: destination.u, v: destination.v }],
        meters: pos ? straightDistance(cal, destination, pos) : 0,
        dashed: true,
      }
    }
    const r = findRoute({ u: userUV.u, v: userUV.v }, { u: destination.u, v: destination.v })
    if (!r) return null
    return { path: r.path, meters: routeLength(cal, r.path), dashed: false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [destination, userCellKey, cal])

  const arrived = routeInfo && routeInfo.meters < ARRIVED_M

  const visiblePois = useMemo(() => {
    if (MODE === 'calibrate') return []
    if (destination) return [destination]
    return POIS
  }, [destination])

  useEffect(() => { if (destination) setFollow(false) }, [destination])

  // ---- Điều hướng ----
  const openDetail = (poi) => { setShowPlaces(false); setDetailPoi(poi) }
  const startRoute = (poi) => { setDetailPoi(null); setDestination(poi); setScreen('campus') }
  const exitGuide = () => setDestination(null)
  const goRegion = () => { setDetailPoi(null); setDestination(null); setScreen('region') }
  const goCampus = () => setScreen('campus')

  if (MODE === 'normal' && screen === 'splash') {
    return <Splash onDone={() => setScreen('campus')} />
  }

  const guiding = MODE === 'normal' && !!destination
  const viewMode = screen === 'region' ? 'region' : 'campus'
  const appClass = `app${guiding ? ' guiding' : ''}`

  return (
    <div className={appClass}>
      <MapView
        mode={MODE}
        viewMode={viewMode}
        layer={layer}
        overlayOpacity={overlayOpacity}
        cal={cal}
        onCalChange={setCal}
        pois={visiblePois}
        selectedPoiId={detailPoi?.id ?? destination?.id ?? null}
        onSelectPoi={(p) => (p ? openDetail(p) : null)}
        onMapTap={viewMode === 'region' ? goCampus : undefined}
        position={pos}
        follow={follow}
        onUserInteract={() => setFollow(false)}
        route={routeInfo?.path ?? null}
        routeDashed={routeInfo?.dashed ?? false}
        fitKey={destination?.id ?? null}
      />

      {MODE === 'normal' && viewMode === 'campus' && (
        <>
          {guiding ? (
            <GuideBar destination={destination} onExit={exitGuide} onRegion={goRegion} />
          ) : (
            <div className="map-top">
              <button className="pill-btn" onClick={goRegion}>
                <Icon name="DirectionsBus" size={20} />
                <span>Đường đến La Vang</span>
              </button>
            </div>
          )}

          <div className="fabs">
            {!guiding && (
              <button className="fab" title="Tìm địa điểm" onClick={() => setShowPlaces(true)}>
                <Icon name="Search" size={22} />
              </button>
            )}
            <button
              className={`fab${layer === 'notree' ? ' fab-on' : ''}`}
              title={layer === 'tree' ? 'Ẩn cây' : 'Hiện cây'}
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
            <GuideCard routeInfo={routeInfo} arrived={arrived} hasPosition={!!pos} insideCampus={insideCampus} />
          )}
        </>
      )}

      {MODE === 'normal' && viewMode === 'region' && (
        <RegionChrome onEnter={goCampus} />
      )}

      {MODE === 'normal' && showPlaces && (
        <PlacesPanel cal={cal} position={pos} geoStatus={geo.status}
          onPick={openDetail} onClose={() => setShowPlaces(false)} />
      )}

      {MODE === 'normal' && detailPoi && (
        <DetailPopup poi={detailPoi} cal={cal} pos={pos}
          onClose={() => setDetailPoi(null)} onRoute={() => startRoute(detailPoi)} />
      )}

      {MODE === 'normal' && <div className="attribution">{REGION.attribution}</div>}

      {MODE === 'calibrate' && (
        <CalibratePanel cal={cal} layer={layer} setLayer={setLayer}
          opacity={overlayOpacity} setOpacity={setOverlayOpacity}
          onSave={() => saveCalibration(cal)}
          onClear={() => { clearCalibration(); setCal(DEFAULT_CALIBRATION) }} />
      )}

      {MODE === 'editpoi' && (
        <div className="banner">Chế độ lấy tọa độ POI: chạm vào bản đồ → u,v được copy vào clipboard.</div>
      )}
    </div>
  )
}

function GuideBar({ destination, onExit, onRegion }) {
  return (
    <div className="map-top">
      <div className="top-pill glass">
        <button className="icon-btn" onClick={onExit} aria-label="Kết thúc chỉ đường">
          <Icon name="ArrowBack" size={22} />
        </button>
        <div className="pill-text">
          <div className="pill-title">{destination.name}</div>
          <div className="pill-sub">Đi bộ từ vị trí của bạn</div>
        </div>
        <button className="icon-btn" onClick={onRegion} aria-label="Đường đến La Vang">
          <Icon name="DirectionsBus" size={20} />
        </button>
      </div>
    </div>
  )
}

function RegionChrome({ onEnter }) {
  return (
    <>
      <div className="map-top">
        <div className="region-title glass">
          <Icon name="DirectionsBus" size={20} />
          <span>Đường xe đến Trung tâm La Vang</span>
        </div>
      </div>
      <button className="enter-campus" onClick={onEnter}>
        <Icon name="Map" size={20} />
        Vào bản đồ khu hành hương
      </button>
    </>
  )
}

function GuideCard({ routeInfo, arrived, hasPosition, insideCampus }) {
  return (
    <div className="guide-card glass">
      <div className="guide-row">
        <span className="guide-mode">
          <Icon name="DirectionsWalk" size={24} />
        </span>
        <div className="guide-info">
          {arrived ? (
            <div className="guide-time arrived">Bạn đã tới nơi</div>
          ) : routeInfo?.dashed ? (
            <>
              <div className="guide-time">{formatDistance(routeInfo.meters)}</div>
              <div className="guide-dist">đường chim bay · điểm ngoài khuôn viên, đi theo biển chỉ dẫn</div>
            </>
          ) : routeInfo ? (
            <>
              <div className="guide-time">{walkMinutes(routeInfo.meters)} phút</div>
              <div className="guide-dist">{formatDistance(routeInfo.meters)} · đi bộ</div>
            </>
          ) : (
            <div className="guide-wait">
              {!hasPosition ? 'Đang chờ vị trí GPS…' : !insideCampus ? 'Bạn đang ở ngoài khuôn viên' : 'Chưa tìm được lối đi'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Banners({ geo, pos, insideCampus, guiding, routeInfo }) {
  const items = []
  if (geo.status === 'denied')
    items.push(['warn', 'Bạn đã từ chối quyền vị trí. Hãy bật lại quyền Vị trí cho trang này.'])
  else if (geo.status === 'unavailable') items.push(['warn', 'Thiết bị không lấy được vị trí GPS.'])
  else if (!pos) items.push(['', 'Đang dò tín hiệu GPS…'])
  else if (pos.stale) items.push(['', `Tín hiệu GPS yếu (±${Math.round(pos.accuracy)}m).`])
  if (pos && !insideCampus) items.push(['', 'Bạn đang ở ngoài Trung tâm hành hương La Vang.'])
  else if (guiding && pos && insideCampus && !routeInfo) items.push(['warn', 'Không tìm được lối đi bộ tới điểm này.'])

  return items.map(([kind, text], i) => (
    <div key={i} className={`banner${kind ? ` banner-${kind}` : ''}`} style={{ '--i': i }}>{text}</div>
  ))
}

function CalibratePanel({ cal, layer, setLayer, opacity, setOpacity, onSave, onClear }) {
  const [open, setOpen] = useState(false)
  const [showJson, setShowJson] = useState(false)
  const json = JSON.stringify(cal, null, 2)
  return (
    <div className="cal-panel">
      <button className="cal-head" onClick={() => setOpen((o) => !o)}>
        <Icon name="Tune" size={20} />
        <span>Căn chỉnh bản đồ</span>
        <Icon name={open ? 'ExpandMore' : 'ExpandLess'} size={22} />
      </button>
      {open && (
        <div className="cal-body">
          <label className="cal-row">
            <span className="cal-label">Độ mờ ảnh</span>
            <input type="range" min="0.2" max="1" step="0.05" value={opacity}
              onChange={(e) => setOpacity(Number(e.target.value))} />
            <span className="cal-value">{Math.round(opacity * 100)}%</span>
          </label>
          <div className="cal-row">
            {['tree', 'notree', 'none'].map((l) => (
              <button key={l} className={`chip${layer === l ? ' chip-on' : ''}`} onClick={() => setLayer(l)}>
                {l === 'tree' ? 'Có cây' : l === 'notree' ? 'Không cây' : 'Ẩn ảnh'}
              </button>
            ))}
          </div>
          <div className="cal-row">
            <button className="btn" onClick={() => navigator.clipboard?.writeText(json)}><Icon name="ContentCopy" size={16} /> Copy</button>
            <button className="btn btn-primary" onClick={onSave}><Icon name="Save" size={16} /> Lưu</button>
            <button className="btn" onClick={onClear}><Icon name="RestartAlt" size={16} /> Mặc định</button>
            <button className="btn" onClick={() => setShowJson((s) => !s)}>JSON</button>
          </div>
          {showJson && <pre className="cal-json">{json}</pre>}
        </div>
      )}
    </div>
  )
}
