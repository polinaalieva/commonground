import { useRef } from 'react'
import './FloorSwitcher.css'

const SWIPE_THRESHOLD = 20

function floorLabel(level) {
  return level < 0 ? `B${-level}` : `${level} Fl`
}

// floors — уровни сверху вниз, например [3, 2, 1]
function FloorSwitcher({ floors, current, onChange }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const index = Math.max(0, floors.indexOf(current))

  function onPointerDown(e) {
    dragRef.current = { startY: e.clientY, moved: false }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragRef.current) return
    if (Math.abs(e.clientY - dragRef.current.startY) > 5) dragRef.current.moved = true
  }

  function onPointerUp(e) {
    const drag = dragRef.current
    dragRef.current = null
    if (!drag || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const slotH = rect.height / floors.length
    const dy = e.clientY - drag.startY

    // свайп вниз — этажи ниже; длинный свайп перескакивает несколько
    if (drag.moved && Math.abs(dy) >= SWIPE_THRESHOLD) {
      const steps = Math.max(1, Math.round(Math.abs(dy) / slotH))
      const next = Math.min(floors.length - 1, Math.max(0, index + Math.sign(dy) * steps))
      if (next !== index) onChange(floors[next])
      return
    }

    const tapped = floors[Math.floor((e.clientY - rect.top) / slotH)]
    if (tapped != null && tapped !== current) onChange(tapped)
  }

  return (
    <div
      ref={containerRef}
      className="floor-switcher"
      role="radiogroup"
      aria-label="Floor"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="floor-switcher__pill"
        style={{ transform: `translateY(calc(var(--slot-h) * ${index}))` }}
      />

      {floors.map(level => (
        <div
          key={level}
          className="floor-switcher__slot"
          role="radio"
          aria-checked={level === current}
          aria-label={`Floor ${level}`}
        >
          <span className={`floor-switcher__label${level === current ? ' floor-switcher__label--active' : ''}`}>
            {floorLabel(level)}
          </span>
        </div>
      ))}
    </div>
  )
}

export default FloorSwitcher
