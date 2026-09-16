import Header from '../sections/Header'
import LegalPage from './LegalPage'
import '../styles/landing.css'

export default function ContentRulesPage() {
  return (
    <div className="cg-landing legal-page">
      <Header />
      <LegalPage domain="commonground" slug="content-rules" />
    </div>
  )
}