// src/events/components/VenueLayer.jsx

import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { maplibregl } from '../../config/map'
import { EVENTS, buildZoneColorExpression } from '../../config/events'
import { VENUE_ICONS } from '../../config/venueIcons'

export function VenueLayer({
  map,
  eventVenues = [],
  eventId,
  onSelect,
  selectedVenue,
}) {
  const renderedRef = useRef(false)
  const selectedMarkerElRef = useRef(null)

  useEffect(() => {
    if (!selectedVenue) {
      if (map.current?.getLayer('venues-outline')) {
        map.current.setPaintProperty('venues-outline', 'line-width', 1.5)
        map.current.setPaintProperty('venues-outline', 'line-opacity', 1)
      }

      if (selectedMarkerElRef.current) {
        selectedMarkerElRef.current.style.width = '25px'
        selectedMarkerElRef.current.style.height = '25px'
        selectedMarkerElRef.current.style.border = '2px solid white'
        selectedMarkerElRef.current.style.boxShadow =
          '0 2px 6px rgba(0,0,0,0.25)'
        selectedMarkerElRef.current = null
      }
    }
  }, [selectedVenue, map])

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
        <IconComponent size={18} color="white" stroke={1.5} />
      )
    }

    return el
  }

  function resetSelectedMarker() {
    if (!selectedMarkerElRef.current) return

    selectedMarkerElRef.current.style.width = '25px'
    selectedMarkerElRef.current.style.height = '25px'
    selectedMarkerElRef.current.style.border = '2px solid white'
    selectedMarkerElRef.current.style.boxShadow =
      '0 2px 6px rgba(0,0,0,0.25)'
    selectedMarkerElRef.current = null
  }

  function resetPolygonSelection() {
    if (!map.current?.getLayer('venues-outline')) return

    map.current.setPaintProperty('venues-outline', 'line-width', 1.5)
    map.current.setPaintProperty('venues-outline', 'line-opacity', 1)
  }

  function renderVenues(data) {
    if (map.current.getSource('venues-polygons')) return

    const zoneColor = buildZoneColorExpression(EVENTS[eventId]?.zoneColors || {})
    const polygons = data.filter(v => v.geometry_type === 'polygon')
    const points = data.filter(v => v.geometry_type === 'point')

    // ── Polygons ──
    if (polygons.length) {
      const geojson = {
        type: 'FeatureCollection',
        features: polygons.map(v => ({
          type: 'Feature',
          properties: {
            id: v.id,
            code: v.code,
            number: v.number,
            zone: v.zone,
            type: v.type,
          },
          geometry: {
            type: 'Polygon',
            coordinates: [
              typeof v.coordinates === 'string'
                ? JSON.parse(v.coordinates)
                : v.coordinates,
            ],
          },
        })),
      }

      map.current.addSource('venues-polygons', {
        type: 'geojson',
        data: geojson,
      })

      map.current.addLayer({
        id: 'venues-fill',
        type: 'fill',
        source: 'venues-polygons',
        paint: {
          'fill-color': zoneColor,
          'fill-opacity': 0.3,
        },
      })

      map.current.addLayer({
        id: 'venues-outline',
        type: 'line',
        source: 'venues-polygons',
        paint: {
          'line-color': zoneColor,
          'line-width': 1.5,
          'line-opacity': 1,
        },
      })

      map.current.addLayer({
        id: 'venues-labels',
        type: 'symbol',
        source: 'venues-polygons',
        layout: {
          'text-field': ['get', 'number'],
          'text-size': 12,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      })

      map.current.on('click', 'venues-fill', e => {
        e.originalEvent.stopPropagation()

        const props = e.features[0]?.properties
        if (!props) return

        resetSelectedMarker()

        map.current.setPaintProperty('venues-outline', 'line-width', [
          'case',
          ['==', ['get', 'id'], props.id],
          4,
          1.5,
        ])

        map.current.setPaintProperty('venues-outline', 'line-opacity', [
          'case',
          ['==', ['get', 'id'], props.id],
          1,
          0.4,
        ])

        onSelect(props)
      })

      map.current.on('mouseenter', 'venues-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })

      map.current.on('mouseleave', 'venues-fill', () => {
        map.current.getCanvas().style.cursor = ''
      })
    }

    // ── Points ──
    const serviceColor = EVENTS[eventId]?.serviceColor || '#6B7280'

    points.forEach(v => {
      const coords =
        typeof v.coordinates === 'string'
          ? JSON.parse(v.coordinates)
          : v.coordinates

      const isService = v.type?.startsWith('service_')

      const el = isService
        ? makeServiceMarkerEl(v.type, serviceColor)
        : (() => {
            const dot = document.createElement('div')
            dot.style.cssText = `
              width: 10px;
              height: 10px;
              background: #F5A623;
              border: 2px solid white;
              border-radius: 50%;
              cursor: pointer;
            `
            return dot
          })()

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current)

      marker.getElement().addEventListener('click', e => {
        e.stopPropagation()

        resetSelectedMarker()
        resetPolygonSelection()

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

        const center =
          venue.geometry_type === 'point'
            ? raw
            : [
                raw.reduce((sum, coord) => sum + coord[0], 0) / raw.length,
                raw.reduce((sum, coord) => sum + coord[1], 0) / raw.length,
              ]

        map.current.flyTo({
          center,
          zoom: 17,
          essential: true,
        })
      }
    }
  }

  return null
}