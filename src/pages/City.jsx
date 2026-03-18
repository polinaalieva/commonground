import { useParams } from 'react-router-dom'
import Header from '../components/Header'
import Map from '../components/Map'
import CityNotFound from '../components/CityNotFound'

const CITY_CONFIGS = {
  world: {
    center: [12, 20],
    zoom: 1.5,
    country: null
  },
  london: {
    bbox: [[-0.55, 51.25], [0.35, 51.75]],
    country: "gb",
    center: [-0.1276, 51.5072],
    zoom: 9
  },
  london_camberwell: {
    bbox: [[-0.55, 51.25], [0.35, 51.75]],
    country: "gb",
    center: [-0.0875, 51.4735],
    zoom: 14
  },
  newyork: {
    bbox: [[-74.30, 40.45], [-73.65, 40.95]],
    country: "us",
    center: [-74.0060, 40.7128],
    zoom: 10
  },
  sanfrancisco: {
    bbox: [[-123.00, 37.55], [-122.30, 37.93]],
    country: "us",
    center: [-122.4194, 37.7749],
    zoom: 11
  },
  moscow: {
    bbox: [[36.80, 55.45], [38.20, 56.10]],
    country: "ru",
    center: [37.6176, 55.7558],
    zoom: 10
  },
  bucharest: {
    bbox: [[25.94, 44.34], [26.30, 44.54]],
    country: "ro",
    center: [26.1025, 44.4268],
    zoom: 11
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
      <Header />
      <div className="cg-city-map-wrapper">
        <Map city={city} config={config} />
      </div>
    </div>
  )
}

export default City