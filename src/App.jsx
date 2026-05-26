// App.jsx — ไฟล์หลักของแอป กำหนดว่าแต่ละ URL จะแสดงหน้าไหน

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState } from 'react'

// นำเข้าหน้าต่างๆ ทั้งหมด
import Login           from './pages/Login'
import Home            from './pages/Home'
import ReportAnimal    from './pages/ReportAnimal'
import FindPet         from './pages/FindPet'
import TrackReport     from './pages/TrackReport'
import PetDetail       from './pages/PetDetail'
import ProfilePage     from './pages/ProfilePage'
import WishlistPage    from './pages/WishlistPage'
import NotificationPage from './pages/NotificationPage'
import VolunteerPage   from './pages/VolunteerPage'
import AdminPage       from './pages/AdminPage'

function App() {
  // user — เก็บข้อมูลผู้ใช้ที่ Login (รวม role)
  // null = ยังไม่ได้ Login
  const [user, setUser] = useState(null)

  function handleLogin(userData) {
    setUser(userData)
  }

  function handleLogout() {
    setUser(null)
  }

  // ถ้ายังไม่ Login → redirect กลับหน้าแรก
  // ใช้ฟังก์ชันนี้ซ้ำแทนการเขียน ternary ซ้ำๆ
  function ต้องLogin(component) {
    return user ? component : <Navigate to="/" />
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* หน้า Login */}
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />} />

        {/* หน้าเมนูหลัก */}
        <Route path="/home" element={ต้องLogin(<Home user={user} onLogout={handleLogout} />)} />

        {/* === หน้าสำหรับผู้ใช้งานทั่วไป === */}
        <Route path="/report"        element={ต้องLogin(<ReportAnimal />)} />
        <Route path="/find-pet"      element={ต้องLogin(<FindPet />)} />
        <Route path="/track"         element={ต้องLogin(<TrackReport />)} />
        <Route path="/pet/:id"       element={ต้องLogin(<PetDetail />)} />
        <Route path="/profile"       element={ต้องLogin(<ProfilePage user={user} />)} />
        <Route path="/wishlist"      element={ต้องLogin(<WishlistPage />)} />
        <Route path="/notifications" element={ต้องLogin(<NotificationPage />)} />

        {/* === หน้าสำหรับเจ้าหน้าที่ / อาสาสมัคร === */}
        <Route path="/volunteer/reports" element={ต้องLogin(<VolunteerPage หน้า="reports" />)} />
        <Route path="/volunteer/update"  element={ต้องLogin(<VolunteerPage หน้า="update" />)} />
        <Route path="/volunteer/animals" element={ต้องLogin(<VolunteerPage หน้า="animals" />)} />
        <Route path="/volunteer/stats"   element={ต้องLogin(<VolunteerPage หน้า="stats" />)} />

        {/* === หน้าสำหรับผู้ดูแลระบบ === */}
        <Route path="/admin/dashboard" element={ต้องLogin(<AdminPage หน้า="dashboard" />)} />
        <Route path="/admin/users"     element={ต้องLogin(<AdminPage หน้า="users" />)} />
        <Route path="/admin/areas"     element={ต้องLogin(<AdminPage หน้า="areas" />)} />
        <Route path="/admin/export"    element={ต้องLogin(<AdminPage หน้า="export" />)} />
        <Route path="/admin/settings"  element={ต้องLogin(<AdminPage หน้า="settings" />)} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
