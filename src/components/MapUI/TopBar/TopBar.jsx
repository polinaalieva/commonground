import { useState, useRef, useEffect } from 'react'
import { Menu } from 'lucide-react'
import MapButton from '../MapButton/MapButton'
import MapMenu from '../../MapMenu/MapMenu'
import AboutModal from '../../AboutModal/AboutModal'
import EventAboutModal from '../../../events/components/EventAboutModal'
import './TopBar.css'

function TopBar({ variant, lang, isEventMode = false, eventConfig, onExitEvent }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const [eventAboutOpen, setEventAboutOpen] = useState(false)
  const menuWrapRef = useRef(null)

  useEffect(() => {
    if (!menuOpen && !aboutOpen && !eventAboutOpen) return
    function handleClickOutside(e) {
      if (menuWrapRef.current && !menuWrapRef.current.contains(e.target)) {
        setMenuOpen(false)
        setAboutOpen(false)
        setEventAboutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen, aboutOpen, eventAboutOpen])

  return (
    <div className="top-bar">
      <div className="top-bar__menu-wrap" ref={menuWrapRef}>
        <MapButton
          icon={<Menu size={18} strokeWidth={1.8} />}
          onClick={() => { setAboutOpen(false); setEventAboutOpen(false); setMenuOpen(v => !v) }}
          ariaLabel="Menu"
          active={menuOpen}
        />

        {menuOpen && (
          <MapMenu
            onClose={() => setMenuOpen(false)}
            onAboutOpen={() => { setMenuOpen(false); setAboutOpen(true) }}
            onEventAboutOpen={() => { setMenuOpen(false); setEventAboutOpen(true) }}
            isEventMode={isEventMode}
            eventConfig={eventConfig}
            onExitEvent={onExitEvent}
          />
        )}

        {aboutOpen && (
          <AboutModal
            onClose={() => setAboutOpen(false)}
            isEventMode={isEventMode}
          />
        )}

        {eventAboutOpen && eventConfig?.description && (
          <EventAboutModal
            onClose={() => setEventAboutOpen(false)}
            eventConfig={eventConfig}
          />
        )}
      </div>
    </div>
  )
}

export default TopBar
