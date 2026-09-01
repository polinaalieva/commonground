/**
 * Custom "i" glyph for the demo trigger button.
 * Not lucide's <Info/> — that has different proportions.
 * Intrinsic size 2.01 x 10.
 */
function InfoIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="2.01"
      height="10"
      viewBox="0 0 2 10"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M1 4C1.55228 4 2 4.44772 2 5V9C2 9.55228 1.55228 10 1 10C0.447715 10 0 9.55228 0 9V5C0 4.44772 0.447715 4 1 4ZM1.00977 0C1.56205 0 2.00977 0.447715 2.00977 1C2.00977 1.55228 1.56205 2 1.00977 2H1C0.447715 2 0 1.55228 0 1C0 0.447715 0.447715 0 1 0H1.00977Z"
        fill="currentColor"
      />
    </svg>
  )
}

export default InfoIcon
