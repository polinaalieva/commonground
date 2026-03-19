import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import './Home.css'
import SuggestCityModal from '../components/BottomSheet/SuggestCityModal'

function Home() {
  const [suggestOpen, setSuggestOpen] = useState(false)

  return (
    <div className="cg-landing">
      <Header />
      <div className="cg-landing__inner">
        <div className="cg-landing__content">

          <h1 className="cg-title">
            <span className="cg-title-accent">Common Ground</span> is a map of how people experience places
          </h1>

          <p className="cg-subtitle">
            Tap the map. Share your experience.
            <br />
            See how others feel about places around you.
          </p>

          <div className="cg-buttons-bleed">
            <div className="cg-buttons">
              <Link className="cg-btn" to="/london">London</Link>
              <Link className="cg-btn" to="/bucharest">Bucharest</Link>
              <button className="cg-btn" onClick={() => setSuggestOpen(true)}>+ Suggest city</button>
            </div>
          </div>

          <div className="cg-body">
            <p>Cities collect vast amounts of data.</p>
            <p>Yet people's lived experience of places often remains fragmented, delayed, and treated as secondary.</p>
            <p>Common Ground explores what happens when signals from people are continuously collected to form a living layer of insight about the city.</p>
          </div>

          <div className="cg-contact">
            If you'd like to share feedback about the project, feel free to message me on Telegram{' '}
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