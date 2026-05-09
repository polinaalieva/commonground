import { useState, useEffect } from 'react'

export function useToast() {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState(null)

  function showToast(data) {
    setMessage(data)
    setVisible(true)
  }

  useEffect(() => {
    if (!visible) return
    const t = setTimeout(() => setVisible(false), 3000)
    return () => clearTimeout(t)
  }, [visible, message])

  return {
    showToast,
    toastProps: { message, visible, onHide: () => setVisible(false) },
  }
}
