import { Link, useLocation } from 'react-router-dom'
import Header from '../sections/Header'
import Footer from '../sections/Footer'
import '../styles/landing.css'
import './Legal.css'

// Статичный список: slug в Supabase (terms) не совпадает с адресом (terms-of-use)
const DOCUMENTS = [
  { title: 'Terms of Use', path: '/legal/terms-of-use' },
  { title: 'Privacy Policy', path: '/legal/privacy-policy' },
  { title: 'Content Rules', path: '/legal/content-rules' },
]

export default function LegalIndexPage() {
  const { pathname } = useLocation()
  const prefix = pathname.startsWith('/ru') ? '/ru' : ''

  return (
    <div className="cg-landing legal-page">
      <Header />
      <div className="legal-content">
        <h1 className="h1">Legal</h1>
        <ul className="legal-index">
          {DOCUMENTS.map(({ title, path }) => (
            <li key={path}>
              <Link to={`${prefix}${path}`}>{title}</Link>
            </li>
          ))}
        </ul>
      </div>
      <Footer />
    </div>
  )
}
