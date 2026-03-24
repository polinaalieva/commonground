function BottomSheet({ children, variant = 'default', hidden = false }) {
  return (
    <div className={`bottom-sheet bottom-sheet--${variant}${hidden ? ' bottom-sheet--hidden' : ''}`}>
      {children}
    </div>
  )
}

export default BottomSheet