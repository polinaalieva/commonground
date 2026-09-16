// src/components/ui/ButtonText.jsx
import './ButtonText.css'

const ButtonText = ({ children, onClick, ...rest }) => {
  return (
    <button className="btn-text text-reg-small" onClick={onClick} {...rest}>
      {children}
    </button>
  )
}

export default ButtonText