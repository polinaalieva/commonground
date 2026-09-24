// src/events/pages/EventPage.jsx

import { Navigate, useLocation, useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EVENTS, LEGACY_EVENT_IDS } from '../../config/events'
import { SURVEY_CONTENT } from '../../config/content-survey'
import { supabaseFetch } from '../../config/supabase'
import Map from '../../components/Map'

function EventPage() {
  const { eventId } = useParams()
  const location = useLocation()
  const event = EVENTS[eventId]
  const [eventVenues, setEventVenues] = useState([])

  useEffect(() => {
    if (!eventId || !EVENTS[eventId]) return // старый код — сейчас будет редирект
    supabaseFetch(`event_${eventId}_venues?event_id=eq.${eventId}&select=*`)
      .then(setEventVenues)
      .catch(e => console.error('Failed to load venues', e))
  }, [eventId])

  // старый код → новый, с сохранением ?venue= и прочих параметров
  const newId = LEGACY_EVENT_IDS[eventId]
  if (newId) {
    const path = location.pathname.replace(`/event/${eventId}`, `/event/${newId}`)
    return <Navigate to={path + location.search} replace />
  }

  if (!event) {
    return <div style={{ padding: 40 }}>Event not found: {eventId}</div>
  }

  const content = SURVEY_CONTENT

  return (
    <Map
      city={eventId}
      cityConfig={event}
      pageContent={content}
      variant="belonging"
      source="event"
      lang="en"
      eventId={eventId}
      eventVenues={eventVenues}
    />
  )
}

export default EventPage