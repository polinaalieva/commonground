import './styles/landing.css'
import './Home.css'
import Header from './sections/Header'
import Hero from './sections/Hero'
import WhatYouCanDo from './sections/WhatYouCanDo'
import UrbanDecisionMakers from './sections/UrbanDecisionMakers'
import Footer from './sections/Footer'

export default function Home() {
  return (
    <div className="cg-landing">
      <Header />
      <main className="landing-main">
        <Hero />
        <WhatYouCanDo />
        <UrbanDecisionMakers />
      </main>
      <Footer />
    </div>
  )
}
