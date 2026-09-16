// src/components/ui/CardB.jsx
import './CardB.css'
import Button from './Button'

const CardB = ({ tier, price, priceIcon, onRequest, onClick }) => {
  return (
    <div className="cardb">
      <div className="cardb-text">
        <span className="cardb-tier">{tier}</span>
        <span className="cardb-price">
          {priceIcon && <img src={priceIcon} alt="AMD" className="cardb-currency-icon" />}
          {price}
        </span>
      </div>
      <Button variant="white" onClick={onClick}>
        {onRequest ? 'Get in touch' : 'Send a request'}
      </Button>
    </div>
  )
}

export default CardB
