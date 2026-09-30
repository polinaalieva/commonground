import { useLocation, useNavigate } from 'react-router-dom'
import { CITY_CONFIGS } from '../../config/cities'
import './MapMenu.css'

const ACTIVE_CITIES = ['london']
// ↑ добавили константу с городами, которые отображаются в свитчере --- IGNORE ---

// Пункты меню (временно, пока нет шторки с настройками аккаунта).
// Открываются в новой вкладке, чтобы карта не терялась.
const MENU_LINKS = [
  { label: 'About', path: '/about', ru: false },
  { label: 'Terms of use', path: '/legal/terms-of-use', ru: true },
  { label: 'Privacy Policy', path: '/legal/privacy-policy', ru: true },
]

const CITY_LABELS = {
  london: { en: 'London', ru: 'Лондон' },
  moscow:  { en: 'Moscow', ru: 'Москва' },
}
// ↑ добавили словарь с названиями городов на разных языках --- IGNORE ---

function MapMenu({ onClose, onEventAboutOpen, isEventMode = false, eventConfig, onExitEvent }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const isRu = pathname.startsWith('/ru')

  const pathParts = pathname.replace(/^\/ru/, '').replace(/^\//, '')
  const currentCity = pathParts || 'london'

  const cityConfig = CITY_CONFIGS[currentCity] ?? {}
  const hideCitySwitcher = true // --- IGNORE --- убрали свитчер городов, так как сейчас отображается только Лондон

  function goToCity(cityKey) {
    const base = isRu ? '/ru' : ''
    navigate(`${base}/${cityKey}${search}`)
    onClose()
  }

  function toggleLang() {
    if (isRu) {
      navigate(pathname.replace('/ru', '') + search || '/' + search)
    } else {
      navigate('/ru' + pathname + search)
    }
    onClose()
  }

  const allOptions = [...ACTIVE_CITIES, 'map']

  return (
    <div className="map-menu">

      {isEventMode && eventConfig?.description && (
        <div className="map-menu__row map-menu__row--home">
          <button className="map-menu__home-btn" onClick={() => { onClose(); onEventAboutOpen() }}>
            About {eventConfig.name || eventConfig.shortName}
          </button>
        </div>
      )}

      {isEventMode && (
        <div className="map-menu__row map-menu__row--home">
          <button className="map-menu__home-btn" onClick={() => { onClose(); onExitEvent() }}>
            Exit event
          </button>
        </div>
      )}

      <div className="map-menu__divider" />

      {MENU_LINKS.map(({ label, path, ru }) => (
        <div key={path} className="map-menu__row map-menu__row--home">
          <a
            className="map-menu__home-btn"
            href={isRu && ru ? `/ru${path}` : path}
            target="_blank"
            rel="noopener"
            onClick={onClose}
          >
            {label}
          </a>
        </div>
      ))}

    </div>
  )
}

export default MapMenu