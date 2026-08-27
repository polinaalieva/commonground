// src/components/Landing/Footer.jsx
import { Link } from 'react-router-dom'
import './Footer.css'

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-row-1">
        <div className="footer-left">
          <span className="h4">Common Ground</span>
          <p className="text-small-grey">A platform where people mark places and share how they experience&nbsp;them. From city streets to event venues.</p>
        </div>
        <div className="footer-right">
          <div className="footer-col">
            <span className="h5">Contact us</span>
            <p className="text-small-grey">
              <a href="mailto:hi@commonground.page">hi@commonground.page</a>
            </p>
            <p className="text-small-grey">
              <a href="tel:+37498789349">+374 98 789349</a>
            </p>
          </div>
          <div className="footer-col">
            <span className="h5">Follow us</span>
            <p className="text-small-grey">
              <a href="https://www.linkedin.com/company/121073922/" target="_blank" rel="noopener noreferrer">LinkedIn</a>
            </p>
          </div>
        </div>
      </div>
      <div className="footer-row-2">
        <div className="footer-left">
          <p className="text-small-grey">© 2026 Common Ground</p>
        </div>
        <div className="footer-right">
          <p className="text-small-grey">
            <Link to="/legal/terms-of-use">Terms of Use</Link> • <Link to="/legal/privacy-policy">Privacy Policy</Link> • <Link to="/legal/terms-of-use#user-generated-content-rules">Content Rules</Link>
          </p>
        </div>
      </div>
    </footer>
  )
}

export default Footer
