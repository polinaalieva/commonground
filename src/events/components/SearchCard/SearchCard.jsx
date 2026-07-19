import { useState, useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import { supabaseFetch } from '../../../config/supabase'
import { useOverflow } from '../../../hooks/useOverflow'
import '../../../components/Card/Hex/Hex_card.css'
import '../../../components/Card/ui/Card_shared.css'

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

function groupBy(arr, keyFn) {
  const map = new Map()
  for (const item of arr) {
    const k = keyFn(item)
    if (!map.has(k)) map.set(k, [])
    map.get(k).push(item)
  }
  return map
}

export function SearchCard({ eventId, venues = [], onDismiss, onShowOnMap }) {
  const [visible, setVisible] = useState(false)
  const [tab, setTab] = useState('locations')
  const [search, setSearch] = useState('')
  const [sessions, setSessions] = useState(null)
  const [sessionsLoading, setSessionsLoading] = useState(false)
  const [orgsByVenueCode, setOrgsByVenueCode] = useState({})
  const scrollRef = useOverflow()
  const sessionsFetchedRef = useRef(false)
  const orgsFetchedRef = useRef(false)

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 30)
    loadOrgs()
    return () => clearTimeout(t)
  }, [])

  async function loadOrgs() {
    if (orgsFetchedRef.current) return
    orgsFetchedRef.current = true
    try {
      const result = await supabaseFetch(
        `event_${eventId}_orgs?select=venue_code,name`
      )
      const map = {}
      for (const org of result || []) {
        if (org.venue_code) map[org.venue_code] = org.name
      }
      setOrgsByVenueCode(map)
    } catch {
      // orgs are optional — silently ignore
    }
  }

  async function loadSessions() {
    if (sessionsFetchedRef.current) return
    sessionsFetchedRef.current = true
    setSessionsLoading(true)
    try {
      const result = await supabaseFetch(
        `event_${eventId}_sessions?select=*&order=starts_at.asc`
      )
      setSessions(result || [])
    } catch {
      setSessions([])
    } finally {
      setSessionsLoading(false)
    }
  }

  function handleTabChange(next) {
    setTab(next)
    setSearch('')
    if (next === 'sessions') loadSessions()
  }

  const q = search.toLowerCase()

  const filteredVenues = venues.filter(v => {
    if (!q) return true
    const orgName = orgsByVenueCode[v.code] || ''
    return (
      (v.name || '').toLowerCase().includes(q) ||
      (v.code || '').toLowerCase().includes(q) ||
      orgName.toLowerCase().includes(q)
    )
  })

  const filteredSessions = (sessions || []).filter(s =>
    !q ||
    (s.name || '').toLowerCase().includes(q) ||
    (s.venue_code || '').toLowerCase().includes(q)
  )

  const venuesByZoneRaw = groupBy(filteredVenues, v => v.zone || 'Other')
  const venuesByZone = new Map([
    ...[...venuesByZoneRaw.entries()].filter(([z]) => z !== 'Other'),
    ...(venuesByZoneRaw.has('Other') ? [['Other', venuesByZoneRaw.get('Other')]] : []),
  ])
  const sessionsByDate = groupBy(filteredSessions, s => formatDate(s.starts_at) || 'Unknown date')

  function venueForSession(session) {
    const found = venues.find(v => v.code === session.venue_code)
    if (found) return found
    if (session.venue_code) return { code: session.venue_code, type: 'session' }
    return null
  }

  return (
    <div className={`hc-card ${visible ? 'hc-card--visible' : ''}`}>
      <div className="hc-header">
        <div className="sc-tab-switcher">
          <button
            className={`sc-tab${tab === 'locations' ? ' sc-tab--active' : ''}`}
            onClick={() => handleTabChange('locations')}
          >
            Locations
          </button>
          <button
            className={`sc-tab${tab === 'sessions' ? ' sc-tab--active' : ''}`}
            onClick={() => handleTabChange('sessions')}
          >
            Sessions
          </button>
        </div>
        <button className="sheet-header__btn" onClick={onDismiss} aria-label="Close">
          <X size={14} />
        </button>
      </div>

      <input
        className="hc-search-input"
        type="text"
        placeholder="Search..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />

      <div ref={scrollRef} className="hc-comment-wrap">
        {tab === 'locations' && (
          <>
            {filteredVenues.length === 0 && (
              <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>No results</p>
            )}
            {[...venuesByZone.entries()].map(([zone, zoneVenues]) => (
              <div key={zone}>
                <p className="hc-comment-author" style={{ marginBottom: 8 }}>{zone}</p>
                {zoneVenues.map(venue => {
                  const orgName = orgsByVenueCode[venue.code]
                  return (
                    <div key={venue.code} className="sc-venue-row">
                      <span className="hc-comment">
                        {venue.type === 'expo' && orgName
                          ? <>{venue.code} <span className="sc-dot">·</span> {orgName}</>
                          : (venue.name || venue.code)
                        }
                      </span>
                      <button className="sc-show-btn" onClick={() => onShowOnMap(venue)}>
                        Show on map
                      </button>
                    </div>
                  )
                })}
              </div>
            ))}
          </>
        )}

        {tab === 'sessions' && (
          <>
            {sessionsLoading && (
              <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>Loading...</p>
            )}
            {!sessionsLoading && filteredSessions.length === 0 && sessions !== null && (
              <p className="hc-comment" style={{ color: 'rgba(17,17,17,0.4)' }}>No results</p>
            )}
            {!sessionsLoading && [...sessionsByDate.entries()].map(([date, dateSessions]) => (
              <div key={date}>
                <p className="hc-comment-author" style={{ marginBottom: 8 }}>{date}</p>
                {dateSessions.map((session, i) => (
                  <div key={session.id ?? i} className="sc-session-row">
                    <div className="sc-session-info">
                      <span className="hc-comment">{session.name}</span>
                      <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
                        <span className="hc-comment-date">
                          {formatTime(session.starts_at)}{session.ends_at ? ' – ' + formatTime(session.ends_at) : ''}
                        </span>
                        {session.venue_code && (
                          <span className="hc-comment-date">{session.venue_code}</span>
                        )}
                      </div>
                    </div>
                    <button
                      className="sc-show-btn"
                      onClick={() => {
                        const venue = venueForSession(session)
                        if (venue) onShowOnMap(venue)
                      }}
                    >
                      Show on map
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  )
}
