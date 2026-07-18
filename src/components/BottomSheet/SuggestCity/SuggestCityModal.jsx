import SuggestCity_BSheet from './SuggestCity_BSheet'
import './SuggestCityModal.css'

function SuggestCityModal({ isOpen, onClose }) {
  if (!isOpen) return null

  return (
    <div className="suggest-modal">
      {/* backdrop: white 20% + blur 5px */}
      <div className="suggest-modal__backdrop" onClick={onClose} />
      <SuggestCity_BSheet onClose={onClose} />
    </div>
  )
}

export default SuggestCityModal