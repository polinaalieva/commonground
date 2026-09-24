import TopBar from './TopBar/TopBar'
import MiddleBar from './MiddleBar/MiddleBar'
import BottomBar from './BottomBar/BottomBar'
import FloorSwitcher from './FloorSwitcher/FloorSwitcher'
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
  onInfoClick,
  infoActive,
  floors = [],
  currentFloor,
  onFloorChange,
}) {
  return (
    <div className="map-ui">
      <TopBar
        variant={variant}
        lang={lang}
        isEventMode={source === 'event'}
        eventConfig={eventConfig}
        onExitEvent={onExitEvent}
        onInfoClick={onInfoClick}
        infoActive={infoActive}
      />
      {source === 'event' && floors.length > 1 && (
        <FloorSwitcher floors={floors} current={currentFloor} onChange={onFloorChange} />
      )}
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
