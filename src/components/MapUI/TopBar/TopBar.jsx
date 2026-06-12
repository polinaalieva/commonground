import { useState, useRef, useEffect } from 'react'
import { Menu } from 'lucide-react'
import MapButton from '../MapButton/MapButton'
import MapMenu from '../../MapMenu/MapMenu'
import AboutModal from '../../AboutModal/AboutModal'
import './TopBar.css'

function TopBar({ variant, lang }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
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

  return (
    <div className="top-bar">
      <div className="top-bar__menu-wrap" ref={menuWrapRef}>
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
    </div>
  )
}

export default TopBar
