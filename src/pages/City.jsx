import { useParams } from 'react-router-dom'
import Map from '../components/Map'
import CityNotFound from '../components/CityNotFound'

const CITY_CONFIGS = {
  london: {
    bbox: [[-0.55, 51.25], [0.35, 51.75]],
    center: [-0.1276, 51.5072],
    zoom: 9
  },
  berlin: {
    bbox: [[13.09, 52.34], [13.76, 52.68]],
    center: [13.4050, 52.5200],
    zoom: 10
  },
  nyc: {
    bbox: [[-74.30, 40.45], [-73.65, 40.95]],
    center: [-74.0060, 40.7128],
    zoom: 10
  }
}

function City() {
  const { city } = useParams()
  const config = CITY_CONFIGS[city]

  if (!config) {
    return <CityNotFound />
  }

  return (
    <div>
      <Map city={city} config={config} />
    </div>
  )
}

export default City