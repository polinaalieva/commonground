import Header from '../sections/Header'
import LegalPage from './LegalPage'
import '../styles/landing.css'

export default function PrivacyPolicyPage() {
  return (
    <div className="cg-landing legal-page">
      <Header />
      <LegalPage domain="commonground" slug="privacy" />
    </div>
  )
}