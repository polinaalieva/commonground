import Button_Card from '../ui/Button_Card'
import './DemoButtons.css'

/**
 * Back / Next→Done controls for the demo card.
 * Fixed width (106x40) so the layout doesn't shift when Next becomes Done.
 *
 * @param {boolean} canGoBack - false on the first step (Back hidden)
 * @param {boolean} isLast    - Next becomes Done
 * @param {() => void} onBack
 * @param {() => void} onNext
 * @param {() => void} onDone
 */
function DemoButtons({ canGoBack, isLast, onBack, onNext, onDone }) {
  return (
    <div className={`demo-buttons ${canGoBack ? '' : 'demo-buttons--single'}`}>
      {canGoBack && (
        <Button_Card
          variant="secondary"
          className="demo-btn demo-btn--secondary"
          onClick={onBack}
        >
          Back
        </Button_Card>
      )}
      <Button_Card
        variant="primary"
        className="demo-btn demo-btn--primary"
        onClick={isLast ? onDone : onNext}
      >
        {isLast ? 'Done' : 'Next'}
      </Button_Card>
    </div>
  )
}

export default DemoButtons
