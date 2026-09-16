import Button from '../ui/Button'
import './UrbanDecisionMakers.css'

export default function UrbanDecisionMakers() {
  return (
    <section className="landing-urban" aria-labelledby="landing-urban-title">
      <h2 className="h2" id="landing-urban-title">For urban decision-makers</h2>
      <div className="landing-urban-content">
        <div className="landing-urban-text">
          <p className="text-reg">
            We’re exploring how continuously shared, location-based experiences
            can help better inform urban decisions.
          </p>
          <p className="text-reg">
            Have a project, problem or idea?<br />
            We’d love to hear about it.
          </p>
        </div>
        <Button as="a" shadow href="mailto:urban@commonground.page">
          Get in touch
        </Button>
      </div>
    </section>
  )
}
