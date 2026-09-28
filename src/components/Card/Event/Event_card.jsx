import { useState, useEffect } from 'react'
import { X, Forward } from 'lucide-react'
import '../Hex/Hex_card.css'
import '../ui/Card_shared.css'
import { supabaseFetch } from '../../../config/supabase'
import { useToast } from '../../Toast/useToast'
import { Toast } from '../../Toast/Toast'
import { useOverflow } from '../../../hooks/useOverflow'
import { shareVenue } from '../../../utils/share'

function truncate(text, max = 240) {
  if (!text) return null
  return text.length > max ? text.slice(0, max) + '...' : text
}

// Кнопка действия точки: venues.action_type / action_label / action_value (+ place_id / address для карты)
const ACTIONS = {
  directions: { label: 'Directions' },
  url: { label: 'Open' },
  tel: { label: 'Call' },
  email: { label: 'Email' },
}

// центр точки/полигона: среднее всех пар [lng, lat]
function venueCenter(coordinates) {
  let c = coordinates
  if (typeof c === 'string') { try { c = JSON.parse(c) } catch { return null } }
  const pts = []
  const walk = a => {
    if (!Array.isArray(a)) return
    if (a.length >= 2 && typeof a[0] === 'number' && typeof a[1] === 'number') pts.push(a)
    else a.forEach(walk)
  }
  walk(c)
  if (!pts.length) return null
  return [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]
}

function getVenueAction(venue) {
  const type = venue?.action_type?.trim()
  const def = ACTIONS[type]
  if (!def) return null
  const value = venue.action_value?.trim()
  let href = null
  if (type === 'directions') {
    // открыть место в Google Maps: place_id → адрес → координаты точки
    const placeId = venue.place_id?.trim()
    const address = venue.address?.trim()
    const c = venueCenter(venue.coordinates)
    const base = 'https://www.google.com/maps/search/?api=1'
    if (placeId) {
      const q = address || venue.name || (c ? `${c[1]},${c[0]}` : 'place')
      href = `${base}&query=${encodeURIComponent(q)}&query_place_id=${encodeURIComponent(placeId)}`
    } else if (address) {
      href = `${base}&query=${encodeURIComponent(address)}`
    } else if (c) {
      href = `${base}&query=${encodeURIComponent(`${c[1]},${c[0]}`)}`
    }
  } else if (value) {
    href = type === 'tel' ? `tel:${value.replace(/\s+/g, '')}`
      : type === 'email' ? `mailto:${value}`
      : value
  }
  if (!href) return null
  return { href, label: venue.action_label?.trim() || def.label, external: type === 'directions' || type === 'url' }
}

// «7 · Design House»: номер и название точки, пустые части пропускаем
export function venueTitle(venue) {
  const parts = [venue?.number, venue?.name].map(x => (x ?? '').toString().trim()).filter(Boolean)
  return [...new Set(parts)].join(' · ')
}

const same = (a, b) => (a ?? '').toString().trim().toLowerCase() === (b ?? '').toString().trim().toLowerCase()

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
          className="hc-learn-more"
        >
          Learn more
        </a>
      )}
    </div>
  )
}

function OrgBlock({ org, venueName }) {
  // имя экспонента показываем, только если оно не повторяет название точки
  const showName = org.name?.trim() && !same(org.name, venueName)
  return (
    <div className="hc-comment-block">
      {showName && <p className="hc-comment-author">{org.name}</p>}
      {org.description && (
        <p className="hc-comment">{truncate(org.description)}</p>
      )}
      {org.link && (
        <a
          href={org.link}
          target="_blank"
          rel="noopener noreferrer"
          className="hc-learn-more"
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
  const action = getVenueAction(venue)

  async function handleShare() {
    const result = await shareVenue(venue.id, eventId)
    if (result) showToast(result)
  }

  return (
    <div className={`hc-card ${visible ? 'hc-card--visible' : ''}`}>
      <div className="hc-header">
        <div>
          <span className="hc-rating">{venueTitle(venue) || venue.code || venue.type}</span>
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
            <OrgBlock org={data[0]} venueName={venue.name} />
          )}
          {!loading && data !== null && data.length === 0 && (
            <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>No content yet</p>
          )}
        </div>
      )}

      <div className="hc-card-actions" style={{ justifyContent: action ? 'space-between' : 'flex-end' }}>
        {action && (
          <a
            className="btn-secondary"
            href={action.href}
            {...(action.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
            style={{ display: 'flex', alignItems: 'center', textDecoration: 'none' }}
          >
            {action.label}
          </a>
        )}
        <button className="btn-primary" onClick={handleShare}>
          Share <Forward size={16} />
        </button>
      </div>

      <Toast {...toastProps} />
    </div>
  )
}