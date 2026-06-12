// src/events/components/EventMarker/EventMarker.jsx

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { maplibregl } from '../../../config/map'
import './EventMarker.css'

function getSize(zoom) {
  if (zoom < 9) return 'tiny'
  if (zoom < 14) return 'medium'
  return 'pill'
}

function buildEl(el, config, size) {
  el.innerHTML = ''
  el.className = `event-marker event-marker--${size}`

  const img = document.createElement('img')
  img.src = config.markerImage || '/events/placeholder.png'
  img.alt = config.shortName || config.name
  img.className = 'event-marker__img'
  el.appendChild(img)

  if (size === 'pill') {
    const label = document.createElement('span')
    label.className = 'event-marker__label'
    label.textContent = (config.shortName || config.name || '').slice(0, 15)
    el.appendChild(label)
  }
}

export function EventMarker({ mapRef, eventId, eventConfig }) {
  const navigate = useNavigate()

  useEffect(() => {
    const map = mapRef.current
    if (!map || !eventConfig?.center) return

    const wrapper = document.createElement('div')
    wrapper.style.cssText = 'width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;'

    const el = document.createElement('div')
    wrapper.appendChild(el)

    let currentSize = null

    function update() {
      const size = getSize(map.getZoom())
      if (size === currentSize) return
      currentSize = size
      buildEl(el, eventConfig, size)
    }

    update()

    wrapper.addEventListener('click', () => navigate(`/event/${eventId}`))

    const marker = new maplibregl.Marker({ element: wrapper, anchor: 'center' })
      .setLngLat(eventConfig.center)
      .addTo(map)

    map.on('zoom', update)

    return () => {
      map.off('zoom', update)
      marker.remove()
    }
  }, [mapRef.current])

  return null
}