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
  source,
  eventConfig,
  onExitEvent,
  onSearch,
}) {
  return (
    <div className="map-ui">
      <TopBar
        variant={variant}
        lang={lang}
        isEventMode={source === 'event'}
        eventConfig={eventConfig}
        onExitEvent={onExitEvent}
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
        mode={source === 'event' ? 'event' : 'global'}
        onExit={onExitEvent}
        onSearch={onSearch}
      />
    </div>
  )
}

export default MapUI
