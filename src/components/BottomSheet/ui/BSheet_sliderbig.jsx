import { useRef, useState, useEffect, useCallback } from 'react'
import './BSheet_sliderbig.css'

const SNAPS = 10
const MAGNET_MS = 180

const STOPS = [
  [0, [237, 76, 186]],
  [0.5, [108, 149, 193]],
  [1, [49, 208, 170]],
]

const lerp = (a, b, k) => Math.round(a + (b - a) * k)

const gradColor = (t) => {
  const [s0, s1] = t > 0.5 ? [STOPS[1], STOPS[2]] : [STOPS[0], STOPS[1]]
  const k = (t - s0[0]) / (s1[0] - s0[0])
  const [c0, c1] = [s0[1], s1[1]]
  return `rgb(${lerp(c0[0], c1[0], k)},${lerp(c0[1], c1[1], k)},${lerp(c0[2], c1[2], k)})`
}

const mouthPath = (t) => {
  const O = 11 * (2 * t - 1)
  const yc = 16
  const yE = (yc - 0.375 * O).toFixed(2)
  const yC = (yc + 0.625 * O).toFixed(2)
  return `M4 ${yE} C6 ${yC} 18 ${yC} 20 ${yE}`
}

const easeOutCubic = (x) => 1 - Math.pow(1 - x, 3)

const ArrowsIcon = () => (
  <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
    <path
      d="M6 6L2 10L6 14M2 10L8 10M14 6L18 10L14 14M12 10L18 10"
      stroke="#000"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
)

function BSheet_sliderbig ({ label, value, onChange, hint = 'Adjust to choose experience' }) {
  const gradRef = useRef(null)
  const draggingRef = useRef(false)
  const rafRef = useRef(null)

  // непрерывная позиция 0..1; null пока не трогали
  const [pos, setPos] = useState(() =>
    value !== null && value !== undefined ? (value - 1) / (SNAPS - 1) : null
  )

  const cancelAnim = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }, [])

  useEffect(() => cancelAnim, [cancelAnim])

  const rawFromX = (clientX) => {
    const el = gradRef.current
    if (!el) return 0
    const { left, width } = el.getBoundingClientRect()
    return Math.max(0, Math.min(1, (clientX - left) / width))
  }

  const magnet = (from) => {
    const snapped = Math.round(from * (SNAPS - 1)) // 0..9
    const to = snapped / (SNAPS - 1)
    const start = performance.now()
    const step = (now) => {
      const k = Math.min(1, (now - start) / MAGNET_MS)
      setPos(from + (to - from) * easeOutCubic(k))
      if (k < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        rafRef.current = null
        setPos(to)
        onChange(snapped + 1) // 1..10
      }
    }
    rafRef.current = requestAnimationFrame(step)
  }

  const onPointerDown = (e) => {
    cancelAnim()
    draggingRef.current = true
    e.currentTarget.setPointerCapture(e.pointerId)
    setPos(rawFromX(e.clientX))
  }
  const onPointerMove = (e) => {
    if (!draggingRef.current) return
    setPos(rawFromX(e.clientX))
  }
  const onPointerUp = () => {
    if (!draggingRef.current) return
    draggingRef.current = false
    setPos((cur) => {
      magnet(cur ?? 0)
      return cur
    })
  }

  const active = pos !== null
  const t = active ? pos : 0
  const restT = 1 / (SNAPS - 1)
  const knobT = active ? pos : restT

  return (
    <div className="sheet-sliderbig">
      {label && <p className="sheet-sliderbig__label">{label}</p>}

      <div
        className={`sheet-sliderbig__hitarea${active ? ' is-active' : ''}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div ref={gradRef} className="sheet-sliderbig__grad" />

        <div className="sheet-sliderbig__dots">
          {Array.from({ length: 10 }).map((_, i) => (
            <span key={i} className="sheet-sliderbig__dot" />
          ))}
        </div>

        {!active && (
          <span
            className="sheet-sliderbig__hint"
            style={{ left: `calc(${restT * 100}% - ${restT * 40}px + 40px)` }}
          >
            {hint}
          </span>
        )}

        <div
          className="sheet-sliderbig__knob"
          style={{ left: `calc(${knobT * 100}% - ${knobT * 40}px)` }}
        >
          {active ? (
            <svg width="20" height="20" viewBox="0 0 24 24">
              <path
                d={mouthPath(t)}
                stroke={gradColor(t)}
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          ) : (
            <ArrowsIcon />
          )}
        </div>
      </div>
    </div>
  )
}

export default BSheet_sliderbig