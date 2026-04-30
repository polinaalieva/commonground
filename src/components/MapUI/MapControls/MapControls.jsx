// src/components/MapUI/MapControls/MapControls.jsx

import { useState, useRef, useEffect } from 'react'
import { Menu, Plus, Minus, Navigation2, Grid } from 'lucide-react'
import MapButton from './MapButton'
import MapMenu from '../../MapMenu/MapMenu'
import AboutModal from '../../AboutModal/AboutModal'
import './MapControls.css'

function MapControls({ onZoomIn, onZoomOut, onLocate, onToggleHex, hexMode, variant, lang }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [locateError, setLocateError] = useState(false)
  const menuWrapRef = useRef(null)

  useEffect(() => {
    if (!menuOpen && !aboutOpen) return
    function handleClickOutside(e) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false)
        setAboutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen, aboutOpen])

  function handleLocateClick() {
    if (!navigator.geolocation) {
      triggerError()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords
        onLocate(lng, lat)
      },
      () => {
        triggerError()
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    )
  }

  function triggerError() {
    setLocateError(true)
    setTimeout(() => setLocateError(false), 1000)
  }

  return (
    
    <div className="map-controls">
      

      {/* Меню */}
      <div className="map-controls__menu-wrap" ref={menuWrapRef}>
        <MapButton
          icon={<Menu size={18} strokeWidth={1.8} />}
          onClick={() => { setAboutOpen(false); setMenuOpen(v => !v) }}
          ariaLabel="Menu"
          active={menuOpen}
        />

        {menuOpen && (
          <MapMenu
            onClose={() => setMenuOpen(false)}
            onAboutOpen={() => { setMenuOpen(false); setAboutOpen(true) }}
          />
        )}

        {aboutOpen && (
          <AboutModal
            onClose={() => setAboutOpen(false)}
            variant={variant}
            lang={lang}
          />
        )}
      </div>

      <div className="map-controls__gap map-controls__gap--lg" style={{ marginBottom: '36px' }} />

      <MapButton
        icon={<Plus size={18} strokeWidth={1.8} />}
        onClick={onZoomIn}
        ariaLabel="Zoom in"
      />

      <div className="map-controls__gap map-controls__gap--sm" />

      <MapButton
        icon={<Minus size={18} strokeWidth={1.8} />}
        onClick={onZoomOut}
        ariaLabel="Zoom out"
      />

      <div className="map-controls__gap map-controls__gap--lg" />

      {/* My Location */}
      <MapButton
  icon={<Navigation2 size={16} strokeWidth={1.8} />}
  onClick={handleLocateClick}
  ariaLabel="My location"
  error={locateError}
/>

      <div className="map-controls__gap map-controls__gap--lg" />

      <div style={{ marginTop: '56px' }}>
  <MapButton
    icon={<Grid size={18} strokeWidth={1.8} />}
    onClick={onToggleHex}
    ariaLabel="Toggle hex layer"
    active={hexMode}
  />
</div>

    </div>
  )
}

export default MapControls