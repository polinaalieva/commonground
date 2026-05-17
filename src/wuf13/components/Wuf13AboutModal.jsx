import { X } from 'lucide-react'
import ContactBlock from '../../components/ui/ContactBlock'
import '../../components/AboutModal/AboutModal.css'

function Wuf13AboutModal({ onClose, lang }) {
  const isRu = lang === 'ru'

  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>
      <div className="about-modal__body">
        <p className="about-modal__text">
          Cities have lots of urban data. Almost none of it captures how residents actually experience living somewhere, in real time, at neighborhood scale.
        </p>
        <p className="about-modal__text">
          Common Ground is a map where people mark places, share their experience of living there, and explore others.
        </p>
        <p className="about-modal__text">
          The output is a continuous, geo-tagged dataset of lived experience, open data by design.
        </p>
        <div className="about-modal__contact">
          <ContactBlock lang={isRu ? 'ru' : 'en'} inter />
        </div>
      </div>
    </div>
  )
}

export default Wuf13AboutModal
