// src/events/pages/EventPage.jsx

import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { useEvent } from '../../config/events'
import { SURVEY_CONTENT } from '../../config/content-survey'
import { supabaseFetch } from '../../config/supabase'
import Map from '../../components/Map'

function EventPage() {
  const { eventId } = useParams()
  const { status, event } = useEvent(eventId)
  const [eventVenues, setEventVenues] = useState([])

  useEffect(() => {
    if (!event) return
    supabaseFetch(`event_${event.code}_venues?event_id=eq.${event.code}&select=*`)
      .then(setEventVenues)
      .catch(e => console.error('Failed to load venues', e))
  }, [event])

  // карта создаётся сразу с настройками события, поэтому ждём их
  if (status === 'loading') return null

  if (!event) {
    const message = status === 'error' ? 'Could not load the event. Please try again.' : `Event not found: ${eventId}`
    return <div style={{ padding: 40 }}>{message}</div>
  }

  return (
    <Map
      city={eventId}
      cityConfig={event}
      pageContent={SURVEY_CONTENT}
      variant="belonging"
      source="event"
      lang="en"
      eventId={eventId}
      eventVenues={eventVenues}
    />
  )
}

export default EventPage
