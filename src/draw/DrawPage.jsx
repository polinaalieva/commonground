import { useEffect, useRef, useState } from 'react'
import { maplibregl, MAP_STYLE } from '../config/map'
import MaplibreDraw from 'maplibre-gl-draw'
import 'maplibre-gl-draw/dist/mapbox-gl-draw.css'

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
  const [locked, setLocked] = useState(false)
  const [shapeCount, setShapeCount] = useState(0)
  const [selectedId, setSelectedId] = useState(null)
  const [panel, setPanel] = useState({ code: '', number: '', zone: '', type: '' })
  const [scaleX, setScaleX] = useState(1)
  const [scaleY, setScaleY] = useState(1)
  const shapeMeta = useRef({})

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: MAP_STYLE,
      center: [37.6173, 55.7558],
      zoom: 12,
    })

    map.current.on('load', () => {
      draw.current = new MaplibreDraw({
        displayControlsDefault: false,
        controls: { polygon: true, trash: true, point: true },
      })
      map.current.addControl(draw.current)

      map.current.on('draw.create', (e) => {
        const id = e.features[0].id
        shapeMeta.current[id] = { code: '', number: '', zone: '', type: '' }
        setSelectedId(id)
        setPanel({ code: '', number: '', zone: '', type: '' })
        updateShapeCount()
      })

      map.current.on('draw.selectionchange', (e) => {
        if (e.features.length === 0) {
          setSelectedId(null)
          return
        }
        const id = e.features[0].id
        const meta = shapeMeta.current[id] || { code: '', number: '', zone: '', type: '' }
        setSelectedId(id)
        setPanel({ ...meta })
      })

      map.current.on('draw.delete', () => {
        setSelectedId(null)
        updateShapeCount()
      })
    })
  }, [])

  function updateShapeCount() {
    const all = draw.current?.getAll()
    setShapeCount(all?.features?.length ?? 0)
  }

  function handlePanelSave() {
    if (!selectedId) return
    shapeMeta.current[selectedId] = { ...panel }
    updateLabels()
    setSelectedId(null)
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
      if (!meta.number) return null

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

  function applyScale(sx, sy) {
    if (!baseCornersRef.current) return
    const base = baseCornersRef.current
    const center = getCenter(base)

    const scaled = base.map(c => [
      center[0] + (c[0] - center[0]) * sx,
      center[1] + (c[1] - center[1]) * sy,
    ])

    cornersRef.current = scaled
    updateImageOverlay()

    // обновляем маркеры
    if (centerMarkerRef.current) {
      centerMarkerRef.current.setLngLat(getCenter(scaled))
    }
    if (markersRef.current[0]) {
      markersRef.current[0].setLngLat(scaled[2])
    }
  }

  function handleScaleX(e) {
    const val = parseFloat(e.target.value)
    setScaleX(val)
    applyScale(val, scaleY)
  }

  function handleScaleY(e) {
    const val = parseFloat(e.target.value)
    setScaleY(val)
    applyScale(scaleX, val)
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
      })
    }
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

      cornersRef.current = cornersRef.current.map(c => [
        center[0] + (c[0] - center[0]) * scale,
        center[1] + (c[1] - center[1]) * scale,
      ])

      // обновляем базу после ручного скейла маркером
      baseCornersRef.current = cornersRef.current.map(c => [...c])
      setScaleX(1)
      setScaleY(1)

      updateImageOverlay()
      centerMarkerRef.current?.setLngLat(getCenter(cornersRef.current))
      scaleMarker.setLngLat(cornersRef.current[2])
    })

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
      cornersRef.current = cornersRef.current.map(c => [c[0] + dx, c[1] + dy])
      baseCornersRef.current = cornersRef.current.map(c => [...c])
      setScaleX(1)
      setScaleY(1)
      updateImageOverlay()
      scaleMarker.setLngLat(cornersRef.current[2])
    })

    centerMarkerRef.current = moveMarker
  }

  function handleImageUpload(e) {
    const file = e.target.files[0]
    if (!file) return

    const url = URL.createObjectURL(file)
    imageUrlRef.current = url

    const img = new Image()
    img.onload = () => {
      const center = map.current.getCenter()
      const w = 0.01
      const h = w / (img.width / img.height)

      const corners = [
        [center.lng - w / 2, center.lat + h / 2],
        [center.lng + w / 2, center.lat + h / 2],
        [center.lng + w / 2, center.lat - h / 2],
        [center.lng - w / 2, center.lat - h / 2],
      ]

      cornersRef.current = corners
      baseCornersRef.current = corners.map(c => [...c])
      setScaleX(1)
      setScaleY(1)

      updateImageOverlay()
      addControlMarkers(corners)
      setHasImage(true)
      setLocked(false)
    }
    img.src = url
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
      return `${i + 1},"${meta.code || ''}","${meta.number || ''}","${meta.zone || ''}","${meta.type || ''}","${geomType}","${coords}"`
    })

    const csv = ['id,code,number,zone,type,geometry_type,coordinates', ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'shapes.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  function handleCsvImport(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target.result
      const lines = text.trim().split('\n').slice(1)

      const features = lines.map(line => {
        const parts = line.match(/^(\d+),"([^"]*)","([^"]*)","([^"]*)","([^"]*)","([^"]*)","(.+)"$/)
        if (!parts) return null

        const [, , code, number, zone, type, geomType, coordsRaw] = parts

        try {
          const coords = JSON.parse(coordsRaw)
          const feature = {
            type: 'Feature',
            geometry: geomType === 'point'
              ? { type: 'Point', coordinates: coords }
              : { type: 'Polygon', coordinates: [coords] },
            properties: {},
          }
          return { feature, meta: { code, number, zone, type } }
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
        <input ref={fileInputRef} type="file" accept="image/*"
          style={{ display: 'none' }} onChange={handleImageUpload} />

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
            {!locked && (
              <span style={{ fontSize: 11, color: '#666' }}>🔵 двигать · ⚪ масштаб</span>
            )}
          </>
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