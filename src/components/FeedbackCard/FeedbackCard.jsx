import { useEffect, useRef, useState } from 'react'
import { Info, X } from 'lucide-react'
import './FeedbackCard.css'

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '/')
}

export function FeedbackCard({ pin, surveySheetRef, onDismiss }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(20)

  // slide-in animation
  useEffect(() => {
    if (!pin) { setVisible(false); return }
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pin?.id ?? pin])

  // measure SurveySheet height to position card above it (desktop)
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

  const date = formatDate(pin.created_at)

  return (
    <div
      ref={cardRef}
      className={`fc-card ${visible ? 'fc-card--visible' : ''}`}
      style={{ '--fc-bottom': `${bottomOffset}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Feedback details"
    >
      {/* HEADER */}
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

      {/* COMMENT */}
      {pin.experience && (
        <div className="fc-comment-wrap">
          <p className="fc-comment">{pin.experience}</p>
        </div>
      )}

      {/* META */}
      {date && (
        <div className="fc-meta">
          <Info size={14} strokeWidth={1.5} color="rgba(17,17,17,0.5)" />
          <span>{date}</span>
        </div>
      )}
    </div>
  )
}

export default FeedbackCard