import Header from '../../components/Header'
import LegalPage from '../../components/Legal/LegalPage'
import '../Home.css'

export default function ContentRulesPage() {
  return (
    <div className="cg-landing">
      <Header />
      <LegalPage domain="commonground" slug="content-rules" />
    </div>
  )
}