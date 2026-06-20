// src/events/components/VenueLayer.jsx

import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { maplibregl } from '../../config/map'
import { EVENTS } from '../../config/events'
import { VENUE_ICONS } from '../../config/venueIcons'

export function VenueLayer({
  map,
  eventVenues = [],
  eventId,
  onSelect,
  selectedVenue,
  highlightedVenueCode,
}) {
  const renderedRef = useRef(false)
  const selectedMarkerElRef = useRef(null)
  const markerElsByCode = useRef({})

  useEffect(() => {
    if (!selectedVenue) {
      resetSelectedMarker()
      return
    }
    const el = markerElsByCode.current[selectedVenue.code]
    if (!el || el === selectedMarkerElRef.current) return
    resetSelectedMarker()
    applyHighlight(el)
  }, [selectedVenue])

  useEffect(() => {
    if (!highlightedVenueCode) return
    const el = markerElsByCode.current[highlightedVenueCode]
    if (!el || el === selectedMarkerElRef.current) return
    resetSelectedMarker()
    applyHighlight(el)
  }, [highlightedVenueCode])

  function applyHighlight(el) {
    el.style.width = '34px'
    el.style.height = '34px'
    el.style.border = '4px solid white'
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    selectedMarkerElRef.current = el
  }

  useEffect(() => {
    if (!eventVenues.length || renderedRef.current) return
    if (!map.current) return

    renderedRef.current = true

    if (map.current.isStyleLoaded()) {
      renderVenues(eventVenues)
    } else {
      map.current.once('load', () => renderVenues(eventVenues))
    }
  }, [eventVenues])

  function resetSelectedMarker() {
    if (!selectedMarkerElRef.current) return
    selectedMarkerElRef.current.style.width = '25px'
    selectedMarkerElRef.current.style.height = '25px'
    selectedMarkerElRef.current.style.border = '2px solid white'
    selectedMarkerElRef.current.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)'
    selectedMarkerElRef.current = null
  }

  function makeServiceMarkerEl(type, color) {
    const IconComponent = VENUE_ICONS[type]
    const el = document.createElement('div')
    el.style.cssText = `
      width: 25px;
      height: 25px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
    `
    if (IconComponent) {
      el.innerHTML = renderToStaticMarkup(
        <IconComponent size={14} color="white" stroke={1.5} />
      )
    }
    return el
  }

  function makeVenueMarkerEl(number, color) {
    const el = document.createElement('div')
    el.style.cssText = `
      width: 25px;
      height: 25px;
      background: ${color};
      border-radius: 50%;
      border: 2px solid white;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      font-family: Inter, system-ui, sans-serif;
      font-size: 10px;
      font-weight: 700;
      color: white;
      line-height: 1;
    `
    el.textContent = number || '?'
    return el
  }

  function renderFloorplan() {
  const floorplan = EVENTS[eventId]?.floorplan
  if (!floorplan) return
  if (map.current.getSource('floorplan')) return

  map.current.addSource('floorplan', {
    type: 'image',
    url: floorplan.url,
    coordinates: floorplan.coordinates,
  })

  map.current.addLayer({
    id: 'floorplan-layer',
    type: 'raster',
    source: 'floorplan',
    paint: { 'raster-opacity': 0.85 },
  })
}

function renderVenues(data) {
  renderFloorplan()
  const zoneColors = EVENTS[eventId]?.zoneColors || {}
  const serviceColor = EVENTS[eventId]?.serviceColor || '#6B7280'
    const allMarkerEls = []

function getMarkerSize() {
  const zoom = map.current.getZoom()
  if (zoom < 16) return { size: 16, icon: 10, font: 7 }
  if (zoom < 18) return { size: 25, icon: 14, font: 9 }
  return { size: 32, icon: 18, font: 12 }
}

function applyMarkerSizes() {
  const { size, icon, font } = getMarkerSize()
  allMarkerEls.forEach(({ el, isService }) => {
    if (el === selectedMarkerElRef.current) return
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', icon)
      svg.setAttribute('height', icon)
    }
    if (!isService) {
      el.style.fontSize = `${font}px`
    }
  })
}

map.current.on('zoom', applyMarkerSizes)

    data.forEach(v => {
      const coords =
        typeof v.coordinates === 'string'
          ? JSON.parse(v.coordinates)
          : v.coordinates

      const isService = v.type?.startsWith('service_')
      const zoneColor = zoneColors[v.zone] || '#9ca3af'

      const el = isService
        ? makeServiceMarkerEl(v.type, serviceColor)
        : makeVenueMarkerEl(v.number, zoneColor)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current)

      allMarkerEls.push({ el, isService })
      if (v.code) markerElsByCode.current[v.code] = el

      marker.getElement().addEventListener('click', e => {
        e.stopPropagation()
        resetSelectedMarker()
        el.style.width = '34px'
        el.style.height = '34px'
        el.style.border = '4px solid white'
        el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
        selectedMarkerElRef.current = el
        onSelect({
          id: v.id,
          code: v.code,
          type: v.type,
          zone: v.zone,
          number: v.number,
        })
      })
    })

    // ── Deep link: ?venue=CODE ──
    const params = new URLSearchParams(window.location.search)
    const venueCode = params.get('venue')
    if (venueCode) {
      const venue = data.find(v => v.code === venueCode)
      if (venue) {
        onSelect({
          id: venue.id,
          code: venue.code,
          type: venue.type,
          zone: venue.zone,
          number: venue.number,
        })
        const raw =
          typeof venue.coordinates === 'string'
            ? JSON.parse(venue.coordinates)
            : venue.coordinates
        map.current.flyTo({ center: raw, zoom: 17, essential: true })
      }
    }
  }

  return null
}