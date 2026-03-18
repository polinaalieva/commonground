import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'
import Dev from './pages/Dev.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:city" element={<City />} />
      <Route path="/dev" element={<Dev />} />
    </Routes>
  )
}

export default App