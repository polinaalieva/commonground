import { useState } from 'react'
import MapButton from '../MapButton/MapButton'
import Switcher from '../Switcher/Switcher'
import Slider from '../Slider/Slider'
import StartSurveyButton from '../StartSurveyButton/StartSurveyButton'
import './BottomBar.css'

const NavIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M6 0.5L11 11L6 8.5L1 11L6 0.5Z" fill="#111" />
  </svg>
)

function BottomBar({ onLocate, onToggleHex, hexMode, onStartSurvey, visible = true, mode = 'global', onExit }) {
  const [locateError, setLocateError] = useState(false)

  function handleLocateClick() {
    if (!navigator.geolocation) {
      triggerError()
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { longitude: lng, latitude: lat } = pos.coords
        onLocate(lng, lat)
      },
      () => triggerError(),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 10000 }
    )
  }

  function triggerError() {
    setLocateError(true)
    setTimeout(() => setLocateError(false), 1000)
  }

  return (
    <div className={`bottom-bar${visible ? '' : ' bottom-bar--hidden'}`}>
      <div className="bottom-bar__left">
        <MapButton
          icon={<NavIcon />}
          onClick={handleLocateClick}
          ariaLabel="My location"
          error={locateError}
        />
        {mode === 'global' && <Switcher hexMode={hexMode} onToggle={onToggleHex} />}
        {mode === 'event' && <Slider label="Swipe to exit" onExit={onExit} />}
      </div>
      <StartSurveyButton onClick={onStartSurvey} />
    </div>
  )
}

export default BottomBar
