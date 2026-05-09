import { useCallback, useRef } from 'react'

export function useOverflow() {
  const cleanupRef = useRef(null)

  const ref = useCallback((el) => {
    cleanupRef.current?.()
    cleanupRef.current = null

    if (!el) return

    const check = () => {
      el.classList.toggle('has-overflow', el.scrollHeight > el.clientHeight)
    }

    check()

    const ro = new ResizeObserver(check)
    ro.observe(el)

    const mo = new MutationObserver(check)
    mo.observe(el, { childList: true, subtree: true, characterData: true })

    cleanupRef.current = () => {
      ro.disconnect()
      mo.disconnect()
    }
  }, [])

  return ref
}
