import { useLocation, useNavigate, Link } from 'react-router-dom'
import './MapMenu.css'

// Сюда добавляй города когда будут готовы
// 'map' — это специальный ключ для World view
const ACTIVE_CITIES = ['london']

const CITY_LABELS = {
  london: { en: 'London', ru: 'Лондон' },
  moscow: { en: 'Moscow', ru: 'Москва' },
  // добавляй сюда новые города
}

function MapMenu({ onClose }) {
  const { pathname, search } = useLocation()
  const navigate = useNavigate()
  const isRu = pathname.startsWith('/ru')

  // Определяем текущий город из URL
  // pathname: /london, /ru/london, /map, /ru/map
  const pathParts = pathname.replace(/^\/ru/, '').replace(/^\//, '')
  const currentCity = pathParts || 'london'

  function goToCity(cityKey) {
    const base = isRu ? '/ru' : ''
    navigate(`${base}/${cityKey}${search}`)
    onClose()
  }

  function goHome() {
    navigate(isRu ? '/ru' : '/')
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
  // 'map' — это World

  return (
    <div className="map-menu">

      {/* Кнопка на главную */}
      <div className="map-menu__row map-menu__row--home">
        <button className="map-menu__home-btn" onClick={goHome}>
          {isRu ? 'Главная страница' : 'About project'}
        </button>
      </div>

      <div className="map-menu__divider" />

      {/* Выбор города */}
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

      {/* Выбор языка */}
      <div className="map-menu__row">
        <span className="map-menu__label">
          {isRu ? 'Язык' : 'Language'}
        </span>
        <div className="map-menu__switcher" onClick={toggleLang}>
          <button className={`map-menu__option ${!isRu ? 'map-menu__option--active' : ''}`}>
            EN
          </button>
          <button className={`map-menu__option ${isRu ? 'map-menu__option--active' : ''}`}>
            RU
          </button>
        </div>
      </div>

    </div>
  )
}

export default MapMenu