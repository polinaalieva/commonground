// src/components/Map.jsx

import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { maplibregl, MAP_STYLE_CG } from '../config/map'
import { addOrientationLayers } from '../config/orientationLayers'
import { createCityMarkers, hidePointsBelowCityZoom } from './CityMarkers/cityMarkers'
import './Map.css'
import Survey_BSheet from './BottomSheet/Survey_v2/Survey_BSheet_v2'
import { Feedback_card } from './Card/Feedback/Feedback_card'
import { Hex_card } from './Card/Hex/Hex_card'
import EmptyZone_tooltip from './Tooltip/EmptyZone/EmptyZone_tooltip'
import './Tooltip/EmptyZone/EmptyZone_tooltip.css'
import MapUI from './MapUI/MapUI'
import { latLngToCell, cellToBoundary } from 'h3-js'
import { Hexagon } from 'lucide-react'
import { CenterPin } from './ui/CenterPin'
import MapLoader from './ui/MapLoader'
import { supabaseFetch } from '../config/supabase'
import { Event_card } from './Card/Event/Event_card'
import { VenueLayer } from '../events/components/VenueLayer'
import { isOnFloor, useEvents } from '../config/events'
import { useEventFloors } from '../events/hooks/useEventFloors'
import { EventMarker } from '../events/components/EventMarker/EventMarker'
import { SearchCard } from '../events/components/SearchCard/SearchCard'
import Demo_card from './Card/Demo/Demo_card'

// Кольцо для точек без коммента: один круг с radial-gradient
// (как в Figma: 0% прозрачно → 50% цвет · RING_PEAK_ALPHA → 100% прозрачно)
const RING_PREFIX = 'cg-ring-'
const RING_SIZE = 15          // диаметр кольца в px
const RING_PEAK_ALPHA = 0.35  // непрозрачность на пике градиента
const RING_PIXEL_RATIO = 4    // рисуем в 4x, чтобы было чётко на ретине
function makeRingImage(color) {
  const px = Math.round(RING_SIZE * RING_PIXEL_RATIO)
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = px
  const ctx = canvas.getContext('2d')
  // нормализуем любой css-цвет в #rrggbb
  ctx.fillStyle = '#9ca3af'
  ctx.fillStyle = color
  const hex = ctx.fillStyle.startsWith('#') ? ctx.fillStyle : '#9ca3af'
  const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16)
  const rgba = (a) => `rgba(${r}, ${g}, ${b}, ${a})`
  const c = px / 2
  const grad = ctx.createRadialGradient(c, c, 0, c, c, c)
  grad.addColorStop(0, rgba(0))
  grad.addColorStop(0.5, rgba(RING_PEAK_ALPHA))
  grad.addColorStop(1, rgba(0))
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, px, px)
  return ctx.getImageData(0, 0, px, px)
}

// Все слои точек фидбека — прятать/показывать вместе
const FEEDBACK_LAYERS = ['cg-feedback-layer', 'cg-feedback-ring', 'cg-feedback-core']
function setFeedbackVisibility(m, v) {
  FEEDBACK_LAYERS.forEach((id) => { if (m.getLayer(id)) m.setLayoutProperty(id, 'visibility', v) })
}


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
          event_id: r.event_id ?? null,
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

function Map({ city, cityConfig, pageContent, variant, source, lang, eventId, eventVenues = [] }) {
  const navigate = useNavigate()
  const location = useLocation()

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
  const cityMarkersRef = useRef(null) // городские маркеры на отдалении (только общая карта)
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
  const [selectedVenue, setSelectedVenue] = useState(null)
  const [searchOpen, setSearchOpen] = useState(false)
  const [highlightedVenueId, setHighlightedVenueId] = useState(null)
  const [mapReady, setMapReady] = useState(false)
  // карточка точки с другого этажа закрывается вместе со сменой этажа
  const { floorLevels, currentFloor, changeFloor } = useEventFloors(
    source === 'event' ? cityConfig : null,
    level => setSelectedVenue(v => (v && !isOnFloor(v.floor, level) ? null : v)),
  )
  // маркеры событий на общей карте
  const allEvents = useEvents()

  // TODO (2026-09-09): убрать, когда починят Chrome iOS (баг с 152.0.7977.64).
  // До первого тач-жеста страница рисуется смещённой вверх на высоту адресной
  // строки; из JS состояние неотличимо от нормального. Свайп по карте не
  // помогает — его съедает MapLibre. Прокладка отдаёт первый жест браузеру
  // (страничный overscroll сбрасывает смещение) и тут же снимается.
  const [gestureShim, setGestureShim] = useState(() => /CriOS/.test(navigator.userAgent))
  // Ивент: расширяем рамку прокрутки, чтобы в неё влезли все точки (старт остаётся по plan)
  useEffect(() => {
    if (source !== 'event' || !mapReady || !map.current || !eventVenues.length) return
    const pts = []
    const walk = a => {
      if (!Array.isArray(a)) return
      if (a.length >= 2 && typeof a[0] === 'number' && typeof a[1] === 'number') pts.push(a)
      else a.forEach(walk)
    }
    for (const v of eventVenues) {
      let c = v.coordinates
      if (typeof c === 'string') { try { c = JSON.parse(c) } catch { continue } }
      walk(c)
    }
    if (!pts.length) return
    let [minLng, minLat] = [Math.min(...pts.map(p => p[0])), Math.min(...pts.map(p => p[1]))]
    let [maxLng, maxLat] = [Math.max(...pts.map(p => p[0])), Math.max(...pts.map(p => p[1]))]
    const base = cityConfig.maxBounds
    // все точки уже внутри рамки из plan — ничего не трогаем (WUF, ивенты с планом)
    if (base && pts.every(([x, y]) => x >= base[0][0] && x <= base[1][0] && y >= base[0][1] && y <= base[1][1])) return
    if (base) {
      minLng = Math.min(minLng, base[0][0]); minLat = Math.min(minLat, base[0][1])
      maxLng = Math.max(maxLng, base[1][0]); maxLat = Math.max(maxLat, base[1][1])
    }
    // запас ~10% размера, минимум ~2 км
    const padLng = Math.max((maxLng - minLng) * 0.1, 0.02)
    const padLat = Math.max((maxLat - minLat) * 0.1, 0.02)
    const bounds = [
      [Math.max(minLng - padLng, -180), Math.max(minLat - padLat, -85)],
      [Math.min(maxLng + padLng, 180), Math.min(maxLat + padLat, 85)],
    ]
    map.current.setMaxBounds(bounds)
  }, [source, mapReady, eventVenues, cityConfig.maxBounds])

  useEffect(() => {
    if (!gestureShim) return
    const t = setTimeout(() => setGestureShim(false), 5000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Demo "How it works" card — independent state, not tied to any selection.
  const [demoOpen, setDemoOpen] = useState(false)
  const demoSeenKey = eventId ? `demo_seen_${eventId}` : null

  function openDemo() {
    if (demoSeenKey) {
      try { localStorage.setItem(demoSeenKey, '1') } catch { /* private mode */ }
    }
    setDemoOpen(true)
  }

  // Auto-show on the first visit to an event map — 1s after load.
  useEffect(() => {
    if (source !== 'event' || !demoSeenKey) return
    let seen = false
    try { seen = localStorage.getItem(demoSeenKey) === '1' } catch { seen = false }
    if (seen) return
    const t = setTimeout(() => openDemo(), 1000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, demoSeenKey])

  // Opening any other card / sheet dismisses the demo card.
  useEffect(() => {
    if (selectedPin || selectedHex || selectedVenue || searchOpen || mode !== 'view') {
      setDemoOpen(false)
    }
  }, [selectedPin, selectedHex, selectedVenue, searchOpen, mode])

  const modeRef = useRef('view')
  const pageContentRef = useRef(pageContent)
  useEffect(() => {
    pageContentRef.current = pageContent
  }, [pageContent])

  function handleVenueSelect(venue) {
    dismissSelectedPin()
    setSelectedHex(null)
    if (map.current?.getLayer('cg-hex-selected-layer')) {
      map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
    }
    setHighlightedVenueId(null)
    setSearchOpen(false)
    setSelectedVenue(venue)
  }

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

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE_CG,
      center: cityConfig.center,
      zoom: cityConfig.zoom,
      ...(cityConfig.initialBounds && { bounds: cityConfig.initialBounds }),
      ...(source === 'event' && { bearing: cityConfig.bearing ?? 0, pitch: 0, pitchWithRotate: false }),
      ...(cityConfig.minZoom && { minZoom: cityConfig.minZoom }),
      ...(cityConfig.maxBounds && { maxBounds: cityConfig.maxBounds }),
      attributionControl: false,
    })

    map.current.on('load', () => {
      map.current.addControl(
    new maplibregl.AttributionControl({ compact: true }),
    'top-right'
  )
      addOrientationLayers(map.current)
      if (source !== 'event') cityMarkersRef.current = createCityMarkers(map.current)
      loadData()
      setMapReady(true)
      if (city === 'map') setTimeout(() => requestGeoAuto(), 500)
    })

    return () => {
      if (geoWatchId.current) navigator.geolocation.clearWatch(geoWatchId.current)
      cityMarkersRef.current?.destroy()
      cityMarkersRef.current = null
    }
  }, [cityConfig])

  // ── Fit to event bbox on exit ──
  useEffect(() => {
    if (!mapReady || !location.state?.fitBounds) return
    map.current?.fitBounds(location.state.fitBounds, { padding: 60, duration: 1500 })
  }, [mapReady])

  // ── Empty zone tooltip ──
  useEffect(() => {
    if (!map.current) return

    const EMPTY_ZOOM_MIN = 15
    const EMPTY_RADIUS_PX = 120

    function checkEmptyZone() {
      if (source === 'event') return
      if (!dataLoadedRef.current) return
      const urlParams = new URLSearchParams(window.location.search)
      if (urlParams.has('point') || urlParams.has('hex')) return
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

      // отзывы события — по event_id; на общей карте — только отзывы без события
      const eventFilter = eventId ? `&event_id=eq.${encodeURIComponent(eventId)}` : '&event_id=is.null'
      const records = await supabaseFetch(
        `feedback_map?select=id,city,event_id,source,lat,lng,place_rate,experience,created_at,original_date,metric_type&or=(visibility.is.null,visibility.neq.hidden)${eventFilter}&order=created_at.desc&limit=1000`,
        { cache: 'no-store', signal: controller.signal }
      )
      clearTimeout(timeoutId)
      console.log('sample record:', records[0])
      allPointsRef.current = records
      cityMarkersRef.current?.update(records)
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

        // Точки фидбека — мягкие «нефизические» пятна без чётких границ.
        // Всё на WebGL (circle + symbol), без DOM — телефоны не страдают.
        //  1) cg-feedback-layer — внешний круг (circle), он же зона клика/hover
        //  2) cg-feedback-ring  — кольцо-градиент у точек без коммента (symbol-картинка)
        //  3) cg-feedback-core  — ядро (circle)
        const COLOR_STR = ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
          ['case',
            ['==', ['var', 'c'], ''], '#9ca3af',
            ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
            ['concat', '#', ['var', 'c']]
          ]
        ]
        const RATING_COLOR = ['to-color', COLOR_STR, '#9ca3af']
        const SELECTED = ['boolean', ['feature-state', 'selected'], false]
        const OLD = ['==', ['get', 'is_old'], 1]
        const HAS_COMMENT = ['==', ['get', 'has_comment'], 1]

        // Картинки колец генерируются на лету под каждый цвет рейтинга
        // (id картинки: 'cg-ring-#31D0AA'). Одна картинка на цвет, не на точку.
        if (!map.current.__cgRingHandler) {
          map.current.__cgRingHandler = true
          map.current.on('styleimagemissing', (e) => {
            if (!e.id.startsWith(RING_PREFIX)) return
            if (map.current.hasImage(e.id)) return
            map.current.addImage(e.id, makeRingImage(e.id.slice(RING_PREFIX.length)), { pixelRatio: RING_PIXEL_RATIO })
          })
        }

        // 1) Внешний круг:
        //    с комментом — мягкое полупрозрачное пятно;
        //    без коммента — невидимый (только зона клика), в выбранном состоянии — пятно
        map.current.addLayer({
          id: 'cg-feedback-layer',
          type: 'circle',
          source: 'cg-feedback',
          paint: {
            'circle-radius': ['case', SELECTED, 20, HAS_COMMENT, 14, RING_SIZE / 2],
            'circle-color': RATING_COLOR,
            'circle-opacity': ['case',
              SELECTED, 0.35,
              HAS_COMMENT, ['case', OLD, 0.1, 0.28],
              0
            ],
            // большой blur = край растворяется почти от самого центра
            'circle-blur': ['case', HAS_COMMENT, 0.8, 0.6],
          },
        })

        // 2) Кольцо-градиент — только точки без коммента
        //    radial-gradient: прозрачно в центре → цвет 35% на 50% → прозрачно на краю
        map.current.addLayer({
          id: 'cg-feedback-ring',
          type: 'symbol',
          source: 'cg-feedback',
          filter: ['!=', ['get', 'has_comment'], 1],
          layout: {
            'icon-image': ['concat', RING_PREFIX, COLOR_STR],
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
          },
          paint: {
            'icon-opacity': ['case', SELECTED, 1, OLD, 0.4, 1],
          },
        })

        // 3) Ядро — плотный центр с мягким краем, только у точек с комментом
        //    (у точек без коммента центр кольца прозрачный — это и есть весь их вид)
        map.current.addLayer({
          id: 'cg-feedback-core',
          type: 'circle',
          source: 'cg-feedback',
          filter: HAS_COMMENT,
          paint: {
            'circle-radius': ['case', SELECTED, 8, 6],
            'circle-color': RATING_COLOR,
            'circle-opacity': ['case', SELECTED, 1, OLD, 0.35, 0.95],
            'circle-blur': ['case', SELECTED, 0.3, 0.5],
          },
        })

        // на общей карте ниже 8 зума вместо точек — городские маркеры
        if (source !== 'event') hidePointsBelowCityZoom(map.current, FEEDBACK_LAYERS)

        dataLoadedRef.current = true

        map.current.on('click', 'cg-feedback-layer', (e) => {
          if (modeRef.current !== 'view') return
          e.originalEvent.stopPropagation()
          const feature = e.features[0]
          if (!feature) return
          setSelectedVenue(null)

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
            city: props.city || null,
            event_id: props.event_id || null,
          })
        })

        map.current.on('mouseenter', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = ''
        })

        map.current.on('click', (e) => {
          setDemoOpen(false)
          const features = map.current.queryRenderedFeatures(e.point, { layers: ['cg-feedback-layer'] })
          if (features.length > 0) return
          if (modeRef.current === 'select') return
          dismissSelectedPin()
          setShowEmptyTooltip(false)
        })
      }

      const params = new URLSearchParams(window.location.search)

      const hexCellId = params.get('hex')
      const hexZoom = params.get('z')
      if (hexCellId) {
        const z = hexZoom ? clamp(Number(hexZoom), 7, 16) : 12
        map.current.jumpTo({ zoom: z })

        const hexGeoJSON = buildHexData(records)
        const feature = hexGeoJSON.features.find(f => f.properties.cell === hexCellId)

        if (feature) {
          const props = feature.properties

          hexModeRef.current = true
          setHexMode(true)
          setFeedbackVisibility(map.current, 'none')
          showHexLayer()

          map.current.once('idle', () => {
            try {
              map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], hexCellId])
            } catch {}
          })

          setSelectedHex({
            cell: props.cell,
            avgRating: props.avgRating,
            count: props.count,
            comments: typeof props.comments === 'string' ? JSON.parse(props.comments) : props.comments,
            ratings: typeof props.ratings === 'string' ? JSON.parse(props.ratings) : (props.ratings || []),
          })

          const boundary = cellToBoundary(hexCellId)
          const centerLat = boundary.reduce((sum, p) => sum + p[0], 0) / boundary.length
          const centerLng = boundary.reduce((sum, p) => sum + p[1], 0) / boundary.length
          const hexPadding = window.innerWidth <= 430
            ? { bottom: Math.round(window.innerHeight * 0.55) }
            : { left: 430 }
          map.current.flyTo({ center: [centerLng, centerLat], zoom: z, essential: true, padding: hexPadding })
        }
      }

      const pointId = params.get('point')
      if (pointId) {
        const record = records.find(r => String(r.id) === String(pointId))
        if (record) {
          const rating = record.place_rate ? clamp(Math.round(record.place_rate), 1, 10) : null
          setSelectedPin({
            id: record.id,
            ratingLabel: rating ? getRatingLabel(rating) : null,
            ratingColor: getRatingColor(rating),
            experience: record.experience || null,
            created_at: record.created_at || null,
            original_date: record.original_date || null,
            source: record.source || null,
            city: record.city || null,
            event_id: record.event_id || null,
          })
          const pinPadding = window.innerWidth <= 430
            ? { bottom: Math.round(window.innerHeight * 0.55) }
            : { left: 430 }
          map.current.flyTo({ center: [record.lng, record.lat], zoom: 15, essential: true, padding: pinPadding })
          map.current.once('idle', () => {
            try {
              map.current.setFeatureState(
                { source: 'cg-feedback', id: record.id },
                { selected: true }
              )
              selectedFeatureId.current = record.id
            } catch {}
          })
        }
      }

    } catch (e) {
      if (retries > 0) setTimeout(() => loadData(retries - 1), 900)
    } finally {
      setIsLoading(false)
    }
  }

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
        city: r.city || null,
        event_id: r.event_id || null,
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
          ratings: JSON.stringify(data.ratings),
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
        cell: props.cell,
        avgRating: props.avgRating,
        count: props.count,
        comments: typeof props.comments === 'string' ? JSON.parse(props.comments) : props.comments,
        ratings: typeof props.ratings === 'string' ? JSON.parse(props.ratings) : (props.ratings || []),
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

    if (next) {
      if (!localStorage.getItem('hexTipSeen')) {
        localStorage.setItem('hexTipSeen', '1')
        setShowHexTooltip(true)
        setTimeout(() => setShowHexTooltip(false), 3000)
      }
      setFeedbackVisibility(map.current, 'none')
      dismissSelectedPin()
      showHexLayer()
    } else {
      if (map.current.getLayer('cg-hex-selected-layer')) {
        map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
      }
      setFeedbackVisibility(map.current, 'visible')
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
      const pinY = pinRect.bottom - 4 - mapRect.top
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
      userMarker.current = new maplibregl.Marker({ element: el })
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

      {gestureShim && (
        <div
          onTouchEnd={() => setGestureShim(false)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 90,
            touchAction: 'pan-y',
            background: 'transparent',
          }}
        />
      )}

      <MapLoader visible={!mapReady || isLoading} />
      <CenterPin mapRef={map} mode={mode} ref={centerPinRef} />

      {showEmptyTooltip && mode === 'view' && (
        <EmptyZone_tooltip
          text={pageContent.empty_zone_tooltip.text}
          cta={pageContent.empty_zone_tooltip.cta}
          onClick={handleEmptyTooltipClick}
        />
      )}

      {showHexTooltip && (
        <EmptyZone_tooltip
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
        onStartSurvey={() => surveySheetRef.current?.startSelect()}
        variant={variant}
        lang={lang}
        bottomBarVisible={!selectedPin && !selectedHex && !selectedVenue && mode !== 'select'}
        source={source}
        eventConfig={source === 'event' ? cityConfig : undefined}
        onExitEvent={() => navigate(location.pathname.startsWith('/ru') ? '/ru/map' : '/map', { state: { fitBounds: cityConfig.bbox } })}
        onSearch={() => { setSelectedVenue(null); setSearchOpen(v => !v) }}
        onInfoClick={openDemo}
        infoActive={demoOpen}
        floors={floorLevels}
        currentFloor={currentFloor}
        onFloorChange={changeFloor}
      />

      <Demo_card
        open={demoOpen}
        onClose={() => setDemoOpen(false)}
        onLockMap={() => { if (map.current) disableMap() }}
        onUnlockMap={() => { if (map.current) enableMap() }}
      />

      <Feedback_card
        pin={selectedPin}
        surveySheetRef={bottomSheetRef}
        onDismiss={dismissSelectedPin}
      />

      <Hex_card
        hex={selectedHex}
        surveySheetRef={bottomSheetRef}
        onAddExperience={() => surveySheetRef.current?.startSelect()}
        getZoom={() => map.current?.getZoom() ?? 10}
        onDismiss={() => {
          setSelectedHex(null)
          if (map.current?.getLayer('cg-hex-selected-layer')) {
            map.current.setFilter('cg-hex-selected-layer', ['==', ['get', 'cell'], ''])
          }
        }}
      />

      <Survey_BSheet
        pinSelected={!!selectedPin || !!selectedHex || !!selectedVenue}
        ref={surveySheetRef}
        bottomSheetRef={bottomSheetRef}
        city={city}
        eventId={source === 'event' ? eventId : null}
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
        onFlyTo={(lng, lat) => map.current?.flyTo({ center: [lng, lat], zoom: Math.max(map.current.getZoom(), 14), essential: true })}
      />

      {source === 'event' && searchOpen && (
        <SearchCard
          eventId={eventId}
          venues={eventVenues}
          onDismiss={() => setSearchOpen(false)}
          onShowOnMap={(venue) => {
            const coords = typeof venue.coordinates === 'string'
              ? JSON.parse(venue.coordinates)
              : venue.coordinates
            changeFloor(venue.floor)
            if (coords) {
              const padding = window.innerWidth <= 430
                ? { bottom: Math.round(window.innerHeight * 0.62) }
                : { left: 420 }
              map.current?.flyTo({ center: coords, zoom: 22, essential: true, padding })
            }
            setHighlightedVenueId(venue.id)
          }}
        />
      )}

      <Event_card
        venue={selectedVenue}
        eventId={eventId}
        onDismiss={() => setSelectedVenue(null)}
      />

      {source !== 'event' && allEvents.map(event => (
  <EventMarker key={event.code} mapRef={map} eventId={event.code} eventConfig={event} />
))}

      {mapReady && source === 'event' && (
        <VenueLayer
          map={map}
          eventVenues={eventVenues}
          onSelect={handleVenueSelect}
          onDeselect={() => setSelectedVenue(null)}
          selectedVenue={selectedVenue}
          highlightedVenueId={highlightedVenueId}
          currentFloor={currentFloor}
          onFloorChange={changeFloor}
          eventConfig={cityConfig}
        />
      )}
    </div>
  )
}

export default Map