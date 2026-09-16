import './WhatYouCanDo.css'
import Accordion from '../ui/Accordion'

const features = [
  { title: 'Share your experience', body: 'Leave feedback about a place directly on the map.' },
  { title: 'Explore other experiences', body: 'See what people say about places, neighborhoods, and the city around you.' },
  { title: 'Understand areas better', body: 'Learn how different neighborhoods and parts of the city are experienced by people.' },
  { title: 'Compare places', body: 'Explore differences between areas based on people’s experiences.' },
]

export default function WhatYouCanDo() {
  return (
    <section className="landing-features" aria-labelledby="landing-features-title">
          <h2 className="h2" id="landing-features-title">What can you do?</h2>
          <Accordion items={features} />
        </section>
  )
}
