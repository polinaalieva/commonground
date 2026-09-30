// Городские маркеры: на отдалении вместо сотен точек — один кружок на город с числом фидбеков.
//
// Сейчас числа считаются на фронте из уже загруженных точек. Группируем НЕ по полю `city`
// (оно у части точек не совпадает с координатами), а по расстоянию на экране:
// точки ближе CLUSTER_RADIUS_PX друг к другу на текущем зуме → один кружок в их центре масс.
// Пересчёт — при смене целого уровня зума. Город не режется границами сетки.
// Когда появится агрегат на бэкенде, поменять нужно только clusterPoints().

import { maplibregl } from '../../config/map'
import './cityMarkers.css'

// Ниже этого зума — городские маркеры, с него и выше — отдельные точки фидбека
export const CITY_MARKERS_MAX_ZOOM = 8
// С какого количества отзывов показываем кружок с цифрой; меньше — маленькая точка без цифры
const MIN_COUNT_FOR_NUMBER = 3
// Куда подлетаем по клику на город
const FLY_TO_ZOOM = 11

// 950 → "950", 1234 → "1.2k", 12000 → "12k"
export function formatCount(n) {
  if (n < 1000) return String(n)
  const k = n / 1000
  return (k < 10 ? k.toFixed(1).replace(/\.0$/, '') : Math.round(k)) + 'k'
}

// Радиус объединения точек в один кружок, px на экране
const CLUSTER_RADIUS_PX = 90

// lng/lat → мировые пиксели (Web Mercator) на зуме z
function project(lng, lat, z) {
  const scale = 512 * 2 ** z // MapLibre: тайл 512px
  const x = ((lng + 180) / 360) * scale
  const s = Math.sin((lat * Math.PI) / 180)
  const y = (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * scale
  return [x, y]
}

// Размер кружка в px по зуму: мир → 20, Европа → 27, регион → 34
const SIZE_STOPS = [[2, 20], [4, 27], [7, 34]]
function sizeForZoom(z) {
  if (z <= SIZE_STOPS[0][0]) return SIZE_STOPS[0][1]
  for (let i = 1; i < SIZE_STOPS.length; i++) {
    const [z1, s1] = SIZE_STOPS[i]
    const [z0, s0] = SIZE_STOPS[i - 1]
    if (z <= z1) return s0 + ((s1 - s0) * (z - z0)) / (z1 - z0)
  }
  return SIZE_STOPS[SIZE_STOPS.length - 1][1]
}

// records → [{ city (id группы), count, lng, lat, bounds }]
function clusterPoints(records, z) {
  const R = CLUSTER_RADIUS_PX
  const pts = []
  for (const r of records) {
    const lat = parseFloat(r.lat)
    const lng = parseFloat(r.lng)
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue
    if (lat === 0 && lng === 0) continue // мусорные координаты
    const [x, y] = project(lng, lat, z)
    pts.push({ id: r.id, lat, lng, x, y, taken: false })
  }
  // сетка-ускоритель: ячейка = R, соседей ищем в 3×3
  const grid = new Map()
  const key = (gx, gy) => gx + ':' + gy
  pts.forEach((p) => {
    const k = key(Math.floor(p.x / R), Math.floor(p.y / R))
    if (!grid.has(k)) grid.set(k, [])
    grid.get(k).push(p)
  })
  // сначала «затравки» из самых плотных мест — так крупный город собирается целиком
  const density = (p) => {
    let n = 0
    const gx = Math.floor(p.x / R), gy = Math.floor(p.y / R)
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) n += (grid.get(key(gx + dx, gy + dy)) || []).length
    return n
  }
  const order = pts.map((p) => [p, density(p)]).sort((a, b) => b[1] - a[1]).map(([p]) => p)

  const out = []
  for (const seed of order) {
    if (seed.taken) continue
    const gx = Math.floor(seed.x / R), gy = Math.floor(seed.y / R)
    const members = []
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      for (const p of grid.get(key(gx + dx, gy + dy)) || []) {
        if (!p.taken && (p.x - seed.x) ** 2 + (p.y - seed.y) ** 2 <= R * R) { p.taken = true; members.push(p) }
      }
    }
    let latSum = 0, lngSum = 0, minLat = 90, maxLat = -90, minLng = 180, maxLng = -180
    members.forEach((p) => {
      latSum += p.lat; lngSum += p.lng
      minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat)
      minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng)
    })
    out.push({
      city: `c-${seed.id}`,
      count: members.length,
      latSum, lngSum, minLat, maxLat, minLng, maxLng,
    })
  }

  // второй проход: «хвостик» на краю города вливаем в соседний крупный кружок,
  // если их центры ближе радиуса — чтобы город не распадался на большой + маленький
  out.sort((a, b) => b.count - a.count)
  const merged = []
  for (const c of out) {
    const [cx, cy] = project(c.lngSum / c.count, c.latSum / c.count, z)
    const host = merged.find((m) => {
      const [mx, my] = project(m.lngSum / m.count, m.latSum / m.count, z)
      return (mx - cx) ** 2 + (my - cy) ** 2 <= R * R
    })
    if (!host) { merged.push({ ...c }); continue }
    host.count += c.count
    host.latSum += c.latSum; host.lngSum += c.lngSum
    host.minLat = Math.min(host.minLat, c.minLat); host.maxLat = Math.max(host.maxLat, c.maxLat)
    host.minLng = Math.min(host.minLng, c.minLng); host.maxLng = Math.max(host.maxLng, c.maxLng)
  }

  return merged.map((c) => ({
    city: c.city,
    count: c.count,
    lat: c.latSum / c.count,
    lng: c.lngSum / c.count,
    bounds: [[c.minLng, c.minLat], [c.maxLng, c.maxLat]],
  }))
}

// Прячем слои точек фидбека ниже CITY_MARKERS_MAX_ZOOM
export function hidePointsBelowCityZoom(map, layerIds) {
  layerIds.forEach((id) => {
    if (map.getLayer(id)) map.setLayerZoomRange(id, CITY_MARKERS_MAX_ZOOM, 24)
  })
}

export function createCityMarkers(map) {
  const markers = new Map() // id ячейки → { marker, label }
  let lastRecords = []
  let lastLevel = null // целый уровень зума, на котором считали группы

  function makeElement(city, getBounds) {
    const el = document.createElement('div')
    el.className = 'cg-city-marker'
    const inner = document.createElement('div') // внутренний — чтобы hover-scale не конфликтовал с transform маркера
    inner.className = 'cg-city-marker__bubble'
    el.appendChild(inner)
    el.addEventListener('click', (e) => {
      e.stopPropagation()
      // подлетаем так, чтобы все точки группы влезли в экран, но не ближе FLY_TO_ZOOM
      map.fitBounds(getBounds(), { padding: 80, maxZoom: FLY_TO_ZOOM, duration: 1800, essential: true })
    })
    el.setAttribute('role', 'button')
    el.setAttribute('aria-label', city)
    return { el, inner }
  }

  // Прячем через внутренний кружок: на сам элемент маркера MapLibre ставит inline opacity
  function syncVisibility() {
    const z = map.getZoom()
    const hidden = z >= CITY_MARKERS_MAX_ZOOM
    const size = Math.round(sizeForZoom(z))
    markers.forEach(({ marker, label }) => {
      const el = marker.getElement()
      el.style.pointerEvents = hidden ? 'none' : ''
      label.classList.toggle('is-hidden', hidden)
      label.style.setProperty('--cg-city-size', `${size}px`)
    })
    // на другом уровне зума — пересчитываем группы
    if (!hidden && Math.floor(z) !== lastLevel) update(lastRecords)
  }

  function update(records) {
    lastRecords = records
    lastLevel = Math.floor(map.getZoom())
    const groups = clusterPoints(records, lastLevel + 0.5)
    const seen = new Set()
    for (const g of groups) {
      seen.add(g.city)
      let m = markers.get(g.city)
      if (!m) {
        const holder = {}
        const { el, inner } = makeElement(g.city, () => holder.bounds)
        const marker = new maplibregl.Marker({ element: el, anchor: 'center' }).setLngLat([g.lng, g.lat]).addTo(map)
        m = { marker, label: inner, holder }
        markers.set(g.city, m)
      } else {
        m.marker.setLngLat([g.lng, g.lat])
      }
      m.holder.bounds = g.bounds
      const small = g.count < MIN_COUNT_FOR_NUMBER
      m.label.classList.toggle('is-small', small)
      m.label.textContent = small ? '' : formatCount(g.count)
      m.label.title = `${g.count}`
    }
    // города, где точек больше нет
    markers.forEach((m, city) => {
      if (!seen.has(city)) { m.marker.remove(); markers.delete(city) }
    })
    syncVisibility()
  }

  map.on('zoom', syncVisibility)

  function destroy() {
    map.off('zoom', syncVisibility)
    markers.forEach(({ marker }) => marker.remove())
    markers.clear()
  }

  return { update, destroy }
}
