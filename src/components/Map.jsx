import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.css'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import SurveySheet from './BottomSheet/SurveySheet'
import { FeedbackCard } from './FeedbackCard/FeedbackCard'
import EmptyZoneTooltip from './EmptyZoneTooltip/EmptyZoneTooltip'
import './EmptyZoneTooltip/EmptyZoneTooltip.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const WORKER_URL = import.meta.env.VITE_WORKER_URL

const RATING_COLORS = {
  1: '#ED4B9E', 2: '#DF5BA6', 3: '#C46DB4',
  4: '#A47EC0', 5: '#8490C8', 6: '#64A0C8',
  7: '#44B0BE', 8: '#34C4B4', 9: '#31CEAC', 10: '#31D0AA',
}

function getFeatureRating(props) {
  const candidates = ['place_rate','rating','rate','score','value','mark','Rate','Rating']
  for (const k of candidates) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') return props[k]
  }
  return ''
}

function getFeatureComment(props) {
  const candidates = ['experience','comment','text','message','feedback','notes','description','Comment','Feedback']
  for (const k of candidates) {
    if (props[k] !== undefined && props[k] !== null && String(props[k]).trim() !== '') return props[k]
  }
  return ''
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
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

  const [mode, setMode] = useState('view')
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPin, setSelectedPin] = useState(null)
  const [showEmptyTooltip, setShowEmptyTooltip] = useState(false)

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

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const geocoder = new MapboxGeocoder({
      accessToken: mapboxgl.accessToken,
      mapboxgl: mapboxgl,
      marker: false,
      placeholder: 'Search address',
      countries: cityConfig.country || 'gb'
    })
    map.current.addControl(geocoder, 'top-left')

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

      const res = await fetch(WORKER_URL, {
        cache: 'no-store',
        signal: controller.signal
      })
      clearTimeout(timeoutId)

      const geojson = await res.json()

      geojson.features = geojson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          has_comment: !!String(getFeatureComment(f.properties) || '').trim()
        }
      }))

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
              'case', ['boolean', ['feature-state', 'selected'], false],
              9,
              7
            ],
            'circle-opacity': ['case', ['==', ['get', 'has_comment'], true], 0.70, 0.30],
            'circle-color': [
              'case', ['boolean', ['feature-state', 'selected'], false],
              '#ffffff',
              [
                'to-color',
                ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
                  ['case',
                    ['==', ['var', 'c'], ''], '#9ca3af',
                    ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
                    ['concat', '#', ['var', 'c']]
                  ]
                ], '#9ca3af'
              ]
            ],
            'circle-stroke-color': [
              'case', ['boolean', ['feature-state', 'selected'], false],
              [
                'to-color',
                ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
                  ['case',
                    ['==', ['var', 'c'], ''], '#9ca3af',
                    ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
                    ['concat', '#', ['var', 'c']]
                  ]
                ], '#9ca3af'
              ],
              'rgba(0,0,0,0.25)'
            ],
            'circle-stroke-width': [
              'case', ['boolean', ['feature-state', 'selected'], false], 2.5, 1
            ],
            'circle-stroke-opacity': [
              'case',
              ['boolean', ['feature-state', 'selected'], false], 1,
              ['case', ['==', ['get', 'has_comment'], true], 0.9, 0]
            ]
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

          if (feature.id !== undefined) {
            map.current.setFeatureState(
              { source: 'cg-feedback', id: feature.id },
              { selected: true }
            )
            selectedFeatureId.current = feature.id
          }

          setSelectedPin({
            id: feature.id,
            ratingLabel: rating ? getRatingLabel(rating) : null,
            ratingColor: color,
            experience: getFeatureComment(props) || null,
            created_at: props.created_time || null,
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

  function onLocateClick() {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(pos => {
      const { longitude: lng, latitude: lat } = pos.coords
      updateUserLocation(lng, lat, true)
    }, () => {}, { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 })
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

      <button className="cg-map-tool-btn" onClick={onLocateClick} aria-label="My location">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1 L10.5 11 L6 8.8 L1.5 11 Z" fill="#111"/>
        </svg>
      </button>

      <FeedbackCard
        pin={selectedPin}
        surveySheetRef={bottomSheetRef}
        onDismiss={dismissSelectedPin}
      />

      <SurveySheet
        pinSelected={!!selectedPin}
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