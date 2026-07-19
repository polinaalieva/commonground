import { useState, useEffect } from 'react'
import { X, Forward } from 'lucide-react'
import '../Hex/Hex_card.css'
import { supabaseFetch } from '../../../config/supabase'
import { useToast } from '../../Toast/useToast'
import { Toast } from '../../Toast/Toast'
import { useOverflow } from '../../../hooks/useOverflow'
import { shareVenue } from '../../../utils/share'

function truncate(text, max = 240) {
  if (!text) return null
  return text.length > max ? text.slice(0, max) + '...' : text
}

function formatDate(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })
}

function formatTime(iso) {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d) ? '' : d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

function SessionBlock({ session, showDivider }) {
  return (
    <div
      className="hc-comment-block"
      style={showDivider ? { paddingBottom: 16, borderBottom: '1px solid rgba(17,17,17,0.07)', marginBottom: 16 } : {}}
    >
      <p className="hc-comment-author">{session.name}</p>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span className="hc-comment-date">
          {formatDate(session.starts_at)}{session.ends_at ? ' - ' + formatTime(session.ends_at) : ''}
        </span>
        {session.session_code && (
          <span className="hc-comment-date">{session.session_code}</span>
        )}
      </div>
      {session.description && (
        <p className="hc-comment">{truncate(session.description)}</p>
      )}
      {session.link && (
        <a
          href={session.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#4A90E2', marginTop: 6, display: 'block' }}
        >
          Learn more
        </a>
      )}
    </div>
  )
}

function OrgBlock({ org }) {
  return (
    <div className="hc-comment-block">
      <p className="hc-comment-author">{org.name}</p>
      {org.description && (
        <p className="hc-comment">{truncate(org.description)}</p>
      )}
      {org.link && (
        <a
          href={org.link}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontSize: 13, color: '#4A90E2', marginTop: 6, display: 'block' }}
        >
          Learn more
        </a>
      )}
    </div>
  )
}

export function Event_card({ venue, eventId, onDismiss }) {
  const [visible, setVisible] = useState(false)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const { showToast, toastProps } = useToast()
  const scrollRef = useOverflow()

  useEffect(() => {
    if (!venue) { setVisible(false); return }
    setData(null)
    setLoading(false)
    const t = setTimeout(() => setVisible(true), 30)
    fetchData()
    return () => clearTimeout(t)
  }, [venue])

  async function fetchData() {
    const type = venue?.type
    if (!type || type.startsWith('service_')) return
    setLoading(true)
    try {
      if (type === 'session') {
        const result = await supabaseFetch(
          `event_${eventId}_sessions?venue_code=eq.${venue.code}&select=*&order=starts_at.asc`
        )
        setData(result || [])
      } else if (type === 'expo') {
        const result = await supabaseFetch(
          `event_${eventId}_orgs?venue_code=eq.${venue.code}&select=*`
        )
        setData(result || [])
      }
    } catch {
      setData([])
    } finally {
      setLoading(false)
    }
  }

  if (!venue) return null

  const isService = venue.type?.startsWith('service_')

  async function handleShare() {
    const result = await shareVenue(venue.code, eventId)
    if (result) showToast(result)
  }

  return (
    <div className={`hc-card ${visible ? 'hc-card--visible' : ''}`}>
      <div className="hc-header">
        <div>
          <span className="hc-rating">{venue.code || venue.number || venue.type}</span>
          {venue.zone && (
            <div className="hc-comment-date" style={{ marginTop: 2, marginBottom: 0 }}>
              {venue.zone}
            </div>
          )}
        </div>
        <button className="sheet-header__btn" onClick={onDismiss} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      {!isService && (
        <div ref={scrollRef} className="hc-comment-wrap">
          {loading && (
            <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>Loading...</p>
          )}
          {!loading && data && venue.type === 'session' && data.map((s, i) => (
            <SessionBlock key={s.id ?? i} session={s} showDivider={i < data.length - 1} />
          ))}
          {!loading && data && venue.type === 'expo' && data[0] && (
            <OrgBlock org={data[0]} />
          )}
          {!loading && data !== null && data.length === 0 && (
            <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>No content yet</p>
          )}
        </div>
      )}

      <div className="hc-card-actions" style={{ justifyContent: 'flex-end' }}>
        <button className="btn-primary" onClick={handleShare}>
          <Forward size={16} /> Share location
        </button>
      </div>

      <Toast {...toastProps} />
    </div>
  )
}