import { useId, useState } from 'react'
import { ChevronDown } from 'lucide-react'
import './Accordion.css'

export default function Accordion({ items }) {
  const id = useId()
  const [openIndexes, setOpenIndexes] = useState(new Set())
  const toggle = index => setOpenIndexes(previous => {
    const next = new Set(previous)
    if (next.has(index)) next.delete(index)
    else next.add(index)
    return next
  })
  return <div className="accordion">{items.map((item, index) => <div className="accordion-item" key={item.title}><div className="accordion-border" /><h3><button type="button" id={`${id}-button-${index}`} className="accordion-btn" aria-expanded={openIndexes.has(index)} aria-controls={`${id}-panel-${index}`} onClick={() => toggle(index)}><span className="h3">{item.title}</span><ChevronDown aria-hidden="true" className={`accordion-icon ${openIndexes.has(index) ? 'open' : ''}`} size={16} color="var(--color-grey-light)" strokeWidth={2} /></button></h3><div id={`${id}-panel-${index}`} role="region" aria-labelledby={`${id}-button-${index}`} className={`accordion-body ${openIndexes.has(index) ? 'open' : ''}`} aria-hidden={!openIndexes.has(index)}><p className="landing-accordion-description text-grey">{item.body}</p></div></div>)}<div className="accordion-border" /></div>
}
