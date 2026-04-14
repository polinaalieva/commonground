import './ContactBlock.css'
import { CONTENT } from '../../config/content'

function ContactBlock({ lang, inter = false }) {
  const c = CONTENT.home[lang]
  const isRu = lang === 'ru'

  return (
    <p className={`contact-block ${inter ? 'contact-block--inter' : ''}`}>
      {c.contact}{' '}
      <a href="https://t.me/AlievaPolina" target="_blank" rel="noreferrer">
        @AlievaPolina
      </a>
      {' '}{isRu ? 'или на почту' : 'or email'}{' '}
      <a href="mailto:polina.alieva@gmail.com">polina.alieva@gmail.com</a>
    </p>
  )
}

export default ContactBlock