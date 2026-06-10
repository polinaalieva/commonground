const isMobileDevice = () => {
  if (navigator.userAgentData) return navigator.userAgentData.mobile
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
}

async function doShare({ text, url }) {
  if (navigator.share && isMobileDevice()) {
    try {
      await navigator.share({ title: 'CommonGround', text, url })
      return null
    } catch (e) {
      if (e.name === 'AbortError') return null
    }
  }
  await navigator.clipboard.writeText(`${text} ${url}`)
  return { text, url }
}

export function sharePoint(pointId) {
  const text = 'Check out what people say about this area'
  const url = `https://commonground.page/map?point=${pointId}&utm_source=feedback_share`
  return doShare({ text, url })
}

export function shareHex(cellId, zoom) {
  const text = 'Check out what people say about this area'
  const url = `https://commonground.page/map?hex=${cellId}&z=${Math.round(zoom)}&utm_source=hex_share`
  return doShare({ text, url })
}

export function shareVenue(venueCode, eventId) {
  const text = 'Check out this venue'
  const url = `https://commonground.page/event/${eventId}?venue=${encodeURIComponent(venueCode)}&utm_source=venue_share`
  return doShare({ text, url })
}
