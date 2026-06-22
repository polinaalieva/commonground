import './MapLoader.css'

function MapLoader({ visible }) {
  if (!visible) return null

  return (
    <div className="map-loader">
      <div className="map-loader__spinner" />
    </div>
  )
}

export default MapLoader
