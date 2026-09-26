// src/events/components/VenueLayer.jsx

import { useEffect, useRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { maplibregl } from '../../config/map'
import { getEventFloors, isOnFloor } from '../../config/events'
import { VENUE_ICONS } from '../../config/venueIcons'

// Смена этажа — «лифт»: план плавно сменяется, точки уезжают/приезжают по вертикали.
// Длительность — как у «таблетки» в FloorSwitcher
const FLOOR_ANIM_MS = 250
const FLOOR_SHIFT_PX = 10
const PLAN_OPACITY = 0.85

export function VenueLayer({
  map,
  eventVenues = [],
  onSelect,
  selectedVenue,
  highlightedVenueId,
  currentFloor = null,
  onFloorChange,
  eventConfig,
}) {
  const renderedRef = useRef(false)
  const markersRef = useRef([]) // { el, floor }
  const currentFloorRef = useRef(currentFloor)
  const prevFloorRef = useRef(currentFloor)
  const animTokens = useRef(new WeakMap()) // отменяет устаревшие таймеры при быстрых переключениях

  function floorplanId(level) {
    return `floorplan-${level ?? 'main'}`
  }

  function applyFloor() {
    const level = currentFloorRef.current
    const prev = prevFloorRef.current
    prevFloorRef.current = level

    // Едем вверх — мир уходит вниз (+y), вниз — наоборот
    const dir = prev == null || level == null || prev === level ? 0 : (level > prev ? 1 : -1)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    const shift = reduceMotion ? 0 : dir * FLOOR_SHIFT_PX

    markersRef.current.forEach(({ el, floor }) => {
      const visible = isOnFloor(floor, level)
      if (visible === (el.style.display !== 'none')) return
      if (dir === 0) {
        // flex, а не '' — иначе цифра/иконка съезжает из центра кружка
        el.style.display = visible ? 'flex' : 'none'
      } else if (visible) {
        showMarker(el, -shift)
      } else {
        hideMarker(el, shift)
      }
    })

    if (!map.current) return
    getEventFloors(eventConfig).forEach(f => {
      const layerId = `${floorplanId(f.level)}-layer`
      if (!map.current.getLayer(layerId)) return
      map.current.setPaintProperty(layerId, 'raster-opacity', isOnFloor(f.level, level) ? PLAN_OPACITY : 0)
    })
  }

  // opacity маркеров переписывает сама maplibre на каждом движении карты,
  // поэтому гасим через filter, а сдвигаем через translate (transform тоже её)
  function hideMarker(el, toShift) {
    const token = {}
    animTokens.current.set(el, token)
    el.style.transition = `filter ${FLOOR_ANIM_MS}ms ease-in, translate ${FLOOR_ANIM_MS}ms ease-in`
    el.style.filter = 'opacity(0)'
    el.style.translate = `0 ${toShift}px`
    setTimeout(() => {
      if (animTokens.current.get(el) !== token) return
      el.style.display = 'none'
      el.style.transition = ''
      el.style.filter = ''
      el.style.translate = ''
    }, FLOOR_ANIM_MS)
  }

  function showMarker(el, fromShift) {
    const token = {}
    animTokens.current.set(el, token)
    el.style.transition = 'none'
    el.style.display = 'flex'
    el.style.filter = 'opacity(0)'
    el.style.translate = `0 ${fromShift}px`
    el.getBoundingClientRect() // зафиксировать стартовое положение до перехода
    el.style.transition = `filter ${FLOOR_ANIM_MS}ms ease-out, translate ${FLOOR_ANIM_MS}ms ease-out`
    el.style.filter = ''
    el.style.translate = ''
    setTimeout(() => {
      if (animTokens.current.get(el) === token) el.style.transition = ''
    }, FLOOR_ANIM_MS)
  }

  // Смена этажа: показываем план этого этажа и его точки (+ точки без этажа)
  useEffect(() => {
    currentFloorRef.current = currentFloor
    applyFloor()
    scheduleClusters()
  }, [currentFloor])

  const selectedMarkerElRef = useRef(null)
  // по id, а не по code: у сервисных точек коды повторяются (10 × «Restrooms»)
  const markerElsById = useRef({})

  useEffect(() => {
    if (!selectedVenue) {
      resetSelectedMarker()
      return
    }
    const el = markerElsById.current[selectedVenue.id]
    if (!el || el === selectedMarkerElRef.current) return
    resetSelectedMarker()
    applyHighlight(el)
  }, [selectedVenue])

  useEffect(() => {
    if (!highlightedVenueId) return
    const el = markerElsById.current[highlightedVenueId]
    if (!el || el === selectedMarkerElRef.current) return
    resetSelectedMarker()
    applyHighlight(el)
  }, [highlightedVenueId])

  // Размер пина считаем от стартового зума события, а не от абсолютного:
  // одинаково работает и для зала (зум 20), и для города (зум 14).
  // rel = на сколько приблизились/отдалились от старта; между точками — плавно
  const SIZE_STEPS = [
    // rel,  пин, иконка, шрифт (0 — номер скрыт, пин-точка)
    [-3,     8,   0,  0],
    [-1.5,  12,   8,  0],
    [-1,    18,  10,  8],
    [0,     22,  12,  9],
    [2,     30,  16, 12],
  ]

  function getMarkerSize() {
    const rel = map.current.getZoom() - (eventConfig?.zoom ?? 16)
    const first = SIZE_STEPS[0]
    const last = SIZE_STEPS[SIZE_STEPS.length - 1]
    if (rel <= first[0]) return { size: first[1], icon: first[2], font: first[3] }
    if (rel >= last[0]) return { size: last[1], icon: last[2], font: last[3] }
    const i = SIZE_STEPS.findIndex(s => s[0] >= rel)
    const [z0, s0, i0, f0] = SIZE_STEPS[i - 1]
    const [z1, s1, i1, f1] = SIZE_STEPS[i]
    const t = (rel - z0) / (z1 - z0)
    const lerp = (a, b) => Math.round(a + (b - a) * t)
    // шрифт не интерполируем с нуля: либо номер читаемый, либо его нет
    const font = f0 === 0 || f1 === 0 ? (t < 0.5 ? f0 : f1) : lerp(f0, f1)
    return { size: lerp(s0, s1), icon: lerp(i0, i1), font }
  }

  function applyHighlight(el) {
    const { size } = getMarkerSize()
    const big = Math.max(size + 10, 30)
    el.style.width = `${big}px`
    el.style.height = `${big}px`
    el.style.fontSize = el.dataset.service ? '' : '11px'
    const svg = el.querySelector('svg')
    if (svg) { svg.setAttribute('width', 16); svg.setAttribute('height', 16); svg.style.display = '' }
    el.style.border = '4px solid white'
    el.style.boxShadow = '0 4px 12px rgba(0,0,0,0.5)'
    selectedMarkerElRef.current = el
    scheduleClusters()
  }

  // ── Кластеры ──
  // Кластер задаётся вручную: колонка cluster у точки (напр. «Expo A»).
  // Пока пины группы налезают друг на друга, группа показывается одной капсулой
  // «Название · число»; как только пины помещаются — капсула раскрывается.
  // Точки без cluster всегда видны пинами. Выбранный пин в капсулу не прячется.
  const clusterItemsRef = useRef([]) // { el, floor, coords, zone, isService, cluster }
  const clusterMarkersRef = useRef([])
  const clusterFrameRef = useRef(null)
  const clusterOpenZoomRef = useRef({}) // cluster → зум, с которого показываем пины
  const CLUSTER_GAP = 2         // столько px воздуха нужно пинам, чтобы стоять отдельно
  const CLUSTER_OVERLAP_OK = 0.1 // раскрываем, когда налезают не больше 10% пинов группы
  const CLUSTER_MIXED_COLOR = '#6B7280'

  function scheduleClusters() {
    if (clusterFrameRef.current) return
    clusterFrameRef.current = requestAnimationFrame(() => {
      clusterFrameRef.current = null
      updateClusters()
    })
  }

  function markerSizeAt(zoom) {
    const rel = zoom - (eventConfig?.zoom ?? 16)
    const first = SIZE_STEPS[0]
    const last = SIZE_STEPS[SIZE_STEPS.length - 1]
    if (rel <= first[0]) return first[1]
    if (rel >= last[0]) return last[1]
    const i = SIZE_STEPS.findIndex(s => s[0] >= rel)
    const [z0, s0] = SIZE_STEPS[i - 1]
    const [z1, s1] = SIZE_STEPS[i]
    return s0 + (s1 - s0) * (rel - z0) / (z1 - z0)
  }

  // Для каждой группы один раз считаем зум, с которого её пины помещаются.
  // Расстояние до ближайшего соседа удваивается с каждым уровнем зума.
  function computeClusterOpenZooms() {
    const refZoom = map.current.getZoom()
    const byCluster = {}
    clusterItemsRef.current.forEach(it => {
      if (!it.cluster) return
      ;(byCluster[it.cluster] ??= []).push(map.current.project(it.coords))
    })
    const maxZoom = map.current.getMaxZoom()
    const result = {}
    Object.entries(byCluster).forEach(([name, pts]) => {
      const nn = pts.map((a, i) => {
        let d = Infinity
        pts.forEach((b, j) => { if (i !== j) d = Math.min(d, Math.hypot(a.x - b.x, a.y - b.y)) })
        return d
      })
      let z = map.current.getMinZoom()
      for (; z < maxZoom; z += 0.1) {
        const need = markerSizeAt(z) + CLUSTER_GAP
        const k = 2 ** (z - refZoom)
        const overlapping = nn.filter(d => d * k < need).length
        if (overlapping <= nn.length * CLUSTER_OVERLAP_OK) break
      }
      // cluster_zoom из настроек события — потолок: с него раскрыты все группы
      const cap = Number.isFinite(eventConfig?.clusterZoom) ? eventConfig.clusterZoom : maxZoom
      result[name] = Math.min(z, cap, maxZoom)
    })
    clusterOpenZoomRef.current = result
  }

  function updateClusters() {
    if (!map.current) return
    clusterMarkersRef.current.forEach(m => m.remove())
    clusterMarkersRef.current = []

    const zoom = map.current.getZoom()
    const level = currentFloorRef.current
    const groups = {}
    clusterItemsRef.current.forEach(it => {
      it.el.style.visibility = ''
      if (!it.cluster || !isOnFloor(it.floor, level)) return
      ;(groups[it.cluster] ??= []).push(it)
    })

    Object.entries(groups).forEach(([name, members]) => {
      const openZoom = clusterOpenZoomRef.current[name] ?? 0
      if (zoom >= openZoom || members.length < 2) return
      const hidden = members.filter(it => it.el !== selectedMarkerElRef.current)
      hidden.forEach(it => { it.el.style.visibility = 'hidden' })
      addCluster(name, members, openZoom)
    })
  }

  function addCluster(name, members, openZoom) {
    const size = markerSizeAt(map.current.getZoom())
    // цвет — по зоне точек (сервисы не в счёт); несколько зон или одни сервисы — серый
    const zones = new Set(members.filter(it => !it.isService).map(it => it.zone))
    const color = zones.size === 0
      ? (eventConfig?.serviceColor || '#6B7280')
      : zones.size === 1
        ? ((eventConfig?.zoneColors || {})[[...zones][0]] || CLUSTER_MIXED_COLOR)
        : CLUSTER_MIXED_COLOR

    // капсула: высота как у пина (не меньше 20), ширина по тексту, скругление — половина высоты
    const h = Math.max(Math.round(size), 20)
    const el = document.createElement('div')
    el.style.cssText = `
      height: ${h}px;
      min-width: ${h * 2}px;
      padding: 0 ${Math.round(h / 2)}px;
      border-radius: ${h / 2}px;
      background: ${color};
      border: 2px solid white;
      box-sizing: border-box;
      display: flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
      cursor: pointer;
      box-shadow: 0 2px 6px rgba(0,0,0,0.25);
      font-family: Inter, system-ui, sans-serif;
      font-size: ${Math.max(Math.round(h * 0.45), 9)}px;
      font-weight: 700;
      color: white;
      line-height: 1;
    `
    el.textContent = `${name} · ${members.length}`

    const lng = members.reduce((s, it) => s + it.coords[0], 0) / members.length
    const lat = members.reduce((s, it) => s + it.coords[1], 0) / members.length

    el.addEventListener('click', e => {
      e.stopPropagation()
      zoomIntoCluster(members, openZoom)
    })

    clusterMarkersRef.current.push(
      new maplibregl.Marker({ element: el }).setLngLat([lng, lat]).addTo(map.current)
    )
  }

  // Показываем группу на весь экран, но не мельче зума, на котором она раскрывается
  function zoomIntoCluster(members, openZoom) {
    const bounds = new maplibregl.LngLatBounds()
    members.forEach(it => bounds.extend(it.coords))
    const fit = map.current.cameraForBounds(bounds, { padding: 60, maxZoom: map.current.getMaxZoom() })
    const target = Math.min(Math.max(fit?.zoom ?? 0, openZoom + 0.05), map.current.getMaxZoom())
    map.current.easeTo({ center: fit?.center ?? bounds.getCenter(), zoom: target, duration: 500 })
  }

  // при уходе со страницы события убираем капсулы с карты
  useEffect(() => () => {
    // обнуляем, иначе scheduleClusters решит, что кадр ещё в очереди, и больше не сработает
    // (в dev React StrictMode вызывает эту очистку сразу после монтирования)
    if (clusterFrameRef.current) cancelAnimationFrame(clusterFrameRef.current)
    clusterFrameRef.current = null
    clusterMarkersRef.current.forEach(m => m.remove())
    clusterMarkersRef.current = []
  }, [])

  // План рисуем сразу, не дожидаясь точек: слой монтируется после load карты.
  // Картинки-оверлеи — раньше плана, чтобы план лежал поверх них
  useEffect(() => {
    if (!map.current) return
    renderOverlays()
    renderFloorplan()
  }, [])

  // Декоративные картинки по 4 углам (логотип, надпись); видны на всех этажах
  function renderOverlays() {
    ;(eventConfig?.overlays ?? []).forEach(o => {
      if (map.current.getSource(o.id)) return
      map.current.addSource(o.id, { type: 'image', url: o.url, coordinates: o.coordinates })
      map.current.addLayer({
        id: `${o.id}-layer`,
        type: 'raster',
        source: o.id,
        paint: { 'raster-opacity': o.opacity, 'raster-fade-duration': 0 },
      })
    })
  }

  useEffect(() => {
    if (!eventVenues.length || renderedRef.current) return
    if (!map.current) return

    renderedRef.current = true

    // Слой монтируется после load карты (mapReady). isStyleLoaded() тут не годится:
    // пока грузятся картинки планов, он false, а 'load' второй раз уже не придёт
    renderVenues(eventVenues)
  }, [eventVenues])

  // размер одного пина; на мелком масштабе номер/иконка прячутся, остаётся цветная точка
  function sizeMarker(el, { size, icon, font }) {
    el.style.width = `${size}px`
    el.style.height = `${size}px`
    el.style.borderWidth = size < 12 ? '1px' : '2px'
    const svg = el.querySelector('svg')
    if (svg) {
      svg.setAttribute('width', icon)
      svg.setAttribute('height', icon)
      svg.style.display = icon ? '' : 'none'
    }
    if (!el.dataset.service) el.style.fontSize = `${font}px`
  }

  // обратно к размеру по текущему зуму, как у остальных точек
  function resetSelectedMarker() {
    if (!selectedMarkerElRef.current) return
    sizeMarker(selectedMarkerElRef.current, getMarkerSize())
    selectedMarkerElRef.current.style.border = '2px solid white'
    selectedMarkerElRef.current.style.boxShadow = '0 2px 6px rgba(0,0,0,0.25)'
    selectedMarkerElRef.current = null
    scheduleClusters()
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
    el.dataset.service = '1'
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
    getEventFloors(eventConfig).forEach(f => {
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
        // все этажи в слое всегда, переключаем прозрачностью — так работает плавная смена
        paint: {
          'raster-opacity': isOnFloor(f.level, currentFloorRef.current) ? PLAN_OPACITY : 0,
          'raster-opacity-transition': { duration: FLOOR_ANIM_MS, delay: 0 },
        },
      })
    })
  }

function renderVenues(data) {
  const zoneColors = eventConfig?.zoneColors || {}
  const serviceColor = eventConfig?.serviceColor || '#6B7280'
    const allMarkerEls = []

function applyMarkerSizes() {
  const s = getMarkerSize()
  allMarkerEls.forEach(({ el }) => {
    if (el === selectedMarkerElRef.current) return
    sizeMarker(el, s)
  })
}

map.current.on('zoom', applyMarkerSizes)
map.current.on('zoom', scheduleClusters)
map.current.on('rotate', scheduleClusters)

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

      sizeMarker(el, getMarkerSize())
      allMarkerEls.push({ el, isService })
      clusterItemsRef.current.push({ el, floor: v.floor, coords, zone: v.zone, isService, cluster: v.cluster || null })
      markersRef.current.push({ el, floor: v.floor })
      if (!isOnFloor(v.floor, currentFloorRef.current)) el.style.display = 'none'
      markerElsById.current[v.id] = el

      marker.getElement().addEventListener('click', e => {
        e.stopPropagation()
        // выделение ставит эффект по selectedVenue.id
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

    computeClusterOpenZooms()
    scheduleClusters()

    // ── Deep link: ?venue=<id> (старые ссылки с кодом тоже находим) ──
    const params = new URLSearchParams(window.location.search)
    const venueParam = params.get('venue')
    if (venueParam) {
      const venue = data.find(v => v.id === venueParam) ?? data.find(v => v.code === venueParam)
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