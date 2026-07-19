import { useMemo, useState } from 'react'
import { CATEGORIES, POIS } from '../data/pois.js'
import { straightDistance, formatDistance } from '../map/geo.js'
import Icon from './Icon.jsx'

// Màn hình đầu: chọn địa điểm muốn tới, hoặc mở bản đồ tổng quan.
export default function HomeScreen({ cal, position, onPick, onOverview, geoStatus }) {
  const [query, setQuery] = useState('')

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const withDist = POIS.map((p) => ({
      ...p,
      dist: position ? straightDistance(cal, p, position) : null,
    })).filter((p) => !q || p.name.toLowerCase().includes(q))

    return Object.entries(CATEGORIES)
      .map(([key, meta]) => ({
        key,
        meta,
        items: withDist
          .filter((p) => p.cat === key)
          .sort((a, b) => (a.dist == null ? 0 : a.dist - b.dist)),
      }))
      .filter((g) => g.items.length > 0)
  }, [cal, position, query])

  return (
    <div className="home">
      <header className="hero">
        <div className="hero-photo" />
        <div className="hero-caption">
          <p className="hero-eyebrow">Trung tâm hành hương</p>
          <h1 className="hero-title">Đức Mẹ La&nbsp;Vang</h1>
          <div className="hero-rule" />
          <p className="hero-sub">La Vang · Quảng Trị</p>
        </div>
      </header>

      <div className="home-top">
        <div className="searchbar">
          <Icon name="Search" size={22} />
          <input
            type="search"
            placeholder="Tìm địa điểm"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="icon-only" onClick={() => setQuery('')} aria-label="Xóa">
              <Icon name="Close" size={20} />
            </button>
          )}
        </div>

        <button className="btn-tonal" onClick={onOverview}>
          <Icon name="Map" size={20} />
          Xem toàn bộ bản đồ
        </button>

        <GpsNote position={position} geoStatus={geoStatus} />
      </div>

      {groups.length === 0 && <div className="home-empty">Không tìm thấy địa điểm nào</div>}

      {groups.map((g) => (
        <section key={g.key} className="home-group">
          <h2>{g.meta.label}</h2>
          {g.items.map((p) => (
            <button
              key={p.id}
              className="place-row"
              onClick={() => onPick(p)}
              style={{ '--c': g.meta.color, '--c-bg': `${g.meta.color}1f` }}
            >
              <span className="place-avatar">
                <Icon name={p.icon} size={22} />
              </span>
              <span className="place-body">
                <span className="place-name">{p.name}</span>
                <span className="place-meta">
                  {p.dist != null ? (
                    <>
                      <b>{formatDistance(p.dist)}</b> · {g.meta.label}
                    </>
                  ) : (
                    g.meta.label
                  )}
                </span>
              </span>
              <span className="place-go">
                <Icon name="DirectionsWalk" size={20} />
              </span>
            </button>
          ))}
        </section>
      ))}
    </div>
  )
}

function GpsNote({ position, geoStatus }) {
  if (position) {
    return (
      <div className="gps-note">
        <span className="gps-dot" />
        Đã có vị trí của bạn — địa điểm xếp theo khoảng cách gần nhất
      </div>
    )
  }
  if (geoStatus === 'denied') {
    return (
      <div className="gps-note warn">
        <span className="gps-dot" />
        Chưa có quyền vị trí. Bật quyền Vị trí để được chỉ đường.
      </div>
    )
  }
  return (
    <div className="gps-note">
      <span className="gps-dot" />
      Đang lấy vị trí GPS của bạn…
    </div>
  )
}
