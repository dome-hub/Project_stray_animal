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
import NotificationPage from './pages/NotificationPage'
import VolunteerPage    from './pages/VolunteerPage'
import AdminPage        from './pages/AdminPage'

function App() {
  const [user, setUser]           = useState(null)
  const [กำลังโหลด, setกำลังโหลด] = useState(true)  // รอเช็ค session ก่อน render

  useEffect(function () {
    // ป้องกันค้าง: ถ้าโหลดนานเกิน 5 วินาที ให้แสดงหน้า Login เลย
    const timeout = setTimeout(function () {
      setกำลังโหลด(false)
    }, 5000)

    // เช็ค session ที่มีอยู่แล้ว (กรณี user เปิดแอปใหม่แต่เคย login ไว้)
    supabase.auth.getSession().then(async function ({ data: { session } }) {
      clearTimeout(timeout)
      if (session?.user) {
        await ดึงข้อมูลUser(session.user)
      }
      setกำลังโหลด(false)
    }).catch(function () {
      clearTimeout(timeout)
      setกำลังโหลด(false)
    })

    // ฟัง event: login / logout / กดลิงก์ยืนยันอีเมล
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async function (event, session) {
        if (session?.user) {
          await ดึงข้อมูลUser(session.user)
        } else {
          setUser(null)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [])

  // ดึง role + ชื่อ จาก public.users โดยใช้ id จาก Supabase Auth
  async function ดึงข้อมูลUser(authUser) {
    // fallback พร้อมใช้งานทันที ถ้า DB ค้างหรือ error
    const fallback = {
      id:    authUser.id,
      email: authUser.email,
      name:  authUser.user_metadata?.name || authUser.email,
      role:  'user',
    }

    try {
      // timeout 5 วินาที: ถ้า users table ค้าง → ใช้ fallback เลย ไม่รอ
      const timer = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('TIMEOUT')), 5000)
      )
      const query = supabase
        .from('users')
        .select('name, role, status')
        .eq('id', authUser.id)
        .single()

      const { data } = await Promise.race([query, timer])

      setUser({
        id:    authUser.id,
        email: authUser.email,
        name:  data?.name || fallback.name,
        role:  data?.role  || 'user',
      })
    } catch {
      // ดึงจาก users table ไม่ได้ หรือ timeout → login ด้วย role default
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
