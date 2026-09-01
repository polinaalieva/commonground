import './MapButton.css'

function MapButton({ icon, onClick, ariaLabel, active = false, error = false, size = 'md' }) {
  return (
    <button
      className={[
        'map-btn',
        size === 'sm' ? 'map-btn--sm' : '',
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
