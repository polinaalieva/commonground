import { X } from 'lucide-react'
import { MENU_CONTENT } from '../../config/content-menu'
import './AboutModal.css'

function AboutModal({ onClose, isEventMode = false }) {
  const content = MENU_CONTENT[isEventMode ? 'event' : 'city']
  const { about_text, about_contact } = content

  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="about-modal__body">
        <p className="about-modal__text" style={{ whiteSpace: 'pre-line', paddingTop: 0 }}>
          {about_text}
        </p>

        <div className="about-modal__contact">
          <p className="about-modal__text" style={{ paddingTop: 0, color: 'rgba(17,17,17,0.6)', fontSize: 13 }}>
            {about_contact.prefix}{' '}
            {about_contact.links.map((link, i) => (
              <span key={i}>
                {link.before ?? (i > 0 ? ' ' : '')}
                <a href={link.href} target="_blank" rel="noreferrer" style={{ color: 'rgba(17,17,17,0.6)', textDecoration: 'none' }}>
                  {link.text}
                </a>
              </span>
            ))}
          </p>
        </div>
      </div>
    </div>
  )
}

export default AboutModal
