import MapControls from './MapControls/MapControls'
import './MapUI.css'

function MapUI({ onZoomIn, onZoomOut, onLocate, variant, lang }) {
  return (
    <div className="map-ui">
      <MapControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onLocate={onLocate}
        variant={variant}
        lang={lang}
      />
      {/* Сюда в будущем: <MapGeocoder />, <MapSettings /> */}
    </div>
  )
}

export default MapUI