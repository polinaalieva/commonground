import TopBar from './TopBar/TopBar'
import MiddleBar from './MiddleBar/MiddleBar'
import BottomBar from './BottomBar/BottomBar'
import './MapUI.css'

function MapUI({
  onZoomIn,
  onZoomOut,
  onLocate,
  onToggleHex,
  hexMode,
  onStartSurvey,
  variant,
  lang,
  bottomBarVisible,
}) {
  return (
    <div className="map-ui">
      <TopBar
        variant={variant}
        lang={lang}
      />
      <MiddleBar
        onZoomIn={onZoomIn}
        onZoomOut={onZoomOut}
      />
      <BottomBar
        onLocate={onLocate}
        onToggleHex={onToggleHex}
        hexMode={hexMode}
        onStartSurvey={onStartSurvey}
        visible={bottomBarVisible}
      />
    </div>
  )
}

export default MapUI
