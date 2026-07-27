import { useEffect, useRef, useState } from 'react'
import Icon from './Icon.jsx'

// Màn hình chào: ảnh Thánh Đường ken-burns + emblem vàng + tiêu đề Playfair.
// Tự tắt sau ~2.2s (hoặc chạm) rồi vào thẳng bản đồ nội khu.
export default function Splash({ onDone }) {
  const [leaving, setLeaving] = useState(false)
  const done = useRef(false)

  const finish = () => setLeaving(true)
  const complete = () => { if (!done.current) { done.current = true; onDone() } }

  useEffect(() => {
    const t = setTimeout(finish, 2200)
    return () => clearTimeout(t)
  }, [])

  // Fallback: gọi onDone kể cả khi transitionend không kích hoạt
  useEffect(() => {
    if (!leaving) return
    const t = setTimeout(complete, 600)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [leaving])

  return (
    <div
      className={`splash${leaving ? ' splash-leave' : ''}`}
      onClick={finish}
      onTransitionEnd={complete}
    >
      <div className="splash-photo" />
      <div className="splash-veil" />
      <div className="splash-rays"><span /><span /><span /></div>

      <div className="splash-content">
        {/* Emblem tạm — thay bằng logo La Vang chính thức sau */}
        <div className="splash-emblem">
          <Icon name="Church" size={46} />
        </div>
        <p className="splash-eyebrow">Trung tâm hành hương</p>
        <h1 className="splash-title">Đức Mẹ La&nbsp;Vang</h1>
        <div className="splash-rule" />
        <p className="splash-sub">La Vang · Quảng Trị</p>
      </div>

      <div className="splash-loader"><span /></div>
    </div>
  )
}
