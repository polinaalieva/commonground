import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import './FeedbackCard.css'

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

export function FeedbackCard({ pin, surveySheetRef, onDismiss }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(20)

  useEffect(() => {
    if (!pin) { setVisible(false); return }
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pin?.id ?? pin])

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

  if (!pin) return null

  const date = formatDate(pin.original_date || pin.created_at)
  const sourceLabel = getSourceLabel(pin.source)

  return (
    <div
      ref={cardRef}
      className={`fc-card ${visible ? 'fc-card--visible' : ''}`}
      style={{ '--fc-bottom': `${bottomOffset}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Feedback details"
    >
      <div className="fc-header">
        {pin.ratingLabel && (
          <span className="fc-rating" style={{ color: pin.ratingColor }}>
            {pin.ratingLabel}
          </span>
        )}
        <button className="sheet-header__btn" onClick={onDismiss} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {pin.experience && (
        <div className="fc-comment-wrap">
          <p className="fc-comment">{pin.experience}</p>
        </div>
      )}

      {(date || sourceLabel) && (
        <div className="fc-meta">
          {date && <span>{date}</span>}
          {date && sourceLabel && <span>·</span>}
          {sourceLabel && <span>via {sourceLabel}</span>}
        </div>
      )}
    </div>
  )
}

export default FeedbackCard