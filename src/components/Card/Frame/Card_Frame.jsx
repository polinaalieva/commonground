import { useEffect, useState } from 'react'
import './Card_Frame.css'

/**
 * Base shell for the Card/* family: fixed positioning, blur, bottom-sheet on
 * mobile / floating panel on desktop, and the enter/exit transition.
 *
 * Padding is owned by the frame (16 top/bottom, 32 left/right) — card content
 * should not add its own outer padding.
 *
 * @param {boolean} open       - mount + play the enter animation
 * @param {React.ReactNode} children
 * @param {string} [className] - extra class on the frame element
 * @param {object} [ariaProps] - role / aria-* overrides
 */
function Card_Frame({ open, children, className = '', ariaProps }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!open) { setVisible(false); return }
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [open])

  if (!open) return null

  return (
    <div
      className={['card-frame', visible ? 'card-frame--visible' : '', className]
        .filter(Boolean)
        .join(' ')}
      role="dialog"
      aria-modal="false"
      {...ariaProps}
    >
      {children}
    </div>
  )
}

export default Card_Frame
