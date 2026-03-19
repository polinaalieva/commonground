import { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp } from 'lucide-react'

function SheetDropdown({ label, placeholder = 'Select option', options = [], value, onChange, disabled }) {
  const [isOpen, setIsOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handleClickOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedLabel = options.find(o => o.value === value)?.label || null

  return (
    <div className={`sheet-dropdown${disabled ? ' sheet-dropdown--disabled' : ''}`} ref={ref}>
      {label && <p className="sheet-dropdown__label">{label}</p>}

      <button
        className={`sheet-dropdown__trigger${isOpen ? ' sheet-dropdown__trigger--open' : ''}${selectedLabel ? ' sheet-dropdown__trigger--selected' : ''}`}
        onClick={() => !disabled && setIsOpen(o => !o)}
        type="button"
        disabled={disabled}
      >
        <span className={`sheet-dropdown__value${!selectedLabel ? ' sheet-dropdown__value--placeholder' : ''}`}>
          {selectedLabel || placeholder}
        </span>
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {isOpen && (
        <div className="sheet-dropdown__list">
          {options.map(opt => (
            <button
              key={opt.value}
              className={`sheet-dropdown__option${opt.value === value ? ' sheet-dropdown__option--selected' : ''}`}
              onClick={() => {
                onChange(opt.value)
                setIsOpen(false)
              }}
              type="button"
            >
              {opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default SheetDropdown