import { useState, useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import './Header.css'
import LangSwitcher from './ui/LangSwitcher'
import BurgerButton from './ui/BurgerButton'
import MapMenu from './MapMenu/MapMenu'
import { CONTENT } from '../config/content'

function Header({ isMap = false }) {
  const { pathname } = useLocation()
  const isRu = pathname.startsWith('/ru')
  const c = CONTENT.home[isRu ? 'ru' : 'en']
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef(null)


  useEffect(() => {
    if (!menuOpen) return
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [menuOpen])

  return (
    <header className="cg-header">
      <div className="cg-header__inner">
        <Link to={isRu ? '/ru' : '/'} className="cg-header__link">
            <div className="cg-header__title">Common Ground</div>
        </Link>

        {isMap ? (
          <div className="cg-header__burger-wrap" ref={menuRef}>
            <BurgerButton isOpen={menuOpen} onClick={() => setMenuOpen(v => !v)} />
            {menuOpen && <MapMenu onClose={() => setMenuOpen(false)} />}
          </div>
        ) : (
          <LangSwitcher />
        )}
      </div>
    </header>
  )
}

export default Header