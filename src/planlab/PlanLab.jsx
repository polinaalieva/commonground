// src/planlab/PlanLab.jsx
// Лаборатория векторных планов: SVG → GeoJSON в привязке события, сравнение с PNG, экспорт.
// Только для разработки: localhost:5173/plan-lab.html (в прод-сборку не входит).

import { useEffect, useMemo, useRef, useState } from 'react'
import { maplibregl, MAP_STYLE, MAP_STYLE_EVENT } from '../config/map'
import { useEvents } from '../config/events'
import {
  loadSvg, extractItems, collectGroups, buildGeojson, defaultCorners,
  ROLES, ROLE_LABELS,
} from './svgPlan'

const KEY = import.meta.env.VITE_MAPTILER_KEY
const BLANK_STYLE = {
  version: 8,
  glyphs: `https://api.maptiler.com/fonts/{fontstack}/{range}.pbf?key=${KEY}`,
  sources: {},
  layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#f7f7f5' } }],
}
const BASEMAPS = {
  dataviz: { label: 'dataviz-light (события)', style: MAP_STYLE_EVENT },
  streets: { label: 'streets-v2-light', style: MAP_STYLE },
  blank: { label: 'пустой фон', style: BLANK_STYLE },
}

const LAYER_IDS = ['lab-png', 'lab-area', 'lab-area-edge', 'lab-line', 'lab-names', 'lab-label']
const SOURCE_IDS = ['lab-plan', 'lab-png']

const ROLE_RANK = ['match', ['get', 'role'], 'outline', 0, 'zone', 1, 'room', 2, 'other', 3, 'wall', 4, 3]
const MONO_FILL = ['match', ['get', 'role'],
  'wall', '#2f343b', 'outline', '#efefec', 'room', '#ffffff', 'zone', '#e6edf6', '#e4e5e8']
const MONO_LINE = ['match', ['get', 'role'], 'wall', '#2f343b', '#8d939c']

// Толщина в метрах → пиксели на каждом зуме (тайлы 512 px), не тоньше minPx
function metersToPx(prop, fallbackM, lat, minPx) {
  const c = 78271.517 * Math.cos(lat * Math.PI / 180)
  const stops = []
  for (let z = 12; z <= 24; z++) {
    stops.push(z, ['max', minPx, ['*', ['coalesce', ['get', prop], fallbackM], 2 ** z / c]])
  }
  return ['interpolate', ['exponential', 2], ['zoom'], ...stops]
}

function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'application/geo+json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

function plural(n) { return n.toLocaleString('ru-RU') }

export default function PlanLab() {
  const mapEl = useRef(null)
  const map = useRef(null)
  const svgRef = useRef(null) // { host, viewBox }
  const latest = useRef({})
  const fittedFor = useRef(null)
  const styleReady = useRef(false) // isStyleLoaded() врёт, пока грузятся тайлы
  const firstBasemap = useRef(true)

  const events = useEvents()
  const [svgName, setSvgName] = useState('')
  const [parsed, setParsed] = useState(null) // { items, warnings, viewBox, ms }
  const [error, setError] = useState('')
  const [overrides, setOverrides] = useState({})

  const [georef, setGeoref] = useState('event') // event | json | none
  const [eventCode, setEventCode] = useState('')
  const [jsonPlan, setJsonPlan] = useState(null)
  const [level, setLevel] = useState('')
  const [freeCorners, setFreeCorners] = useState(null)

  const [pngFileUrl, setPngFileUrl] = useState(null)
  const [pngOpacity, setPngOpacity] = useState(0.35)
  const [basemap, setBasemap] = useState('dataviz')
  const [colorMode, setColorMode] = useState('mono') // mono | svg
  const [widthMode, setWidthMode] = useState('real') // real | thin
  const [vecOpacity, setVecOpacity] = useState(1)
  const [tolCm, setTolCm] = useState(5)
  const [minLenCm, setMinLenCm] = useState(0)
  const [minAreaM2, setMinAreaM2] = useState(0)
  const [showLabels, setShowLabels] = useState(true)
  const [showNames, setShowNames] = useState(false)

  // ── привязка ──
  const event = events.find(e => e.code === eventCode) ?? null
  const floors = useMemo(() => {
    if (georef === 'event') return event?.floors ?? []
    if (georef === 'json' && jsonPlan) {
      if (jsonPlan.floors?.length) return jsonPlan.floors.map(f => ({ level: f.level, coordinates: f.coordinates, url: null }))
      if (jsonPlan.coordinates) return [{ level: null, coordinates: jsonPlan.coordinates, url: null }]
    }
    return []
  }, [georef, event, jsonPlan])
  const floor = floors.find(f => String(f.level) === level) ?? floors[0] ?? null
  const corners = georef === 'none' ? freeCorners : floor?.coordinates ?? null
  const bearing = georef === 'event' ? event?.bearing ?? 0 : georef === 'json' ? jsonPlan?.bearing ?? 0 : 0
  const pngUrl = pngFileUrl ?? floor?.url ?? null

  // ── сборка ──
  const built = useMemo(() => {
    if (!parsed || !corners) return null
    const t0 = performance.now()
    const r = buildGeojson(parsed.items, {
      viewBox: parsed.viewBox, corners, overrides, tolCm, minLenCm, minAreaM2,
      level: floor?.level ?? null,
    })
    const json = JSON.stringify(r.geojson)
    return { ...r, json, ms: performance.now() - t0 }
  }, [parsed, corners, overrides, tolCm, minLenCm, minAreaM2, floor])

  const groups = useMemo(() => (parsed ? collectGroups(parsed.items) : []), [parsed])

  // ── карта ──
  useEffect(() => {
    if (map.current) return
    map.current = new maplibregl.Map({
      container: mapEl.current,
      style: BASEMAPS.dataviz.style,
      center: [37.6173, 55.7558],
      zoom: 15,
      pitchWithRotate: false,
    })
    map.current.on('style.load', () => { styleReady.current = true; sync() })
    return () => { map.current?.remove(); map.current = null; styleReady.current = false }
  }, [])

  useEffect(() => {
    if (!map.current) return
    if (firstBasemap.current) { firstBasemap.current = false; return }
    styleReady.current = false
    map.current.setStyle(BASEMAPS[basemap].style, { diff: false })
  }, [basemap])

  latest.current = { built, pngUrl, corners, pngOpacity, colorMode, widthMode, vecOpacity, showLabels, showNames }
  useEffect(() => { sync() }, [built, pngUrl, corners, pngOpacity, colorMode, widthMode, vecOpacity, showLabels, showNames])

  // подгоняем вид один раз на каждый новый файл/этаж
  useEffect(() => {
    if (!built || !map.current) return
    const key = `${svgName}|${eventCode}|${floor?.level}|${georef}`
    if (fittedFor.current === key) return
    fittedFor.current = key
    const lngs = corners.map(c => c[0]), lats = corners.map(c => c[1])
    map.current.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
      { padding: 40, bearing, duration: 0 })
  }, [built])

  function sync() {
    const m = map.current
    if (!m || !styleReady.current) return
    const s = latest.current

    LAYER_IDS.forEach(id => { if (m.getLayer(id)) m.removeLayer(id) })
    SOURCE_IDS.forEach(id => { if (m.getSource(id)) m.removeSource(id) })

    if (s.pngUrl && s.corners && s.pngOpacity > 0) {
      m.addSource('lab-png', { type: 'image', url: s.pngUrl, coordinates: s.corners })
      m.addLayer({ id: 'lab-png', type: 'raster', source: 'lab-png', paint: { 'raster-opacity': s.pngOpacity } })
    }
    if (!s.built) return

    const lat = s.built.stats.lat
    const mono = s.colorMode === 'mono'
    const real = s.widthMode === 'real'
    const op = s.vecOpacity
    const font = findFont(m)

    m.addSource('lab-plan', { type: 'geojson', data: s.built.geojson })

    m.addLayer({
      id: 'lab-area', type: 'fill', source: 'lab-plan',
      filter: ['==', ['get', 'kind'], 'area'],
      layout: { 'fill-sort-key': mono ? ['+', ['*', ROLE_RANK, 1e6], ['get', 'z']] : ['get', 'z'] },
      paint: mono
        ? { 'fill-color': MONO_FILL, 'fill-opacity': op }
        : {
            'fill-color': ['to-color', ['coalesce', ['get', 'fill'], '#d9d9d9']],
            'fill-opacity': ['*', op, ['coalesce', ['get', 'fillOpacity'], 0]],
          },
    })

    m.addLayer({
      id: 'lab-area-edge', type: 'line', source: 'lab-plan',
      filter: mono
        ? ['all', ['==', ['get', 'kind'], 'area'], ['!=', ['get', 'role'], 'wall']]
        : ['all', ['==', ['get', 'kind'], 'area'], ['has', 'stroke']],
      layout: { 'line-join': 'round' },
      paint: mono
        ? { 'line-color': '#b4b9c1', 'line-width': 0.8, 'line-opacity': op }
        : {
            'line-color': ['to-color', ['get', 'stroke']],
            'line-width': real ? metersToPx('widthM', 0.05, lat, 0.5) : 1,
            'line-opacity': ['*', op, ['coalesce', ['get', 'strokeOpacity'], 1]],
          },
    })

    m.addLayer({
      id: 'lab-line', type: 'line', source: 'lab-plan',
      filter: ['==', ['get', 'kind'], 'line'],
      layout: {
        'line-join': 'round', 'line-cap': 'round',
        'line-sort-key': mono ? ['+', ['*', ROLE_RANK, 1e6], ['get', 'z']] : ['get', 'z'],
      },
      paint: {
        'line-color': mono ? MONO_LINE : ['to-color', ['coalesce', ['get', 'stroke'], '#333333']],
        'line-width': real
          ? metersToPx('widthM', 0.1, lat, 0.6)
          : ['match', ['get', 'role'], 'wall', 1.8, 0.8],
        'line-opacity': mono ? op : ['*', op, ['coalesce', ['get', 'strokeOpacity'], 1]],
      },
    })

    if (s.showNames) {
      m.addLayer({
        id: 'lab-names', type: 'symbol', source: 'lab-plan',
        filter: ['all', ['==', ['get', 'kind'], 'area'], ['has', 'name']],
        layout: { 'text-field': ['get', 'name'], 'text-font': font, 'text-size': 11, 'text-max-width': 8 },
        paint: { 'text-color': '#4b5563', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
      })
    }
    if (s.showLabels) {
      m.addLayer({
        id: 'lab-label', type: 'symbol', source: 'lab-plan',
        filter: ['==', ['get', 'kind'], 'label'],
        layout: {
          'text-field': ['get', 'text'],
          'text-font': font,
          'text-size': real ? metersToPx('sizeM', 0.5, lat, 7) : 11,
          'text-max-width': 10,
        },
        paint: { 'text-color': '#2f343b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.2 },
      })
    }
  }

  function findFont(m) {
    const f = m.getStyle().layers.find(l => Array.isArray(l.layout?.['text-font']) && l.layout['text-font'].every(x => typeof x === 'string'))
    return f ? f.layout['text-font'] : ['Noto Sans Regular']
  }

  // ── файлы ──
  async function openSvg(file) {
    if (!file) return
    setError('')
    try {
      const text = await file.text()
      svgRef.current?.host.remove()
      const t0 = performance.now()
      const loaded = loadSvg(text)
      svgRef.current = loaded
      const { items, warnings } = extractItems(loaded)
      setParsed({ items, warnings, viewBox: loaded.viewBox, ms: performance.now() - t0 })
      setSvgName(file.name)
      setOverrides({})
      const c = map.current.getCenter()
      setFreeCorners(defaultCorners([c.lng, c.lat], loaded.viewBox))
    } catch (e) {
      setError(e.message)
    }
  }

  async function openJson(file) {
    if (!file) return
    try {
      setJsonPlan(JSON.parse(await file.text()))
      setGeoref('json')
      setLevel('')
    } catch {
      setError('Не получилось прочитать JSON координат')
    }
  }

  function openPng(file) {
    if (!file) return
    if (pngFileUrl) URL.revokeObjectURL(pngFileUrl)
    setPngFileUrl(URL.createObjectURL(file))
  }

  function onDrop(e) {
    e.preventDefault()
    ;[...e.dataTransfer.files].forEach(f => {
      if (/\.svg$/i.test(f.name)) openSvg(f)
      else if (/\.json$/i.test(f.name)) openJson(f)
      else if (/\.(png|jpe?g|webp)$/i.test(f.name)) openPng(f)
    })
  }

  function exportGeojson() {
    if (!built) return
    const base = svgName.replace(/\.svg$/i, '') || 'plan'
    const suffix = floor?.level != null ? `-floor-${floor.level}` : ''
    download(`${base}${suffix}.geojson`, JSON.stringify(built.geojson, null, 0))
  }

  const kb = built ? (new Blob([built.json]).size / 1024) : 0

  return (
    <div style={S.page} onDragOver={e => e.preventDefault()} onDrop={onDrop}>
      <aside style={S.panel}>
        <h1 style={S.h1}>Plan lab</h1>
        <p style={S.hint}>SVG → GeoJSON в привязке события. Файлы можно просто перетащить на страницу.</p>

        <Section title="1. SVG плана">
          <input type="file" accept=".svg,image/svg+xml" onChange={e => openSvg(e.target.files[0])} />
          {svgName && <div style={S.meta}>{svgName} · {plural(parsed.items.length)} элементов · {parsed.ms.toFixed(0)} мс</div>}
          {error && <div style={S.err}>{error}</div>}
          {parsed?.warnings.map(w => <div key={w} style={S.warn}>{w}</div>)}
        </Section>

        <Section title="2. Привязка">
          <Seg value={georef} onChange={setGeoref} options={{ event: 'событие', json: 'JSON из /draw', none: 'без привязки' }} />
          {georef === 'event' && (
            <select style={S.input} value={eventCode} onChange={e => { setEventCode(e.target.value); setLevel('') }}>
              <option value="">— выбери событие —</option>
              {events.map(e => <option key={e.code} value={e.code}>{e.code} · {e.shortName || e.name}</option>)}
            </select>
          )}
          {georef === 'json' && <input type="file" accept=".json" onChange={e => openJson(e.target.files[0])} />}
          {georef === 'none' && <div style={S.meta}>План 150 м шириной в центре карты, север вверх — для проверки чистки без привязки.</div>}
          {floors.length > 1 && (
            <select style={S.input} value={String(floor?.level)} onChange={e => setLevel(e.target.value)}>
              {floors.map(f => <option key={String(f.level)} value={String(f.level)}>этаж {f.level}</option>)}
            </select>
          )}
          {georef !== 'none' && !corners && <div style={S.warn}>Нет координат углов — выбери событие или загрузи JSON</div>}
          <div style={S.meta}>Углы viewBox SVG = углы PNG. Экспортируй оба из одного артборда.</div>
        </Section>

        <Section title="3. Сравнение с PNG">
          <Range label="PNG под вектором" value={pngOpacity} min={0} max={1} step={0.05} onChange={setPngOpacity} fmt={v => `${Math.round(v * 100)}%`} />
          <Range label="Вектор" value={vecOpacity} min={0} max={1} step={0.05} onChange={setVecOpacity} fmt={v => `${Math.round(v * 100)}%`} />
          <label style={S.meta}>другой PNG: <input type="file" accept="image/*" onChange={e => openPng(e.target.files[0])} /></label>
          {!pngUrl && <div style={S.meta}>PNG нет — у события без плана или выбран JSON</div>}
        </Section>

        <Section title="4. Вид">
          <select style={S.input} value={basemap} onChange={e => setBasemap(e.target.value)}>
            {Object.entries(BASEMAPS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
          <Seg value={colorMode} onChange={setColorMode} options={{ mono: 'монохром CG', svg: 'цвета из SVG' }} />
          <Seg value={widthMode} onChange={setWidthMode} options={{ real: 'толщина в метрах', thin: 'тонкие px' }} />
          <label style={S.check}><input type="checkbox" checked={showLabels} onChange={e => setShowLabels(e.target.checked)} /> текст из SVG</label>
          <label style={S.check}><input type="checkbox" checked={showNames} onChange={e => setShowNames(e.target.checked)} /> имена полигонов (id слоёв)</label>
        </Section>

        <Section title="5. Упрощение и мусор">
          <Range label="Допуск упрощения" value={tolCm} min={0} max={50} step={1} onChange={setTolCm} fmt={v => `${v} см`} />
          <Range label="Мин. длина линии" value={minLenCm} min={0} max={200} step={5} onChange={setMinLenCm} fmt={v => `${v} см`} />
          <Range label="Мин. площадь" value={minAreaM2} min={0} max={5} step={0.05} onChange={setMinAreaM2} fmt={v => `${v} м²`} />
        </Section>

        {groups.length > 0 && (
          <Section title="6. Роли слоёв">
            <div style={S.meta}>Роль наследуется вложенными элементами. Названия вроде walls / rooms / zones / labels / ignore (или стены, помещения, зоны…) угадываются сами.</div>
            <div style={S.groups}>
              {groups.slice(0, 60).map(g => (
                <div key={g.name} style={S.groupRow}>
                  <span style={S.groupName} title={g.name}>{g.name}</span>
                  <span style={S.groupCount}>{g.count}</span>
                  <select
                    style={S.groupSel}
                    value={overrides[g.name] ?? ''}
                    onChange={e => setOverrides(o => {
                      const n = { ...o }
                      if (e.target.value) n[g.name] = e.target.value
                      else delete n[g.name]
                      return n
                    })}
                  >
                    <option value="">{g.guess ? `${ROLE_LABELS[g.guess]} (угадано)` : '— наследовать —'}</option>
                    {ROLES.map(r => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </Section>
        )}

        {built && (
          <Section title="Итог">
            <div style={S.stats}>
              <div>{plural(built.stats.features)} объектов · {plural(built.stats.vertices)} вершин</div>
              <div>{kb.toFixed(0)} КБ GeoJSON · {built.ms.toFixed(0)} мс</div>
              <div>1 ед. SVG = {(built.stats.metersPerUnit * 100).toFixed(2)} см</div>
              {built.stats.dropped > 0 && <div>отброшено: {plural(built.stats.dropped)}</div>}
              {Object.entries(built.stats.byRole).map(([k, v]) => <div key={k} style={S.meta}>{k}: {plural(v)}</div>)}
            </div>
            <button style={S.btn} onClick={exportGeojson}>Скачать GeoJSON</button>
          </Section>
        )}
      </aside>
      <div ref={mapEl} style={S.map} />
    </div>
  )
}

function Section({ title, children }) {
  return (
    <section style={S.section}>
      <h2 style={S.h2}>{title}</h2>
      {children}
    </section>
  )
}

function Seg({ value, onChange, options }) {
  return (
    <div style={S.seg}>
      {Object.entries(options).map(([k, label]) => (
        <button key={k} style={{ ...S.segBtn, ...(value === k ? S.segOn : null) }} onClick={() => onChange(k)}>{label}</button>
      ))}
    </div>
  )
}

function Range({ label, value, min, max, step, onChange, fmt }) {
  return (
    <label style={S.range}>
      <span style={S.rangeHead}><span>{label}</span><span>{fmt(value)}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={e => onChange(+e.target.value)} />
    </label>
  )
}

const S = {
  page: { display: 'flex', height: '100vh', fontFamily: 'Inter, system-ui, sans-serif', fontSize: 13, color: '#1c1c1e' },
  panel: { width: 340, flexShrink: 0, overflowY: 'auto', padding: '16px 16px 40px', borderRight: '1px solid #ececec', background: '#fff' },
  map: { flex: 1 },
  h1: { fontSize: 18, fontWeight: 600, margin: '0 0 4px' },
  h2: { fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.04em', color: '#6b7280', margin: '0 0 8px' },
  hint: { color: '#6b7280', margin: '0 0 12px', lineHeight: 1.4 },
  section: { padding: '12px 0', borderTop: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column', gap: 8 },
  meta: { color: '#6b7280', fontSize: 12, lineHeight: 1.4 },
  err: { color: '#b42318', fontSize: 12 },
  warn: { color: '#9a6700', fontSize: 12, lineHeight: 1.4 },
  input: { padding: '6px 8px', borderRadius: 8, border: '1px solid #e2e2e4', fontSize: 13, background: '#fff' },
  seg: { display: 'flex', padding: 3, background: '#f0f1f2', borderRadius: 10, gap: 2 },
  segBtn: { flex: 1, border: 0, background: 'transparent', padding: '6px 4px', borderRadius: 8, fontSize: 12, cursor: 'pointer', color: '#6b7280' },
  segOn: { background: '#fff', color: '#1c1c1e', boxShadow: '0 1px 2px rgba(0,0,0,.08)', fontWeight: 600 },
  range: { display: 'flex', flexDirection: 'column', gap: 2 },
  rangeHead: { display: 'flex', justifyContent: 'space-between', fontSize: 12 },
  check: { display: 'flex', gap: 6, alignItems: 'center' },
  groups: { display: 'flex', flexDirection: 'column', gap: 4, maxHeight: 300, overflowY: 'auto' },
  groupRow: { display: 'flex', alignItems: 'center', gap: 6 },
  groupName: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  groupCount: { color: '#9ca3af', fontSize: 11, minWidth: 28, textAlign: 'right' },
  groupSel: { width: 130, fontSize: 12, padding: '3px 4px', borderRadius: 6, border: '1px solid #e2e2e4' },
  stats: { display: 'flex', flexDirection: 'column', gap: 2 },
  btn: { marginTop: 8, padding: '10px 12px', border: 0, borderRadius: 10, background: '#111114', color: '#fff', fontWeight: 600, cursor: 'pointer' },
}
