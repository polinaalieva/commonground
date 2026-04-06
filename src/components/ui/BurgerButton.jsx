import './BurgerButton.css'

function BurgerButton({ isOpen, onClick }) {
  return (
    <button
      className={`cg-burger ${isOpen ? 'cg-burger--open' : ''}`}
      onClick={onClick}
      aria-label="Menu"
    >
      {isOpen ? (
        <svg width="14" height="14" viewBox="0 0 18 18" fill="none">
  <line x1="2" y1="2" x2="16" y2="16" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
  <line x1="16" y1="2" x2="2" y2="16" stroke="#111" strokeWidth="2" strokeLinecap="round"/>
</svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
          <line x1="2" y1="6" x2="16" y2="6" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
          <line x1="2" y1="12" x2="16" y2="12" stroke="#111" strokeWidth="1.8" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  )
}

export default BurgerButton