import { useEffect, useRef, useState, useCallback } from 'react'
import { maplibregl, MAP_STYLE } from '../../config/map'
import { useWuf13Pins } from '../hooks/useWuf13Pins'
import { Wuf13Dashboard } from '../components/Wuf13Dashboard'
import { Wuf13PinCard } from '../components/Wuf13PinCard'
import './Wuf13ViewPage.css'


const WORLD_CENTER = [12, 20]
const WORLD_ZOOM = 1.5
const AUTO_DISMISS_MS = 4000

function createPulseMarker(color) {
  const el = document.createElement('div')
  el.className = 'wuf-pulse'
  el.style.setProperty('--pulse-color', color || '#4EBBA8')
  return el
}

export default function Wuf13DashboardPage() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const pulseMarkerRef = useRef(null)
  const pinsRef = useRef([])
  const dismissTimerRef = useRef(null)

  const { pins, stats, newPin } = useWuf13Pins()

  const [activePin, setActivePin] = useState(null)
  const [layout, setLayout] = useState('vertical')

  useEffect(() => {
    function check() {
      setLayout(window.innerWidth > window.innerHeight ? 'vertical' : 'horizontal')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  const removePulseMarker = useCallback(() => {
    if (pulseMarkerRef.current) {
      pulseMarkerRef.current.remove()
      pulseMarkerRef.current = null
    }
  }, [])

  const dismiss = useCallback(() => {
    clearTimeout(dismissTimerRef.current)
    removePulseMarker()
    setActivePin(null)
  }, [removePulseMarker])

  // Refs so map click handlers always call the latest version
  const showPinRef = useRef(null)
  const dismissRef = useRef(dismiss)
  useEffect(() => { dismissRef.current = dismiss }, [dismiss])

  const showPinWithTimer = useCallback((pin) => {
    clearTimeout(dismissTimerRef.current)
    setActivePin(pin)
    dismissTimerRef.current = setTimeout(() => {
      removePulseMarker()
      setActivePin(null)
    }, AUTO_DISMISS_MS)
  }, [removePulseMarker])

  useEffect(() => { showPinRef.current = showPinWithTimer }, [showPinWithTimer])

  // Keep pinsRef in sync for click handler
  useEffect(() => {
    pinsRef.current = pins
  }, [pins])

  // Init map — interactive
  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      interactive: true,
    })

    map.current.on('load', () => {
      map.current.addSource('wuf13-pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        promoteId: 'id',
      })
      map.current.addLayer({
        id: 'wuf13-pins-layer',
        type: 'circle',
        source: 'wuf13-pins',
        paint: {
          'circle-radius': ['interpolate', ['linear'], ['zoom'], 1, 4, 5, 8, 10, 14],
          'circle-opacity': 0.75,
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
          'circle-stroke-color': 'rgba(255,255,255,0.8)',
          'circle-stroke-width': 1.5,
        },
      })

      map.current.on('click', 'wuf13-pins-layer', (e) => {
        const feature = e.features?.[0]
        if (!feature) return
        const pin = pinsRef.current.find(p => p.id === feature.id)
        if (pin) showPinRef.current?.(pin)
      })

      map.current.on('mouseenter', 'wuf13-pins-layer', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'wuf13-pins-layer', () => {
        map.current.getCanvas().style.cursor = ''
      })

      map.current.on('click', (e) => {
        const features = map.current.queryRenderedFeatures(e.point, { layers: ['wuf13-pins-layer'] })
        if (features.length === 0) dismissRef.current?.()
      })
    })
  }, [])

  // Update map pins when data changes
  useEffect(() => {
    if (!map.current || !pins.length) return

    const features = pins
      .filter(p => p.lat && p.lng)
      .map(p => ({
        type: 'Feature',
        id: p.id,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: { id: p.id, rating_color: p.ratingColor },
      }))

    const geojson = { type: 'FeatureCollection', features }

    function apply() {
      const source = map.current?.getSource('wuf13-pins')
      if (source) source.setData(geojson)
    }

    if (map.current.isStyleLoaded()) {
      apply()
    } else {
      map.current.once('load', apply)
    }
  }, [pins])

  // New pin — show card + pulse marker, no flyTo
  useEffect(() => {
    if (!newPin) return
    removePulseMarker()
    const el = createPulseMarker(newPin.ratingColor)
    pulseMarkerRef.current = new maplibregl.Marker({ element: el, anchor: 'center' })
      .setLngLat([newPin.lng, newPin.lat])
      .addTo(map.current)
    showPinWithTimer(newPin)
  }, [newPin, removePulseMarker, showPinWithTimer])

  useEffect(() => {
    return () => {
      clearTimeout(dismissTimerRef.current)
      removePulseMarker()
    }
  }, [removePulseMarker])

  return (
    <div className="wuf-view">
      <div ref={mapContainer} className="wuf-view__map" />
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        zIndex: 40,
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 17,
        fontWeight: 700,
        color: '#111',
        pointerEvents: 'none',
        whiteSpace: 'nowrap',
      }}>
        Common Ground · WUF13 Dashboard
      </div>
      <Wuf13Dashboard stats={stats} layout={layout} />
      <Wuf13PinCard pin={activePin} onDismiss={dismiss} />
    </div>
  )
}
