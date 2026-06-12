import { useRef } from 'react'
import './Switcher.css'

const SWIPE_THRESHOLD = 20
const HEX_GRAD_ID = 'sw-hex-g'

function Switcher({ hexMode, onToggle }) {
  const containerRef = useRef(null)
  const dragRef = useRef(null)

  function getPillWidth() {
    if (!containerRef.current) return 42
    return parseFloat(
      getComputedStyle(containerRef.current).getPropertyValue('--pill-w')
    )
  }

  function onPointerDown(e) {
    dragRef.current = { startX: e.clientX, moved: false }
    containerRef.current?.setPointerCapture(e.pointerId)
  }

  function onPointerMove(e) {
    if (!dragRef.current) return
    const dx = e.clientX - dragRef.current.startX
    if (Math.abs(dx) > 5) dragRef.current.moved = true
  }

  function onPointerUp(e) {
    if (!dragRef.current) return
    const { startX, moved } = dragRef.current
    dragRef.current = null

    const dx = e.clientX - startX

    if (moved && Math.abs(dx) >= SWIPE_THRESHOLD) {
      const wantHex = dx > 0
      if (wantHex !== hexMode) onToggle()
    } else {
      onToggle()
    }
  }

  return (
    <div
      ref={containerRef}
      className="switcher"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
    >
      <div
        className="switcher__pill"
        style={{ transform: hexMode ? `translateX(${getPillWidth()}px)` : 'translateX(0)' }}
      />

      <div className="switcher__slot" aria-label="Show experience points">
        <span className={`sw-point${hexMode ? '' : ' sw-point--active'}`} />
      </div>

      <div className="switcher__slot" aria-label="Show hex aggregation">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          {hexMode && (
            <defs>
              <linearGradient id={HEX_GRAD_ID} x1="0.21" y1="0.09" x2="0.79" y2="0.91">
                <stop offset="0%" stopColor="#31D0AA" />
                <stop offset="50%" stopColor="#6C95C1" />
                <stop offset="100%" stopColor="#ED4BBA" />
              </linearGradient>
            </defs>
          )}
          <path
            fillRule="evenodd"
            clipRule="evenodd"
            d="M13.5486 0C14.9027 0 16 1.09735 16 2.45136V13.5486C16 14.9027 14.9026 16 13.5486 16H2.45136C1.09735 16 0 14.9027 0 13.5486V2.45136C0 1.09735 1.09735 0 2.45136 0H13.5486ZM1.73177 13.5486V11.2446H4.75541V14.2682H2.45136C2.05422 14.2682 1.73177 13.9458 1.73177 13.5486ZM6.48818 14.2682V11.2446H9.51182V14.2682H6.48818ZM11.2446 14.2682V11.2446H14.2682V13.5486C14.2682 13.9458 13.9458 14.2682 13.5486 14.2682H11.2446ZM14.2682 9.51182H11.2446V6.48818H14.2682V9.51182ZM9.51182 6.48818H6.48818V9.51182H9.51182V6.48818ZM4.75541 6.48818H1.73177V9.51182H4.75541V6.48818ZM1.73177 4.75541H4.75541V1.73177H2.45136C2.05422 1.73177 1.73177 2.05422 1.73177 2.45136V4.75541ZM6.48818 4.75541H9.51182V1.73177H6.48818V4.75541ZM11.2446 4.75541H14.2682V2.45136C14.2682 2.05422 13.9458 1.73177 13.5486 1.73177H11.2446V4.75541Z"
            fill={hexMode ? `url(#${HEX_GRAD_ID})` : 'rgba(0,0,0,0.20)'}
          />
        </svg>
      </div>
    </div>
  )
}

export default Switcher