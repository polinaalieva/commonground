import { forwardRef } from 'react'

const BottomSheet = forwardRef(function BottomSheet({ children, variant = 'default', hidden = false }, ref) {
  return (
    <div ref={ref} className={`bottom-sheet bottom-sheet--${variant}${hidden ? ' bottom-sheet--hidden' : ''}`}>
      {children}
    </div>
  )
})

export default BottomSheet