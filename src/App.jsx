import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'
import EventPage from './events/pages/EventPage'
import Dev from './pages/Dev.jsx'
import QRPage from './pages/QRpage/QRPage'
import TermsOfUse from './pages/Legal/TermsOfUse.jsx'
import PrivacyPolicy from './pages/Legal/PrivacyPolicy.jsx'
import ContentRules from './pages/Legal/ContentRules.jsx'

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

      {/* Лендинг*/}
      <Route path="/about" element={<Home />} />
      <Route path="/ru/about" element={<Home />} />

      {/* Legal */}
      <Route path="/legal/terms-of-use" element={<TermsOfUse />} />
      <Route path="/ru/legal/terms-of-use" element={<TermsOfUse />} />
      <Route path="/legal/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/ru/legal/privacy-policy" element={<PrivacyPolicy />} />
      <Route path="/legal/content-rules" element={<ContentRules />} />
      <Route path="/ru/legal/content-rules" element={<ContentRules />} />

      {/* Города */}
      <Route path="/:city" element={<City />} />
      <Route path="/ru/:city" element={<City />} />

      {/* Остальное */}
      <Route path="/qr" element={<QRPage />} />
      <Route path="/ru/qr" element={<QRPage />} />
      <Route path="/dev" element={<Dev />} />
    </Routes>
    
  )
}

export default App