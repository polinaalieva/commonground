import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import './DemoNav.css'

/**
 * Arrow navigation for the demo card — sits at the bottom of the right column.
 * Both buttons are always rendered so the layout never shifts.
 *
 * - Back (‹): disabled + semi-transparent on the first step
 * - Forward (›): becomes a close (✕) button on the last step
 *
 * @param {boolean} canGoBack
 * @param {boolean} isLast
 * @param {() => void} onBack
 * @param {() => void} onNext
 * @param {() => void} onClose
 */
function DemoNav({ canGoBack, isLast, onBack, onNext, onClose }) {
  return (
    <div className="demo-nav">
      <button
        type="button"
        className="demo-nav__btn demo-nav__btn--secondary"
        onClick={onBack}
        disabled={!canGoBack}
        aria-label="Back"
      >
        <ChevronLeft size={20} />
      </button>
      <button
        type="button"
        className="demo-nav__btn demo-nav__btn--primary"
        onClick={isLast ? onClose : onNext}
        aria-label={isLast ? 'Close' : 'Next'}
      >
        {isLast ? <X size={20} /> : <ChevronRight size={20} />}
      </button>
    </div>
  )
}

export default DemoNav
