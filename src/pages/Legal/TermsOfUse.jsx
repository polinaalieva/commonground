import Header from '../../components/Header'
import LegalPage from '../../components/Legal/LegalPage'
import '../Home.css'

export default function TermsOfUsePage() {
  return (
    <div className="cg-landing">
      <Header />
      <LegalPage domain="commonground" slug="terms" />
    </div>
  )
}