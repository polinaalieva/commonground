// src/pages/City.jsx

import Map from '../components/Map'
import CityNotFound from '../components/CityNotFound'
import { CITY_CONFIGS } from '../config/cities'
import { CONTENT } from '../config/content'
import { usePageParams } from '../hooks/usePageParams'
import posthog from 'posthog-js'

function City() {
  const { city, lang, variant, source } = usePageParams()
  const config = CITY_CONFIGS[city]
  const content = CONTENT.map[variant]?.[lang] ?? CONTENT.map['belonging']['en']

  posthog.capture('city_opened', { city, variant, lang, source })

  if (!config) {
    return <CityNotFound />
  }

  return (
    <Map
      city={city}
      cityConfig={config}
      pageContent={content}
      variant={variant}
      source={source}
      lang={lang}
    />
  )
}

export default City