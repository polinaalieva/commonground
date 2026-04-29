import { useLocation, useNavigate } from 'react-router-dom'
import { CITY_CONFIGS } from '../../config/cities'
import './MapMenu.css'

const ACTIVE_CITIES = ['london']
// ↑ добавили константу с городами, которые отображаются в свитчере --- IGNORE ---

const CITY_LABELS = {
  london: { en: 'London', ru: 'Лондон' },
  moscow:  { en: 'Moscow', ru: 'Москва' },
}
// ↑ добавили словарь с названиями городов на разных языках --- IGNORE ---

function MapMenu({ onClose, onAboutOpen }) {
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

  function handleAbout() {
    onClose()
    onAboutOpen()
  }

  const allOptions = [...ACTIVE_CITIES, 'map']

  return (
    <div className="map-menu">

      {/* О проекте — теперь открывает модалку */}
      <div className="map-menu__row map-menu__row--home">
        <button className="map-menu__home-btn" onClick={handleAbout}>
          {isRu ? 'О проекте' : 'About the project'}
        </button>
      </div>

      <div className="map-menu__divider" />

      {/* Выбор города — скрыт для hideCitySwitcher */}
      {!hideCitySwitcher && (
        <div className="map-menu__row">
          <span className="map-menu__label">
            {isRu ? 'Город' : 'Explore the map'}
          </span>
          <div className="map-menu__switcher">
            {allOptions.map(key => (
              <button
                key={key}
                className={`map-menu__option ${currentCity === key ? 'map-menu__option--active' : ''}`}
                onClick={() => goToCity(key)}
              >
                {key === 'map'
                  ? (isRu ? 'Мир' : 'World')
                  : (CITY_LABELS[key]?.[isRu ? 'ru' : 'en'] ?? key)
                }
              </button>
            ))}
          </div>
        </div>
      )}

      {!hideCitySwitcher && <div className="map-menu__divider" />}

      {/* Язык */}
      <div className="map-menu__row">
        <span className="map-menu__label">
          {isRu ? 'Язык' : 'Language'}
        </span>
        <div className="map-menu__switcher" onClick={toggleLang}>
          <button className={`map-menu__option ${!isRu ? 'map-menu__option--active' : ''}`}>EN</button>
          <button className={`map-menu__option ${isRu ? 'map-menu__option--active' : ''}`}>RU</button>
        </div>
      </div>

    </div>
  )
}

export default MapMenu