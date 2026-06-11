// src/events/components/VenueLayer.jsx

import { useEffect, useRef } from 'react'
import { maplibregl } from '../../config/map'
import { EVENTS, buildZoneColorExpression } from '../../config/events'
import { VENUE_ICON_SVGS, VENUE_ICON_COLORS, svgToMapImage } from '../../config/venueIcons'

export function VenueLayer({ map, eventVenues = [], eventId, onSelect, onDeselect }) {
  const renderedRef = useRef(false)

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

  async function loadServiceIcons() {
    const types = [...new Set(
      eventVenues
        .filter(v => v.geometry_type === 'point' && v.type?.startsWith('service_'))
        .map(v => v.type)
    )]

    for (const type of types) {
      if (map.current.hasImage(type)) continue
      const svg = VENUE_ICON_SVGS[type]
      const color = VENUE_ICON_COLORS[type] || '#888888'
      if (!svg) continue
      try {
        const canvas = await svgToMapImage(svg, color, 32)
        if (!map.current.hasImage(type)) {
          map.current.addImage(type, canvas)
        }
      } catch (e) {
        console.warn(`Failed to load icon for ${type}`, e)
      }
    }
  }

  async function renderVenues(data) {
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
            coordinates: [typeof v.coordinates === 'string'
              ? JSON.parse(v.coordinates)
              : v.coordinates],
          },
        })),
      }

      map.current.addSource('venues-polygons', { type: 'geojson', data: geojson })

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

      map.current.on('click', 'venues-fill', (e) => {
        e.originalEvent.stopPropagation()
        const props = e.features[0]?.properties
        if (!props) return
        onSelect(props)
      })

      map.current.on('mouseenter', 'venues-fill', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'venues-fill', () => {
        map.current.getCanvas().style.cursor = ''
      })
    }

    // ── Points (service markers) ──
    await loadServiceIcons()

    points.forEach(v => {
      const isService = v.type?.startsWith('service_')
      const coords = typeof v.coordinates === 'string'
        ? JSON.parse(v.coordinates)
        : v.coordinates

      if (isService && VENUE_ICON_SVGS[v.type] && map.current.hasImage(v.type)) {
        // MapLibre symbol marker with custom icon
        const sourceId = `venue-point-${v.id}`
        map.current.addSource(sourceId, {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: { code: v.code, type: v.type, zone: v.zone, number: v.number },
            geometry: { type: 'Point', coordinates: coords },
          },
        })
        map.current.addLayer({
          id: sourceId,
          type: 'symbol',
          source: sourceId,
          layout: {
            'icon-image': v.type,
            'icon-size': 1,
            'icon-allow-overlap': true,
          },
        })
        map.current.on('click', sourceId, (e) => {
          e.originalEvent.stopPropagation()
          onSelect({ code: v.code, type: v.type, zone: v.zone, number: v.number })
        })
        map.current.on('mouseenter', sourceId, () => {
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', sourceId, () => {
          map.current.getCanvas().style.cursor = ''
        })
      } else {
        // Fallback: simple dot marker
        const el = document.createElement('div')
        el.style.cssText = `
          width: 10px; height: 10px;
          background: ${VENUE_ICON_COLORS[v.type] || '#F5A623'};
          border: 2px solid white;
          border-radius: 50%;
          cursor: pointer;
        `
        const marker = new maplibregl.Marker({ element: el })
          .setLngLat(coords)
          .addTo(map.current)

        marker.getElement().addEventListener('click', () => {
          onSelect({ code: v.code, type: v.type, zone: v.zone, number: v.number })
        })
      }
    })

    // ── Deep link: ?venue=CODE ──
    const params = new URLSearchParams(window.location.search)
    const venueCode = params.get('venue')
    if (venueCode) {
      const v = data.find(v => v.code === venueCode)
      if (v) {
        onSelect({ code: v.code, type: v.type, zone: v.zone, number: v.number })
        const raw = typeof v.coordinates === 'string' ? JSON.parse(v.coordinates) : v.coordinates
        const center = v.geometry_type === 'point'
          ? raw
          : [
              raw.reduce((s, c) => s + c[0], 0) / raw.length,
              raw.reduce((s, c) => s + c[1], 0) / raw.length,
            ]
        map.current.flyTo({ center, zoom: 17, essential: true })
      }
    }
  }

  return null
}// src/config/venueIcons.js
// SVG strings from Tabler Icons (outline) for MapLibre map markers
// https://tabler.io/icons

const ICON_SIZE = 20
const STROKE = 1.5

function makeSVG(paths) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="${STROKE}" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`
}

export const VENUE_ICON_SVGS = {
  service_pickup: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M5 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
     <path d="M15 17a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
     <path d="M5 17h-2v-6l2 -5h9l4 5h1a2 2 0 0 1 2 2v4h-2m-4 0h-6m-6 -6h15m-6 0v-5"/>`
  ),
  service_parking: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M3 5a2 2 0 0 1 2 -2h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14"/>
     <path d="M10 16v-8h2.667c.736 0 1.333 .895 1.333 2s-.597 2 -1.333 2h-2.667"/>`
  ),
  service_assembly: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M19.875 6.27c.7 .398 1.13 1.143 1.125 1.948v7.284c0 .809 -.443 1.555 -1.158 1.948l-6.75 4.27a2.27 2.27 0 0 1 -2.184 0l-6.75 -4.27a2.23 2.23 0 0 1 -1.158 -1.948v-7.285c0 -.809 .443 -1.554 1.158 -1.947l6.75 -3.98a2.33 2.33 0 0 1 2.25 0l6.75 3.98"/>
     <path d="M15.5 9.422c.312 .18 .503 .515 .5 .876v3.277c0 .364 -.197 .7 -.515 .877l-3 1.922a1 1 0 0 1 -.97 0l-3 -1.922a1 1 0 0 1 -.515 -.876v-3.278c0 -.364 .197 -.7 .514 -.877l3 -1.79c.311 -.174 .69 -.174 1 0l3 1.79"/>`
  ),
  service_lost_found: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M6 8a2 2 0 0 1 2 -2h8a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-8a2 2 0 0 1 -2 -2l0 -10"/>
     <path d="M9 6v-1a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v1"/>
     <path d="M6 10h12"/>
     <path d="M6 16h12"/>
     <path d="M9 20v1"/>
     <path d="M15 20v1"/>`
  ),
  service_info: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M3 12a9 9 0 1 0 18 0a9 9 0 0 0 -18 0"/>
     <path d="M12 9h.01"/>
     <path d="M11 12h1v4h1"/>`
  ),
  service_medical: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M8 8v-2a2 2 0 0 1 2 -2h4a2 2 0 0 1 2 2v2"/>
     <path d="M4 10a2 2 0 0 1 2 -2h12a2 2 0 0 1 2 2v8a2 2 0 0 1 -2 2h-12a2 2 0 0 1 -2 -2l0 -8"/>
     <path d="M10 14h4"/>
     <path d="M12 12v4"/>`
  ),
  service_nursing: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M6 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
     <path d="M16 19a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/>
     <path d="M2 5h2.5l1.632 4.897a6 6 0 0 0 5.693 4.103h2.675a5.5 5.5 0 0 0 0 -11h-.5v6"/>
     <path d="M6 9h14"/>
     <path d="M9 17l1 -3"/>
     <path d="M16 14l1 3"/>`
  ),
  service_prayer: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M13.5 5.49a1.764 1.764 0 0 1 -2.5 -2.49"/>
     <path d="M12 6v3"/>
     <path d="M19 21a8.9 8.9 0 0 0 1 -3.67c0 -2 -.92 -3.25 -3.24 -4.51a17.4 17.4 0 0 1 -4.76 -3.82a17.4 17.4 0 0 1 -4.76 3.82c-2.32 1.26 -3.24 2.55 -3.24 4.51a8.9 8.9 0 0 0 1 3.67h14"/>`
  ),
  service_quiet: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M15 8a5 5 0 0 1 1.912 4.934m-1.377 2.602a5 5 0 0 1 -.535 .464"/>
     <path d="M17.7 5a9 9 0 0 1 2.362 11.086m-1.676 2.299a9 9 0 0 1 -.686 .615"/>
     <path d="M9.069 5.054l.431 -.554a.8 .8 0 0 1 1.5 .5v2m0 4v8a.8 .8 0 0 1 -1.5 .5l-3.5 -4.5h-2a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1h2l1.294 -1.664"/>
     <path d="M3 3l18 18"/>`
  ),
  service_atm: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M7 15h-3a1 1 0 0 1 -1 -1v-8a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v3"/>
     <path d="M7 10a1 1 0 0 1 1 -1h12a1 1 0 0 1 1 1v8a1 1 0 0 1 -1 1h-12a1 1 0 0 1 -1 -1l0 -8"/>
     <path d="M12 14a2 2 0 1 0 4 0a2 2 0 0 0 -4 0"/>`
  ),
  service_food: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M19 3v12h-5c-.023 -3.681 .184 -7.406 5 -12m0 12v6h-1v-3m-10 -14v17m-3 -17v3a3 3 0 1 0 6 0v-3"/>`
  ),
  service_cafe: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M3 14c.83 .642 2.077 1.017 3.5 1c1.423 .017 2.67 -.358 3.5 -1c.83 -.642 2.077 -1.017 3.5 -1c1.423 -.017 2.67 .358 3.5 1"/>
     <path d="M8 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/>
     <path d="M12 3a2.4 2.4 0 0 0 -1 2a2.4 2.4 0 0 0 1 2"/>
     <path d="M3 10h14v5a6 6 0 0 1 -6 6h-2a6 6 0 0 1 -6 -6v-5"/>
     <path d="M16.746 16.726a3 3 0 1 0 .252 -5.555"/>`
  ),
  service_smoking: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M3 14a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1l0 -2"/>
     <path d="M8 13l0 4"/>
     <path d="M16 5v.5a2 2 0 0 0 2 2a2 2 0 0 1 2 2v.5"/>`
  ),
  service_vet: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M14.7 13.5c-1.1 -2 -1.441 -2.5 -2.7 -2.5c-1.259 0 -1.736 .755 -2.836 2.747c-.942 1.703 -2.846 1.845 -3.321 3.291c-.097 .265 -.145 .677 -.143 .962c0 1.176 .787 2 1.8 2c1.259 0 3 -1 4.5 -1s3.241 1 4.5 1c1.013 0 1.8 -.823 1.8 -2c0 -.285 -.049 -.697 -.146 -.962c-.475 -1.451 -2.512 -1.835 -3.454 -3.538"/>
     <path d="M20.188 8.082a1.039 1.039 0 0 0 -.406 -.082h-.015c-.735 .012 -1.56 .75 -1.993 1.866c-.519 1.335 -.28 2.7 .538 3.052c.129 .055 .267 .082 .406 .082c.739 0 1.575 -.742 2.011 -1.866c.516 -1.335 .273 -2.7 -.54 -3.052"/>
     <path d="M9.474 9c.055 0 .109 0 .163 -.011c.944 -.128 1.533 -1.346 1.32 -2.722c-.203 -1.297 -1.047 -2.267 -1.932 -2.267c-.055 0 -.109 0 -.163 .011c-.944 .128 -1.533 1.346 -1.32 2.722c.204 1.293 1.048 2.267 1.933 2.267"/>
     <path d="M16.456 6.733c.214 -1.376 -.375 -2.594 -1.32 -2.722a1.164 1.164 0 0 0 -.162 -.011c-.885 0 -1.728 .97 -1.93 2.267c-.214 1.376 .375 2.594 1.32 2.722c.054 .007 .108 .011 .162 .011c.885 0 1.73 -.974 1.93 -2.267"/>
     <path d="M5.69 12.918c.816 -.352 1.054 -1.719 .536 -3.052c-.436 -1.124 -1.271 -1.866 -2.009 -1.866c-.14 0 -.277 .027 -.407 .082c-.816 .352 -1.054 1.719 -.536 3.052c.436 1.124 1.271 1.866 2.009 1.866c.14 0 .277 -.027 .407 -.082"/>`
  ),
  service_relief: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M11 5h2"/>
     <path d="M19 12c-.667 5.333 -2.333 8 -5 8h-4c-2.667 0 -4.333 -2.667 -5 -8"/>
     <path d="M11 16c0 .667 .333 1 1 1s1 -.333 1 -1h-2"/>
     <path d="M12 18v2"/>
     <path d="M10 11v.01"/>
     <path d="M14 11v.01"/>
     <path d="M5 4l6 .97l-6.238 6.688a1.021 1.021 0 0 1 -1.41 .111a.953 .953 0 0 1 -.327 -.954l1.975 -6.815"/>
     <path d="M19 4l-6 .97l6.238 6.688c.358 .408 .989 .458 1.41 .111a.953 .953 0 0 0 .327 -.954l-1.975 -6.815"/>`
  ),
  service_restroom: makeSVG(
    `<path stroke="none" d="M0 0h24v24H0z" fill="none"/>
     <path d="M3 10a3 7 0 1 0 6 0a3 7 0 1 0 -6 0"/>
     <path d="M21 10c0 -3.866 -1.343 -7 -3 -7"/>
     <path d="M6 3h12"/>
     <path d="M21 10v10l-3 -1l-3 2l-3 -3l-3 2v-10"/>
     <path d="M6 10h.01"/>`
  ),
}

// Background colors per service type (shown as circle behind icon)
export const VENUE_ICON_COLORS = {
  service_pickup:     '#4A90E2',
  service_parking:    '#4A90E2',
  service_assembly:   '#E25B4A',
  service_lost_found: '#9B59B6',
  service_info:       '#3498DB',
  service_medical:    '#E74C3C',
  service_nursing:    '#E91E8C',
  service_prayer:     '#27AE60',
  service_quiet:      '#7F8C8D',
  service_atm:        '#27AE60',
  service_food:       '#F39C12',
  service_cafe:       '#8B4513',
  service_smoking:    '#95A5A6',
  service_vet:        '#16A085',
  service_relief:     '#27AE60',
  service_restroom:   '#2980B9',
}

// Convert SVG string to MapLibre-compatible Image via canvas
export function svgToMapImage(svgString, color, size = 32) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')

    // Draw colored circle background
    ctx.beginPath()
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.fill()

    // Draw SVG icon on top
    const blob = new Blob([svgString], { type: 'image/svg+xml' })
    const url = URL.createObjectURL(blob)
    const img = new Image()
    img.onload = () => {
      const padding = size * 0.2
      ctx.drawImage(img, padding, padding, size - padding * 2, size - padding * 2)
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(canvas)
    }
    img.src = url
  })
}