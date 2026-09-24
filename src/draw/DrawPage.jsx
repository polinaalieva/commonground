import { useEffect, useRef, useState } from 'react'
import { maplibregl, MAP_STYLE } from '../config/map'
import MaplibreDraw from 'maplibre-gl-draw'
import { RotateCw, Scaling } from 'lucide-react'
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css'

// Этаж — число (1, 2, … подвал -1). Пусто = null: этаж не задан,
// в событии с этажами такая точка видна на всех этажах
function emptyMeta() {
  return { code: '', number: '', zone: '', type: '', floor: '' }
}

function DrawPage() {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const draw = useRef(null)
  const fileInputRef = useRef(null)
  const csvInputRef = useRef(null)
  const cornersRef = useRef(null)
  const baseCornersRef = useRef(null)
  const markersRef = useRef([])
  const centerMarkerRef = useRef(null)
  const imageUrlRef = useRef(null)
  const [opacity, setOpacity] = useState(0.7)
  const [hasImage, setHasImage] = useState(false)
  const [coordInput, setCoordInput] = useState('')
  const [showCoordInput, setShowCoordInput] = useState(false)
  const [locked, setLocked] = useState(false)
  const [shapeCount, setShapeCount] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [panel, setPanel] = useState(emptyMeta())
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const [rotation, setRotation] = useState(0)
  const [mapBearing, setMapBearing] = useState(0)
  // для обработчиков маркеров, которые создаются один раз и не видят свежий state
  const transformRef = useRef({ sx: 1, sy: 1, rot: 0 })
  const historyRef = useRef([])
  const historyTimeout = useRef(null)
  const [tool, setTool] = useState(null) // null | 'stretch' | 'rotate'
  const [hasPin, setHasPin] = useState(false)
  const toolRef = useRef(null)
  const pinRef = useRef(null)
  const pinMarkerRef = useRef(null)
  const toolDragRef = useRef(null)
  const spaceRef = useRef(false)
  const shapeMeta = useRef({})
  // Этажи: список уровней (числа) и текущий; null — план без этажей
  const [floors, setFloors] = useState([])
  const [currentFloor, setCurrentFloor] = useState(null)
  const floorsRef = useRef([])
  const currentFloorRef = useRef(null)
  // планы по этажам { '1': plan, '2': plan, '_': plan }; активный живёт в рабочих ref-ах
  const plansRef = useRef({})
  const planNameRef = useRef(null)
  const drawFiltersRef = useRef({})
  const pendingCoordsRef = useRef(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const searchTimeout = useRef(null)

  function handleSearchInput(e) {
    const q = e.target.value
    setSearchQuery(q)
    setSearchResults([])
    clearTimeout(searchTimeout.current)
    if (q.length < 2) return
    searchTimeout.current = setTimeout(async () => {
      const key = import.meta.env.VITE_MAPTILER_KEY
      const res = await fetch(
        `https://api.maptiler.com/geocoding/${encodeURIComponent(q)}.json?key=${key}&limit=5`
      )
      const data = await res.json()
      setSearchResults(data.features || [])
    }, 300)
  }

  function handleSearchSelect(feature) {
    const [lng, lat] = feature.center
    map.current.flyTo({ center: [lng, lat], zoom: 14 })
    setSearchQuery(feature.place_name)
    setSearchResults([])
  }

  const [coordQuery, setCoordQuery] = useState('')
  const [coordError, setCoordError] = useState(false)
  const coordMarkerRef = useRef(null)

  // Принимает "55.7558, 37.6173" или "55.7558 37.6173" (широта, долгота)
  function handleCoordSearch() {
    const parts = coordQuery.trim().replace(/[;,]/g, ' ').split(/\s+/).map(Number)
    const [lat, lng] = parts
    if (parts.length !== 2 || !Number.isFinite(lat) || !Number.isFinite(lng)
      || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      setCoordError(true)
      return
    }
    setCoordError(false)
    map.current.flyTo({ center: [lng, lat], zoom: 17 })
    if (coordMarkerRef.current) coordMarkerRef.current.setLngLat([lng, lat])
    else coordMarkerRef.current = new maplibregl.Marker().setLngLat([lng, lat]).addTo(map.current)
  }

  function clearCoordSearch() {
    setCoordQuery('')
    setCoordError(false)
    coordMarkerRef.current?.remove()
    coordMarkerRef.current = null
  }

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [37.6173, 55.7558],
      zoom: 12,
      pitch: 0,
      bearing: 0,
      pitchWithRotate: false,
      dragRotate: false,
    })

    map.current.on('rotate', () => {
      setMapBearing(Math.round(map.current.getBearing() * 10) / 10)
    })

    map.current.on('load', () => {
      map.current.setPitch(0)
      map.current.setBearing(0)

      map.current.getStyle().layers.forEach(layer => {
        if (layer.type === 'fill-extrusion') {
          map.current.setPaintProperty(layer.id, 'fill-extrusion-height', 0)
          map.current.setPaintProperty(layer.id, 'fill-extrusion-base', 0)
        }
      })

      draw.current = new MaplibreDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true, point: true },
        userProperties: true, // floor в свойствах шейпа — по нему прячем другие этажи
      })
      map.current.addControl(draw.current)
      pushHistory()

      map.current.on('draw.create', (e) => {
        const id = e.features[0].id
        const meta = { ...emptyMeta(), floor: currentFloorRef.current == null ? '' : String(currentFloorRef.current) }
        shapeMeta.current[id] = meta
        draw.current.setFeatureProperty(id, 'floor', meta.floor)
        setSelectedId(id)
        setPanel(meta)
        updateShapeCount()
        pushHistory()
      })

      map.current.on('draw.update', () => {
        updateLabels()
        pushHistory()
      })

      map.current.on('draw.selectionchange', (e) => {
        if (e.features.length === 0) {
          setSelectedId(null)
          return
        }
        const id = e.features[0].id
        const meta = { ...emptyMeta(), ...shapeMeta.current[id] }
        setSelectedId(id)
        setPanel(meta)
      })

      map.current.on('draw.delete', () => {
        setSelectedId(null)
        updateShapeCount()
        updateLabels()
        pushHistory()
      })
    })
  }, [])

  useEffect(() => {
    function onKeyDown(e) {
      const tag = e.target.tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return

      // e.code, а не e.key — чтобы работало и на русской раскладке
      if ((e.metaKey || e.ctrlKey) && e.code === 'KeyZ' && !e.shiftKey) {
        e.preventDefault()
        undo()
        return
      }

      if (toolRef.current && e.key === 'Escape') {
        exitTool()
        return
      }

      // пробел во время «растянуть» — пропорционально
      if (toolRef.current && e.code === 'Space') {
        e.preventDefault()
        if (!spaceRef.current) {
          spaceRef.current = true
          if (toolDragRef.current?.last) applyToolDrag(toolDragRef.current.last)
        }
        return
      }

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (!draw.current) return
        // выделенный шейп удаляет сам draw; во время рисования клавиша тоже его
        if (draw.current.getSelectedIds().length) return
        if (draw.current.getMode().startsWith('draw_')) return
        if (locked || !imageUrlRef.current) return
        e.preventDefault()
        removePlan()
        pushHistory()
      }
    }
    function onKeyUp(e) {
      if (e.code !== 'Space' || !spaceRef.current) return
      spaceRef.current = false
      if (toolDragRef.current?.last) applyToolDrag(toolDragRef.current.last)
    }

    // capture: успеваем проверить выделение до того, как draw удалит шейп
    window.addEventListener('keydown', onKeyDown, true)
    window.addEventListener('keyup', onKeyUp, true)
    return () => {
      window.removeEventListener('keydown', onKeyDown, true)
      window.removeEventListener('keyup', onKeyUp, true)
    }
  }, [locked, opacity])

  function takeSnapshot() {
    return {
      features: structuredClone(draw.current.getAll()),
      meta: structuredClone(shapeMeta.current),
      plans: structuredClone(allPlans()),
      floors: [...floorsRef.current],
    }
  }

  // Запоминаем состояние после каждого законченного действия
  function pushHistory() {
    clearTimeout(historyTimeout.current)
    historyTimeout.current = null
    if (!draw.current) return
    const snap = takeSnapshot()
    const history = historyRef.current
    const last = history[history.length - 1]
    if (last && JSON.stringify(last) === JSON.stringify(snap)) return
    history.push(snap)
    if (history.length > 100) history.shift()
  }

  // Для слайдеров: одна запись на всё движение, а не на каждый шаг
  function pushHistoryDebounced() {
    clearTimeout(historyTimeout.current)
    historyTimeout.current = setTimeout(pushHistory, 400)
  }

  function undo() {
    if (historyTimeout.current) pushHistory()
    const history = historyRef.current
    if (history.length < 2) return
    history.pop()
    restoreSnapshot(history[history.length - 1])
  }

  // Отмена не переключает этаж: остаёмся на текущем, если он ещё существует
  function restoreSnapshot(snap) {
    draw.current.set(structuredClone(snap.features))
    shapeMeta.current = structuredClone(snap.meta)
    plansRef.current = structuredClone(snap.plans)
    setFloorList(snap.floors)
    const cur = currentFloorRef.current
    setFloor(snap.floors.includes(cur) ? cur : (snap.floors[0] ?? null))
    setSelectedId(null)
    updateShapeCount()
    showPlan(plansRef.current[floorKey()])
  }

  // ── Этажи ──

  function floorKey() {
    return currentFloorRef.current == null ? '_' : String(currentFloorRef.current)
  }

  function activePlan() {
    return imageUrlRef.current && baseCornersRef.current ? {
      url: imageUrlRef.current,
      name: planNameRef.current,
      base: baseCornersRef.current.map(c => [...c]),
      transform: { ...transformRef.current },
    } : null
  }

  function allPlans() {
    return { ...plansRef.current, [floorKey()]: activePlan() }
  }

  function showPlan(plan) {
    if (!plan) {
      removePlan()
      return
    }
    if (plan.url !== imageUrlRef.current) {
      removeOverlay()
      imageUrlRef.current = plan.url
    }
    planNameRef.current = plan.name
    baseCornersRef.current = plan.base.map(c => [...c])
    setTransform(plan.transform)
    if (!centerMarkerRef.current) {
      addControlMarkers(cornersRef.current)
      setMarkersVisible(!locked && !toolRef.current)
    }
    setHasImage(true)
  }

  function setFloorList(list) {
    floorsRef.current = [...list].sort((a, b) => b - a)
    setFloors(floorsRef.current)
  }

  function setFloor(level) {
    currentFloorRef.current = level
    setCurrentFloor(level)
    applyFloorFilter()
    updateLabels()
  }

  function isOnCurrentFloor(floor) {
    const level = currentFloorRef.current
    return level == null || floor == null || floor === '' || String(floor) === String(level)
  }

  // Прячем шейпы других этажей фильтром на слоях draw (их нельзя и выделить)
  function applyFloorFilter() {
    if (!draw.current) return // слои draw появляются после load
    const level = currentFloorRef.current
    const floorFilter = level == null ? null : ['any',
      ['!has', 'user_floor'],
      ['==', 'user_floor', ''],
      ['==', 'user_floor', String(level)],
    ]
    map.current.getStyle().layers.forEach(l => {
      if (!l.id.startsWith('gl-draw')) return
      if (!(l.id in drawFiltersRef.current)) drawFiltersRef.current[l.id] = l.filter ?? null
      const own = drawFiltersRef.current[l.id]
      const parts = [own, floorFilter].filter(Boolean)
      map.current.setFilter(l.id, parts.length > 1 ? ['all', ...parts] : (parts[0] ?? null))
    })
  }

  function switchFloor(level) {
    if (level === currentFloorRef.current) return
    exitTool()
    plansRef.current[floorKey()] = activePlan()
    draw.current.changeMode('simple_select', { featureIds: [] })
    setSelectedId(null)
    setFloor(level)
    showPlan(plansRef.current[floorKey()])
  }

  function addFloor(direction) {
    const list = floorsRef.current
    plansRef.current[floorKey()] = activePlan()

    // первый этаж: текущий план становится 1-м
    if (!list.length) {
      plansRef.current['1'] = plansRef.current._ ?? null
      delete plansRef.current._
      setFloorList([1])
      setFloor(1)
      pushHistory()
      return
    }

    const max = Math.max(...list)
    const min = Math.min(...list)
    const level = direction > 0
      ? (max === -1 ? 1 : max + 1)
      : (min === 1 ? -1 : min - 1)

    // новый этаж встаёт на место текущего — здание то же
    const template = activePlan()
    setFloorList([...list, level])
    switchFloor(level)
    pushHistory()
    if (template) {
      const { sx, sy, rot } = template.transform
      pendingCoordsRef.current = transformCorners(template.base, sx, sy, rot)
    }
    fileInputRef.current.click()
  }

  function removeFloor() {
    const level = currentFloorRef.current
    if (level == null) return
    const hasShapes = draw.current.getAll().features
      .some(f => String(shapeMeta.current[f.id]?.floor ?? '') === String(level))
    if (imageUrlRef.current || hasShapes) {
      alert('На этаже есть план или шейпы — сначала удали их')
      return
    }
    delete plansRef.current[String(level)]
    const rest = floorsRef.current.filter(l => l !== level)
    setFloorList(rest)
    setFloor(rest[0] ?? null)
    showPlan(plansRef.current[floorKey()])
    pushHistory()
  }

  function removeOverlay() {
    if (map.current.getLayer('overlay-image-layer')) map.current.removeLayer('overlay-image-layer')
    if (map.current.getSource('overlay-image')) map.current.removeSource('overlay-image')
  }

  // object URL картинки не освобождаем — он нужен, чтобы вернуть план по cmd+Z
  function removePlan() {
    exitTool()
    removeOverlay()
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    centerMarkerRef.current?.remove()
    centerMarkerRef.current = null
    imageUrlRef.current = null
    cornersRef.current = null
    baseCornersRef.current = null
    transformRef.current = { sx: 1, sy: 1, rot: 0 }
    setScaleX(1)
    setScaleY(1)
    setRotation(0)
    setHasImage(false)
    setLocked(false)
  }

  function updateShapeCount() {
    const all = draw.current?.getAll()
    setShapeCount(all?.features?.length ?? 0)
  }

  function handlePanelSave() {
    if (!selectedId) return
    const floorNum = parseInt(panel.floor, 10)
    const meta = { ...panel, floor: Number.isInteger(floorNum) ? String(floorNum) : '' }
    shapeMeta.current[selectedId] = meta
    // add с тем же id обновляет шейп и перерисовывает — нужно, чтобы сработал фильтр этажа
    const feature = draw.current.get(selectedId)
    if (feature) {
      feature.properties = { ...feature.properties, floor: meta.floor }
      draw.current.add(feature)
    }
    updateLabels()
    setSelectedId(null)
    pushHistory()
  }

  function updateLabels() {
    if (!map.current.getSource('labels-source')) {
      map.current.addSource('labels-source', {
        type: 'geojson',
        data: buildLabelsGeoJSON(),
      })
      map.current.addLayer({
        id: 'labels-layer',
        type: 'symbol',
        source: 'labels-source',
        layout: {
          'text-field': ['get', 'number'],
          'text-size': 13,
          'text-font': ['Open Sans Bold', 'Arial Unicode MS Bold'],
          'text-anchor': 'center',
        },
        paint: {
          'text-color': '#111',
          'text-halo-color': '#fff',
          'text-halo-width': 2,
        },
      })
    } else {
      map.current.getSource('labels-source').setData(buildLabelsGeoJSON())
    }
  }

  function buildLabelsGeoJSON() {
    const all = draw.current?.getAll()
    if (!all) return { type: 'FeatureCollection', features: [] }

    const features = all.features.map(f => {
      const meta = shapeMeta.current[f.id] || {}
      if (!meta.number || !isOnCurrentFloor(meta.floor)) return null

      let center
      if (f.geometry.type === 'Point') {
        center = f.geometry.coordinates
      } else {
        const coords = f.geometry.coordinates[0]
        center = [
          coords.reduce((s, c) => s + c[0], 0) / coords.length,
          coords.reduce((s, c) => s + c[1], 0) / coords.length,
        ]
      }

      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: center },
        properties: { number: meta.number },
      }
    }).filter(Boolean)

    return { type: 'FeatureCollection', features }
  }

  function getCenter(corners) {
    return [
      (corners[0][0] + corners[1][0] + corners[2][0] + corners[3][0]) / 4,
      (corners[0][1] + corners[1][1] + corners[2][1] + corners[3][1]) / 4,
    ]
  }

  function normalizeDeg(deg) {
    return (((deg + 180) % 360) + 360) % 360 - 180
  }

  // Поворот по часовой стрелке вокруг center. Считаем в локальных метрах
  // (долготу умножаем на cos(широты)), иначе план при повороте перекашивается.
  function rotateAround(points, center, deg) {
    const k = Math.cos(center[1] * Math.PI / 180)
    const t = deg * Math.PI / 180
    const cos = Math.cos(t)
    const sin = Math.sin(t)
    return points.map(([lng, lat]) => {
      const x = (lng - center[0]) * k
      const y = lat - center[1]
      return [
        center[0] + (x * cos + y * sin) / k,
        center[1] + (-x * sin + y * cos),
      ]
    })
  }

  // base — план без поворота и без W/H; на карте — base × масштаб × поворот
  function transformCorners(base, sx, sy, rot) {
    const center = getCenter(base)
    const scaled = base.map(c => [
      center[0] + (c[0] - center[0]) * sx,
      center[1] + (c[1] - center[1]) * sy,
    ])
    return rotateAround(scaled, center, rot)
  }

  function applyTransform() {
    if (!baseCornersRef.current) return
    const { sx, sy, rot } = transformRef.current
    const corners = transformCorners(baseCornersRef.current, sx, sy, rot)

    cornersRef.current = corners
    updateImageOverlay()

    // обновляем маркеры
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLngLat(getCenter(corners))
    }
    if (markersRef.current[0]) {
      markersRef.current[0].setLngLat(corners[2])
    }
  }

  function setTransform(patch) {
    transformRef.current = { ...transformRef.current, ...patch }
    setScaleX(transformRef.current.sx)
    setScaleY(transformRef.current.sy)
    setRotation(transformRef.current.rot)
    applyTransform()
  }

  // Загружаем углы (возможно, уже повёрнутые): угол берём по верхней грани
  function loadCorners(corners) {
    setFromCorners(corners, 1, 1)
  }

  // Раскладываем готовые углы обратно в base + масштаб W/H + поворот
  function setFromCorners(corners, sx, sy) {
    const center = getCenter(corners)
    const k = Math.cos(center[1] * Math.PI / 180)
    const dx = (corners[1][0] - corners[0][0]) * k
    const dy = corners[1][1] - corners[0][1]
    const rot = normalizeDeg(Math.atan2(-dy, dx) * 180 / Math.PI)
    baseCornersRef.current = rotateAround(corners, center, -rot).map(c => [
      center[0] + (c[0] - center[0]) / sx,
      center[1] + (c[1] - center[1]) / sy,
    ])
    setTransform({ sx, sy, rot })
  }

  // ── Инструменты «растянуть» / «повернуть» вокруг булавки ──

  function selectTool(name) {
    if (toolRef.current === name) {
      exitTool()
      return
    }
    toolRef.current = name
    setTool(name)
    setMarkersVisible(false)
    map.current.getCanvas().style.cursor = 'crosshair'
  }

  function exitTool() {
    toolRef.current = null
    setTool(null)
    setPin(null)
    if (map.current) map.current.getCanvas().style.cursor = ''
    if (cornersRef.current) setMarkersVisible(true)
  }

  function setPin(lngLat) {
    pinRef.current = lngLat
    setHasPin(!!lngLat)
    if (!lngLat) {
      pinMarkerRef.current?.remove()
      pinMarkerRef.current = null
      return
    }
    if (!pinMarkerRef.current) {
      const el = document.createElement('div')
      el.style.cssText = `
        width: 14px; height: 14px; background: #e53935;
        border: 2px solid #fff; border-radius: 50%;
        box-shadow: 0 0 0 1px #333; pointer-events: none;
      `
      pinMarkerRef.current = new maplibregl.Marker({ element: el }).setLngLat(lngLat).addTo(map.current)
    } else {
      pinMarkerRef.current.setLngLat(lngLat)
    }
  }

  function eventLngLat(e) {
    const rect = map.current.getCanvas().getBoundingClientRect()
    const p = map.current.unproject([e.clientX - rect.left, e.clientY - rect.top])
    return [p.lng, p.lat]
  }

  function isInsidePlan(e) {
    if (!cornersRef.current) return false
    const rect = map.current.getCanvas().getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const poly = cornersRef.current.map(c => map.current.project(c))
    let inside = false
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const a = poly[i]
      const b = poly[j]
      if ((a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x) inside = !inside
    }
    return inside
  }

  // Считаем в метрах вокруг булавки (как и поворот — иначе перекос)
  function applyToolDrag(current) {
    const d = toolDragRef.current
    const pin = pinRef.current
    if (!d || !pin) return
    const k = Math.cos(pin[1] * Math.PI / 180)
    const toLocal = p => [(p[0] - pin[0]) * k, p[1] - pin[1]]
    const fromLocal = ([x, y]) => [pin[0] + x / k, pin[1] + y]
    const a = toLocal(d.start)
    const b = toLocal(current)

    if (toolRef.current === 'rotate') {
      const delta = Math.atan2(b[1], b[0]) - Math.atan2(a[1], a[0])
      const corners = rotateAround(d.startCorners, pin, -delta * 180 / Math.PI)
      setFromCorners(corners, transformRef.current.sx, transformRef.current.sy)
      return
    }

    // растягиваем вдоль собственных осей плана
    const t = d.startRot * Math.PI / 180
    const u = [Math.cos(t), -Math.sin(t)]
    const v = [Math.sin(t), Math.cos(t)]
    const dot = (p, q) => p[0] * q[0] + p[1] * q[1]
    const len = Math.hypot(a[0], a[1])
    if (len === 0) return

    let fu, fv
    if (spaceRef.current) {
      fu = fv = Math.hypot(b[0], b[1]) / len
    } else {
      // если тянем точку, лежащую на одной оси с булавкой, другую ось не трогаем
      const au = dot(a, u)
      const av = dot(a, v)
      fu = Math.abs(au) < len * 0.05 ? 1 : dot(b, u) / au
      fv = Math.abs(av) < len * 0.05 ? 1 : dot(b, v) / av
    }
    fu = Math.max(fu, 0.05)
    fv = Math.max(fv, 0.05)

    const corners = d.startCorners.map(q => {
      const l = toLocal(q)
      const qu = dot(l, u) * fu
      const qv = dot(l, v) * fv
      return fromLocal([u[0] * qu + v[0] * qv, u[1] * qu + v[1] * qv])
    })
    setFromCorners(corners, 1, 1)
  }

  // Слушаем мышь в capture-фазе: если жест наш, карта и draw его не видят
  useEffect(() => {
    const container = mapContainer.current

    function onMouseDown(e) {
      if (!toolRef.current || e.button !== 0) return
      if (e.target !== map.current.getCanvas() || !isInsidePlan(e)) return
      e.stopPropagation()
      e.preventDefault()
      toolDragRef.current = {
        start: eventLngLat(e),
        startCorners: cornersRef.current.map(c => [...c]),
        startRot: transformRef.current.rot,
        startX: e.clientX,
        startY: e.clientY,
        moved: false,
        last: null,
      }
      window.addEventListener('mousemove', onMouseMove, true)
      window.addEventListener('mouseup', onMouseUp, true)
    }

    function onMouseMove(e) {
      const d = toolDragRef.current
      if (!d) return
      e.stopPropagation()
      if (!d.moved && Math.hypot(e.clientX - d.startX, e.clientY - d.startY) < 4) return
      d.moved = true
      d.last = eventLngLat(e)
      applyToolDrag(d.last)
    }

    function onMouseUp(e) {
      const d = toolDragRef.current
      window.removeEventListener('mousemove', onMouseMove, true)
      window.removeEventListener('mouseup', onMouseUp, true)
      toolDragRef.current = null
      if (!d) return
      e.stopPropagation()
      if (!d.moved) setPin(d.start) // просто клик — ставим/переставляем булавку
      else if (pinRef.current) pushHistory()
    }

    // клик по плану не должен выделять шейпы под ним
    function onClick(e) {
      if (toolRef.current && e.target === map.current?.getCanvas() && isInsidePlan(e)) e.stopPropagation()
    }

    container.addEventListener('mousedown', onMouseDown, true)
    container.addEventListener('click', onClick, true)
    return () => {
      container.removeEventListener('mousedown', onMouseDown, true)
      container.removeEventListener('click', onClick, true)
    }
  }, [])

  function handleScaleX(e) {
    setTransform({ sx: parseFloat(e.target.value) })
    pushHistoryDebounced()
  }

  function handleScaleY(e) {
    setTransform({ sy: parseFloat(e.target.value) })
    pushHistoryDebounced()
  }

  function handleRotation(e) {
    const val = parseFloat(e.target.value)
    if (!Number.isFinite(val)) return
    setTransform({ rot: normalizeDeg(val) })
    pushHistoryDebounced()
  }

  function handleAlignMap() {
    const target = mapBearing === 0 ? transformRef.current.rot : 0
    map.current.easeTo({ bearing: target, duration: 600 })
  }

  function updateImageOverlay() {
    if (!imageUrlRef.current || !cornersRef.current) return

    if (map.current.getSource('overlay-image')) {
      map.current.getSource('overlay-image').setCoordinates(cornersRef.current)
    } else {
      map.current.addSource('overlay-image', {
        type: 'image',
        url: imageUrlRef.current,
        coordinates: cornersRef.current,
      })
      map.current.addLayer({
        id: 'overlay-image-layer',
        type: 'raster',
        source: 'overlay-image',
        paint: { 'raster-opacity': opacity },
      }, beforeLayerId())
    }
  }

  // план кладём под шейпы и подписи, даже если их нарисовали раньше
  function beforeLayerId() {
    return map.current.getStyle().layers
      .find(l => l.id.startsWith('gl-draw') || l.id === 'labels-layer')?.id
  }

  function setMarkersVisible(visible) {
    markersRef.current.forEach(m => {
      m.getElement().style.display = visible ? 'block' : 'none'
    })
    if (centerMarkerRef.current) {
      centerMarkerRef.current.getElement().style.display = visible ? 'block' : 'none'
    }
  }

  function handleLockToggle() {
    const newLocked = !locked
    if (newLocked) exitTool()
    setLocked(newLocked)
    setMarkersVisible(!newLocked)
  }

  function makeDot(color, size = 16) {
    const el = document.createElement('div')
    el.style.cssText = `
      width: ${size}px;
      height: ${size}px;
      background: ${color};
      border: 2px solid #333;
      border-radius: 50%;
      cursor: grab;
    `
    return el
  }

  function addControlMarkers(corners) {
    markersRef.current.forEach(m => m.remove())
    markersRef.current = []
    if (centerMarkerRef.current) centerMarkerRef.current.remove()

    const scaleEl = makeDot('white')
    const scaleMarker = new maplibregl.Marker({ element: scaleEl, draggable: true })
      .setLngLat(corners[2])
      .addTo(map.current)

    scaleMarker.on('drag', () => {
      const newCorner = Object.values(scaleMarker.getLngLat())
      const center = getCenter(cornersRef.current)

      const oldDx = cornersRef.current[2][0] - center[0]
      const oldDy = cornersRef.current[2][1] - center[1]
      const newDx = newCorner[0] - center[0]
      const newDy = newCorner[1] - center[1]

      const oldDist = Math.sqrt(oldDx * oldDx + oldDy * oldDy)
      const newDist = Math.sqrt(newDx * newDx + newDy * newDy)
      const scale = oldDist !== 0 ? newDist / oldDist : 1

      // равномерный скейл применяем к базе — поворот и W/H сохраняются
      const baseCenter = getCenter(baseCornersRef.current)
      baseCornersRef.current = baseCornersRef.current.map(c => [
        baseCenter[0] + (c[0] - baseCenter[0]) * scale,
        baseCenter[1] + (c[1] - baseCenter[1]) * scale,
      ])
      applyTransform()
    })

    scaleMarker.on('dragend', pushHistory)
    markersRef.current.push(scaleMarker)

    const moveEl = makeDot('#4A90E2', 20)
    moveEl.style.cursor = 'move'
    const center = getCenter(corners)
    const moveMarker = new maplibregl.Marker({ element: moveEl, draggable: true })
      .setLngLat(center)
      .addTo(map.current)

    moveMarker.on('drag', () => {
      const newCenter = Object.values(moveMarker.getLngLat())
      const oldCenter = getCenter(cornersRef.current)
      const dx = newCenter[0] - oldCenter[0]
      const dy = newCenter[1] - oldCenter[1]
      baseCornersRef.current = baseCornersRef.current.map(c => [c[0] + dx, c[1] + dy])
      applyTransform()
    })

    moveMarker.on('dragend', pushHistory)
    centerMarkerRef.current = moveMarker
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return
    e.target.value = ''

    const url = URL.createObjectURL(file)
    imageUrlRef.current = url
    planNameRef.current = file.name

    const img = new Image()
    img.onload = () => {
      const pending = pendingCoordsRef.current
      pendingCoordsRef.current = null

      const corners = pending ?? (() => {
        const center = map.current.getCenter()
        const w = 0.01
        const h = w / (img.width / img.height)
        return [
          [center.lng - w / 2, center.lat + h / 2],
          [center.lng + w / 2, center.lat + h / 2],
          [center.lng + w / 2, center.lat - h / 2],
          [center.lng - w / 2, center.lat - h / 2],
        ]
      })()

      removeOverlay()
      loadCorners(corners)
      addControlMarkers(cornersRef.current)
      setHasImage(true)
      setLocked(false)
      pushHistory()

      if (pending) {
        map.current.fitBounds([
          [Math.min(...corners.map(c => c[0])), Math.min(...corners.map(c => c[1]))],
          [Math.max(...corners.map(c => c[0])), Math.max(...corners.map(c => c[1]))],
        ], { padding: 80, duration: 800 })
      }
    }
    img.src = url
  }

  function handleLoadWithCoords() {
    try {
      const clean = coordInput.replace(/[""«»]/g, '"').replace(/['']/g, "'").trim()
      const parsed = JSON.parse(clean)
      const coords = pickCoords(parsed)
      if (!Array.isArray(coords) || coords.length !== 4) { alert('Неверный формат'); return }
      pendingCoordsRef.current = coords
      fileInputRef.current.click()
      setShowCoordInput(false)
      setCoordInput('')
    } catch (e) {
      alert('Не удалось распарсить JSON: ' + e.message)
    }
  }

  function handleOpacityChange(e) {
    const val = parseFloat(e.target.value)
    setOpacity(val)
    if (map.current.getLayer('overlay-image-layer')) {
      map.current.setPaintProperty('overlay-image-layer', 'raster-opacity', val)
    }
  }

  function handleExport() {
    const all = draw.current.getAll()
    if (!all.features.length) return

    const rows = all.features.map((f, i) => {
      const meta = shapeMeta.current[f.id] || {}
      const coords = JSON.stringify(
        f.geometry.type === 'Point'
          ? f.geometry.coordinates
          : f.geometry.coordinates[0]
      )
      const geomType = f.geometry.type === 'Point' ? 'point' : 'polygon'
      const floor = Number.isInteger(parseInt(meta.floor, 10)) ? parseInt(meta.floor, 10) : ''
      return `${i + 1},"${meta.code || ''}","${meta.number || ''}","${meta.zone || ''}","${meta.type || ''}",${floor},"${geomType}","${coords}"`
    })

    const csv = ['id,code,number,zone,type,floor,geometry_type,coordinates', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shapes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function applyCoords(json) {
    try {
      const clean = json
        .replace(/[“”«»]/g, '"')
        .replace(/[‘’]/g, "'")
        .trim()
      const parsed = JSON.parse(clean)
      const coords = pickCoords(parsed)
      if (!Array.isArray(coords) || coords.length !== 4) return 'Неверный формат: нужен массив из 4 точек'
      loadCorners(coords)
      addControlMarkers(cornersRef.current)
      pushHistory()
      map.current.fitBounds([
        [Math.min(...coords.map(c => c[0])), Math.min(...coords.map(c => c[1]))],
        [Math.max(...coords.map(c => c[0])), Math.max(...coords.map(c => c[1]))],
      ], { padding: 60, duration: 800 })
      return null
    } catch (e) {
      return 'Не удалось распарсить JSON: ' + e.message
    }
  }

  function handleImportCorners() {
    const err = applyCoords(coordInput)
    if (err) { alert(err); return }
    setShowCoordInput(false)
    setCoordInput('')
  }


  // JSON с этажами: берём этаж текущего уровня, иначе первый
  function pickCoords(parsed) {
    if (!Array.isArray(parsed.floors)) return parsed.coordinates
    const floor = parsed.floors.find(f => f.level === currentFloorRef.current) ?? parsed.floors[0]
    return floor?.coordinates
  }

  function handleExportCorners() {
  const plans = allPlans()
  const cornersOf = p => transformCorners(p.base, p.transform.sx, p.transform.sy, p.transform.rot)
  // bearing карты события, при котором план стоит на экране ровно
  const bearingOf = p => Math.round(p.transform.rot * 10) / 10
  let data

  if (!floorsRef.current.length) {
    const plan = plans._
    if (!plan) return
    // углы: top-left, top-right, bottom-right, bottom-left
    data = { coordinates: cornersOf(plan), bearing: bearingOf(plan) }
  } else {
    // готовый JSON для колонки plan в Supabase; картинки — Storage events/<код>/floors/<этаж>.png
    const floorsOut = [...floorsRef.current].sort((a, b) => a - b)
      .filter(level => plans[String(level)])
      .map(level => ({ level, coordinates: cornersOf(plans[String(level)]) }))
    if (!floorsOut.length) return
    const main = plans['1'] ?? plans[String(floorsOut[0].level)]
    data = {
      floors: floorsOut,
      defaultFloor: floorsOut.some(f => f.level === 1) ? 1 : floorsOut[0].level,
      bearing: bearingOf(main),
    }
  }
  const json = JSON.stringify(data, null, 2)
  const blob = new Blob([json], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'floorplan-coords.json'
  a.click()
  URL.revokeObjectURL(url)
}

  function handleCsvImport(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
  const text = event.target.result
  const lines = text.trim().split('\n')
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''))

  const coordIdx = headers.indexOf('coordinates')

  const features = lines.slice(1).map(line => {
    if (!line.trim()) return null
    // берём всё до координат и координаты отдельно
    const coordStart = line.indexOf('"[')
    const coordEnd = line.lastIndexOf(']"') + 2
    const coordsRaw = line.slice(coordStart + 1, coordEnd - 1)
    const before = line.slice(0, coordStart - 1).split(',')

    const get = (name) => {
      const i = headers.indexOf(name)
      return i >= 0 ? before[i]?.replace(/"/g, '').trim() : ''
    }

    try {
      const coords = JSON.parse(coordsRaw)
      const geomType = get('geometry_type')
      return {
        feature: {
          type: 'Feature',
          geometry: geomType === 'point'
            ? { type: 'Point', coordinates: coords }
            : { type: 'Polygon', coordinates: [coords] },
          properties: { floor: get('floor') },
        },
        meta: {
          code: get('code'),
          number: get('number'),
          zone: get('zone'),
          type: get('type'),
          floor: get('floor'),
        }
      }
    } catch {
      return null
    }
  }).filter(Boolean)

  if (features.length) {
    features.forEach(({ feature, meta }) => {
      const ids = draw.current.add(feature)
      shapeMeta.current[ids[0]] = meta
    })
    updateShapeCount()
    updateLabels()
    pushHistory()
  }
}
    reader.readAsText(file)
    e.target.value = ''
  }

  const inputStyle = {
    padding: '4px 8px',
    border: '1px solid #ccc',
    borderRadius: 4,
    fontSize: 13,
    width: '100%',
    boxSizing: 'border-box',
  }

  function floorButtonStyle(active) {
    return {
      minWidth: 28, padding: '4px 6px', cursor: 'pointer', fontSize: 12,
      background: active ? '#333' : '#fff',
      color: active ? '#fff' : '#333',
      border: '1px solid #333', borderRadius: 4,
    }
  }

  function toolButtonStyle(active) {
    return {
      padding: '5px 8px', cursor: 'pointer', display: 'flex', alignItems: 'center',
      background: active ? '#333' : '#fff',
      color: active ? '#fff' : '#333',
      border: '1px solid #333', borderRadius: 4,
    }
  }

  const labelStyle = {
    fontSize: 11,
    color: '#666',
    marginBottom: 2,
    display: 'block',
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />

      {/* Верхняя панель */}
      <div style={{
        position: 'absolute',
        top: 10,
        left: 10,
        display: 'flex',
        gap: 8,
        alignItems: 'center',
        zIndex: 10,
        background: 'rgba(255,255,255,0.9)',
        padding: '8px 12px',
        borderRadius: 8,
        flexWrap: 'wrap',
        maxWidth: 700,
      }}>
        <button onClick={() => fileInputRef.current.click()}
          style={{ padding: '6px 10px', cursor: 'pointer' }}>
          Загрузить план
        </button>
        <button onClick={() => setShowCoordInput(v => !v)}
          style={{ padding: '6px 10px', cursor: 'pointer' }}>
          По координатам
        </button>
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handleImageUpload} />

        {/* Этажи */}
        {floors.length === 0 ? (
          (hasImage || shapeCount > 0) && (
            <button onClick={() => addFloor(1)} title="Сделать текущий план 1-м этажом"
              style={{ padding: '6px 10px', cursor: 'pointer' }}>
              + этажи
            </button>
          )
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <span style={{ fontSize: 11, color: '#666' }}>Этаж</span>
            <button onClick={() => addFloor(1)} title="Добавить этаж выше" style={floorButtonStyle(false)}>+↑</button>
            {floors.map(level => (
              <button key={level} onClick={() => switchFloor(level)} style={floorButtonStyle(level === currentFloor)}>
                {level}
              </button>
            ))}
            <button onClick={() => addFloor(-1)} title="Добавить этаж ниже (подвал)" style={floorButtonStyle(false)}>+↓</button>
            <button onClick={removeFloor} title="Удалить пустой этаж" style={floorButtonStyle(false)}>✕</button>
          </div>
        )}

        {showCoordInput && (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 6 }}>
            <textarea
              value={coordInput}
              onChange={e => setCoordInput(e.target.value)}
              placeholder='Вставь JSON: {"coordinates": [[lng,lat],[lng,lat],[lng,lat],[lng,lat]]}'
              style={{ width: '100%', height: 80, fontSize: 11, fontFamily: 'monospace',
                padding: '4px 8px', border: '1px solid #ccc', borderRadius: 4, boxSizing: 'border-box', resize: 'vertical' }}
            />
            <div style={{ display: 'flex', gap: 6 }}>
              {hasImage && (
                <button onClick={handleImportCorners} style={{
                  padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                  background: '#1a3b6b', color: '#fff', border: 'none', borderRadius: 4,
                }}>
                  Применить к плану
                </button>
              )}
              <button onClick={handleLoadWithCoords} style={{
                padding: '5px 10px', cursor: 'pointer', fontSize: 12,
                background: '#333', color: '#fff', border: 'none', borderRadius: 4,
              }}>
                Загрузить план по координатам
              </button>
            </div>
          </div>
        )}

        {hasImage && (
          <>
            <input type="range" min="0" max="1" step="0.05" value={opacity}
              onChange={handleOpacityChange} style={{ width: 80, cursor: 'pointer' }} />
            <span style={{ fontSize: 12, color: '#333', minWidth: 30 }}>
              {Math.round(opacity * 100)}%
            </span>

            {!locked && (
              <>
                <span style={{ fontSize: 11, color: '#666' }}>W</span>
                <input type="range" min="0.2" max="3" step="0.01" value={scaleX}
                  onChange={handleScaleX} style={{ width: 80, cursor: 'pointer' }} />
                <span style={{ fontSize: 11, color: '#333', minWidth: 30 }}>
                  {Math.round(scaleX * 100)}%
                </span>

                <span style={{ fontSize: 11, color: '#666' }}>H</span>
                <input type="range" min="0.2" max="3" step="0.01" value={scaleY}
                  onChange={handleScaleY} style={{ width: 80, cursor: 'pointer' }} />
                <span style={{ fontSize: 11, color: '#333', minWidth: 30 }}>
                  {Math.round(scaleY * 100)}%
                </span>

                <span style={{ fontSize: 11, color: '#666' }}>↻</span>
                <input type="range" min="-180" max="180" step="0.1" value={rotation}
                  onChange={handleRotation} style={{ width: 100, cursor: 'pointer' }} />
                <input type="number" min="-180" max="180" step="0.1"
                  value={Math.round(rotation * 10) / 10}
                  onChange={handleRotation}
                  style={{ ...inputStyle, width: 64, padding: '2px 4px', fontSize: 11 }} />
                <span style={{ fontSize: 11, color: '#666' }}>°</span>
              </>
            )}

            <button onClick={handleLockToggle} style={{
              padding: '6px 10px', cursor: 'pointer',
              background: locked ? '#333' : '#fff',
              color: locked ? '#fff' : '#333',
              border: '1px solid #333', borderRadius: 4,
            }}>
              {locked ? '🔒' : '🔓'}
            </button>
            <button onClick={handleAlignMap} style={{ padding: '6px 10px', cursor: 'pointer', fontSize: 12 }}>
              {mapBearing === 0 ? 'Карту по плану' : 'Карту на север'}
            </button>
            {!locked && (
              <>
                <button onClick={() => selectTool('stretch')} title="Растянуть от булавки (пробел — пропорционально)"
                  style={toolButtonStyle(tool === 'stretch')}>
                  <Scaling size={16} />
                </button>
                <button onClick={() => selectTool('rotate')} title="Повернуть вокруг булавки"
                  style={toolButtonStyle(tool === 'rotate')}>
                  <RotateCw size={16} />
                </button>
                <span style={{ fontSize: 11, color: '#666' }}>
                  {!tool && '🔵 двигать · ⚪ масштаб'}
                  {tool && !hasPin && 'кликни по плану — поставить булавку'}
                  {tool && hasPin && (tool === 'stretch'
                    ? 'тяни план · пробел — пропорционально · клик — переставить булавку · Esc — выйти'
                    : 'тяни план · клик — переставить булавку · Esc — выйти')}
                </span>
              </>
            )}
          </>
        )}

        <div style={{ width: '100%', height: 1, background: '#ddd', margin: '4px 0' }} />

        {/* Поиск адреса */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Поиск адреса..."
            value={searchQuery}
            onChange={handleSearchInput}
            onKeyDown={e => e.key === 'Escape' && setSearchResults([])}
            style={{ ...inputStyle, paddingRight: 28 }}
          />
          {searchQuery && (
            <button
              onClick={() => { setSearchQuery(''); setSearchResults([]) }}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#999',
              }}
            >✕</button>
          )}
          {searchResults.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'white', border: '1px solid #ddd', borderRadius: 4,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)', marginTop: 2,
            }}>
              {searchResults.map((f, i) => (
                <div
                  key={i}
                  onClick={() => handleSearchSelect(f)}
                  style={{
                    padding: '8px 10px', cursor: 'pointer', fontSize: 12,
                    borderBottom: i < searchResults.length - 1 ? '1px solid #f0f0f0' : 'none',
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                  onMouseLeave={e => e.currentTarget.style.background = 'white'}
                >
                  {f.place_name}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Поиск по координатам */}
        <div style={{ position: 'relative', width: '100%' }}>
          <input
            type="text"
            placeholder="Координаты: 55.7558, 37.6173"
            value={coordQuery}
            onChange={e => { setCoordQuery(e.target.value); setCoordError(false) }}
            onKeyDown={e => {
              if (e.key === 'Enter') handleCoordSearch()
              if (e.key === 'Escape') clearCoordSearch()
            }}
            style={{ ...inputStyle, paddingRight: 28, borderColor: coordError ? '#e53935' : undefined }}
          />
          {coordQuery && (
            <button
              onClick={clearCoordSearch}
              style={{
                position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
                background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: '#999',
              }}
            >✕</button>
          )}
        </div>
        {coordError && (
          <span style={{ fontSize: 11, color: '#e53935' }}>Формат: широта, долгота</span>
        )}

        <div style={{ width: '100%', height: 1, background: '#ddd', margin: '4px 0' }} />

        <button onClick={() => csvInputRef.current.click()}
          style={{ padding: '6px 10px', cursor: 'pointer' }}>
          Импорт CSV
        </button>
        <input ref={csvInputRef} type="file" accept=".csv"
          style={{ display: 'none' }} onChange={handleCsvImport} />

        {shapeCount > 0 && (
  <>
    <span style={{ fontSize: 12, color: '#666' }}>шейпов: {shapeCount}</span>
    <button onClick={handleExport} style={{
      padding: '6px 10px', cursor: 'pointer',
      background: '#333', color: '#fff', border: 'none', borderRadius: 4,
    }}>
      Экспорт CSV
    </button>
  </>
)}

{(hasImage || floors.length > 0) && (
  <button onClick={handleExportCorners} style={{
    padding: '6px 10px', cursor: 'pointer',
    background: '#1a6b3c', color: '#fff', border: 'none', borderRadius: 4,
  }}>
    Экспорт координат
  </button>
)}
      </div>

      {/* Боковая панель редактирования */}
      {selectedId && (
        <div style={{
          position: 'absolute',
          top: 10,
          right: 10,
          zIndex: 10,
          background: 'white',
          padding: 16,
          borderRadius: 8,
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
          width: 220,
          display: 'flex',
          flexDirection: 'column',
          gap: 10,
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>
            Объект
          </div>

          <div>
            <span style={labelStyle}>Code — уникальный ID</span>
            <input style={inputStyle} placeholder="напр. HALL_A или booth_42"
              value={panel.code}
              onChange={e => setPanel(p => ({ ...p, code: e.target.value }))} />
          </div>

          <div>
            <span style={labelStyle}>Number — отображается на карте</span>
            <input style={inputStyle} placeholder="напр. 12 или A3"
              value={panel.number}
              onChange={e => setPanel(p => ({ ...p, number: e.target.value }))} />
          </div>

          <div>
            <span style={labelStyle}>Zone</span>
            <input style={inputStyle} placeholder="напр. A или B"
              value={panel.zone}
              onChange={e => setPanel(p => ({ ...p, zone: e.target.value }))} />
          </div>

          <div>
            <span style={labelStyle}>Type</span>
            <input style={inputStyle} placeholder="напр. session, expo, service_cafe"
              value={panel.type}
              onChange={e => setPanel(p => ({ ...p, type: e.target.value }))} />
          </div>

          <div>
            <span style={labelStyle}>Floor — этаж (подвал: -1, пусто — на всех)</span>
            <input style={inputStyle} type="number" step="1" placeholder="не задан"
              value={panel.floor}
              onChange={e => setPanel(p => ({ ...p, floor: e.target.value }))} />
          </div>

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button onClick={handlePanelSave} style={{
              flex: 1, padding: '6px 0', cursor: 'pointer',
              background: '#333', color: '#fff',
              border: 'none', borderRadius: 4, fontSize: 13,
            }}>
              Сохранить
            </button>
            <button onClick={() => setSelectedId(null)} style={{
              padding: '6px 10px', cursor: 'pointer',
              background: '#fff', border: '1px solid #ccc',
              borderRadius: 4, fontSize: 13,
            }}>
              ✕
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default DrawPage