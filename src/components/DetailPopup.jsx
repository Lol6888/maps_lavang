import { CATEGORIES } from '../data/pois.js'
import { straightDistance, formatDistance } from '../map/geo.js'
import Icon from './Icon.jsx'

// Popup chi tiết địa điểm — modal giữa màn hình (glassmorphism navy).
// 3 ảnh: nếu poi.images có thì dùng, không thì hiện 3 ô placeholder.
export default function DetailPopup({ poi, cal, pos, onClose, onRoute }) {
  const cat = CATEGORIES[poi.cat]
  const dist = pos ? straightDistance(cal, poi, pos) : null
  const images = poi.images && poi.images.length ? poi.images.slice(0, 3) : [null, null, null]

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="detail-card" onClick={(e) => e.stopPropagation()}>
        <button className="detail-close" onClick={onClose} aria-label="Đóng">
          <Icon name="Close" size={22} />
        </button>

        <div className="detail-head">
          <span className="detail-icon" style={{ '--c': cat.color }}>
            <Icon name={poi.icon} size={22} />
          </span>
          <div className="detail-titles">
            <h2 className="detail-name">{poi.name}</h2>
            <div className="detail-meta">
              {cat.label}
              {dist != null && <> · cách bạn {formatDistance(dist)}</>}
            </div>
          </div>
        </div>

        <div className="detail-gallery">
          {images.map((src, i) => (
            <div key={i} className="detail-photo" style={{ '--c': cat.color }}>
              {src ? (
                <img src={src} alt={`${poi.name} ${i + 1}`} loading="lazy" />
              ) : (
                <span className="detail-photo-ph"><Icon name={poi.icon} size={26} /></span>
              )}
            </div>
          ))}
        </div>

        <button className="detail-route" onClick={onRoute}>
          <Icon name="DirectionsWalk" size={20} />
          Chỉ đường tới đây
        </button>
      </div>
    </div>
  )
}
