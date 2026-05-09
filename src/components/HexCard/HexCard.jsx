import { useEffect, useRef, useState } from 'react'
import { X, Sparkles, Forward } from 'lucide-react'

const ENABLE_SUMMARY = false
import './HexCard.css'
import { getSourceLabel } from '../../config/sources'
import { shareHex } from '../../utils/share'
import { useToast } from '../Toast/useToast'
import { Toast } from '../Toast/Toast'
import { useOverflow } from '../../hooks/useOverflow'

function formatDate(iso) {
  if (!iso) return null
  const d = new Date(iso)
  if (isNaN(d)) return null
  return d.toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' }).replace('/', '-')
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

export function HexCard({ hex, surveySheetRef, onAddExperience, onDismiss, getZoom }) {
  const cardRef = useRef(null)
  const [visible, setVisible] = useState(false)
  const [bottomOffset, setBottomOffset] = useState(20)
  const [summary, setSummary] = useState(null)
  const [generating, setGenerating] = useState(false)

  const { showToast, toastProps } = useToast()
  const commentRef = useOverflow()
  const summaryRef = useOverflow()

  useEffect(() => {
    if (!hex) { setVisible(false); return }
    setSummary(null)
    setGenerating(false)
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
  const ctaLabel = count < 2 ? 'Too few feedbacks' : null
  const comments = (hex.comments || []).filter(Boolean)
  const showActions = ENABLE_SUMMARY && comments.length >= 3

  function generateSummary() {
    setGenerating(true)
    setTimeout(() => {
      const stub = comments.slice(0, 2).map(c => c.text).filter(Boolean).join(' ')
      setSummary(stub || '—')
      setGenerating(false)
    }, 1500)
  }

  async function handleShare() {
    const result = await shareHex(hex.cell, getZoom?.() ?? 10)
    if (result) showToast(result)
  }

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
          <span className="hc-rating" style={{ color }}>{label}</span>
        )}
        {ctaLabel && (
          <span className="hc-rating" style={{ color: 'rgba(17,17,17,0.5)' }}>{ctaLabel}</span>
        )}
        <button className="sheet-header__btn" onClick={onDismiss} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {/* SUMMARY or COMMENTS */}
      {summary ? (
        <div ref={summaryRef} className="hc-summary-wrap">
          <p className="hc-summary-text">{summary}</p>
        </div>
      ) : (
        comments.length > 0 && (
          <div ref={commentRef} className="hc-comment-wrap">
            {comments.map((c, i) => <CommentBlock key={i} comment={c} />)}
          </div>
        )
      )}

      {/* META */}
      <div className="hc-meta" style={{ justifyContent: 'flex-end' }}>
        <span>{count} {count === 1 ? 'feedback' : 'feedbacks'}</span>
        <span>·</span>
        <span>avg {Math.round(Number(hex.avgRating) * 10) / 10}/10</span>
      </div>

      {/* ACTIONS */}
      {showActions && (
        summary && !generating ? (
          <div className="hc-card-actions">
            <button
              className="btn-secondary"
              onClick={onAddExperience}
            >
              + Add your experience
            </button>
            <button className="btn-primary" onClick={handleShare}>
              Share <Forward size={16} />
            </button>
          </div>
        ) : generating ? (
          <button key="gen" className="hc-generate-btn" disabled>
            <span>Generating...</span>
          </button>
        ) : (
          <button key="idle" className="hc-generate-btn" onClick={generateSummary}>
            <span>Generate summary</span>
            <Sparkles size={15} />
          </button>
        )
      )}

      <Toast {...toastProps} />
    </div>
  )
}

export default HexCard
