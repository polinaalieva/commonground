import { Search } from 'lucide-react'
import { useState } from 'react'

function SheetAddress({ value, onChange, placeholder = 'Search address' }) {
  const [isEditing, setIsEditing] = useState(false)

  return (
    <div className="sheet-address">
      <label className="sheet-address__label">Address</label>
      <div className="sheet-address__field">
        <Search size={14} className="sheet-address__icon" />
        <input
          className="sheet-address__input"
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          readOnly={!isEditing}
          onFocus={() => setIsEditing(true)}
          onBlur={() => setIsEditing(false)}
        />
      </div>
    </div>
  )
}

export default SheetAddress