import { X } from 'lucide-react'
import { MENU_CONTENT } from '../../config/content-menu'
import './AboutModal.css'

function AboutModal({ onClose, isEventMode = false }) {
  const content = MENU_CONTENT[isEventMode ? 'event' : 'city']
  const { about_text, about_link, about_contact } = content

  const renderAboutText = () => {
    if (!about_link || !about_text.includes(about_link.match)) return about_text
    const [before, after] = about_text.split(about_link.match)
    return (
      <>
        {before}
        <a href={about_link.href} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
          {about_link.match}
        </a>
        {after}
      </>
    )
  }

  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="about-modal__body">
        <p className="about-modal__text" style={{ whiteSpace: 'pre-line', paddingTop: 0 }}>
          {renderAboutText()}
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

          {about_contact.legal && (
            <p className="about-modal__text" style={{ paddingTop: 0, color: 'rgba(17,17,17,0.6)', fontSize: 13 }}>
              {about_contact.legal.map((link, i) => (
                <span key={i}>
                  {i > 0 && ' • '}
                  <a href={link.href} target="_blank" rel="noreferrer" style={{ color: 'rgba(17,17,17,0.6)', textDecoration: 'none' }}>
                    {link.text}
                  </a>
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

export default AboutModal
