import { useEffect, useRef } from 'react'

export function useOverflow() {
  const ref = useRef(null)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const check = () => {
      el.classList.toggle('has-overflow', el.scrollHeight > el.clientHeight)
    }

    check()
    const ro = new ResizeObserver(check)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  return ref
}
