import { Link } from 'react-router-dom'
import { IconBrandAppleFilled, IconBrandAndroid } from '@tabler/icons-react'
import Button from '../ui/Button'
import PhoneMap from '../ui/PhoneMap'
import './Hero.css'

export default function Hero() {
  return (
    <section className="landing-hero" aria-labelledby="landing-title">
      <h1 className="h1" id="landing-title">A shared map of how people experience places</h1>
      <p className="landing-intro text-reg">
        <span>Share your experience<span className="landing-mobile-period">.</span></span>{' '}
        <span>Explore&nbsp;others</span>{' '}
        <span>Understand cities better</span>
      </p>
      <div className="landing-actions">
        <Button as={Link} shadow className="landing-explore" to="/map">
          <span className="landing-explore-desktop">Explore map</span>
          <span className="landing-explore-mobile">Explore</span>
        </Button>
        <p className="landing-coming text-small-grey">
          Coming soon
          <IconBrandAppleFilled size={18} aria-label="iOS" />
          <IconBrandAndroid size={18} aria-label="Android" />
        </p>
      </div>
      <PhoneMap />
    </section>
  )
}
