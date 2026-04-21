import { useEffect, useState } from 'react'
import { MapPin } from 'lucide-react'
import './Wuf13PinCard.css'

export function Wuf13PinCard({ pin, onDismiss }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (!pin) return
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
        <p className="wuf-card__comment">{pin.experience.length > 600 ? pin.experience.slice(0, 600) + '…' : pin.experience}</p>
      )}
      {location && (
        <div className="wuf-card__meta">
          <MapPin size={14} color="rgba(17,17,17,0.5)" strokeWidth={1.5} />
          {location}
        </div>
      )}
    </div>
  )
}