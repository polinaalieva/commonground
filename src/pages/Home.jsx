import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header'
import './Home.css'
import SuggestCityModal from '../components/BottomSheet/SuggestCityModal'
import { CONTENT } from '../config/content'

function Home() {
  const [suggestOpen, setSuggestOpen] = useState(false)
  const { pathname } = useLocation()
  const lang = pathname.startsWith('/ru') ? 'ru' : 'en'
  const c = CONTENT.home[lang]

  return (
    <div className="cg-landing">
      <Header />
      <div className="cg-landing__inner">
        <div className="cg-landing__content">

          <h1 className="cg-title">
            <span className="cg-title-accent">Common Ground</span> {c.title.replace('Common Ground', '').trim()}
          </h1>

          <p className="cg-subtitle">
            {c.subtitle.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>

          <div className="cg-buttons-bleed">
            <div className="cg-buttons">
              <Link className="cg-btn" to={lang === 'ru' ? '/ru/london' : '/london'}>
                {c.btn_city}
              </Link>
              <button className="cg-btn" onClick={() => setSuggestOpen(true)}>
                {c.btn_suggest}
              </button>
            </div>
          </div>

          <div className="cg-body">
            <p>{c.body_1}</p>
            <p>{c.body_2}</p>
            <p>{c.body_3}</p>
          </div>

          <div className="cg-contact">
            {c.contact}{' '}
            <a href="https://t.me/AlievaPolina" target="_blank">@AlievaPolina</a>
            {' '}or email{' '}
            <a href="mailto:polina.alieva@gmail.com">polina.alieva@gmail.com</a>
          </div>

        </div>
      </div>

      <SuggestCityModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />

    </div>
  )
}

export default Home