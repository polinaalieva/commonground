import MapControls from './MapControls/MapControls'
import './MapUI.css'

function MapUI({ onZoomIn, onZoomOut, onLocate, onToggleHex, hexMode, variant, lang, city, pinFilter, onPinFilterChange }) {
  return (
    <div className="map-ui">
      <MapControls
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
        onLocate={onLocate}
        onToggleHex={onToggleHex}
        hexMode={hexMode}
        variant={variant}
        lang={lang}
        city={city}
        pinFilter={pinFilter}
        onPinFilterChange={onPinFilterChange}
      />
    </div>
  )
}

export default MapUI