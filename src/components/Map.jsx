import { useEffect, useRef } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_TOKEN

function Map({ city, config }) {
  const mapContainer = useRef(null)
  const map = useRef(null)

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

  }, [])

  return (
    <div ref={mapContainer} style={{ width: '100%', height: '80vh' }} />
  )
}

export default Map