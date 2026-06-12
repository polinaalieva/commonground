import { useRef, useState } from 'react'
import './Slider.css'

const ArrowIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <path d="M10 3L5 8L10 13" stroke="#111" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

const THRESHOLD = 0.45

function Slider({ label = 'Slide left to exit', onExit }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)
  const [dragX, setDragX] = useState(0)
  const [snapping, setSnapping] = useState(false)

  function getMaxTravel() {
    if (!containerRef.current) return 160
    const pw = parseFloat(getComputedStyle(containerRef.current).getPropertyValue('--pill-w'))
    return containerRef.current.offsetWidth - pw
  }

  function onPointerDown(e) {
    setSnapping(false)
    dragRef.current = { startX: e.clientX, baseDragX: dragX }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    const maxTravel = getMaxTravel()
    const next = Math.min(0, Math.max(-maxTravel, dragRef.current.baseDragX + dx))
    setDragX(next)
  }

  function onPointerUp() {
    if (!dragRef.current) return
    dragRef.current = null
    const maxTravel = getMaxTravel()

    if (dragX <= -maxTravel * THRESHOLD) {
      setSnapping(true)
      setDragX(-maxTravel)
      setTimeout(() => onExit?.(), 220)
    } else {
      setSnapping(true)
      setDragX(0)
    }
  }

  return (
    <div
      ref={containerRef}
      className="slider"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <span className="slider__label">{label}</span>
      <div
        className={`slider__pill${snapping ? ' slider__pill--snap' : ''}`}
        style={{ transform: `translateX(${dragX}px)` }}
      >
        <ArrowIcon />
      </div>
    </div>
  )
}

export default Slider
