// углы плана DW! Brasília: top-left, top-right, bottom-right, bottom-left
const TBR26_PLAN_CORNERS = [
  [-47.95428204716544, -15.82627570046853],
  [-47.95282120449338, -15.82649977301081],
  [-47.95301915455409, -15.827694309932193],
  [-47.95447999722615, -15.827470237389912],
]

// Код события: короткое-имя-месяц-год (wuf-11-26). Он же в URL /event/<код>,
// в таблицах event_<код>_venues/_sessions/_orgs и в feedback_map.event_id
export const EVENTS = {
  'wuf-11-26': {
    name: 'World Urban Forum 13',
    shortName: 'WUF13',
    description: 'WUF13 brings together urban leaders, practitioners, and researchers to shape the future of sustainable cities. This map lets participants mark places across the venue and share how they experience them.',
    markerImage: '/events/wuf13.png',
    location: 'Baku, Azerbaijan',
    dates: ['2026-11-01', '2026-11-07'],
    bbox: [[49.910, 40.425], [49.930, 40.438]],
    center: [49.920, 40.431],
    zoom: 15,
    minZoom: 14,
    maxBounds: [[49.900, 40.420], [49.940, 40.445]],
    zoneColors: {
      'Area A': '#4A90E2',
      'Urban Expo': '#F5A623',
      'Area B': '#7ED321',
    },
    serviceColor: '#6B7280',
    
  floorplan: {url: '/floorplans/wuf13-v2.png',
      coordinates: [
        [49.91300582305555, 40.43617368340293],
        [49.92681429980005, 40.43617368340293],
        [49.92681429980005, 40.4253899164859],
        [49.91300582305555, 40.4253899164859],
      ]
    }
  },
  'uis-09-27': {
    name: 'Urban Intelligence Summit 2027',
    shortName: 'UIS27',
        description: 'An event bringing together people shaping the future of cities through data, technology, design, and new approaches to understanding urban life.',
    markerImage: '/events/uis27.png',
    location: 'Barcelona, Spain',
    dates: ['2027-09-13', '2027-09-15'],
    center: [2.142519076132203, 41.379661064465864],
    zoom: 20,
    bearing: 45,
    bbox: [[2.1418, 41.3790], [2.1433, 41.3803]],
    minZoom: 17,
    maxBounds: [
      [2.1418, 41.3790],
      [2.1433, 41.3803],
    ],
    zoneColors: {
      'Zone A': '#00DBB0',
      'Expo Area': '#03A1EA',
    },
    serviceColor: '#6B7280',
    floorplan: {
      url: '/floorplans/uis27_planv.png',
      coordinates: [
        [2.1422313456499102, 41.379862061414904],
        [2.1427886690649496, 41.379862061414904],
        [2.1427886690649496, 41.37943883449626],
        [2.1422313456499102, 41.37943883449626],
      ]
    }
  },
  'dwb-09-26': {
    name: 'DW! Brasília',
    shortName: 'DW!B',
    description: '', // TODO: описание для окна About
    markerImage: '/events/TBr26-logo.png',
    location: 'Brasília, Brazil',
    // вход в ивент: маркер на общей карте и старт карты события
    center: [-47.95360383586143, -15.827000870234729],
    zoom: 17,
    bearing: 9.1, // план на экране стоит ровно
    // TODO: границы примерные (±~1 км от входа) — сузить по плану площадки
    bbox: [[-47.9636, -15.8370], [-47.9436, -15.8170]],
    minZoom: 15,
    maxBounds: [
      [-47.9636, -15.8370],
      [-47.9436, -15.8170],
    ],
    zoneColors: {}, // TODO: цвета зон из CSV
    serviceColor: '#6B7280',
    // оба этажа в одном контуре здания
    floors: [
      { level: 2, url: '/floorplans/TBr26_2Fl.png', coordinates: TBR26_PLAN_CORNERS },
      { level: 1, url: '/floorplans/TBr26_1Fl.png', coordinates: TBR26_PLAN_CORNERS },
    ],
    defaultFloor: 1,
  },
}

// Этажи события сверху вниз. Старый одиночный floorplan — один план без уровня
export function getEventFloors(config) {
  if (config?.floors?.length) return [...config.floors].sort((a, b) => b.level - a.level)
  if (config?.floorplan) return [{ level: null, ...config.floorplan }]
  return []
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

// Старые коды событий → новые: ссылки и QR-коды, разосланные до переименования
export const LEGACY_EVENT_IDS = {
  wuf13: 'wuf-11-26',
  uis27: 'uis-09-27',
  '26-03-tbr': 'dwb-09-26',
}

export function buildZoneColorExpression(zoneColors, fallback = '#cccccc') {
  const pairs = Object.entries(zoneColors).flat()
  return ['match', ['get', 'zone'], ...pairs, fallback]
}