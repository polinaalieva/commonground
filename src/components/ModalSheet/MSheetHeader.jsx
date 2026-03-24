import { X } from 'lucide-react'

function MSheetHeader({ title, onClose }) {
  return (
    <div className="msheet-header">
      <div className="msheet-header__left" />

      <div className="msheet-header__center">
        <h2 className="msheet-header__title">{title}</h2>
      </div>

      <div className="msheet-header__right">
        {onClose && (
          <button className="msheet-header__btn" onClick={onClose}>
            <X size={14} />
          </button>
        )}
      </div>
    </div>
  )
}

export default MSheetHeader