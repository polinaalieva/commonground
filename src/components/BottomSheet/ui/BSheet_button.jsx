import './BSheet_button.css'

function BSheet_button({ children, onClick, disabled, loading, variant = 'primary', width = 'fixed' }) {
  const isDisabled = disabled || loading

  return (
    <button
      className={[
        'sheet-button',
        `sheet-button--${variant}`,
        `sheet-button--${width}`,
        isDisabled ? 'sheet-button--disabled' : '',
      ].filter(Boolean).join(' ')}
      onClick={onClick}
      disabled={isDisabled}
      type="button"
    >
      {loading ? 'Saving' : children}
    </button>
  )
}

export default BSheet_button

