import { X } from 'lucide-react'
import { CONTENT } from '../../config/content'
import ContactBlock from '../ui/ContactBlock'
import './AboutModal.css'

function AboutModal({ onClose, variant, lang }) {
  const c = CONTENT.map[variant]?.[lang] ?? CONTENT.map['belonging']['en']
  const isRu = lang === 'ru'

  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>
      <div className="about-modal__body">
        <p className="about-modal__text">{c.about_text_1}</p>
        <p className="about-modal__text">{c.about_text_2}</p>
        <div className="about-modal__contact">
          <ContactBlock lang={isRu ? 'ru' : 'en'} inter />
        </div>
      </div>
    </div>
  )
}

export default AboutModal