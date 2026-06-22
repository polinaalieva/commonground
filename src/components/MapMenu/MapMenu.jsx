import { useLocation, useNavigate } from 'react-router-dom'
import { CITY_CONFIGS } from '../../config/cities'
import { MENU_CONTENT } from '../../config/content-menu'
import './MapMenu.css'

const ACTIVE_CITIES = ['london']
// ↑ добавили константу с городами, которые отображаются в свитчере --- IGNORE ---

const CITY_LABELS = {
  london: { en: 'London', ru: 'Лондон' },
  moscow:  { en: 'Moscow', ru: 'Москва' },
}
// ↑ добавили словарь с названиями городов на разных языках --- IGNORE ---

function MapMenu({ onClose, onAboutOpen, onEventAboutOpen, isEventMode = false, eventConfig, onExitEvent }) {
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

      {isEventMode && eventConfig?.description && (
        <div className="map-menu__row map-menu__row--home">
          <button className="map-menu__home-btn" onClick={() => { onClose(); onEventAboutOpen() }}>
            About {eventConfig.shortName}
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

      {/* About map - open modal */}
      <div className="map-menu__row map-menu__row--home">
        <button className="map-menu__home-btn" onClick={handleAbout}>
          {MENU_CONTENT[isEventMode ? 'event' : 'city'].about_btn}
        </button>
      </div>

    </div>
  )
}

export default MapMenu