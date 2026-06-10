import { useState } from 'react'
import { X } from 'lucide-react'
import './Wuf13FirstPinModal.css'

import { supabaseFetch } from '../../config/supabase'

function Wuf13FirstPinModal({ onClose }) {
  const [view, setView] = useState('idle')
  const [value, setValue] = useState('')
  const [sending, setSending] = useState(false)

  function handleClose() {
    setView('idle')
    setValue('')
    onClose()
  }

  async function handleSend() {
    if (!value.trim()) return
    setSending(true)
    try {
      await supabaseFetch('wuf13_contacts', {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify({ message: value.trim() }),
      })
      setView('success')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="wuf13-fpm-overlay">
      <div className="wuf13-fpm">
        <button className="wuf13-fpm__close" onClick={handleClose} aria-label="Close">
          <X size={14} />
        </button>

        {view === 'idle' && (
          <>
            <div className="wuf13-fpm__body">
              <p className="wuf13-fpm__title">Thank you for your contribution.</p>
              <p className="wuf13-fpm__text">
                You just shared something cities rarely have: your experience of living somewhere.
              </p>
              <p className="wuf13-fpm__text">
                Cities have plenty of data. But residents' feedback is among the hardest to collect, so it remains project-bound: delayed, fragmented, secondary.
              </p>
              <p className="wuf13-fpm__text">
                If you'd like to share feedback about the project, reach out on{' '}
                <a
                  href="https://www.linkedin.com/in/polinaalieva/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="wuf13-fpm__link"
                >
                  LinkedIn
                </a>
                {' '}or leave your contacts below.
              </p>
            </div>
            <button className="wuf13-fpm__btn" onClick={() => setView('form')}>
              Leave contacts
            </button>
          </>
        )}

        {view === 'form' && (
          <>
            <div className="wuf13-fpm__body">
              <p className="wuf13-fpm__title">Thank you for your contribution.</p>
              <textarea
                className="wuf13-fpm__textarea"
                placeholder="Your name, email, or anything you'd like to share"
                value={value}
                onChange={e => setValue(e.target.value)}
                rows={4}
              />
            </div>
            <div className="wuf13-fpm__form-actions">
              <button
                className="wuf13-fpm__btn wuf13-fpm__btn--full"
                onClick={handleSend}
                disabled={!value.trim() || sending}
              >
                {sending ? 'Sending...' : 'Send'}
              </button>
              <button className="wuf13-fpm__btn--cancel" onClick={() => setView('idle')}>
                Cancel
              </button>
            </div>
          </>
        )}

        {view === 'success' && (
          <div className="wuf13-fpm__body">
            <p className="wuf13-fpm__title">Thank you for your contribution.</p>
            <p className="wuf13-fpm__text">Got it. I'll be in touch.</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default Wuf13FirstPinModal
