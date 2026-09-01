import './Button_Card.css'

/**
 * Shared button for the Card/* family.
 * NOTE: named Button_Card (not Button) — src/components/ui/Button.jsx is a
 * different family and the names must not collide.
 *
 * @param {'primary'|'secondary'} [variant]
 * @param {boolean} [disabled]
 */
function Button_Card({ variant = 'primary', disabled = false, onClick, className = '', children, ...rest }) {
  return (
    <button
      type="button"
      className={['btn-card', `btn-card--${variant}`, className].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
      {...rest}
    >
      {children}
    </button>
  )
}

export default Button_Card
