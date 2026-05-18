import { Search, X } from 'lucide-react'
import { useRef, useState, useEffect } from 'react'
import { createPortal } from 'react-dom'

function SheetAddress({ value, onChange, onKeyDown, onClear, suggestions = [], onSelectSuggestion, error = false, placeholder = 'Search address' }) {
  const fieldRef = useRef(null)
  const [dropdownStyle, setDropdownStyle] = useState(null)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    if (suggestions.length > 0 && fieldRef.current) {
      const rect = fieldRef.current.getBoundingClientRect()
      const viewportHeight = window.visualViewport?.height ?? window.innerHeight
      const spaceBelow = viewportHeight - rect.bottom
      const dropdownHeight = suggestions.length * 52 + 8

      if (spaceBelow >= dropdownHeight) {
        setDropdownStyle({
          position: 'fixed',
          top: rect.bottom + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        })
      } else {
        setDropdownStyle({
          position: 'fixed',
          bottom: viewportHeight - rect.top + 4,
          left: rect.left,
          width: rect.width,
          zIndex: 9999,
        })
      }
    } else {
      setDropdownStyle(null)
    }
  }, [suggestions])

  return (
    <div className="sheet-address">
      <label className="sheet-address__label">Address</label>
      <div className={`sheet-address__field${error ? ' sheet-address__field--error' : ''}`} ref={fieldRef}>
        <Search size={14} className="sheet-address__icon" />
        <input
          className="sheet-address__input"
          type="text"
          value={value}
          onChange={onChange}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
        />
        {isFocused && value.length > 0 && (
          <button
            className="sheet-address__clear"
            onMouseDown={(e) => { e.preventDefault(); onClear?.() }}
            onTouchEnd={(e) => { e.preventDefault(); onClear?.() }}
            tabIndex={-1}
          >
            <X size={12} />
          </button>
        )}
      </div>
      {error && (
        <p className="sheet-address__error">Address not found</p>
      )}
      {dropdownStyle && suggestions.length > 0 && createPortal(
        <ul className="sheet-address__suggestions" style={dropdownStyle}>
          {suggestions.map((f) => (
            <li
              key={f.id}
              className="sheet-address__suggestion"
              onMouseDown={() => onSelectSuggestion?.(f)}
              onTouchStart={() => onSelectSuggestion?.(f)}
            >
              {f.place_name}
            </li>
          ))}
        </ul>,
        document.body
      )}
    </div>
  )
}

export default SheetAddress
