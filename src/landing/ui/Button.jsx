import './Button.css'
import { createElement } from 'react'

const Button = ({ children, as: Component = 'button', variant = 'black', shadow = false, className = '', ...rest }) => (
  createElement(Component, { className: `btn btn-${variant} ${shadow ? 'btn-shadow' : ''} text-reg ${className}`, ...rest }, <span className="btn-label">{children}</span>)
)
export default Button
