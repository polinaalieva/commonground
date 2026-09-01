import './Gap.css'

const ALLOWED = [8, 16, 24, 32]

/**
 * Vertical (or horizontal) spacer for the Card/* family.
 * @param {8|16|24|32} size
 * @param {boolean} [horizontal]
 */
function Gap({ size = 16, horizontal = false }) {
  const value = ALLOWED.includes(size) ? size : 16
  return (
    <div
      className="card-gap"
      style={horizontal ? { width: value } : { height: value }}
      aria-hidden="true"
    />
  )
}

export default Gap
