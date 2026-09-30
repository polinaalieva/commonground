// Слои для ориентирования: метро, вокзалы, аэропорты, культура, образование.
// Данные — из тех же векторных тайлов MapTiler (схема OpenMapTiles), иконки — наши,
// из /public/map-icons/*.svg (их можно просто заменить файлами из Figma, 24×24).
//
// Отладка: в консоли браузера вызвать  cgPoiDebug()  — покажет, какие class/subclass
// реально есть в тайлах в текущем виде карты (чтобы подогнать фильтры).

const ICONS = ['metro', 'train', 'airport', 'culture', 'tourism', 'education']
// ── Лестница зумов: на каждом шаге приближения добавляется один слой информации.
// STATION_Z — зум, с которого MapTiler вообще кладёт станции в тайлы (раньше данных нет).
// Если вокзалы появляются на другом зуме — поменять только это число.
const STATION_Z = 12
const Z = {
  airport:        { icon: 7,              text: 7 },
  train:          { icon: STATION_Z,      text: STATION_Z + 1 },
  metro:          { icon: STATION_Z + 1,  text: STATION_Z + 2 },
  culture:        { icon: Math.max(14, STATION_Z + 3), text: 16 },  // культура + туризм
  education:      { icon: Math.max(15, STATION_Z + 4), text: 16 },
}

const ICON_PX = 24          // размер SVG
const ICON_PIXEL_RATIO = 2  // рисуем в 2x для ретины

const CULTURE = ['museum', 'theatre', 'art_gallery', 'attraction', 'monument', 'castle', 'cinema', 'library', 'music']
const EDUCATION = ['college', 'school', 'university']

const NAME = ['coalesce', ['get', 'name'], ['get', 'name:latin'], '']
const TEXT_PAINT = {
  'text-color': '#4B5563',
  'text-halo-color': 'rgba(255,255,255,0.9)',
  'text-halo-width': 1.2,
}

function loadSvg(url) {
  return new Promise((resolve, reject) => {
    const img = new Image(ICON_PX * ICON_PIXEL_RATIO, ICON_PX * ICON_PIXEL_RATIO)
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = url
  })
}

// Ищем векторный источник OpenMapTiles внутри стиля (у MapTiler он обычно 'maptiler_planet')
function findOmtSource(m) {
  const l = m.getStyle().layers.find((x) =>
    ['poi', 'transportation', 'water', 'building'].includes(x['source-layer']))
  if (l) return l.source
  const key = import.meta.env.VITE_MAPTILER_KEY
  if (!m.getSource('cg-omt')) {
    m.addSource('cg-omt', { type: 'vector', url: `https://api.maptiler.com/tiles/v3/tiles.json?key=${key}` })
  }
  return 'cg-omt'
}

// Шрифт Medium того же семейства, что и в стиле (например 'Metropolis Regular Italic' → 'Metropolis Medium')
const WEIGHTS = /\s+(Thin|Extra Light|Light|Regular|Book|Medium|Semi ?Bold|Bold|Extra Bold|Black|Heavy)?\s*(Italic|Oblique)?$/i
function findMediumFont(m) {
  const all = new Set()
  m.getStyle().layers.forEach((l) => {
    const f = l.layout?.['text-font']
    if (Array.isArray(f)) f.forEach((x) => typeof x === 'string' && all.add(x))
  })
  const list = [...all]
  const medium = list.find((f) => /\bMedium$/i.test(f))
  if (medium) return [medium]
  const family = (list[0] || 'Noto Sans Regular').replace(WEIGHTS, '')
  return [`${family} Medium`]
}

function findFont(m) {
  const f = m.getStyle().layers.find((l) =>
    Array.isArray(l.layout?.['text-font']) && l.layout['text-font'].every((x) => typeof x === 'string'))
  return f ? f.layout['text-font'] : ['Noto Sans Regular']
}

export const ORIENTATION_LAYERS = [
  'cg-orient-airport', 'cg-orient-train', 'cg-orient-metro',
  'cg-orient-culture', 'cg-orient-tourism', 'cg-orient-education',
]

export async function addOrientationLayers(m) {
  if (m.getLayer('cg-orient-metro')) return

  // 1) иконки
  await Promise.all(ICONS.map(async (name) => {
    const id = `cg-icon-${name}`
    if (m.hasImage(id)) return
    try {
      const img = await loadSvg(`/map-icons/${name}.svg`)
      if (!m.hasImage(id)) m.addImage(id, img, { pixelRatio: ICON_PIXEL_RATIO })
    } catch (e) {
      console.warn('[orientation] не загрузилась иконка', name, e)
    }
  }))
  if (!m.getStyle()) return // карту уже размонтировали

  const source = findOmtSource(m)
  const font = findFont(m)
  const fontMedium = findMediumFont(m)
  // Кладём ниже точек фидбека, если они уже на карте (иначе они и так добавятся сверху)
  const before = m.getLayer('cg-feedback-layer') ? 'cg-feedback-layer' : undefined

  // station: true → подпись Medium без обводки (станции, аэропорты, культура, туризм)
  const symbol = (id, { sourceLayer, filter, icon, minzoom, textFrom = 0, textSize = 11, sort, station = false, iconOpacity = 1 }) => {
    m.addLayer({
      id,
      type: 'symbol',
      source,
      'source-layer': sourceLayer,
      minzoom,
      filter,
      layout: {
        'icon-image': `cg-icon-${icon}`,
        'icon-size': ['interpolate', ['linear'], ['zoom'], Math.min(minzoom, 15), 0.6, 16, 0.75],   // 24px SVG → ~14…18px
        'icon-allow-overlap': false,
        'symbol-sort-key': sort ?? ['coalesce', ['get', 'rank'], 99],
        'text-field': textFrom ? ['step', ['zoom'], '', textFrom, NAME] : NAME,
        'text-font': station ? fontMedium : font,
        'text-size': textSize,
        'text-offset': [0, 0.9],
        'text-anchor': 'top',
        'text-optional': true,        // если подпись не влезает — оставляем только иконку
        'text-max-width': 8,
      },
      paint: {
        ...(station ? { 'text-color': TEXT_PAINT['text-color'] } : TEXT_PAINT),
        'icon-opacity': iconOpacity,
      },
    }, before)
  }

  // Какая схема тайлов у стиля: MapTiler Planet v4 (poi_station, poi_culture…) или OpenMapTiles (poi)
  const vl = m.getSource(source)?.vectorLayerIds || []
  const isV4 = vl.includes('poi_station')
  const cls = ['get', 'class']
  // Станции в v4 (проверено на живых тайлах): poi_station, class 'railway', subclass 'station' | 'halt' | 'yard'…
  // Метро от вокзала отличается только полем network ('London Underground', 'Московский метрополитен'…)
  const TXT = ['downcase', ['concat',
    ['to-string', ['get', 'class']], '/', ['to-string', ['get', 'subclass']], '/', ['to-string', ['coalesce', ['get', 'network'], '']]]]
  const has = (word) => ['in', word, TXT]
  const IS_STATION = ['all', ['==', cls, 'railway'], ['in', ['get', 'subclass'], ['literal', ['station', 'halt', 'subway']]]]
  const IS_METRO = ['all', IS_STATION, ['any',
    ['==', ['get', 'subclass'], 'subway'],
    has('underground'), has('metro'), has('subway'), has('u-bahn'), has('метро'),
  ]]
  const IS_TRAIN = ['all', IS_STATION, ['!', IS_METRO], ['!', has('tram')]]

  // Добавляем снизу вверх: слой выше = приоритетнее при наложении подписей.
  // Итог сверху вниз: аэропорт > вокзал > метро > культура > образование
  if (isV4) {
    // ── MapTiler Planet v4: https://docs.maptiler.com/schema/planet-v4/
    symbol('cg-orient-education', {
      sourceLayer: 'poi_education', icon: 'education', minzoom: Z.education.icon, textFrom: Z.education.text, textSize: 10, station: true,
      filter: ['in', cls, ['literal', ['university', 'college']]],
    })
    symbol('cg-orient-tourism', {
      sourceLayer: 'poi_tourism', icon: 'tourism', minzoom: Z.culture.icon, textFrom: Z.culture.text, textSize: 10, station: true, iconOpacity: 0.5,
      filter: ['in', cls, ['literal', ['attraction', 'museum', 'gallery', 'zoo', 'aquarium', 'theme_park']]],
    })
    symbol('cg-orient-culture', {
      sourceLayer: 'poi_culture', icon: 'culture', minzoom: Z.culture.icon, textFrom: Z.culture.text, textSize: 10, station: true, iconOpacity: 0.5,
      filter: ['!=', cls, 'place_of_worship'],   // храмов слишком много — не берём
    })
    symbol('cg-orient-metro', {
      sourceLayer: 'poi_station', icon: 'metro', minzoom: Z.metro.icon, textFrom: Z.metro.text, textSize: 11, station: true, iconOpacity: 0.5,
      filter: IS_METRO,
    })
    symbol('cg-orient-train', {
      sourceLayer: 'poi_station', icon: 'train', minzoom: Z.train.icon, textFrom: Z.train.text, textSize: 11, station: true,
      filter: IS_TRAIN,
    })
    symbol('cg-orient-airport', {
      // аэропорты тоже лежат в poi_station: class 'aerodrome', есть код iata
      sourceLayer: 'poi_station', icon: 'airport', minzoom: Z.airport.icon, textFrom: Z.airport.text, textSize: 12, station: true,
      filter: ['all', ['==', cls, 'aerodrome'], ['has', 'iata']],
    })
  } else {
    // ── OpenMapTiles (старые стили MapTiler)
    symbol('cg-orient-education', {
      sourceLayer: 'poi', icon: 'education', minzoom: 15, textFrom: 16, textSize: 10,
      filter: ['in', ['get', 'class'], ['literal', EDUCATION]],
    })
    symbol('cg-orient-culture', {
      sourceLayer: 'poi', icon: 'culture', minzoom: 14, textFrom: 16, textSize: 10,
      filter: ['in', ['get', 'class'], ['literal', CULTURE]],
    })
    symbol('cg-orient-metro', {
      sourceLayer: 'poi', icon: 'metro', minzoom: 12, textFrom: 13, textSize: 11,
      filter: ['all',
        ['==', ['get', 'class'], 'railway'],
        ['==', ['get', 'subclass'], 'subway'],
      ],
    })
    symbol('cg-orient-train', {
      sourceLayer: 'poi', icon: 'train', minzoom: 11, textSize: 11,
      filter: ['all',
        ['==', ['get', 'class'], 'railway'],
        ['==', ['get', 'subclass'], 'station'],
      ],
    })
    symbol('cg-orient-airport', {
      sourceLayer: 'aerodrome_label', icon: 'airport', minzoom: 8, textSize: 12,
      filter: ['has', 'name'],
    })
  }

  // Отладка фильтров
  window.cgPoiDebug = () => {
    const src = m.getSource(source)
    const report = {
      'источник': source,
      'url источника': src?.url || JSON.stringify(src?.tiles || src?._options?.url || '—'),
      'зум': m.getZoom().toFixed(1),
      'иконки загружены': ICONS.filter((n) => m.hasImage(`cg-icon-${n}`)).join(', ') || 'нет',
      'шрифт подписей': font.join(', ') + '  |  станции: ' + fontMedium.join(', '),
      'схема тайлов': isV4 ? 'MapTiler Planet v4' : 'OpenMapTiles',
      'слои в тайлах': vl.join(', '),
      'наши слои на карте': ORIENTATION_LAYERS.filter((id) => m.getLayer(id)).length + ' из ' + ORIENTATION_LAYERS.length,
    }
    ;(isV4 ? ['poi_station', 'poi_culture', 'poi_tourism', 'poi_education', 'aviation'] : ['poi', 'aerodrome_label'])
      .forEach((sl) => { report[`объектов в «${sl}»`] = m.querySourceFeatures(source, { sourceLayer: sl }).length })
    console.log('%c[cgPoiDebug]', 'font-weight:bold', JSON.stringify(report, null, 2))

    const counts = {}
    ;(isV4 ? ['poi_station', 'poi_culture', 'poi_tourism', 'poi_education', 'aviation'] : ['poi']).forEach((sl) =>
    m.querySourceFeatures(source, { sourceLayer: sl }).forEach((f) => {
      const k = `${sl}: ${f.properties.class} / ${f.properties.subclass}`
      counts[k] = (counts[k] || 0) + 1
    }))
    const rows = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(([k, n]) => `${n}\t${k}`)
    console.log('[cgPoiDebug] class / subclass в текущем виде:\n' + (rows.join('\n') || '— пусто —'))
    ;['poi_station', 'subway_label', 'railway_label', 'aviation'].forEach((sl) => {
      const fs = m.querySourceFeatures(source, { sourceLayer: sl }).slice(0, 4)
      console.log(`[cgPoiDebug] примеры «${sl}» (${fs.length ? fs[0].geometry.type : 'нет объектов'}):\n` +
        fs.map((f) => JSON.stringify(f.properties)).join('\n'))
    })
    console.log('[cgPoiDebug] все источники стиля:', JSON.stringify(Object.fromEntries(
      Object.entries(m.getStyle().sources).map(([id, s]) => [id, s.url || s.type]))))
  }
}
