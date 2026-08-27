import { useLocation } from 'react-router-dom'
import Header from '../components/Landing/Header'
import CgButton from '../components/ui/Buttons/CgBtn'
import './Home.css'
import { HOME_CONTENT } from '../config/content-home-page'
import ContactBlock from '../components/ui/ContactBlock'

function Home() {
  const { pathname } = useLocation()
  const lang = pathname.startsWith('/ru') ? 'ru' : 'en'
  const c = HOME_CONTENT[lang]

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
              <CgButton to={lang === 'ru' ? '/ru/map' : '/map'}>
                {c.btn_explore}
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
    </div>
  )
}

export default Home