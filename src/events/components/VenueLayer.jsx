// src/events/components/VenueLayer.jsx

import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { maplibregl } from '../../config/map'
import { EVENTS, getEventFloors, isOnFloor } from '../../config/events'
import { VENUE_ICONS } from '../../config/venueIcons'

export function VenueLayer({
  map,
  eventVenues = [],
  eventId,
  onSelect,
  selectedVenue,
  highlightedVenueCode,
  currentFloor = null,
  onFloorChange,
}) {
  const renderedRef = useRef(false)
  const markersRef = useRef([]) // { el, floor }
  const currentFloorRef = useRef(currentFloor)

  function floorplanId(level) {
    return `floorplan-${level ?? 'main'}`
  }

  function applyFloor() {
    const level = currentFloorRef.current
    markersRef.current.forEach(({ el, floor }) => {
      // flex, а не '' — иначе цифра/иконка съезжает из центра кружка
      el.style.display = isOnFloor(floor, level) ? 'flex' : 'none'
    })
    if (!map.current) return
    getEventFloors(EVENTS[eventId]).forEach(f => {
      const layerId = `${floorplanId(f.level)}-layer`
      if (!map.current.getLayer(layerId)) return
      map.current.setLayoutProperty(layerId, 'visibility', isOnFloor(f.level, level) ? 'visible' : 'none')
    })
  }

  // Смена этажа: показываем план этого этажа и его точки (+ точки без этажа)
  useEffect(() => {
    currentFloorRef.current = currentFloor
    applyFloor()
  }, [currentFloor])

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

  // План рисуем сразу, не дожидаясь точек: слой монтируется после load карты
  useEffect(() => {
    if (map.current) renderFloorplan()
  }, [])

  useEffect(() => {
    if (!eventVenues.length || renderedRef.current) return
    if (!map.current) return

    renderedRef.current = true

    // Слой монтируется после load карты (mapReady). isStyleLoaded() тут не годится:
    // пока грузятся картинки планов, он false, а 'load' второй раз уже не придёт
    renderVenues(eventVenues)
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

  // Все этажи грузим сразу и переключаем видимостью — смена этажа без задержки
  function renderFloorplan() {
    getEventFloors(EVENTS[eventId]).forEach(f => {
      if (!f.url || !f.coordinates) return // этаж без картинки плана — только фильтр точек
      const id = floorplanId(f.level)
      if (map.current.getSource(id)) return

      map.current.addSource(id, {
        type: 'image',
        url: f.url,
        coordinates: f.coordinates,
      })

      map.current.addLayer({
        id: `${id}-layer`,
        type: 'raster',
        source: id,
        paint: { 'raster-opacity': 0.85 },
        layout: { visibility: isOnFloor(f.level, currentFloorRef.current) ? 'visible' : 'none' },
      })
    })
  }

function renderVenues(data) {
  const zoneColors = EVENTS[eventId]?.zoneColors || {}
  const serviceColor = EVENTS[eventId]?.serviceColor || '#6B7280'
    const allMarkerEls = []

function getMarkerSize() {
  const zoom = map.current.getZoom()
  if (zoom < 16) return { size: 12, icon: 9, font: 5 }
  if (zoom < 18) return { size: 18, icon: 11, font: 7 }
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
      markersRef.current.push({ el, floor: v.floor })
      if (!isOnFloor(v.floor, currentFloorRef.current)) el.style.display = 'none'
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
          floor: v.floor,
        })
      })
    })

    // ── Deep link: ?venue=CODE ──
    const params = new URLSearchParams(window.location.search)
    const venueCode = params.get('venue')
    if (venueCode) {
      const venue = data.find(v => v.code === venueCode)
      if (venue) {
        onFloorChange?.(venue.floor)
        onSelect({
          id: venue.id,
          code: venue.code,
          type: venue.type,
          zone: venue.zone,
          number: venue.number,
          floor: venue.floor,
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