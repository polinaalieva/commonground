import { useEffect, useRef, useState } from 'react'
import { X, ChevronDown } from 'lucide-react'
import './HexCard.css'

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')
}

const SOCIAL_PREFIXES = {
  reddit: 'Reddit',
  telegram: 'Telegram',
  facebook: 'Facebook',
  vkontakte: 'VKontakte',
  discord: 'Discord',
}

function getSourceLabel(source) {
  if (!source) return null
  const lower = source.toLowerCase()
  for (const [prefix, label] of Object.entries(SOCIAL_PREFIXES)) {
    if (lower.startsWith(prefix)) return label
  }
  return null
}

function getHexLabel(avgRating) {
  if (!avgRating) return null
  const v = Number(avgRating)
  if (v >= 1 && v < 4) return "Doesn't fit people"
  if (v >= 4 && v < 7) return "Sometimes fits people"
  if (v >= 7 && v < 8) return "Mostly fits people"
  if (v >= 8 && v <= 10) return "Fits people"
  return null
}

function getHexColor(avgRating) {
  const RATING_COLORS = {
    1: '#ED4B9E', 2: '#DF5BA6', 3: '#C46DB4',
    4: '#A47EC0', 5: '#8490C8', 6: '#64A0C8',
    7: '#44B0BE', 8: '#34C4B4', 9: '#31CEAC', 10: '#31D0AA',
  }
  const v = Math.round(Number(avgRating))
  return RATING_COLORS[v] || '#9ca3af'
}

function CommentBlock({ comment }) {
  const date = formatDate(comment.date)
  const source = getSourceLabel(comment.source)
  const authorLabel = source ? `via ${source}` : 'Local Contributor'

  return (
    <div className="hc-comment-block">
      <p className="hc-comment-author">{authorLabel}</p>
      {date && <p className="hc-comment-date">{date}</p>}
      <p className="hc-comment">{comment.text}</p>
    </div>
  )
}

export function HexCard({ hex, surveySheetRef, onDismiss }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(20)

  useEffect(() => {
    if (!hex) { setVisible(false); return }
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [hex])

  useEffect(() => {
    if (!surveySheetRef?.current) return
    const measure = () => {
      const h = surveySheetRef.current?.getBoundingClientRect().height ?? 0
      setBottomOffset(20 + h + 16)
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(surveySheetRef.current)
    return () => ro.disconnect()
  }, [surveySheetRef])

  if (!hex) return null

  const count = Number(hex.count)
  const label = count >= 2 ? getHexLabel(hex.avgRating) : null
  const color = getHexColor(hex.avgRating)
  const ctaLabel = count < 2 ? "Too few feedbacks" : null
  const comments = (hex.comments || []).filter(Boolean)

  return (
    <div
      ref={cardRef}
      className={`hc-card ${visible ? 'hc-card--visible' : ''}`}
      style={{ '--hc-bottom': `${bottomOffset}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Area feedback"
    >
      {/* HEADER */}
      <div className="hc-header">
        {label && (
          <span className="hc-rating" style={{ color }}>
            {label}
          </span>
        )}
        {ctaLabel && (
          <span className="hc-rating" style={{ color: 'rgba(17,17,17,0.5)' }}>
            {ctaLabel}
          </span>
        )}
        <button className="sheet-header__btn" onClick={onDismiss} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {/* COMMENTS */}
      {comments.length > 0 && (
  <div className="hc-comment-wrap">
    {comments.map((c, i) => <CommentBlock key={i} comment={c} />)}
  </div>
)}

{comments.length > 0 && (
  <div className="hc-chevron">
    <ChevronDown size={17} color="rgba(17,17,17,0.9)" />
  </div>
)}

      {/* META */}
      <div className="hc-meta" style={{ justifyContent: 'flex-end' }}>
        <span>{Number(hex.count)} {Number(hex.count) === 1 ? 'feedback' : 'feedbacks'}</span>
        <span>·</span>
        <span>avg {Math.round(Number(hex.avgRating) * 10) / 10}/10</span>
      </div>
    </div>
  )
}

export default HexCard