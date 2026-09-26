// src/planlab/svgPlan.js
// SVG плана → GeoJSON в той же привязке, что и PNG: 4 угла из /draw (floorplan-coords.json).
// Угол viewBox SVG = угол картинки. Значит SVG и PNG надо экспортировать из одного артборда/страницы.
//
// Два этапа:
//   1. extractItems — один раз на файл: браузер сам считает трансформы и стили, мы достаём
//      геометрию в координатах viewBox.
//   2. buildGeojson — на каждое изменение настроек: роли, упрощение, фильтры, привязка.

import { flattenPath, simplify, ringArea, pointInRing, lineLength } from './svgPath'

// ── Роли слоёв ──
// Роль берётся по имени ближайшего слоя/группы (Illustrator — id, Figma — id, Inkscape — label).
// Вложенные элементы наследуют роль, пока не встретится другое имя с ролью.
export const ROLES = ['auto', 'walls', 'rooms', 'zones', 'outline', 'labels', 'ignore']
export const ROLE_LABELS = {
  auto: 'авто',
  walls: 'стены',
  rooms: 'помещения',
  zones: 'зоны',
  outline: 'контур здания',
  labels: 'подписи',
  ignore: 'игнор',
}
const ROLE_RULES = [
  ['ignore', /^(ignore|skip|hide|trash|мусор|скрыть|игнор)/i],
  ['walls', /^(walls?|стен[аы]?)\b/i],
  ['rooms', /^(rooms?|помещени|комнат|зал[ы]?\b)/i],
  ['zones', /^(zones?|зон[аы]?\b)/i],
  ['outline', /^(outline|contour|building|footprint|контур|здание)/i],
  ['labels', /^(labels?|texts?|подпис|текст)/i],
]
export function guessRole(name) {
  return ROLE_RULES.find(([, re]) => re.test(name))?.[0] ?? null
}

// Illustrator кодирует пробелы как _x20_ и дубли как walls_1_
function cleanName(raw) {
  if (!raw) return ''
  return raw
    .replace(/_x([0-9A-Fa-f]{2,4})_/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/_\d+_$/, '')
    .trim()
}
function nameOf(node) {
  return cleanName(node.getAttribute('data-name') || node.getAttribute('inkscape:label') || node.getAttribute('id'))
}
// автоимена редакторов — не названия помещений
const JUNK_NAME = /^(path|rect|polygon|polyline|line|circle|ellipse|vector|group|g|layer|text|shape|svg|clip|mask|union|subtract|frame|слой)[\s_\-.\d]*$/i

// ── 1. SVG → сырые элементы ──

export function loadSvg(text) {
  const doc = new DOMParser().parseFromString(text, 'image/svg+xml')
  if (doc.querySelector('parsererror')) throw new Error('Не получилось прочитать SVG')
  const svg = document.importNode(doc.documentElement, true)
  if (svg.tagName.toLowerCase() !== 'svg') throw new Error('Это не SVG')

  // файл чужой — выкидываем то, что может исполниться
  svg.querySelectorAll('script, foreignObject').forEach(el => el.remove())
  ;[svg, ...svg.querySelectorAll('*')].forEach(el => {
    ;[...el.attributes].forEach(a => { if (/^on/i.test(a.name)) el.removeAttribute(a.name) })
  })

  let vb = (svg.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number)
  if (vb.length !== 4 || vb.some(v => !Number.isFinite(v)) || !vb[2] || !vb[3]) {
    const w = parseFloat(svg.getAttribute('width')) || 1000
    const h = parseFloat(svg.getAttribute('height')) || 1000
    vb = [0, 0, w, h]
    svg.setAttribute('viewBox', vb.join(' '))
  }
  svg.setAttribute('width', '1000')
  svg.setAttribute('height', '1000')
  svg.setAttribute('preserveAspectRatio', 'none')

  // в документ — иначе нет ни трансформов, ни вычисленных стилей
  const host = document.createElement('div')
  host.style.cssText = 'position:fixed;left:-20000px;top:0;width:1000px;height:1000px;opacity:0;pointer-events:none;z-index:-1'
  host.appendChild(svg)
  document.body.appendChild(host)

  return { svg, host, viewBox: { x: vb[0], y: vb[1], w: vb[2], h: vb[3] } }
}

const SKIP_PARENTS = 'defs, clipPath, mask, symbol, marker, pattern'
const HIDDEN = '[display="none"], [visibility="hidden"]'

function color(v) {
  if (!v || v === 'none' || v.startsWith('url') || v === 'transparent' || /rgba\([^)]*,\s*0\)$/.test(v)) return null
  return v
}

export function extractItems({ svg, viewBox }) {
  const items = []
  const warnings = []
  const rootInv = svg.getScreenCTM().inverse()
  const step = Math.hypot(viewBox.w, viewBox.h) / 3000 // шаг нарезки кривых, в ед. viewBox
  const opacityCache = new Map()

  const groupOpacity = node => {
    if (!node || node === svg) return 1
    if (opacityCache.has(node)) return opacityCache.get(node)
    const v = (+getComputedStyle(node).opacity || 0) * groupOpacity(node.parentElement)
    opacityCache.set(node, v)
    return v
  }

  const images = svg.querySelectorAll('image').length
  if (images) warnings.push(`В SVG ${images} встроенных растровых картинок — они пропущены`)
  const uses = svg.querySelectorAll('use').length
  if (uses) warnings.push(`${uses} элементов <use> (символы/клоны) пропущены — разгрупируй или «Expand» в редакторе`)

  const els = svg.querySelectorAll('path, rect, circle, ellipse, line, polyline, polygon, text')
  let z = 0
  for (const el of els) {
    if (el.closest(SKIP_PARENTS) || el.closest(HIDDEN)) continue
    const cs = getComputedStyle(el)
    if (cs.display === 'none' || cs.visibility === 'hidden') continue
    const ctm = el.getScreenCTM()
    if (!ctm) continue
    const m = rootInv.multiply(ctm)
    const scale = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c)) || 1
    const tp = ([px, py]) => [m.a * px + m.c * py + m.e, m.b * px + m.d * py + m.f]

    const groups = []
    for (let a = el.parentElement; a && a !== svg; a = a.parentElement) {
      const nm = nameOf(a)
      if (nm && !JUNK_NAME.test(nm)) groups.push(nm)
    }
    const ownName = nameOf(el)
    const op = groupOpacity(el.parentElement) * (+cs.opacity || 0)
    const tag = el.tagName.toLowerCase()

    if (tag === 'text') {
      const text = (el.textContent || '').replace(/\s+/g, ' ').trim()
      if (!text) continue
      const b = el.getBBox()
      items.push({
        tag, z: z++, groups, name: ownName, text,
        anchor: tp([b.x + b.width / 2, b.y + b.height / 2]),
        fontSize: (parseFloat(cs.fontSize) || 12) * scale,
        fill: color(cs.fill),
      })
      continue
    }

    const lstep = step / scale
    let subs
    const L = attr => el[attr].baseVal.value
    switch (tag) {
      case 'path': {
        try { subs = flattenPath(el.getAttribute('d') || '', lstep) } catch (e) {
          warnings.push(`Путь ${ownName || '#' + z} пропущен: ${e.message}`)
          continue
        }
        break
      }
      case 'rect': {
        const x = L('x'), y = L('y'), w = L('width'), h = L('height')
        if (!w || !h) continue
        subs = [{ pts: [[x, y], [x + w, y], [x + w, y + h], [x, y + h]], closed: true }]
        break
      }
      case 'circle':
      case 'ellipse': {
        const cx = L('cx'), cy = L('cy')
        const rx = tag === 'circle' ? L('r') : L('rx')
        const ry = tag === 'circle' ? L('r') : L('ry')
        if (!rx || !ry) continue
        const k = Math.max(12, Math.min(72, Math.ceil(2 * Math.PI * Math.max(rx, ry) / lstep)))
        const pts = []
        for (let j = 0; j < k; j++) { const t = (2 * Math.PI * j) / k; pts.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]) }
        subs = [{ pts, closed: true }]
        break
      }
      case 'line':
        subs = [{ pts: [[L('x1'), L('y1')], [L('x2'), L('y2')]], closed: false }]
        break
      case 'polyline':
      case 'polygon': {
        const pts = [...el.points].map(p => [p.x, p.y])
        if (pts.length < 2) continue
        subs = [{ pts, closed: tag === 'polygon' }]
        break
      }
    }
    if (!subs?.length) continue

    const fill = color(cs.fill)
    const stroke = color(cs.stroke)
    items.push({
      tag, z: z++, groups, name: ownName,
      subs: subs.map(s => ({ pts: s.pts.map(tp), closed: s.closed })),
      fill,
      fillOpacity: fill ? (+cs.fillOpacity || 0) * op : 0,
      stroke,
      strokeOpacity: stroke ? (+cs.strokeOpacity || 0) * op : 0,
      strokeW: stroke ? (parseFloat(cs.strokeWidth) || 0) * scale : 0,
    })
  }
  return { items, warnings }
}

// Список групп для таблицы ролей: имя → сколько элементов внутри
export function collectGroups(items) {
  const counts = new Map()
  items.forEach(it => new Set(it.groups).forEach(g => counts.set(g, (counts.get(g) || 0) + 1)))
  return [...counts.entries()]
    .map(([name, count]) => ({ name, count, guess: guessRole(name) }))
    .sort((a, b) => (b.guess ? 1 : 0) - (a.guess ? 1 : 0) || b.count - a.count)
}

export function roleOf(item, overrides) {
  for (const nm of [item.name, ...item.groups]) {
    if (!nm) continue
    if (overrides[nm]) return overrides[nm] // ручной выбор, в т.ч. «авто», обрывает наследование
    const g = guessRole(nm)
    if (g) return g
  }
  return 'auto'
}

// ── 2. Привязка: viewBox → lng/lat ──
// Билинейно между 4 углами в Web Mercator — ровно как MapLibre кладёт image source
// (у /draw углы всегда параллелограмм, так что это просто аффинное преобразование).

const R = 6378137
const toMerc = ([lng, lat]) => [R * lng * Math.PI / 180, R * Math.log(Math.tan(Math.PI / 4 + lat * Math.PI / 360))]
const toLngLat = ([mx, my]) => [mx / R * 180 / Math.PI, (2 * Math.atan(Math.exp(my / R)) - Math.PI / 2) * 180 / Math.PI]
const round7 = v => Math.round(v * 1e7) / 1e7 // ~1 см

export function makeGeoref(corners, vb) {
  const [tl, tr, br, bl] = corners.map(toMerc)
  const lat = (corners[0][1] + corners[2][1]) / 2
  const k = Math.cos(lat * Math.PI / 180) // меркатор → метры на земле
  const mx = Math.hypot(tr[0] - tl[0], tr[1] - tl[1]) * k / vb.w
  const my = Math.hypot(bl[0] - tl[0], bl[1] - tl[1]) * k / vb.h
  const project = ([x, y]) => {
    const u = (x - vb.x) / vb.w, v = (y - vb.y) / vb.h
    const a = (1 - u) * (1 - v), b = u * (1 - v), c = u * v, d = (1 - u) * v
    const ll = toLngLat([
      a * tl[0] + b * tr[0] + c * br[0] + d * bl[0],
      a * tl[1] + b * tr[1] + c * br[1] + d * bl[1],
    ])
    return [round7(ll[0]), round7(ll[1])]
  }
  return { project, metersPerUnit: Math.sqrt(mx * my), lat }
}

// План без привязки — прямоугольник заданной ширины вокруг точки, север вверх
export function defaultCorners([lng, lat], vb, widthM = 150) {
  const hM = widthM * vb.h / vb.w
  const dLng = (widthM / 2) / (111320 * Math.cos(lat * Math.PI / 180))
  const dLat = (hM / 2) / 110540
  return [[lng - dLng, lat + dLat], [lng + dLng, lat + dLat], [lng + dLng, lat - dLat], [lng - dLng, lat - dLat]]
}

// ── 3. Сборка GeoJSON ──

const closeRing = pts => {
  const [a, b] = [pts[0], pts[pts.length - 1]]
  return a[0] === b[0] && a[1] === b[1] ? pts : [...pts, a]
}

// Кольца одного path → полигоны с дырками по вложенности (чётная глубина — оболочка, нечётная — дырка).
// Так работают стены «одним составным контуром» из PDF.
function nestRings(rings) {
  const rs = rings
    .map(pts => ({ pts, area: Math.abs(ringArea(pts)) }))
    .filter(r => r.area > 0)
    .sort((a, b) => b.area - a.area)
  const polys = []
  rs.forEach((r, idx) => {
    let parent = null, depth = 0
    for (let j = idx - 1; j >= 0; j--) {
      if (pointInRing(r.pts[0], rs[j].pts)) { parent = rs[j]; depth = rs[j].depth + 1; break }
    }
    r.depth = depth
    if (depth % 2 === 0) { r.poly = { outer: r, holes: [] }; polys.push(r.poly) }
    else parent.poly.holes.push(r)
  })
  return polys
}

export function buildGeojson(items, { viewBox, corners, overrides = {}, tolCm = 5, minLenCm = 0, minAreaM2 = 0, level = null }) {
  const { project, metersPerUnit: mpu, lat } = makeGeoref(corners, viewBox)
  const tol = tolCm / 100 / mpu
  const minLen = minLenCm / 100 / mpu
  const minArea = minAreaM2 / (mpu * mpu)

  const features = []
  const stats = { byRole: {}, vertices: 0, dropped: 0 }
  const count = (role, kind) => {
    const key = `${role} · ${kind}`
    stats.byRole[key] = (stats.byRole[key] || 0) + 1
  }
  const add = (geometry, props, role, kind) => {
    const n = geometry.type === 'Polygon' ? geometry.coordinates.reduce((s, r) => s + r.length, 0)
      : geometry.type === 'LineString' ? geometry.coordinates.length : 1
    stats.vertices += n
    count(role, kind)
    const properties = { role: role === 'auto' ? 'other' : role.replace(/s$/, ''), level }
    // undefined не пишем: в выражениях MapLibre ['has', ...] иначе считает поле существующим
    for (const [k, v] of Object.entries(props)) if (v !== undefined && v !== null) properties[k] = v
    features.push({ type: 'Feature', properties, geometry })
  }

  for (const it of items) {
    const role = roleOf(it, overrides)
    if (role === 'ignore') continue
    const niceName = it.name && !JUNK_NAME.test(it.name) ? it.name : undefined
    const group = it.groups[0]

    if (it.tag === 'text') {
      add({ type: 'Point', coordinates: project(it.anchor) },
        { kind: 'label', text: it.text, z: it.z, group, sizeM: +(it.fontSize * mpu).toFixed(2), fill: it.fill || undefined },
        role, 'подпись')
      continue
    }
    if (role === 'labels') continue // в слое подписей берём только текст

    const hasFill = !!it.fill && it.fillOpacity > 0.01
    const hasStroke = !!it.stroke && it.strokeOpacity > 0.01 && it.strokeW > 0
    const areaRole = role === 'rooms' || role === 'zones' || role === 'outline'
    const common = {
      z: it.z, group, name: niceName,
      fill: it.fill || undefined,
      fillOpacity: hasFill ? +it.fillOpacity.toFixed(3) : undefined,
      stroke: hasStroke ? it.stroke : undefined,
      strokeOpacity: hasStroke ? +it.strokeOpacity.toFixed(3) : undefined,
      widthM: hasStroke ? +(it.strokeW * mpu).toFixed(3) : undefined,
    }

    const closed = it.subs.filter(s => s.closed || (s.pts.length > 3 && s.pts[0][0] === s.pts.at(-1)[0] && s.pts[0][1] === s.pts.at(-1)[1]))
    const open = it.subs.filter(s => !closed.includes(s))
    const asArea = closed.length && (areaRole || hasFill)

    if (asArea) {
      const rings = closed.map(s => simplify(closeRing(s.pts), tol)).filter(r => r.length >= 4)
      for (const p of nestRings(rings)) {
        const area = p.outer.area - p.holes.reduce((s, h) => s + h.area, 0)
        if (area < minArea) { stats.dropped++; continue }
        add({ type: 'Polygon', coordinates: [p.outer.pts, ...p.holes.map(h => h.pts)].map(r => r.map(project)) },
          { ...common, kind: 'area' }, role, 'площадь')
      }
    }

    const lineSubs = asArea ? open : it.subs
    if (!hasStroke && !areaRole && role !== 'walls') { if (lineSubs.length) stats.dropped += lineSubs.length; continue }
    for (const s of lineSubs) {
      const pts = simplify(s.closed ? closeRing(s.pts) : s.pts, tol)
      if (pts.length < 2 || lineLength(pts) < minLen) { stats.dropped++; continue }
      add({ type: 'LineString', coordinates: pts.map(project) }, { ...common, kind: 'line' }, role, 'линия')
    }
  }

  const geojson = {
    type: 'FeatureCollection',
    metadata: { level, metersPerUnit: +mpu.toFixed(5), simplifyCm: tolCm, generatedBy: 'plan-lab' },
    features,
  }
  return { geojson, stats: { ...stats, features: features.length, metersPerUnit: mpu, lat } }
}
