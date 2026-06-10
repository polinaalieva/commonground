import Wuf13ViewPage from './wuf13/pages/Wuf13ViewPage'
import Wuf13DashboardPage from './wuf13/pages/Wuf13DashboardPage'
import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'
import EventPage from './events/pages/EventPage'
import Dev from './pages/Dev.jsx'
import QRPage from './pages/QRpage/QRPage'

function App() {
  return (
    <Routes>
      {/* Event → карта ивентов */}
      <Route path="/event/:eventId" element={<EventPage />} />
      <Route path="/ru/event/:eventId" element={<EventPage />} />


      {/* Главная → мировая карта */}
      <Route path="/" element={<City />} />
      <Route path="/ru" element={<City />} />

      {/* /map → рендерим напрямую чтобы не стрипать query params (deep links) */}
      <Route path="/map" element={<City />} />
      <Route path="/ru/map" element={<City />} />

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
      <Route path="/wuf13dashboard" element={<Wuf13DashboardPage />} />
    </Routes>
    
  )
}

export default App