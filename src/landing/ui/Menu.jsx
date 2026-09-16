import { useState, useRef, useEffect } from 'react'
import { Menu as MenuIcon } from 'lucide-react'
import './Menu.css'

const Menu = ({ items }) => {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    const handleEscape = e => {
      if (e.key === 'Escape' && ref.current?.contains(document.activeElement)) {
        setOpen(false)
        ref.current.querySelector('button')?.focus()
      }
    }
    document.addEventListener('keydown', handleEscape)
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [])

  return (
    <div className="menu" ref={ref}>
      <button type="button" aria-expanded={open} className="menu-trigger" onClick={() => setOpen(o => !o)} aria-label="Open menu">
        <MenuIcon size={22} />
      </button>
      {open && (
        <div className="menu-dropdown">
          {items.map((item, i) => (
            <button key={i} className="menu-item text-reg-small" onClick={() => { item.onClick?.(); setOpen(false) }} {...(item.extraProps || {})}>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default Menu
