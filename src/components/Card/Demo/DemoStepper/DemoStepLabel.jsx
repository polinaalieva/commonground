import './DemoStepLabel.css'

/**
 * One clickable step row. Plain text — no numbers, no icons.
 */
function DemoStepLabel({ label, active, onClick }) {
  return (
    <button
      type="button"
      className={`demo-step-label ${active ? 'demo-step-label--active' : ''}`}
      onClick={onClick}
      aria-current={active ? 'step' : undefined}
    >
      {label}
    </button>
  )
}

export default DemoStepLabel
