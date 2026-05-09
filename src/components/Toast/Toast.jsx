import './Toast.css'

export function Toast({ message, visible }) {
  if (!message) return null

  const shortUrl = message.url?.replace('https://', '')

  return (
    <div className={`toast-card ${visible ? 'toast-card--visible' : ''}`}>
      <span className="toast-check">Copied ✓</span>
      <span className="toast-text">{message.text}</span>
      <span className="toast-url">{shortUrl}</span>
    </div>
  )
}
