import { Link, useNavigate } from 'react-router-dom'
import ButtonText from '../ui/ButtonText'
import Menu from '../ui/Menu'
import './Header.css'

export default function Header() {
  const navigate = useNavigate()
  const navItems = [
    { label: 'Explore map', onClick: () => navigate('/map') },
  ]

  return (
    <header className="landing-header">
      <Link className="landing-logo" to="/about">Common Ground</Link>
      <nav className="landing-desktop-nav" aria-label="Main navigation">
        {navItems.map(item => (
          <ButtonText key={item.label} onClick={item.onClick}>
            {item.label}
          </ButtonText>
        ))}
      </nav>
      <div className="landing-mobile-nav">
        <Menu items={navItems} />
      </div>
    </header>
  )
}
