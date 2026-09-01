import { X } from 'lucide-react'
import './DemoHeader.css'

/**
 * Header for the demo card — just a close button, aligned right.
 *
 * @param {() => void} onClose
 */
function DemoHeader({ onClose }) {
  return (
    <div className="demo-header">
      <button className="demo-header__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>
    </div>
  )
}

export default DemoHeader
