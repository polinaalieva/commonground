function BottomSheet({ children, variant = 'default' }) {
  return (
    <div className={`bottom-sheet bottom-sheet--${variant}`}>
      {children}
    </div>
  )
}

export default BottomSheet