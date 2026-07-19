import { useMemo, useState } from 'react'
import { CATEGORIES, POIS } from '../data/pois.js'
import { straightDistance, formatDistance } from '../map/geo.js'

// Màn hình đầu: chọn địa điểm muốn tới (card), hoặc mở bản đồ tổng quan.
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
      <div className="home-hero">
        <h1>Trung tâm hành hương<br />Đức Mẹ La Vang</h1>
        <p>Chọn địa điểm bạn muốn đến, bản đồ sẽ chỉ đường từ chỗ bạn đang đứng.</p>
        <input
          className="home-search"
          type="search"
          placeholder="Tìm địa điểm…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn-overview" onClick={onOverview}>
          🗺️ Xem toàn bộ bản đồ
        </button>
        {position ? (
          <div className="home-gps ok">Đã có vị trí của bạn — các địa điểm xếp theo khoảng cách gần nhất</div>
        ) : geoStatus === 'denied' ? (
          <div className="home-gps warn">Chưa có quyền vị trí. Bật quyền Vị trí để được chỉ đường.</div>
        ) : (
          <div className="home-gps">Đang lấy vị trí GPS của bạn…</div>
        )}
      </div>

      {groups.length === 0 && <div className="home-empty">Không tìm thấy địa điểm nào.</div>}

      {groups.map((g) => (
        <section key={g.key} className="home-group">
          <h2 style={{ '--c': g.meta.color }}>{g.meta.label}</h2>
          <div className="card-grid">
            {g.items.map((p) => (
              <button key={p.id} className="card" style={{ '--c': g.meta.color }} onClick={() => onPick(p)}>
                <span className="card-icon">{p.icon}</span>
                <span className="card-name">{p.name}</span>
                {p.dist != null && <span className="card-dist">{formatDistance(p.dist)}</span>}
              </button>
            ))}
          </div>
        </section>
      ))}
    </div>
  )
}
