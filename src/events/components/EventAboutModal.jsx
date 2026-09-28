import { X } from 'lucide-react'
import '../../components/AboutModal/AboutModal.css'

function EventAboutModal({ onClose, eventConfig }) {
  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="about-modal__body">
        <p className="about-modal__text" style={{ fontWeight: 700, paddingTop: 0 }}>
          {eventConfig.name}
        </p>
        <p className="about-modal__text" style={{ paddingTop: 6 }}>
          {eventConfig.description}
        </p>
        {eventConfig.link && (
          <p className="about-modal__text" style={{ paddingTop: 10 }}>
            <a
              href={eventConfig.link}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: 'inherit', textDecoration: 'underline', textUnderlineOffset: 3 }}
            >
              Event website ↗
            </a>
          </p>
        )}
      </div>
    </div>
  )
}

export default EventAboutModal
