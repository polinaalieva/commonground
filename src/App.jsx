import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'
import Dev from './pages/Dev.jsx'
import QRPage from './pages/QRpage/QRPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:city" element={<City />} />
      <Route path="/dev" element={<Dev />} />
      <Route path="/qr" element={<QRPage />} />
    </Routes>
  )
}

export default App