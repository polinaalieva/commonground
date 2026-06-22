// src/events/pages/EventPage.jsx

import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { EVENTS } from '../../config/events'
import { SURVEY_CONTENT } from '../../config/content-survey'
import { supabaseFetch } from '../../config/supabase'
import Map from '../../components/Map'

function EventPage() {
  const { eventId } = useParams()
  const event = EVENTS[eventId]
  const [eventVenues, setEventVenues] = useState([])

  useEffect(() => {
    if (!eventId) return
    supabaseFetch(`event_${eventId}_venues?event_id=eq.${eventId}&select=*`)
      .then(setEventVenues)
      .catch(e => console.error('Failed to load venues', e))
  }, [eventId])

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