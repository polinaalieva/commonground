import { X, ChevronLeft } from 'lucide-react'

function SheetHeader({ title, subtitle, onBack, onClose }) {
  return (
    <div className="sheet-header">

      <div className="sheet-header__left">
        {onBack && (
          <button className="sheet-header__btn" onClick={onBack}>
            <ChevronLeft size={14} />
          </button>
        )}
      </div>

      <div className="sheet-header__center">
        <h2 className="sheet-header__title">{title}</h2>
        {subtitle && (
          <p className="sheet-header__subtitle">{subtitle}</p>
        )}
      </div>

      <div className="sheet-header__right">
        {onClose && (
          <button className="sheet-header__btn" onClick={onClose}>
            <X size={14} />
          </button>
        )}
      </div>

    </div>
  )
}

export default SheetHeader