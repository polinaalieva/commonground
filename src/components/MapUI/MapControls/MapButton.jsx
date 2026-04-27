// src/components/MapUI/MapControls/MapButton.jsx

import './MapControls.css'

function MapButton({ icon, onClick, ariaLabel, active = false, error = false }) {
  return (
    <button
      className={[
        'map-btn',
        active ? 'map-btn--active' : '',
        error ? 'map-btn--error' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      aria-label={ariaLabel}
    >
      {icon}
    </button>
  )
}

export default MapButton