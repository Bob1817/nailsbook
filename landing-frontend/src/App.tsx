import { Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage'
import RoleSelectPage from './pages/RoleSelectPage'
import ArtistJoinPage from './pages/ArtistJoinPage'
import ShowcasePage from './pages/ShowcasePage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/role-select" element={<RoleSelectPage />} />
      <Route path="/artist-join" element={<ArtistJoinPage />} />
      <Route path="/showcase" element={<ShowcasePage />} />
    </Routes>
  )
}

export default App
