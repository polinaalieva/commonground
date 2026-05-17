import { useState } from 'react'
import { X } from 'lucide-react'
import './Wuf13IntroModal.css'

const SESSION_KEY = 'wuf13_intro_seen'

function Wuf13IntroModal() {
  const [visible, setVisible] = useState(() => !sessionStorage.getItem(SESSION_KEY))

  function close() {
    sessionStorage.setItem(SESSION_KEY, '1')
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="wuf13-intro-overlay" onClick={close}>
      <div className="wuf13-intro" onClick={e => e.stopPropagation()}>
        <button className="wuf13-intro__close" onClick={close} aria-label="Close">
          <X size={14} />
        </button>
        <div className="wuf13-intro__body">
          <p className="wuf13-intro__title">Common Ground · WUF13</p>
          <p className="wuf13-intro__text">
            WUF13 brings together people from cities across the world.
          </p>
          <p className="wuf13-intro__text">
            Pick a place you know, where you live, or where you're from, and share what it's actually like to live there.
          </p>
          <p className="wuf13-intro__text">
            Your experience will appear on the map alongside others from this forum.
          </p>
        </div>
        <button className="wuf13-intro__btn" onClick={close}>
          Explore the map
        </button>
      </div>
    </div>
  )
}

export default Wuf13IntroModal
