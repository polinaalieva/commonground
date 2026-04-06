import { useParams } from 'react-router-dom'
import Header from '../components/Header'
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
    <div>
      <Header isMap />
      <div className="cg-city-map-wrapper">
        <Map 
            city={city}
            cityConfig={config}      //← из cities.js, настройки карты
            pageContent={content}    // ← из content.js, тексты
            variant={variant}        // ← из URL (?v=)
            source={source}          // ← из URL (utm_source=)
            lang={lang}              // ← из URL (/ru/)
        />
      </div>
    </div>
  )
}

export default City