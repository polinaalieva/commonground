import { useEffect, useRef, useState } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import './Map.css'
import MapboxGeocoder from '@mapbox/mapbox-gl-geocoder'
import '@mapbox/mapbox-gl-geocoder/dist/mapbox-gl-geocoder.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const WORKER_URL = 'https://commonground.polina-alieva-int.workers.dev/geojson'

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

function getRatingLabel(rating) {
  const v = Number(rating)
  if (v >= 1 && v <= 4) return 'Not my place'
  if (v >= 5 && v <= 8) return 'Mixed feelings'
  if (v >= 9 && v <= 10) return 'Feels like mine'
  return 'No rating'
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;').replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#039;')
}

function isMobile() {
  return window.innerWidth <= 768
}

function Map({ city, config }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const activePopup = useRef(null)
  const tempMarker = useRef(null)
  const userMarker = useRef(null)
  const userCoords = useRef(null)
  const geoWatchId = useRef(null)
  const [mode, setMode] = useState('view')
  const [formOpen, setFormOpen] = useState(false)
  const [formUrl, setFormUrl] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const modeRef = useRef('view')

  function setModeSync(m) {
    modeRef.current = m
    setMode(m)
  }

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: config.center,
      zoom: config.zoom
    })

    if (config.bbox) map.current.setMaxBounds(config.bbox)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    const geocoder = new MapboxGeocoder({
  accessToken: mapboxgl.accessToken,
  mapboxgl: mapboxgl,
  marker: false,
  placeholder: 'Search address',
  countries: config.country || 'gb'
})
map.current.addControl(geocoder, 'top-left')

    map.current.on('load', () => {
      loadData()
      requestGeoAuto()
    })

    return () => {
      if (geoWatchId.current) navigator.geolocation.clearWatch(geoWatchId.current)
    }
  }, [])

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
              '<div class="cg-popup-value">' + (rating ? escapeHtml(getRatingLabel(rating)) : 'No rating') + '</div>' +
              '<div class="cg-popup-comment">' + (comment ? escapeHtml(comment) : '— no comment') + '</div>'
            )
            .addTo(map.current)
        })

        map.current.on('mouseenter', 'cg-feedback-layer', () => {
          if (isMobile()) return
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = ''
        })

        map.current.on('click', (e) => {
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['cg-feedback-layer'] })
          if (features.length > 0) return
          const { lng, lat } = e.lngLat
          if (modeRef.current === 'view') {
            if (isMobile()) return
            enterSelect([lng, lat])
          } else if (modeRef.current === 'select') {
            moveTemp([lng, lat])
          }
        })
      }
    } catch (e) {
      if (retries > 0) setTimeout(() => loadData(retries - 1), 900)
    } finally {
      setIsLoading(false)
    }
  }

  function enterSelect(coords) {
    if (activePopup.current) { activePopup.current.remove(); activePopup.current = null }
    setModeSync('select')
    if (!tempMarker.current) {
      const el = document.createElement('div')
      el.className = 'cg-temp-marker'
      const inner = document.createElement('div')
      inner.className = 'cg-temp-marker-inner'
      el.appendChild(inner)
      tempMarker.current = new mapboxgl.Marker({ element: el }).setLngLat(coords).addTo(map.current)
    } else {
      tempMarker.current.setLngLat(coords)
      if (!tempMarker.current._map) tempMarker.current.addTo(map.current)
    }
    if (userMarker.current && userMarker.current._map) userMarker.current.remove()
  }

  function moveTemp(coords) {
    if (!tempMarker.current) return
    tempMarker.current.setLngLat(coords)
  }

  function exitSelect() {
    setModeSync('view')
    if (tempMarker.current) { tempMarker.current.remove(); tempMarker.current = null }
    if (userCoords.current && userMarker.current) {
      userMarker.current.setLngLat(userCoords.current)
      if (!userMarker.current._map) userMarker.current.addTo(map.current)
    }
  }

  function confirmSelect() {
    if (!tempMarker.current) return
    const lngLat = tempMarker.current.getLngLat()
    const url = `https://commonground.fillout.com/placebelonging?City=${city}&Lat=${lngLat.lat.toFixed(6)}&Lng=${lngLat.lng.toFixed(6)}`
    exitSelect()
    setFormUrl(url)
    setFormOpen(true)
  }

  function closeForm() {
    setFormOpen(false)
    setTimeout(() => { setFormUrl(''); loadData(1) }, 280)
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
      if (modeRef.current === 'select') moveTemp([lng, lat])
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
    if (modeRef.current === 'select') return
    if (!userMarker.current) {
      const el = document.createElement('div')
      el.className = 'cg-user-marker'
      userMarker.current = new mapboxgl.Marker({ element: el })
    }
    userMarker.current.setLngLat([lng, lat])
    if (!userMarker.current._map) userMarker.current.addTo(map.current)
    if (fly) map.current.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 15), essential: true })
  }

  function onStartMobile() {
    const coords = userCoords.current || [map.current.getCenter().lng, map.current.getCenter().lat]
    enterSelect(coords)
  }

  return (
    <div style={{ position: 'relative', height: 'calc(100svh - 50px)', overflow: 'hidden' }}>
      <div ref={mapContainer} style={{ width: '100%', height: 'calc(100svh - 50px)' }} />

      <button className="cg-map-tool-btn" onClick={onLocateClick} aria-label="My location">
        <svg viewBox="0 0 12 12" aria-hidden="true">
          <path d="M6 1 L10.5 11 L6 8.8 L1.5 11 Z" fill="#111"/>
        </svg>
      </button>

      <div className="cg-panel-desktop">
        {mode === 'view' ? (
          <>
            <div className="cg-map-panel-title">Click on map to leave your signal</div>
            <div className="cg-map-panel-subtitle">or click on points to read other people's signals</div>
            <div className="cg-map-actions">
              <button className="cg-map-btn" onClick={onLocateClick}>⌖ My location</button>
              <button className="cg-map-btn" onClick={() => loadData(1)} disabled={isLoading}>
                {isLoading ? '⟳ Refreshing...' : '⟳ Refresh signals'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="cg-map-panel-title">Select location</div>
            <div className="cg-map-panel-subtitle">click on other place to choose other location</div>
            <div className="cg-map-actions">
              <button className="cg-map-btn" onClick={exitSelect}>Cancel</button>
              <button className="cg-map-btn cg-map-btn-dark" onClick={confirmSelect}>Leave signal here</button>
            </div>
          </>
        )}
      </div>

      <div className="cg-mobile-bottom">
        {mode === 'view' ? (
          <>
            <button className="cg-map-btn" onClick={() => loadData(1)} disabled={isLoading}>
              {isLoading ? '⟳' : '⟳ Refresh'}
            </button>
            <button className="cg-map-btn cg-map-btn-dark" onClick={onStartMobile}>＋ Leave your signal</button>
          </>
        ) : (
          <div className="cg-mobile-select-actions">
            <button className="cg-map-btn" onClick={exitSelect}>‹ Cancel</button>
            <button className="cg-map-btn cg-map-btn-dark" onClick={confirmSelect}>Leave signal here</button>
          </div>
        )}
      </div>

      <div className="cg-mobile-note">
        {mode === 'view'
          ? "leave your signal or tap on points to read other people's signals"
          : 'tap on another place to move your signal'}
      </div>

      <div className={'cg-form-modal' + (formOpen ? ' is-open' : '')}>
        <div className="cg-form-backdrop" onClick={closeForm} />
        <div className="cg-form-shell">
          <button className="cg-form-close" onClick={closeForm}>×</button>
          <iframe className="cg-form-iframe" src={formOpen ? formUrl : 'about:blank'} allow="clipboard-write" />
        </div>
      </div>
    </div>
  )
}

export default Map