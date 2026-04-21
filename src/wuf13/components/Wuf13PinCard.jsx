import { useEffect, useState } from 'react'
import './Wuf13PinCard.css'

export function Wuf13PinCard({ pin, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pin) return
    // Small delay for enter animation
    const t = setTimeout(() => setVisible(true), 30)
    return () => clearTimeout(t)
  }, [pin])

  if (!pin) return null

  const location = [pin.country_name, pin.city_name].filter(Boolean).join(', ')

  return (
    <div className={`wuf-card ${visible ? 'wuf-card--visible' : ''}`}>
      {pin.ratingLabel && (
        <div className="wuf-card__rating" style={{ color: pin.ratingColor }}>
          {pin.ratingLabel}
        </div>
      )}
      {pin.experience && (
        <p className="wuf-card__comment">{pin.experience}</p>
      )}
      {location && (
        <div className="wuf-card__meta">
          <span
            className="wuf-card__dot"
            style={{ background: pin.ratingColor }}
          />
          {location}
        </div>
      )}
    </div>
  )
}
