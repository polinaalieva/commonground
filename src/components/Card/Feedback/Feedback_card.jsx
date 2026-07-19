import { useEffect, useRef, useState } from 'react'
import { X, Forward } from 'lucide-react'
import './Feedback_card.css'
import { FC_Voting } from './FC_Voting'
import { getSourceLabel } from '../../../config/sources'
import { sharePoint } from '../../../utils/share'
import { useToast } from '../../Toast/useToast'
import { Toast } from '../../Toast/Toast'
import { useOverflow } from '../../../hooks/useOverflow'

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')
}


export function Feedback_card({ pin, surveySheetRef, onDismiss }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(20)
  const [voted, setVoted] = useState(false)

  const { showToast, toastProps } = useToast()
  const commentRef = useOverflow()

  useEffect(() => {
    if (!pin) { setVisible(false); return }
    setVoted(false)
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
  let authorLabel
  if (pin.city === 'wuf13') {
    authorLabel = 'via WUF13'
  } else {
    const sourceLabel = getSourceLabel(pin.source)
    authorLabel = sourceLabel ? `via ${sourceLabel}` : 'Local Contributor'
  }

  async function handleShare() {
    const result = await sharePoint(pin.id)
    if (result) showToast(result)
  }

  return (
    <div
      ref={cardRef}
      className={`fc-card ${visible ? 'fc-card--visible' : ''}`}
      style={{ '--fc-bottom': `${bottomOffset}px` }}
      role="dialog"
      aria-modal="false"
      aria-label="Feedback details"
      onTouchStart={e => e.stopPropagation()}
      onTouchEnd={e => e.stopPropagation()}
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
        <div ref={commentRef} className="fc-comment-wrap">
          <p className="fc-comment">{pin.experience}</p>
        </div>
      )}

      <div className="fc-meta">
        {date && <span>{date}</span>}
        {date && <span>·</span>}
        <span>{authorLabel}</span>
      </div>

      <FC_Voting
        feedbackId={pin.id}
        onVoted={() => setVoted(true)}
      />

      <div className="card-actions">
        <button className="btn-primary" onClick={handleShare} aria-label="Share">
          <Forward size={16} />
          Share
        </button>
      </div>

      <Toast {...toastProps} />
    </div>
  )
}

export default Feedback_card
