// App.jsx — ไฟล์หลักของแอป ทำหน้าที่กำหนดว่าแต่ละ URL จะแสดงหน้าไหน

// นำเข้า Library ที่จำเป็น
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom' // สำหรับจัดการ URL / การเปลี่ยนหน้า
import { useState } from 'react' // สำหรับเก็บข้อมูลใน Component

// นำเข้าหน้าต่างๆ ของแอป
import Login from './pages/Login'
import Home from './pages/Home'
import ReportAnimal from './pages/ReportAnimal'
import FindPet from './pages/FindPet'
import TrackReport from './pages/TrackReport'
import PetDetail from './pages/PetDetail'

function App() {
  // user — เก็บข้อมูลผู้ใช้ที่ Login อยู่
  // ถ้า user เป็น null = ยังไม่ได้ Login
  const [user, setUser] = useState(null)

  // ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้ Login สำเร็จ
  // รับข้อมูลผู้ใช้ (userData) แล้วเก็บไว้ใน state
  function handleLogin(userData) {
    setUser(userData)
  }

  // ฟังก์ชันนี้จะถูกเรียกเมื่อผู้ใช้กด Logout
  // เคลียร์ข้อมูลผู้ใช้ออก (ตั้งค่ากลับเป็น null)
  function handleLogout() {
    setUser(null)
  }

  return (
    // BrowserRouter — ทำให้แอปรู้จัก URL และเปลี่ยนหน้าได้
    <BrowserRouter>
      <Routes>

        {/* หน้า "/" คือหน้าแรก
            ถ้า Login แล้ว → ไปหน้า Home
            ถ้ายังไม่ Login → แสดงหน้า Login */}
        <Route
          path="/"
          element={user ? <Navigate to="/home" /> : <Login onLogin={handleLogin} />}
        />

        {/* หน้า "/home" คือหน้าเมนูหลัก
            ถ้า Login แล้ว → แสดงหน้า Home
            ถ้ายังไม่ Login → กลับไปหน้าแรก */}
        <Route
          path="/home"
          element={user ? <Home user={user} onLogout={handleLogout} /> : <Navigate to="/" />}
        />

        {/* หน้า "/report" คือหน้าแจ้งสัตว์จร */}
        <Route
          path="/report"
          element={user ? <ReportAnimal /> : <Navigate to="/" />}
        />

        {/* หน้า "/find-pet" คือหน้าค้นหาสัตว์เลี้ยง */}
        <Route
          path="/find-pet"
          element={user ? <FindPet /> : <Navigate to="/" />}
        />

        {/* หน้า "/track" คือหน้าติดตามสถานะรายงาน */}
        <Route
          path="/track"
          element={user ? <TrackReport /> : <Navigate to="/" />}
        />

        {/* หน้า "/pet/:id" คือหน้าดูรายละเอียดสัตว์
            :id คือตัวแปร เช่น /pet/1, /pet/2 */}
        <Route
          path="/pet/:id"
          element={user ? <PetDetail /> : <Navigate to="/" />}
        />

      </Routes>
    </BrowserRouter>
  )
}

export default App
