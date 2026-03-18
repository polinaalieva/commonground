function SheetButton({ children, onClick, disabled, loading, variant = 'primary' }) {
  return (
    <button
      className={`sheet-button sheet-button--${variant} ${disabled || loading ? 'sheet-button--disabled' : ''}`}
      onClick={onClick}
      disabled={disabled || loading}
    >
      {loading ? 'Saving' : children}
    </button>
  )
}

export default SheetButton