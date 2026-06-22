// src/pages/City.jsx

import Map from '../components/Map'
import { CITY_CONFIGS } from '../config/cities'
import { Navigate } from 'react-router-dom'
import { SURVEY_CONTENT } from '../config/content-survey'
import { usePageParams } from '../hooks/usePageParams'
import posthog from 'posthog-js'

function City() {
  const { city, lang, variant, source } = usePageParams()
  const config = CITY_CONFIGS[city]
  const content = SURVEY_CONTENT

  posthog.capture('city_opened', { city, variant, lang, source })

  if (!config) {
    return <Navigate to="/map" replace />
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