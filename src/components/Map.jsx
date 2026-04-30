// src/components/Map.jsx

import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.css'
import SurveySheet from './BottomSheet/SurveySheet'
import { FeedbackCard } from './FeedbackCard/FeedbackCard'
import { HexCard } from './HexCard/HexCard'
import EmptyZoneTooltip from './EmptyZoneTooltip/EmptyZoneTooltip'
import './EmptyZoneTooltip/EmptyZoneTooltip.css'
import MapUI from './MapUI/MapUI'
import { latLngToCell, cellToBoundary } from 'h3-js'
import { Hexagon } from 'lucide-react'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

const RATING_COLORS = {
    1: "#ED4B9E", 2: "#CF60A0", 3: "#BF6AA0", 4: "#AC78A2",
  5: "#9986A3", 6: "#8593A4", 7: "#74A2A6", 8: "#5EAFA7",
  9: "#4EBBA8", 10: "#31D0AA",
}

function clamp(x, min, max) {
  return Math.max(min, Math.min(max, x))
}

function toGeoJSON(records) {
  const features = records
    .filter(r => r.lat && r.lng)
    .map(r => {
      const rating = r.place_rate ? clamp(Math.round(r.place_rate), 1, 10) : null
      const experience = r.experience ?? null
      const dateStr = r.original_date || r.created_at
      const d = dateStr ? new Date(dateStr) : null
      const oneYearAgo = new Date()
      oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)

      return {
        type: 'Feature',
        id: r.id,
        geometry: { type: 'Point', coordinates: [r.lng, r.lat] },
        properties: {
          id: r.id,
          city: r.city ?? null,
          source: r.source ?? null,
          place_rate: rating,
          experience,
          created_time: r.created_at ?? null,
          original_date: r.original_date ?? null,
          metric_type: r.metric_type ?? null,
          rating_color: rating ? RATING_COLORS[rating] : null,
          has_comment: (experience && String(experience).trim()) ? 1 : 0,
          is_old: (d && !isNaN(d) && d < oneYearAgo) ? 1 : 0,
        },
      }
    })
  return { type: 'FeatureCollection', features }
}

function getFeatureRating(props) {
  const candidates = ['place_rate', 'rating', 'rate', 'score', 'value', 'mark', 'Rate', 'Rating']
  for (const k of candidates) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') return props[k]
  }
  return ''
}

function getFeatureComment(props) {
  const candidates = ['experience', 'comment', 'text', 'message', 'feedback', 'notes', 'description', 'Comment', 'Feedback']
  for (const k of candidates) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') return props[k]
  }
  return ''
}

function isMobile() {
  return window.innerWidth <= 768
}

function Map({ city, cityConfig, pageContent, variant, source, lang }) {

  const mapContainer = useRef(null)
  const map = useRef(null)
  const userMarker = useRef(null)
  const userCoords = useRef(null)
  const geoWatchId = useRef(null)
  const centerPinRef = useRef(null)
  const surveySheetRef = useRef(null)
  const bottomSheetRef = useRef(null)
  const selectedFeatureId = useRef(null)
  const dataLoadedRef = useRef(false)
  const emptyTooltipShownRef = useRef(false)
  const allPointsRef = useRef([])
  const hexModeRef = useRef(false)

  function getHexResolution() {
  const zoom = map.current?.getZoom() ?? 10
  if (zoom < 7.5) return 6
  if (zoom < 9) return 7
  if (zoom < 11) return 7
  if (zoom < 13) return 8
  return 9
}

  const [mode, setMode] = useState('view')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPin, setSelectedPin] = useState(null)
  const [showEmptyTooltip, setShowEmptyTooltip] = useState(false)
  const [hexMode, setHexMode] = useState(false)
  const [selectedHex, setSelectedHex] = useState(null)
  const [showHexTooltip, setShowHexTooltip] = useState(false)

  const modeRef = useRef('view')
  const pageContentRef = useRef(pageContent)
  useEffect(() => {
    pageContentRef.current = pageContent
  }, [pageContent])

  function getRatingLabel(rating) {
    const v = Number(rating)
    if (v >= 1 && v <= 3) return pageContentRef.current.map_labels.low
    if (v >= 4 && v <= 7) return pageContentRef.current.map_labels.mid
    if (v >= 8 && v <= 10) return pageContentRef.current.map_labels.high
    return ''
  }

  function getRatingColor(rating) {
    const v = Number(rating)
    if (!v || v < 1 || v > 10) return '#9ca3af'
    return RATING_COLORS[Math.round(v)] || '#9ca3af'
  }

  function setModeSync(m) {
    modeRef.current = m
    setMode(m)
  }

  useEffect(() => {
    if (map.current) {
      map.current.flyTo({
        center: cityConfig.center,
        zoom: cityConfig.zoom,
        essential: true,
        duration: 2500
      })
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: cityConfig.center,
      zoom: cityConfig.zoom
    })

    map.current.on('load', () => {
      loadData()
      if (city === 'map') setTimeout(() => requestGeoAuto(), 500)
    })

    return () => {
      if (geoWatchId.current) navigator.geolocation.clearWatch(geoWatchId.current)
    }
  }, [cityConfig])

  // ── Empty zone tooltip ──
  useEffect(() => {
    if (!map.current) return

    const EMPTY_ZOOM_MIN = 15
    const EMPTY_RADIUS_PX = 120

    function checkEmptyZone() {
      if (!dataLoadedRef.current) return
      if (modeRef.current !== 'view') {
        setShowEmptyTooltip(false)
        return
      }

      const zoom = map.current.getZoom()
      if (zoom < EMPTY_ZOOM_MIN) {
        setShowEmptyTooltip(false)
        return
      }

      const canvas = map.current.getCanvas()
      const cx = canvas.offsetWidth / 2
      const cy = canvas.offsetHeight / 2

      const features = map.current.queryRenderedFeatures(
        [
          [cx - EMPTY_RADIUS_PX, cy - EMPTY_RADIUS_PX],
          [cx + EMPTY_RADIUS_PX, cy + EMPTY_RADIUS_PX],
        ],
        { layers: ['cg-feedback-layer'] }
      )

      if (features.length === 0 && !emptyTooltipShownRef.current) {
        emptyTooltipShownRef.current = true
        setShowEmptyTooltip(true)
      } else if (features.length > 0) {
        setShowEmptyTooltip(false)
      }
    }

    map.current.on('moveend', checkEmptyZone)
    map.current.on('zoomend', checkEmptyZone)

    return () => {
      if (map.current) {
        map.current.off('moveend', checkEmptyZone)
        map.current.off('zoomend', checkEmptyZone)
      }
    }
  }, [])

  async function loadData(retries = 2) {
    setIsLoading(true)
    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 10000)

      const apiUrl = `${SUPABASE_URL}/rest/v1/feedback_map?select=id,city,source,lat,lng,place_rate,experience,created_at,original_date,metric_type&order=created_at.desc&limit=1000`

      const res = await fetch(apiUrl, {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
        },
        cache: 'no-store',
        signal: controller.signal,
      })
      clearTimeout(timeoutId)

      const records = await res.json()
      console.log('sample record:', records[0])
      allPointsRef.current = records
      const geojson = toGeoJSON(records)
      console.log('sample feature props:', geojson.features[0]?.properties)


      const mapSource = map.current.getSource('cg-feedback')
      if (mapSource) {
        mapSource.setData(geojson)
      } else {
        map.current.addSource('cg-feedback', {
          type: 'geojson',
          data: geojson,
          promoteId: 'id',
        })

        map.current.addLayer({
          id: 'cg-feedback-layer',
          type: 'circle',
          source: 'cg-feedback',
          paint: {
  'circle-radius': [
  'case', ['boolean', ['feature-state', 'selected'], false], 10,
  ['case', ['==', ['get', 'has_comment'], 1], 7, 4]
],
  'circle-color': [
    'to-color',
    ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
      ['case',
        ['==', ['var', 'c'], ''], '#9ca3af',
        ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
        ['concat', '#', ['var', 'c']]
      ]
    ], '#9ca3af'
  ],
  'circle-opacity': [
  'case', ['boolean', ['feature-state', 'selected'], false], 1,
  ['case', ['==', ['get', 'is_old'], 1], 0.25,
    ['case', ['==', ['get', 'has_comment'], 1], 0.70, 0.20]
  ]
],
  'circle-stroke-color': [
    'case', ['boolean', ['feature-state', 'selected'], false], '#ffffff',
    ['to-color',
      ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
        ['case',
          ['==', ['var', 'c'], ''], '#9ca3af',
          ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
          ['concat', '#', ['var', 'c']]
        ]
      ], '#9ca3af'
    ]
  ],
  'circle-stroke-width': [
  'case', ['boolean', ['feature-state', 'selected'], false], 3,
  ['case', ['==', ['get', 'has_comment'], 1], 0, 2.5]
],
  'circle-stroke-opacity': [
    'case', ['boolean', ['feature-state', 'selected'], false], 1,
    ['case', ['==', ['get', 'is_old'], 1], 0.35, 0.6]
  ],
}
        })

        

        dataLoadedRef.current = true

        map.current.on('click', 'cg-feedback-layer', (e) => {
          if (modeRef.current !== 'view') return
          e.originalEvent.stopPropagation()
          const feature = e.features[0]
          if (!feature) return

          const props = feature.properties || {}
          const rating = getFeatureRating(props)
          const color = getRatingColor(rating)

          if (selectedFeatureId.current !== null) {
  map.current.setFeatureState(
    { source: 'cg-feedback', id: selectedFeatureId.current },
    { selected: false }
  )
}

if (feature.properties.id !== undefined) {
  map.current.setFeatureState(
    { source: 'cg-feedback', id: feature.properties.id },
    { selected: true }
  )
  selectedFeatureId.current = feature.properties.id
}

          setSelectedPin({
            id: feature.id,
            ratingLabel: rating ? getRatingLabel(rating) : null,
            ratingColor: color,
            experience: getFeatureComment(props) || null,
            created_at: props.created_time || null,
            original_date: props.original_date || null,
            source: props.source || null,
          })
        })

        map.current.on('mouseenter', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = ''
        })

        map.current.on('click', (e) => {
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['cg-feedback-layer'] })
          if (features.length > 0) return
          if (modeRef.current === 'select') return
          dismissSelectedPin()
          setShowEmptyTooltip(false)
        })
      }
    } catch (e) {
      if (retries > 0) setTimeout(() => loadData(retries - 1), 900)
    } finally {
      setIsLoading(false)
    }
  }

  // ── Hex layer ──

  function buildHexData(points) {
    const hexMap = {}
    points.forEach(r => {
      if (!r.lat || !r.lng || !r.place_rate) return
      const cell = latLngToCell(r.lat, r.lng, getHexResolution())
      if (!hexMap[cell]) hexMap[cell] = { ratings: [], comments: [] }
      hexMap[cell].ratings.push(r.place_rate)
      if (r.experience) hexMap[cell].comments.push({
        text: r.experience,
        date: r.original_date || r.created_at || null,
        source: r.source || null,
      })
      hexMap[cell].comments.sort((a, b) => {
  const da = new Date(a.date || 0)
  const db = new Date(b.date || 0)
  return db - da
})
    })

    const features = Object.entries(hexMap).map(([cell, data]) => {
      const avg = data.ratings.reduce((a, b) => a + b, 0) / data.ratings.length
      const count = data.ratings.length
      const opacity = Math.min(0.1 + (count / 20) * 0.9, 1.0)
      const colorRating = Math.round(clamp(avg, 1, 10))
      const boundary = cellToBoundary(cell)
      return {
        type: 'Feature',
        properties: {
          cell,
          avgRating: avg,
          count,
          opacity,
          fillColor: RATING_COLORS[colorRating],
          comments: JSON.stringify(data.comments),
        },
        geometry: {
          type: 'Polygon',
          coordinates: [[...boundary.map(([lat, lng]) => [lng, lat]), [boundary[0][1], boundary[0][0]]]],
        },
      }
    })

    return { type: 'FeatureCollection', features }
  }

function showHexLayer() {
  const hexData = buildHexData(allPointsRef.current)

  if (map.current.getSource('cg-hex')) {
    map.current.getSource('cg-hex').setData(hexData)
    map.current.setLayoutProperty('cg-hex-layer', 'visibility', 'visible')
    return
  }

  map.current.addSource('cg-hex', { type: 'geojson', data: hexData })

  map.current.addLayer({
    id: 'cg-hex-layer',
    type: 'fill',
    source: 'cg-hex',
    paint: {
      'fill-color': ['get', 'fillColor'],
      'fill-opacity': ['get', 'opacity'],
    },
  })

  map.current.addLayer({
    id: 'cg-hex-selected-layer',
    type: 'line',
    source: 'cg-hex',
    paint: {
      'line-color': ['get', 'fillColor'],
      'line-width': 2.5,
      'line-opacity': 0.7,
    },
    filter: ['==', ['get', 'cell'], ''],
  })

  map.current.on('zoomend', () => {
    if (!hexModeRef.current) return
    const updated = buildHexData(allPointsRef.current)
    map.current.getSource('cg-hex')?.setData(updated)
  })

  map.current.on('click', 'cg-hex-layer', (e) => {
    if (modeRef.current !== 'view') return
    e.originalEvent.stopPropagation()
    const props = e.features[0]?.properties
    if (!props) return
    map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], props.cell])
    setSelectedHex({
      avgRating: props.avgRating,
      count: props.count,
      comments: typeof props.comments === 'string' ? JSON.parse(props.comments) : props.comments,
    })
  })

  map.current.on('mouseenter', 'cg-hex-layer', () => {
    map.current.getCanvas().style.cursor = 'pointer'
  })
  map.current.on('mouseleave', 'cg-hex-layer', () => {
    map.current.getCanvas().style.cursor = ''
  })
}
  function toggleHex() {
    const next = !hexModeRef.current
    hexModeRef.current = next
    setHexMode(next)
    setSelectedHex(null)

    if (!localStorage.getItem('hexTipSeen')) {
  setShowHexTooltip(true)
setTimeout(() => setShowHexTooltip(false), 3000)
}
    if (next) {
    setShowHexTooltip(true)
  setTimeout(() => setShowHexTooltip(false), 3000)
  if (map.current.getLayer('cg-feedback-layer')) {
        map.current.setLayoutProperty('cg-feedback-layer', 'visibility', 'none')
      }
      dismissSelectedPin()
      showHexLayer()
    } else {
  if (map.current.getLayer('cg-hex-selected-layer')) {
    map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
  }
  if (map.current.getLayer('cg-feedback-layer')) {
    map.current.setLayoutProperty('cg-feedback-layer', 'visibility', 'visible')
  }
  if (map.current.getLayer('cg-hex-layer')) {
    map.current.setLayoutProperty('cg-hex-layer', 'visibility', 'none')
  }
}
  }

  function dismissSelectedPin() {
    if (selectedFeatureId.current !== null && map.current) {
      map.current.setFeatureState(
        { source: 'cg-feedback', id: selectedFeatureId.current },
        { selected: false }
      )
      selectedFeatureId.current = null
    }
    setSelectedPin(null)
  }

  function enterSelect() {
  setShowEmptyTooltip(false)
  dismissSelectedPin()
  setModeSync('select')
  setSelectedHex(null)
  if (map.current?.getLayer('cg-hex-selected-layer')) {
    map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
  }
}

  function exitSelect() {
    setModeSync('view')
    enableMap()
    if (userCoords.current && userMarker.current) {
      userMarker.current.setLngLat(userCoords.current)
      if (!userMarker.current._map) userMarker.current.addTo(map.current)
    }
  }

  function handleEmptyTooltipClick() {
    setShowEmptyTooltip(false)
    if (surveySheetRef.current) {
      surveySheetRef.current.startSelect()
    }
  }

  function getCenter() {
    if (centerPinRef.current && mapContainer.current) {
      const mapRect = mapContainer.current.getBoundingClientRect()
      const pinRect = centerPinRef.current.getBoundingClientRect()
      const pinX = pinRect.left + pinRect.width / 2 - mapRect.left
      const pinY = pinRect.top + pinRect.height / 2 - mapRect.top
      const coords = map.current.unproject([pinX, pinY])
      return { lat: coords.lat, lng: coords.lng }
    }
    const c = map.current.getCenter()
    return { lat: c.lat, lng: c.lng }
  }

  function onMapMoveEnd(callback) {
    map.current.on('moveend', callback)
    return () => map.current.off('moveend', callback)
  }

  function disableMap() {
    map.current.dragPan.disable()
    map.current.scrollZoom.disable()
    map.current.touchZoomRotate.disable()
  }

  function enableMap() {
    map.current.dragPan.enable()
    map.current.scrollZoom.enable()
    map.current.touchZoomRotate.enable()
  }

  function requestGeoAuto() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude: lng, latitude: lat } = pos.coords
      updateUserLocation(lng, lat, true)
      startGeoWatch()
    }, () => {}, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 })
  }

  function onLocate(lng, lat) {
    updateUserLocation(lng, lat, true)
  }

  function startGeoWatch() {
    if (geoWatchId.current !== null) return
    geoWatchId.current = navigator.geolocation.watchPosition(pos => {
      updateUserLocation(pos.coords.longitude, pos.coords.latitude, false)
    }, () => {}, { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 })
  }

  function updateUserLocation(lng, lat, fly) {
    userCoords.current = [lng, lat]
    if (!userMarker.current) {
      const el = document.createElement('div')
      el.className = 'cg-user-marker'
      userMarker.current = new mapboxgl.Marker({ element: el })
    }
    userMarker.current.setLngLat([lng, lat])
    if (!userMarker.current._map) userMarker.current.addTo(map.current)
    if (fly) map.current.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 15), essential: true })
  }

  function closeSurvey() {
    exitSelect()
    setTimeout(() => loadData(1), 300)
  }

  return (
    <div className="cg-map-outer">
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {mode === 'select' && (
        <div className="cg-center-pin" ref={centerPinRef}>
          <div className="cg-center-pin-inner" />
        </div>
      )}

      {showEmptyTooltip && mode === 'view' && (
        <EmptyZoneTooltip
          text={pageContent.empty_zone_tooltip.text}
          cta={pageContent.empty_zone_tooltip.cta}
          onClick={handleEmptyTooltipClick}
        />
      )}

      {showHexTooltip && (
  <EmptyZoneTooltip
    text={<>Tap any <Hexagon size={13} style={{ display: 'inline', verticalAlign: 'middle' }} /> to see area feedback</>}
    cta=""
    onClick={() => setShowHexTooltip(false)}
  />
)}

      <MapUI
        onZoomIn={() => map.current?.zoomIn()}
        onZoomOut={() => map.current?.zoomOut()}
        onLocate={onLocate}
        onToggleHex={toggleHex}
        hexMode={hexMode}
        variant={variant}
        lang={lang}
      />

      <FeedbackCard
        pin={selectedPin}
        surveySheetRef={bottomSheetRef}
        onDismiss={dismissSelectedPin}
      />

      <HexCard
        hex={selectedHex}
        surveySheetRef={bottomSheetRef}
        onDismiss={() => {
          setSelectedHex(null)
          if (map.current?.getLayer('cg-hex-selected-layer')) {
            map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
          }
        }}
      />

      <SurveySheet
        pinSelected={!!selectedPin || !!selectedHex}
        ref={surveySheetRef}
        bottomSheetRef={bottomSheetRef}
        city={city}
        source={source}
        variant={variant}
        lang={lang}
        pageContent={pageContent}
        getCenter={getCenter}
        onStartSelect={enterSelect}
        onMapMoveEnd={onMapMoveEnd}
        onDisableMap={disableMap}
        onEnableMap={enableMap}
        onClose={closeSurvey}
      />
    </div>
  )
}

export default Map