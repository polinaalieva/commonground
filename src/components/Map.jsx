import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.css'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'
import SurveySheet from './BottomSheet/SurveySheet'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const WORKER_URL = import.meta.env.VITE_WORKER_URL

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
  const activePopup = useRef(null)
  const userMarker = useRef(null)
  const userCoords = useRef(null)
  const geoWatchId = useRef(null)
  const centerPinRef = useRef(null)
  const [mode, setMode] = useState('view')
  const [isLoading, setIsLoading] = useState(false)
  const modeRef = useRef('view')

  // ↓ getRatingLabel теперь здесь — берёт лейблы из pageContent
  function getRatingLabel(rating) {
    const v = Number(rating)
    if (v >= 1 && v <= 3) return pageContent.map_labels.low
    if (v >= 4 && v <= 7) return pageContent.map_labels.mid
    if (v >= 8 && v <= 10) return pageContent.map_labels.high
    return ''
  }

  function setModeSync(m) {
    modeRef.current = m
    setMode(m)
  }

  useEffect(() => {
    // Если карта уже есть — просто перелетаем на новый город
    if (map.current) {
      map.current.setMaxBounds(null) // сначала снимаем ограничения
      map.current.flyTo({
        center: cityConfig.center,
        zoom: cityConfig.zoom,
        essential: true,
        duration: 2500
      })
      // После анимации - новые bounds (если есть)
      setTimeout(() => {
        if (cityConfig.bbox) map.current.setMaxBounds(cityConfig.bbox)
        else map.current.setMaxBounds(null)
      }, 2600)
      return
    }

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: cityConfig.center,
      zoom: cityConfig.zoom
    })

    if (cityConfig.bbox) map.current.setMaxBounds(cityConfig.bbox)
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
      requestGeoAuto()
    })

    return () => {
      if (geoWatchId.current) navigator.geolocation.clearWatch(geoWatchId.current)
    }
  }, [cityConfig]) // ← было [], стало [cityConfig]

  async function loadData(retries = 2) {
    if (isLoading) return
    setIsLoading(true)
    try {
      const res = await fetch(WORKER_URL, { cache: 'no-store' })
      const geojson = await res.json()

      geojson.features = geojson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          has_comment: !!String(getFeatureComment(f.properties) || '').trim()
        }
      }))

      const source = map.current.getSource('cg-feedback')
      if (source) {
        source.setData(geojson)
      } else {
        map.current.addSource('cg-feedback', { type: 'geojson', data: geojson })
        map.current.addLayer({
          id: 'cg-feedback-layer',
          type: 'circle',
          source: 'cg-feedback',
          paint: {
            'circle-radius': 7,
            'circle-opacity': ['case', ['==', ['get', 'has_comment'], true], 0.70, 0.30],
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
            'circle-stroke-color': 'rgba(0,0,0,0.25)',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': ['case', ['==', ['get', 'has_comment'], true], 0.9, 0]
          }
        })

        map.current.on('click', 'cg-feedback-layer', (e) => {
          if (modeRef.current !== 'view') return
          e.originalEvent.stopPropagation()
          const feature = e.features[0]
          if (!feature) return
          const props = feature.properties || {}
          const rating = getFeatureRating(props)
          const comment = getFeatureComment(props)
          if (activePopup.current) activePopup.current.remove()
          activePopup.current = new mapboxgl.Popup({ closeButton: true, closeOnClick: true, offset: 12 })
            .setLngLat(feature.geometry.coordinates.slice())
            .setHTML(
              '<div class="cg-popup-value">' + (rating ? escapeHtml(getRatingLabel(rating)) : '') + '</div>' +
              '<div class="cg-popup-comment">' + (comment ? escapeHtml(comment) : '— no comment') + '</div>'
            )
            .addTo(map.current)
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
        })
      }
    } catch (e) {
      if (retries > 0) setTimeout(() => loadData(retries - 1), 900)
    } finally {
      setIsLoading(false)
    }
  }

  function enterSelect() {
    if (activePopup.current) { activePopup.current.remove(); activePopup.current = null }
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

      <button className="cg-map-tool-btn" onClick={onLocateClick} aria-label="My location">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1 L10.5 11 L6 8.8 L1.5 11 Z" fill="#111"/>
        </svg>
      </button>

      <SurveySheet
        city={city}
        source={source}          // ← раньше было source={city}, это была ошибка!
        variant={variant}        // ← новое
        lang={lang}              // ← новое
        pageContent={pageContent} // ← новое
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