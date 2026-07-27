import { useMemo, useState } from 'react'
import { CATEGORIES, POIS } from '../data/pois.js'
import { straightDistance, formatDistance } from '../map/geo.js'
import Icon from './Icon.jsx'

// Panel tìm/duyệt địa điểm, trượt lên từ đáy. Chọn 1 điểm → mở popup chi tiết.
export default function PlacesPanel({ cal, position, geoStatus, onPick, onClose }) {
  const [query, setQuery] = useState('')
  const [openCats, setOpenCats] = useState(() => new Set())
  const searching = query.trim().length > 0

  const groups = useMemo(() => {
    const q = query.trim().toLowerCase()
    const withDist = POIS.map((p) => ({
      ...p, dist: position ? straightDistance(cal, p, position) : null,
    })).filter((p) => !q || p.name.toLowerCase().includes(q))
    return Object.entries(CATEGORIES)
      .map(([key, meta]) => ({
        key, meta,
        items: withDist.filter((p) => p.cat === key).sort((a, b) => (a.dist == null ? 0 : a.dist - b.dist)),
      }))
      .filter((g) => g.items.length > 0)
  }, [cal, position, query])

  const isOpen = (key) => searching || openCats.has(key)
  const toggle = (key) => setOpenCats((prev) => {
    const next = new Set(prev)
    next.has(key) ? next.delete(key) : next.add(key)
    return next
  })

  return (
    <div className="places-backdrop" onClick={onClose}>
      <div className="places-panel glass" onClick={(e) => e.stopPropagation()}>
        <div className="places-grip" />
        <div className="places-head">
          <div className="searchbar">
            <Icon name="Search" size={22} />
            <input type="search" placeholder="Tìm địa điểm" value={query}
              autoFocus onChange={(e) => setQuery(e.target.value)} />
            {query && (
              <button className="icon-only" onClick={() => setQuery('')} aria-label="Xóa">
                <Icon name="Close" size={20} />
              </button>
            )}
          </div>
          <button className="icon-btn" onClick={onClose} aria-label="Đóng">
            <Icon name="Close" size={22} />
          </button>
        </div>

        {geoStatus === 'denied' && (
          <div className="places-note warn"><span className="gps-dot" />Chưa có quyền vị trí để đo khoảng cách.</div>
        )}

        <div className="places-scroll">
          {groups.length === 0 && <div className="home-empty">Không tìm thấy địa điểm nào</div>}
          {groups.map((g) => {
            const open = isOpen(g.key)
            const nearest = g.items[0]?.dist
            return (
              <section key={g.key} className="section" style={{ '--c': g.meta.color, '--c-bg': `${g.meta.color}22` }}>
                <button className="section-head" onClick={() => toggle(g.key)} aria-expanded={open}>
                  <span className="section-avatar"><Icon name={g.meta.icon} size={22} /></span>
                  <span className="section-text">
                    <span className="section-name">{g.meta.label}</span>
                    <span className="section-meta">
                      {g.items.length} địa điểm{nearest != null && <> · gần nhất {formatDistance(nearest)}</>}
                    </span>
                  </span>
                  <Icon name={open ? 'ExpandLess' : 'ExpandMore'} size={24} className="section-chevron" />
                </button>
                {open && (
                  <div className="tile-grid">
                    {g.items.map((p) => (
                      <button key={p.id} className="tile" onClick={() => onPick(p)}>
                        <span className="tile-icon"><Icon name={p.icon} size={20} /></span>
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
    </div>
  )
}
