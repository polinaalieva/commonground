import './ContactBlock.css'
import { HOME_CONTENT } from '../../config/content-home-page'

function ContactBlock({ lang, inter = false }) {
  const c = HOME_CONTENT[lang]
  const isRu = lang === 'ru'

  return (
    <p className={`contact-block ${inter ? 'contact-block--inter' : ''}`}>
      {c.contact}{' '}
      <a href="https://www.linkedin.com/in/polinaalieva/" target="_blank" rel="noreferrer">
        LinkedIn
      </a>
      {' '}{isRu ? 'или на почту' : 'or email'}{' '}
      <a href="mailto:polina@commonground.page">polina@commonground.page</a>
    </p>
  )
}

export default ContactBlock