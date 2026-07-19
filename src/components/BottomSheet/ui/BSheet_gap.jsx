import './BSheet_gap.css'

function BSheet_gap({ size = 16, horizontal = false }) {
  return (
    <div
      className="sheet-gap"
      style={horizontal ? { width: size } : { height: size }}
      aria-hidden="true"
    />
  )
}

export default BSheet_gap