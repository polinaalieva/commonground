import { Link } from 'react-router-dom'
import logo from '../assets/CG_logo_bw.svg'
import './Header.css'

function Header() {
  return (
    <header className="cg-header">
      <div className="cg-header__inner">
        <Link to="/" className="cg-header__link">
          <img className="cg-header__logo" src={logo} alt="Common Ground" />
          <div className="cg-header__text">
            <div className="cg-header__title">Common Ground</div>
            <div className="cg-header__subtitle">A map of how people experience places</div>
          </div>
        </Link>
      </div>
    </header>
  )
}

export default Header