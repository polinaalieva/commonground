import Wuf13ViewPage from './wuf13/pages/Wuf13ViewPage'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'
import Dev from './pages/Dev.jsx'
import QRPage from './pages/QRpage/QRPage'

function App() {
  return (
    <Routes>
      {/* Главная → мировая карта */}
      <Route path="/" element={<City />} />
      <Route path="/ru" element={<City />} />

      {/* /map → редирект на / */}
      <Route path="/map" element={<Navigate to="/" replace />} />
      <Route path="/ru/map" element={<Navigate to="/ru" replace />} />

      {/* Лендинг переехал на /about */}
      <Route path="/about" element={<Home />} />
      <Route path="/ru/about" element={<Home />} />

      {/* Города */}
      <Route path="/:city" element={<City />} />
      <Route path="/ru/:city" element={<City />} />

      {/* Остальное */}
      <Route path="/qr" element={<QRPage />} />
      <Route path="/ru/qr" element={<QRPage />} />
      <Route path="/dev" element={<Dev />} />
      <Route path="/wuf13view" element={<Wuf13ViewPage />} />
    </Routes>
  )
}

export default App