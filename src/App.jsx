import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'
import Login from './pages/Login'
import Home from './pages/Home'
import ReportAnimal from './pages/ReportAnimal'
import FindPet from './pages/FindPet'
import TrackReport from './pages/TrackReport'
import PetDetail from './pages/PetDetail'

function App() {
  const [user, setUser] = useState(null)

  const handleLogin = (userData) => {
    setUser(userData)
  }

  const handleLogout = () => {
    setUser(null)
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/home"
          element={user ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />
        <Route
          path="/report"
          element={user ? <ReportAnimal user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/find-pet"
          element={user ? <FindPet user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/track"
          element={user ? <TrackReport user={user} /> : <Navigate to="/" />}
        />
        <Route
          path="/pet/:id"
          element={user ? <PetDetail user={user} /> : <Navigate to="/" />}
        />
      </Routes>
    </BrowserRouter>
  )
}

export default App
