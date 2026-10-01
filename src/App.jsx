import { Routes, Route, Navigate } from 'react-router-dom'
import Home from './landing/Home.jsx'
import City from './pages/City.jsx'
import EventPage from './events/pages/EventPage'
import Dev from './pages/Dev.jsx'
import TermsOfUse from './landing/legal/TermsOfUse.jsx'
import PrivacyPolicy from './landing/legal/PrivacyPolicy.jsx'
import ContentRules from './landing/legal/ContentRules.jsx'
import LegalIndex from './landing/legal/LegalIndex.jsx'

function App() {
  return (
    <Routes>
      {/* Event → карта ивентов */}
      <Route path="/event/:eventId" element={<EventPage />} />
      <Route path="/ru/event/:eventId" element={<EventPage />} />

      <Route path="/event" element={<Navigate to="/map" replace />} />
      <Route path="/ru/event" element={<Navigate to="/ru/map" replace />} />

      {/* Главная → лендинг */}
      <Route path="/" element={<Home />} />
      <Route path="/ru" element={<Navigate to="/ru/map" replace />} />

      {/* /about переехал на главную (в проде редиректит Vercel, здесь — для локальной разработки) */}
      <Route path="/about" element={<Navigate to="/" replace />} />
      <Route path="/ru/about" element={<Navigate to="/" replace />} />

      {/* /map → рендерим напрямую чтобы не стрипать query params (deep links) */}
      <Route path="/map" element={<City />} />
      <Route path="/ru/map" element={<City />} />

      {/* Legal */}
      <Route path="/legal" element={<LegalIndex />} />
      <Route path="/ru/legal" element={<LegalIndex />} />
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
      <Route path="/dev" element={<Dev />} />
    </Routes>
    
  )
}

export default App