import './Footer.css'
import { Link } from 'react-router-dom'

export default function Footer() {
  return <footer className="landing-footer text-small-grey"><div className="landing-footer-brand"><Link className="h4" to="/about">Common Ground</Link><p>A shared map where people mark places and share how they experience them. From city streets to event venues.</p></div><div className="landing-footer-contact"><h3 className="h5">Contact us</h3><a href="tel:+44504722272">+44 50 472 2272</a><a href="mailto:hi@commonground.page">hi@commonground.page</a></div><div className="landing-footer-social"><h3 className="h5">Follow us</h3><a href="https://www.linkedin.com/company/121073922/" target="_blank" rel="noopener noreferrer">LinkedIn</a></div><p className="landing-copyright">© 2026 Common Ground</p><div className="landing-footer-legal"><Link to="/legal/terms-of-use">Terms of Service</Link><span> · </span><Link to="/legal/privacy-policy">Privacy Policy</Link><span> · </span><Link to="/legal/content-rules">Content Rules</Link></div></footer>
}
