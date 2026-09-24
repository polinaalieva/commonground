import { useEffect, useState } from 'react'
import { SUPABASE_URL, supabaseFetch } from './supabase'

// Настройки событий — в Supabase, таблица events (для людей — Notion «Event maps»).
// Код события: короткое-имя-месяц-год (wuf-11-26). Он же в URL /event/<код>,
// в таблицах event_<код>_venues/_sessions/_orgs и в feedback_map.event_id.
// Картинки — Storage, бакет events: <код>/logo.png, <код>/floors/<этаж>.png (без этажей — plan.png)

const SERVICE_COLOR = '#6B7280'

export function eventAssetUrl(code, path) {
  return `${SUPABASE_URL}/storage/v1/object/public/events/${code}/${path}`
}

// "широта, долгота" (как копируется из Google Maps) → [lng, lat]
function parseEntrance(text) {
  const [lat, lng] = String(text ?? '').split(',').map(s => Number(s.trim()))
  return Number.isFinite(lat) && Number.isFinite(lng) ? [lng, lat] : null
}

// По зоне на строку: "Area A: #4A90E2" → { 'Area A': '#4A90E2' }
function parseZones(text) {
  const zones = {}
  String(text ?? '').split('\n').forEach(line => {
    const i = line.lastIndexOf(':')
    if (i <= 0) return
    const name = line.slice(0, i).trim()
    const color = line.slice(i + 1).trim()
    if (name && color) zones[name] = color
  })
  return zones
}

// plan — JSON из экспорта координат /draw: { floors: [...] } или { coordinates }
function planFloors(code, plan) {
  if (plan?.floors?.length) {
    return plan.floors.map(f => ({
      level: f.level,
      coordinates: f.coordinates,
      url: eventAssetUrl(code, `floors/${f.level}.png`),
    }))
  }
  if (plan?.coordinates) {
    return [{ level: null, coordinates: plan.coordinates, url: eventAssetUrl(code, 'floors/plan.png') }]
  }
  return []
}

// Границы карты — по плану и входу: bbox с небольшим запасом, maxBounds пошире
function computeBounds(points) {
  if (!points.length) return {}
  const lngs = points.map(p => p[0])
  const lats = points.map(p => p[1])
  const [minLng, maxLng, minLat, maxLat] = [Math.min(...lngs), Math.max(...lngs), Math.min(...lats), Math.max(...lats)]
  const mPerLat = 111320
  const mPerLng = 111320 * Math.cos(((minLat + maxLat) / 2) * Math.PI / 180)
  const size = Math.max((maxLng - minLng) * mPerLng, (maxLat - minLat) * mPerLat)
  const pad = m => [
    [minLng - m / mPerLng, minLat - m / mPerLat],
    [maxLng + m / mPerLng, maxLat + m / mPerLat],
  ]
  return { bbox: pad(Math.max(size * 0.2, 50)), maxBounds: pad(Math.max(size, 500)) }
}

// Строка таблицы events → объект, с которым работает карта
function normalizeEvent(row) {
  const plan = row.plan || {}
  const floors = planFloors(row.code, plan)
  const entrance = parseEntrance(row.entrance)
  const points = [...floors.flatMap(f => f.coordinates), ...(entrance ? [entrance] : [])]
  const zoom = Number(row.zoom) || 16

  return {
    code: row.code,
    name: row.name,
    shortName: row.short_name,
    description: row.description,
    location: row.location,
    dates: [row.starts_on, row.ends_on],
    markerImage: eventAssetUrl(row.code, 'logo.png'),
    center: entrance ?? points[0] ?? [0, 0],
    zoom,
    minZoom: Math.max(zoom - 3, 12),
    bearing: Number(row.bearing ?? plan.bearing ?? 0),
    ...computeBounds(points),
    zoneColors: parseZones(row.zones),
    serviceColor: SERVICE_COLOR,
    floors,
    defaultFloor: plan.defaultFloor ?? null,
  }
}

// ── Загрузка: один запрос на всё приложение ──

let eventsPromise = null
const eventsByCode = {}

export function loadEvents() {
  if (!eventsPromise) {
    eventsPromise = supabaseFetch('events?select=*&order=starts_on.asc')
      .then(rows => {
        const list = rows.map(normalizeEvent)
        list.forEach(e => { eventsByCode[e.code] = e })
        return list
      })
      .catch(err => {
        eventsPromise = null // следующая попытка загрузит заново
        throw err
      })
  }
  return eventsPromise
}

// Синхронно, если события уже загружены (подписи в карточках отзывов)
export function getLoadedEvent(code) {
  return eventsByCode[code] ?? null
}

export function useEvents() {
  const [events, setEvents] = useState([])
  useEffect(() => {
    let alive = true
    loadEvents()
      .then(list => { if (alive) setEvents(list) })
      .catch(e => console.error('Failed to load events', e))
    return () => { alive = false }
  }, [])
  return events
}

// status: 'loading' | 'ready' | 'error'; event: null — такого события нет
export function useEvent(code) {
  const [state, setState] = useState({ code: null, status: 'loading', event: null })
  useEffect(() => {
    let alive = true
    loadEvents()
      .then(list => {
        if (alive) setState({ code, status: 'ready', event: list.find(e => e.code === code) ?? null })
      })
      .catch(() => { if (alive) setState({ code, status: 'error', event: null }) })
    return () => { alive = false }
  }, [code])
  return state.code === code ? state : { code, status: 'loading', event: null }
}

// ── Этажи ──

// Этажи события сверху вниз; план без этажей — один элемент с level: null
export function getEventFloors(config) {
  return [...(config?.floors ?? [])].sort((a, b) => (b.level ?? 0) - (a.level ?? 0))
}

// null — этажей нет, показываем всё
export function getDefaultFloor(config) {
  const levels = getEventFloors(config).map(f => f.level).filter(l => l != null)
  if (!levels.length) return null
  if (levels.includes(config.defaultFloor)) return config.defaultFloor
  return levels.includes(1) ? 1 : levels[levels.length - 1]
}

// Точка без этажа (null) видна на всех этажах
export function isOnFloor(floor, currentFloor) {
  return currentFloor == null || floor == null || Number(floor) === currentFloor
}
