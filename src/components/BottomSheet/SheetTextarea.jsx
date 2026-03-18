function SheetTextarea({ label, placeholder, value, onChange, disabled }) {
  return (
    <div className={`sheet-textarea ${disabled ? 'sheet-textarea--disabled' : ''}`}>
      <label className="sheet-textarea__label">{label}</label>
      <div className="sheet-textarea__field">
        <textarea
          className="sheet-textarea__input"
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          disabled={disabled}
        />
      </div>
    </div>
  )
}

export default SheetTextarea