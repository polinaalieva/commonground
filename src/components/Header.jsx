import { useLocation } from 'react-router-dom'
import { Link } from 'react-router-dom'
import logo from '../assets/CG_logo_bw.svg'
import './Header.css'
import LangSwitcher from './ui/LangSwitcher'
import { CONTENT } from '../config/content'

function Header() {
  const { pathname } = useLocation()
  const isRu = pathname.startsWith('/ru')
  const c = CONTENT.home[isRu ? 'ru' : 'en']

  return (
    <header className="cg-header">
      <div className="cg-header__inner">
        <Link to={isRu ? '/ru' : '/'} className="cg-header__link">
          <img className="cg-header__logo" src={logo} alt="Common Ground" />
          <div className="cg-header__text">
            <div className="cg-header__title">Common Ground</div>
            <div className="cg-header__subtitle">{c.subtitle_header}</div>
          </div>
        </Link>
        <LangSwitcher />
      </div>
    </header>
  )
}

export default Header