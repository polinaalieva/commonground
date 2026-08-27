import Header from '../../components/Landing/Header'
import LegalPage from './LegalPage'
import '../Home.css'

export default function PrivacyPolicyPage() {
  return (
    <div className="cg-landing legal-page">
      <Header />
      <LegalPage domain="commonground" slug="privacy" />
    </div>
  )
}