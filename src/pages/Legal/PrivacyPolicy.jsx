import Header from '../../components/Header'
import LegalPage from '../../components/Legal/LegalPage'
import '../Home.css'

export default function PrivacyPolicyPage() {
  return (
    <div className="cg-landing">
      <Header />
      <LegalPage domain="commonground" slug="privacy" />
    </div>
  )
}