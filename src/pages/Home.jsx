import { useState } from 'react'
import { useLocation } from 'react-router-dom'
import Header from '../components/Header'
import CgButton from '../components/ui/Buttons/CgBtn'
import './Home.css'
import SuggestCityModal from '../components/BottomSheet/SuggestCityModal'
import { CONTENT } from '../config/content'
import ContactBlock from '../components/ui/ContactBlock'

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
            <span className="cg-title-accent"> </span> {c.title.replace('Common Ground', '').trim()}
          </h1>

          <p className="cg-subtitle">
            {c.subtitle.split('\n').map((line, i) => (
              <span key={i}>{line}{i === 0 && <br />}</span>
            ))}
          </p>

          <div className="cg-buttons-bleed">
            <div className="cg-buttons">
              <CgButton to={lang === 'ru' ? '/ru/london' : '/london'}>
                {c.btn_city}
              </CgButton>
              <CgButton onClick={() => setSuggestOpen(true)}>
                {c.btn_suggest}
              </CgButton>
            </div>
          </div>

          <div className="cg-body">
            <p>{c.body_1}<br />{c.body_2}</p>
            <p>{c.body_3}</p>
           <ContactBlock lang={lang} />
          </div>

        </div>
      </div>

      <SuggestCityModal isOpen={suggestOpen} onClose={() => setSuggestOpen(false)} />

    </div>
  )
}

export default Home