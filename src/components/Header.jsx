import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import './Header.css'
import LangSwitcher from './ui/LangSwitcher'
import BurgerButton from './ui/BurgerButton'
import MapMenu from './MapMenu/MapMenu'
import AboutModal from './AboutModal/AboutModal'
import { usePageParams } from '../hooks/usePageParams'

function Header({ isMap = false }) {
  const { pathname } = useLocation()
  const isRu = pathname.startsWith('/ru')
  const { variant, lang } = usePageParams()

  const [menuOpen, setMenuOpen]   = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)

  const wrapRef = useRef(null)

  // Закрывать оба при клике снаружи
  useEffect(() => {
    if (!menuOpen && !aboutOpen) return
    function handleClickOutside(e) {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) {
        setMenuOpen(false)
        setAboutOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen, aboutOpen])

  return (
    <header className="cg-header">
      <div className="cg-header__inner">

        {/* Common Ground — больше не ссылка */}
        <div className="cg-header__title">Common Ground</div>

        {isMap ? (
          <div className="cg-header__burger-wrap" ref={wrapRef}>
            <BurgerButton isOpen={menuOpen} onClick={() => {
              setAboutOpen(false)
              setMenuOpen(v => !v)
            }} />

            {menuOpen && (
              <MapMenu
                onClose={() => setMenuOpen(false)}
                onAboutOpen={() => setAboutOpen(true)}
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
        ) : (
          <LangSwitcher />
        )}

      </div>
    </header>
  )
}

export default Header