import { Link } from 'react-router-dom'
import './CgBtn.css'
 
function CgButton({ children, to, onClick, className = '' }) {
  if (to) {
    return (
      <Link className={`cg-btn ${className}`} to={to}>
        {children}
      </Link>
    )
  }
 
  return (
    <button className={`cg-btn ${className}`} onClick={onClick}>
      {children}
    </button>
  )
}
 
export default CgButton
 