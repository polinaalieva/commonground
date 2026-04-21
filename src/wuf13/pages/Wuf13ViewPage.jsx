import { useEffect, useRef, useState, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import { useWuf13Pins } from '../hooks/useWuf13Pins'
import { Wuf13Dashboard } from '../components/Wuf13Dashboard'
import { Wuf13PinCard } from '../components/Wuf13PinCard'
import './Wuf13ViewPage.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const WORLD_CENTER = [12, 20]
const WORLD_ZOOM = 1.5
const PIN_ZOOM = 5
const MIN_SHOW_MS = 5000   // minimum time to show a pin card
const RETURN_DELAY = 1500  // after card closes, wait before zoom-out

const RATING_COLORS = {
  1: '#ED4B9E', 2: '#CF60A0', 3: '#BF6AA0', 4: '#AC78A2',
  5: '#9986A3', 6: '#8593A4', 7: '#74A2A6', 8: '#5EAFA7',
  9: '#4EBBA8', 10: '#31D0AA',
}

function clamp(x, min, max) { return Math.max(min, Math.min(max, x)) }

export default function Wuf13ViewPage() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const markersRef = useRef([])

  const { pins, stats, newPin } = useWuf13Pins()

  // Autopilot state
  const [activePin, setActivePin] = useState(null)
  const activePinRef = useRef(null)
  const showTimerRef = useRef(null)
  const queueRef = useRef([])
  const isProcessingRef = useRef(false)

  // Dashboard layout — detect from screen ratio
  const [layout, setLayout] = useState('vertical')
  useEffect(() => {
    function check() {
      setLayout(window.innerWidth > window.innerHeight ? 'vertical' : 'horizontal')
    }
    check()
    window.addEventListener('resize', check)
    return () => window.removeEventListener('resize', check)
  }, [])

  // Init map
  useEffect(() => {
    if (map.current) return
    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      interactive: false, // presentation mode — no user interaction
    })

    map.current.on('load', () => {
      // Add source + layer for all pins
      map.current.addSource('wuf13-pins', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
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
    })
  }, [])

  // Update map pins when data changes
  useEffect(() => {
    if (!map.current || !map.current.isStyleLoaded()) return
    const source = map.current.getSource('wuf13-pins')
    if (!source) return

    const features = pins
      .filter(p => p.lat && p.lng)
      .map(p => ({
        type: 'Feature',
        id: p.id,
        geometry: { type: 'Point', coordinates: [p.lng, p.lat] },
        properties: {
          rating_color: p.ratingColor,
          experience: p.experience,
        },
      }))

    source.setData({ type: 'FeatureCollection', features })
  }, [pins])

  // Autopilot — return to world view
  const returnToWorld = useCallback(() => {
    setActivePin(null)
    activePinRef.current = null
    isProcessingRef.current = false

    map.current?.flyTo({
      center: WORLD_CENTER,
      zoom: WORLD_ZOOM,
      duration: 2500,
      essential: true,
    })
  }, [])

  // Autopilot — show a pin
  const showPin = useCallback((pin) => {
    if (!map.current) return
    activePinRef.current = pin
    setActivePin(pin)
    isProcessingRef.current = true

    map.current.flyTo({
      center: [pin.lng, pin.lat],
      zoom: PIN_ZOOM,
      duration: 2000,
      essential: true,
    })

    // Show for at least MIN_SHOW_MS, then check queue or return
    showTimerRef.current = setTimeout(() => {
      if (queueRef.current.length > 0) {
        const next = queueRef.current.shift()
        showPin(next)
      } else {
        // No more in queue — return to world after short delay
        setTimeout(returnToWorld, RETURN_DELAY)
      }
    }, MIN_SHOW_MS)
  }, [returnToWorld])

  // Handle new pins from polling
  useEffect(() => {
    if (!newPin) return

    if (!isProcessingRef.current) {
      showPin(newPin)
    } else {
      // Already showing something — queue it
      queueRef.current.push(newPin)
    }
  }, [newPin, showPin])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => clearTimeout(showTimerRef.current)
  }, [])

  return (
    <div className="wuf-view">
      <div ref={mapContainer} className="wuf-view__map" />
      <Wuf13Dashboard stats={stats} layout={layout} />
      <Wuf13PinCard pin={activePin} />
    </div>
  )
}
