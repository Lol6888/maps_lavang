import { useMemo, useState } from 'react'
import { CATEGORIES, POIS } from '../data/pois.js'
import { straightDistance, formatDistance } from '../map/geo.js'
import Icon from './Icon.jsx'

// Màn hình đầu: 4 phân khu thu gọn được, mở ra là lưới địa điểm.
export default function HomeScreen({ cal, position, onPick, onOverview, geoStatus }) {
  const [query, setQuery] = useState('')
  const [openCats, setOpenCats] = useState(() => new Set())

  const searching = query.trim().length > 0

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

  // Đang tìm kiếm thì mở hết để thấy ngay kết quả
  const isOpen = (key) => searching || openCats.has(key)
  const toggle = (key) => {
    setOpenCats((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

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

      <div className="sections">
        {groups.map((g) => {
          const open = isOpen(g.key)
          const nearest = g.items[0]?.dist
          return (
            <section key={g.key} className="section" style={{ '--c': g.meta.color, '--c-bg': `${g.meta.color}14` }}>
              <button className="section-head" onClick={() => toggle(g.key)} aria-expanded={open}>
                <span className="section-avatar">
                  <Icon name={g.meta.icon} size={22} />
                </span>
                <span className="section-text">
                  <span className="section-name">{g.meta.label}</span>
                  <span className="section-meta">
                    {g.items.length} địa điểm
                    {nearest != null && <> · gần nhất {formatDistance(nearest)}</>}
                  </span>
                </span>
                <Icon name={open ? 'ExpandLess' : 'ExpandMore'} size={24} className="section-chevron" />
              </button>

              {open && (
                <div className="tile-grid">
                  {g.items.map((p) => (
                    <button key={p.id} className="tile" onClick={() => onPick(p)}>
                      <span className="tile-icon">
                        <Icon name={p.icon} size={20} />
                      </span>
                      <span className="tile-name">{p.name}</span>
                      {p.dist != null && <span className="tile-dist">{formatDistance(p.dist)}</span>}
                    </button>
                  ))}
                </div>
              )}
            </section>
          )
        })}
      </div>
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
