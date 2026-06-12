import { Plus, Minus } from 'lucide-react'
import MapButton from '../MapButton/MapButton'
import './MiddleBar.css'

function MiddleBar({ onZoomIn, onZoomOut }) {
  return (
    <div className="middle-bar">
      <MapButton
        icon={<Plus size={18} strokeWidth={1.8} />}
        onClick={onZoomIn}
        ariaLabel="Zoom in"
      />
      <MapButton
        icon={<Minus size={18} strokeWidth={1.8} />}
        onClick={onZoomOut}
        ariaLabel="Zoom out"
      />
    </div>
  )
}

export default MiddleBar
