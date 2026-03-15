import { Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'
import City from './pages/City.jsx'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/:city" element={<City />} />
    </Routes>
  )
}

export default App