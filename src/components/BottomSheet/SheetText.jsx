function SheetText({ children, center }) {
  return (
    <p className={`sheet-text${center ? ' sheet-text--center' : ''}`}>
      {children}
    </p>
  )
}

export default SheetText