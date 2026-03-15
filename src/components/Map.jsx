import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

const WORKER_URL = 'https://commonground.polina-alieva-int.workers.dev/geojson'

function getFeatureRating(props) {
  return props?.place_rate ?? props?.rating ?? props?.rate ?? ''
}

function getFeatureComment(props) {
  return props?.experience ?? props?.comment ?? props?.text ?? ''
}

function getRatingLabel(rating) {
  const v = Number(rating)
  if (v >= 1 && v <= 4) return 'Not my place'
  if (v >= 5 && v <= 8) return 'Mixed feelings'
  if (v >= 9 && v <= 10) return 'Feels like mine'
  return 'No rating'
}

function Map({ city, config }) {
  const mapContainer = useRef(null)
  const map = useRef(null)
  const activePopup = useRef(null)

  useEffect(() => {
    if (map.current) return

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: config.center,
      zoom: config.zoom
    })

    if (config.bbox) map.current.setMaxBounds(config.bbox)
    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.current.on('load', () => {
      loadData()
    })

  }, [])

  async function loadData() {
    try {
      const res = await fetch(WORKER_URL, { cache: 'no-store' })
      const geojson = await res.json()

      geojson.features = geojson.features.map(f => ({
        ...f,
        properties: {
          ...f.properties,
          has_comment: !!String(getFeatureComment(f.properties) || '').trim()
        }
      }))

      const source = map.current.getSource('cg-feedback')
      if (source) {
        source.setData(geojson)
      } else {
        map.current.addSource('cg-feedback', { type: 'geojson', data: geojson })
        map.current.addLayer({
          id: 'cg-feedback-layer',
          type: 'circle',
          source: 'cg-feedback',
          paint: {
            'circle-radius': 7,
            'circle-opacity': ['case', ['==', ['get', 'has_comment'], true], 0.70, 0.30],
            'circle-color': [
              'to-color',
              ['let', 'c', ['coalesce', ['get', 'rating_color'], ''],
                ['case',
                  ['==', ['var', 'c'], ''], '#9ca3af',
                  ['==', ['slice', ['var', 'c'], 0, 1], '#'], ['var', 'c'],
                  ['concat', '#', ['var', 'c']]
                ]
              ],
              '#9ca3af'
            ],
            'circle-stroke-color': 'rgba(0,0,0,0.25)',
            'circle-stroke-width': 1,
            'circle-stroke-opacity': ['case', ['==', ['get', 'has_comment'], true], 0.9, 0]
          }
        })

        map.current.on('click', 'cg-feedback-layer', (e) => {
          const feature = e.features[0]
          if (!feature) return
          e.originalEvent.stopPropagation()

          const props = feature.properties || {}
          const rating = getFeatureRating(props)
          const comment = getFeatureComment(props)

          if (activePopup.current) activePopup.current.remove()

          activePopup.current = new mapboxgl.Popup({ closeButton: true, offset: 12 })
            .setLngLat(feature.geometry.coordinates)
            .setHTML(`
              <div>
                <div style="font-size:15px;font-weight:600;margin-bottom:6px">
                  ${rating ? getRatingLabel(rating) : 'No rating'}
                </div>
                <div style="font-size:14px;line-height:1.45;color:rgba(17,17,17,0.8)">
                  ${comment || '— no comment'}
                </div>
              </div>
            `)
            .addTo(map.current)
        })

        map.current.on('mouseenter', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = 'pointer'
        })
        map.current.on('mouseleave', 'cg-feedback-layer', () => {
          map.current.getCanvas().style.cursor = ''
        })
      }
    } catch (e) {
      console.error('Data load failed:', e)
    }
  }

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '100vh' }} />
  )
}

export default Map