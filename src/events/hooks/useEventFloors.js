import { useState } from 'react'
import { getEventFloors, getDefaultFloor } from '../../config/events'

// Этажи события: уровни для переключателя (сверху вниз) и текущий этаж.
// eventConfig = null — не событие, этажей нет. onChange — после смены этажа.
export function useEventFloors(eventConfig, onChange) {
  const floorLevels = getEventFloors(eventConfig).map(f => f.level).filter(l => l != null)
  const [currentFloor, setCurrentFloor] = useState(() => getDefaultFloor(eventConfig))

  function changeFloor(level) {
    if (level == null || floorLevels.length === 0) return
    setCurrentFloor(level)
    onChange?.(level)
  }

  return { floorLevels, currentFloor, changeFloor }
}
