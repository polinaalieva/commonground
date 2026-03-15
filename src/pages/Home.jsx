import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import './Home.css'

function Home() {
  const [formOpen, setFormOpen] = useState(false)

  return (
    <div className="cg-landing">
      <Header />
      <div className="cg-landing__inner">
        <div className="cg-landing__content">

         <p className="cg-kicker">A map of how people experience places</p> 

          <h1 className="cg-title">
            <span className="cg-title-accent">Common Ground</span> collects small signals people leave about places they know
          </h1>

          <p className="cg-subtitle">
            Click on the map. Leave a short signal. See how it shapes the map.
          </p>

          <div className="cg-buttons-bleed">
            <div className="cg-buttons">
              <Link className="cg-btn" to="/london">London</Link>
              <Link className="cg-btn" to="/bucharest">Bucharest</Link>
              <button className="cg-btn" onClick={() => setFormOpen(true)}>+ Suggest your city</button>
            </div>
          </div>

          <div className="cg-body">
            <p>Cities collect vast amounts of data.</p>
            <p>Yet people's lived experience of places often remains fragmented, delayed, and thus secondary.</p>
            <p>Common Ground explores what happens when signals from people are continuously collected to form a layer of insight about the city.</p>
          </div>

          <div className="cg-contact">
            If you'd like to share feedback about the project, feel free to message me on Telegram{' '}
            <a href="https://t.me/AlievaPolina" target="_blank">@AlievaPolina</a>
            {' '}or email{' '}
            <a href="mailto:polina.alieva@gmail.com">polina.alieva@gmail.com</a>
          </div>

        </div>
      </div>

      {formOpen && (
        <div className="cg-form-modal" style={{display:'flex'}} onClick={(e) => e.target.className === 'cg-form-modal' && setFormOpen(false)}>
          <div className="cg-form-inner">
            <button className="cg-form-close" onClick={() => setFormOpen(false)}>×</button>
            <iframe src="https://form.fillout.com/t/meU3aCY5r8us" allow="fullscreen" />
          </div>
        </div>
      )}

    </div>
  )
}

export default Home