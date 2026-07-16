// App.jsx — ใช้ Supabase Auth จริง
// ฟัง onAuthStateChange แทนการ mock login

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { supabase } from './supabase'

import Login            from './pages/Login'
import Home             from './pages/Home'
import ReportAnimal     from './pages/ReportAnimal'
import FindPet          from './pages/FindPet'
import TrackReport      from './pages/TrackReport'
import PetDetail        from './pages/PetDetail'
import ProfilePage      from './pages/ProfilePage'
import WishlistPage     from './pages/WishlistPage'
import PetGuide         from './pages/PetGuide'
import NotificationPage from './pages/NotificationPage'
import VolunteerPage    from './pages/VolunteerPage'
import AdminPage        from './pages/AdminPage'

function App() {
  const [user, setUser]           = useState(null)
  const [กำลังโหลด, setกำลังโหลด] = useState(true)  // รอเช็ค session ก่อน render

  // Warmup: ยิง HTTP request ไปยัง Supabase ทันทีที่ app โหลด
  // เพื่อ pre-establish DNS+TCP+TLS connection ก่อนที่ user จะกด Login
  // แก้ปัญหา cold start hang บน localhost (npm run dev ใหม่)
  useEffect(function () {
    // Warmup: ยิง request ไปยัง Supabase ทันทีที่ app โหลด
    // เพื่อปลุก project จาก sleep (free tier) ก่อนที่ user จะกด Login
    // ยิงทั้ง REST endpoint และ Auth endpoint พร้อมกัน
    supabase.from('animals').select('id').limit(1).then(function () {}, function () {})
    supabase.auth.getSession().catch(function () {})
  }, [])

  useEffect(function () {
    let cancelled = false

    // Emergency bail: ถ้าทุกอย่างค้างนานเกิน 12 วินาที ให้ปิด loading เลย
    const emergencyTimer = setTimeout(function () {
      if (!cancelled) setกำลังโหลด(false)
    }, 12000)

    // onAuthStateChange ยิง INITIAL_SESSION ทันทีที่ mount → ไม่ต้องเรียก getSession แยก
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      function (event, session) {
        if (cancelled) return

        if (event === 'SIGNED_OUT' || !session) {
          setUser(null)
          clearTimeout(emergencyTimer)
          setกำลังโหลด(false)
        } else if (
          session?.user &&
          (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED')
        ) {
          // แสดงแอปทันที — ใช้ข้อมูลจาก Auth ก่อน ไม่รอ DB
          const authUser = session.user
          setUser({
            id:    authUser.id,
            email: authUser.email,
            name:  authUser.user_metadata?.name || authUser.email,
            role:  'user',
          })
          clearTimeout(emergencyTimer)
          setกำลังโหลด(false)
          // โหลด role/name จริงจาก DB ใน background (ไม่บล็อก UI)
          ดึงข้อมูลUser(authUser)
        }
      }
    )

    return function () {
      cancelled = true
      clearTimeout(emergencyTimer)
      subscription.unsubscribe()
    }
  }, [])

  // ดึง role + ชื่อ จาก public.users (ทำงาน background ไม่บล็อก UI)
  // เรียกหลัง setUser/setLoading แล้ว → อัปเดต role เมื่อ DB ตอบกลับ
  async function ดึงข้อมูลUser(authUser) {
    const fallback = {
      id:    authUser.id,
      email: authUser.email,
      name:  authUser.user_metadata?.name || authUser.email,
      role:  'user',
    }

    try {
      const { data, error } = await supabase
        .from('users')
        .select('name, role, status')
        .eq('id', authUser.id)
        .single()

      if (error || !data) {
        setUser(fallback)
      } else {
        setUser({
          id:    authUser.id,
          email: authUser.email,
          name:  data.name  || fallback.name,
          role:  data.role  || 'user',
        })
      }
    } catch {
      setUser(fallback)
    }
  }

  // Logout จริงผ่าน Supabase Auth
  async function handleLogout() {
    await supabase.auth.signOut()
    setUser(null)
  }

  // Loading spinner ระหว่างรอเช็ค session ครั้งแรก
  if (กำลังโหลด) {
    return (
      <div className="min-h-screen bg-blue-50 flex flex-col items-center justify-center gap-3">
        <div className="w-10 h-10 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
        <p className="text-gray-500 text-sm">กำลังโหลด...</p>
      </div>
    )
  }

  function ต้องLogin(component) {
    return user ? component : <Navigate to="/" />
  }

  return (
    <BrowserRouter>
      <Routes>

        {/* หน้า Login — ไม่ส่ง onLogin แล้ว Supabase Auth จัดการเอง */}
        <Route path="/" element={user ? <Navigate to="/home" /> : <Login />} />

        {/* หน้าเมนูหลัก */}
        <Route path="/home" element={ต้องLogin(<Home user={user} onLogout={handleLogout} />)} />

        {/* === ผู้ใช้ทั่วไป === */}
        <Route path="/report"        element={ต้องLogin(<ReportAnimal user={user} />)} />
        <Route path="/find-pet"      element={ต้องLogin(<FindPet />)} />
        <Route path="/track"         element={ต้องLogin(<TrackReport user={user} />)} />
        <Route path="/pet/:id"       element={ต้องLogin(<PetDetail />)} />
        <Route path="/profile"       element={ต้องLogin(<ProfilePage user={user} />)} />
        <Route path="/wishlist"      element={ต้องLogin(<WishlistPage />)} />
        <Route path="/pet-guide"     element={ต้องLogin(<PetGuide />)} />
        <Route path="/notifications" element={ต้องLogin(<NotificationPage user={user} />)} />

        {/* === เจ้าหน้าที่ / อาสาสมัคร === */}
        <Route path="/volunteer/reports" element={ต้องLogin(<VolunteerPage หน้า="reports" />)} />
        <Route path="/volunteer/update"  element={ต้องLogin(<VolunteerPage หน้า="update" />)} />
        <Route path="/volunteer/animals" element={ต้องLogin(<VolunteerPage หน้า="animals" />)} />
        <Route path="/volunteer/stats"   element={ต้องLogin(<VolunteerPage หน้า="stats" />)} />

        {/* === Admin === */}
        <Route path="/admin/dashboard" element={ต้องLogin(<AdminPage หน้า="dashboard" user={user} />)} />
        <Route path="/admin/users"     element={ต้องLogin(<AdminPage หน้า="users"     user={user} />)} />
        <Route path="/admin/areas"     element={ต้องLogin(<AdminPage หน้า="areas"     user={user} />)} />
        <Route path="/admin/export"    element={ต้องLogin(<AdminPage หน้า="export"    user={user} />)} />
        <Route path="/admin/settings"  element={ต้องLogin(<AdminPage หน้า="settings"  user={user} />)} />

      </Routes>
    </BrowserRouter>
  )
}

export default App
