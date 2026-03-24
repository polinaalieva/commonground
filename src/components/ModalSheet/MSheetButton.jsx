import { useState } from 'react'

function MSheetButton({ children, onClick, type = 'primary', disabled = false, loadingText }) {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = async () => {
    if (disabled || isLoading || !onClick) return
    if (loadingText) {
      setIsLoading(true)
      await new Promise(r => setTimeout(r, 800))
      setIsLoading(false)
    }
    onClick()
  }

  return (
    <button
      className={[
        'msheet-button',
        `msheet-button--${type}`,
        (disabled || isLoading) ? 'msheet-button--disabled' : ''
      ].join(' ').trim()}
      onClick={handleClick}
      disabled={disabled || isLoading}
    >
      {isLoading ? loadingText : children}
    </button>
  )
}

export default MSheetButton