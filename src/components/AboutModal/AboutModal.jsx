import { X } from 'lucide-react'
import { MENU_CONTENT } from '../../config/content-menu'
import './AboutModal.css'

function AboutModal({ onClose, isEventMode = false }) {
  const content = MENU_CONTENT[isEventMode ? 'event' : 'city']
  const { about_text, about_link, about_contact, about_footer } = content
  const GRAY = 'rgba(17,17,17,0.6)'

  const renderAboutText = () => {
    if (!about_link || !about_text.includes(about_link.match)) return about_text
    const [before, after] = about_text.split(about_link.match)
    return (
      <>
        {before}
        <a href={about_link.href} target="_blank" rel="noreferrer" style={{ color: 'inherit', textDecoration: 'none', fontWeight: about_link.bold ? 700 : undefined }}>
          {about_link.match}
        </a>
        {after}
      </>
    )
  }

  const contactLine = (color) => (
    <>
      {about_contact.prefix}{' '}
      {about_contact.links.map((link, i) => (
        <span key={i}>
          {link.before ?? (i > 0 ? ' ' : '')}
          <a href={link.href} target="_blank" rel="noreferrer" style={{ color, textDecoration: 'none' }}>
            {link.text}
          </a>
        </span>
      ))}
    </>
  )

  return (
    <div className="about-modal">
      <button className="about-modal__close" onClick={onClose} aria-label="Close">
        <X size={14} />
      </button>

      <div className="about-modal__body">
        <p className="about-modal__text" style={{ whiteSpace: 'pre-line', paddingTop: 0 }}>
          {renderAboutText()}
        </p>

        {about_footer && (
          <p className="about-modal__text" style={{ paddingTop: 6 }}>
            {contactLine('inherit')}
          </p>
        )}

        <div className="about-modal__contact">
          {about_footer && (
            <p className="about-modal__text" style={{ whiteSpace: 'pre-line', paddingTop: 0, color: GRAY, fontSize: 12 }}>
              {about_footer}
            </p>
          )}

          {!about_footer && (
            <p className="about-modal__text" style={{ paddingTop: 0, color: GRAY, fontSize: 13 }}>
              {contactLine(GRAY)}
            </p>
          )}

          {about_contact.legal && (
            <p className="about-modal__text" style={{ paddingTop: about_footer ? 10 : 0, color: GRAY, fontSize: about_footer ? 12 : 13 }}>
              {about_contact.legal.map((link, i) => (
                <span key={i}>
                  {i > 0 && ' • '}
                  <a href={link.href} target="_blank" rel="noreferrer" style={{ color: GRAY, textDecoration: 'none' }}>
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
