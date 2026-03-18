import { useRef, useCallback } from 'react'

const SNAP_COUNT = 10
const THUMB_SIZE = 16

const SNAP_COLORS = [
  '#ED4B9E',
  '#DF5BA6',
  '#C46DB4',
  '#A47EC0',
  '#8490C8',
  '#64A0C8',
  '#44B0BE',
  '#34C4B4',
  '#31CEAC',
  '#31D0AA',
]

const getThumbColor = (value) => {
  if (value === null) return '#ffffff'
  const index = value - 1
  return SNAP_COLORS[index]
}

function SheetSlider({ label, value, onChange }) {
  const trackRef = useRef(null)

  const snapValue = (raw) => {
    return Math.round(raw * (SNAP_COUNT - 1)) + 1
  }

  const getValueFromEvent = useCallback((clientX) => {
    const track = trackRef.current
    if (!track) return null
    const { left, width } = track.getBoundingClientRect()
    const raw = Math.max(0, Math.min(1, (clientX - left) / width))
    return snapValue(raw)
  }, [])

  const handleMouseDown = (e) => {
    e.preventDefault()
    onChange(getValueFromEvent(e.clientX))
    const handleMouseMove = (e) => onChange(getValueFromEvent(e.clientX))
    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  const handleTouchStart = (e) => {
    onChange(getValueFromEvent(e.touches[0].clientX))
    const handleTouchMove = (e) => {
      e.preventDefault()
      onChange(getValueFromEvent(e.touches[0].clientX))
    }
    const handleTouchEnd = () => {
      window.removeEventListener('touchmove', handleTouchMove)
      window.removeEventListener('touchend', handleTouchEnd)
    }
    window.addEventListener('touchmove', handleTouchMove, { passive: false })
    window.addEventListener('touchend', handleTouchEnd)
  }

  const displayValue = value === null ? 0.5 : (value - 1) / (SNAP_COUNT - 1)
  const thumbColor = getThumbColor(value)
  const half = THUMB_SIZE / 2
  const thumbLeft = `clamp(${half}px, ${displayValue * 100}%, calc(100% - ${half}px))`

  return (
    <div className="sheet-slider">
      {label && <p className="sheet-slider__label">{label}</p>}

      <div
        className="sheet-slider__hitarea"
        ref={trackRef}
        onMouseDown={handleMouseDown}
        onTouchStart={handleTouchStart}
      >
        <div className="sheet-slider__track">
          {SNAP_COLORS.slice(0, -1).map((color, i) => (
            <div
              key={i}
              className="sheet-slider__segment"
              style={{
                background: `linear-gradient(to right, ${color}, ${SNAP_COLORS[i + 1]})`
              }}
            />
          ))}
        </div>

        <div
          className="sheet-slider__thumb"
          style={{
            left: thumbLeft,
            background: thumbColor,
            boxShadow: value === null
              ? '0 0 0 3px rgba(0,0,0,0.2)'
              : '0 1px 6px rgba(0,0,0,0.25)',
          }}
        />
      </div>

      <div className="sheet-slider__labels">
        <span className="sheet-slider__label-item">not mine</span>
        <span className="sheet-slider__label-item">mixed</span>
        <span className="sheet-slider__label-item">feels like mine</span>
      </div>
    </div>
  )
}

export default SheetSlider