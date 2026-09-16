// src/components/ui/CardW.jsx
import './CardW.css'

const CardW = ({ number, title, body }) => {
  return (
    <div className="cardw">
      <span className="text-grey-bold">{number}</span>
      <span className="h3">{title}</span>
      <span className="text-grey">{body}</span>
    </div>
  )
}

export default CardW