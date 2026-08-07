// App.jsx — ใช้ Supabase Auth จริง
// ฟัง onAuthStateChange แทนการ mock login

import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'
import { supabase } from './supabase'
import BottomNav from './components/BottomNav'
import { แสดงแถบนำทาง, ความสูงแถบนำทาง } from './utils/navVisibility'

import LandingPage      from './pages/LandingPage'
import Login            from './pages/Login'
import SuspendedPage    from './pages/SuspendedPage'
import Home             from './pages/Home'
import ReportAnimal     from './pages/ReportAnimal'
import FindPet          from './pages/FindPet'
import LostAndFoundPage from './pages/LostAndFoundPage'
import TrackReport      from './pages/TrackReport'
import PetDetail        from './pages/PetDetail'
import ProfilePage      from './pages/ProfilePage'
import ContactPage      from './pages/ContactPage'
import PrivacyPolicyPage from './pages/PrivacyPolicyPage'
import NotificationPage from './pages/NotificationPage'
import VolunteerPage    from './pages/VolunteerPage'
import AdminPage        from './pages/AdminPage'
import NotFoundPage     from './pages/NotFoundPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import { useToast } from './components/useToast'
import { ข้อความError } from './utils/errorMessage'
import { ผูกตัวรับDeepLink } from './utils/googleSignIn'
import { ลงทะเบียนPush, ยกเลิกPush } from './utils/pushNotifications'

// เว้นที่ว่างด้านล่างเท่าความสูงแถบนำทาง กันเนื้อหาบรรทัดสุดท้ายถูกแถบทับ
// ต้องแยกเป็น component เพราะ useLocation ใช้ได้เฉพาะข้างใน BrowserRouter
// (ชื่อขึ้นต้นด้วยตัวอักษรอังกฤษตัวใหญ่ ไม่งั้น ESLint จะไม่ถือว่าเป็น React component แล้วฟ้อง rules-of-hooks)
function Layoutเนื้อหา({ user, children }) {
  const location = useLocation()
  const มีแถบ = แสดงแถบนำทาง(user, location.pathname)
  return (
    <div style={{ paddingBottom: มีแถบ ? `calc(${ความสูงแถบนำทาง}px + env(safe-area-inset-bottom))` : 0 }}>
      {children}
    </div>
  )
}

// พาไปหน้าที่ผู้ใช้แตะมาจากแจ้งเตือนบนมือถือ
// ต้องแยกเป็น component เพราะ useNavigate ใช้ได้เฉพาะข้างใน BrowserRouter
// ส่วน listener ของ push อยู่ระดับ App ซึ่งอยู่นอก Router จึงส่งต่อผ่าน prop แทน
function นำทางจากแจ้งเตือน({ path, onเสร็จ }) {
  const navigate = useNavigate()
  useEffect(function () {
    if (!path) return
    navigate(path)
    onเสร็จ()
  }, [path, navigate, onเสร็จ])
  return null
}

function App() {
  const [user, setUser]           = useState(null)
  const [กำลังโหลด, setกำลังโหลด] = useState(true)  // รอเช็ค session ก่อน render
  const [ถูกระงับ, setถูกระงับ]   = useState(false)  // Global Block — บัญชีถูกระงับ
  // role จริงจาก DB โหลดหรือยัง — user เริ่มต้นด้วย role: 'user' เสมอระหว่างรอ (ดู setUser ด้านล่าง)
  // ต้องRole() ใช้เช็คตัวนี้ กัน admin/volunteer ที่ refresh หน้าโดนเด้งออกผิดๆ ก่อน role จริงมาถึง
  const [roleพร้อม, setRoleพร้อม] = useState(false)
  const { toastError, ToastHost } = useToast()
  // หน้าที่ต้องพาไปหลังผู้ใช้แตะแจ้งเตือนบนมือถือ (เช่น /track?open=38)
  const [หน้าจากแจ้งเตือน, setหน้าจากแจ้งเตือน] = useState(null)

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

  // ต่ออายุ session ทุกครั้งที่กลับเข้าแอป (Android เท่านั้น)
  //
  // ปัญหา: token ของ Supabase อายุ 1 ชั่วโมง ตัวต่ออายุอัตโนมัติทำงานด้วย timer
  // แต่ Android หยุด/หน่วง timer เมื่อแอปถูกพักไว้เบื้องหลังเพื่อประหยัดแบต
  // พอผู้ใช้กลับมาแล้วกดส่งรายงาน token หมดอายุไปแล้ว เซิร์ฟเวอร์จึงมองเป็นคนที่ยังไม่ล็อกอิน
  // → RLS ปฏิเสธ ขึ้นข้อความ "คุณไม่มีสิทธิ์ทำรายการนี้" ทั้งที่ผู้ใช้ล็อกอินอยู่แท้ๆ
  //
  // เจอจริงตอนทดสอบภาคสนาม: เซิร์ฟเวอร์ AI ตื่นจาก sleep ใช้เวลานาน ผู้ใช้สลับไปทำอย่างอื่น
  // พอกลับมากดส่ง อัปโหลดรูปไม่ผ่าน ทั้งที่สิทธิ์ใน storage ตั้งไว้ถูกต้องทุกอย่าง
  useEffect(function () {
    if (!Capacitor.isNativePlatform()) return
    let ตัวฟัง
    CapApp.addListener('appStateChange', function ({ isActive }) {
      if (isActive) {
        // กลับเข้าแอป — ต่ออายุทันที ไม่รอ timer ที่อาจถูก Android แช่แข็งไว้
        supabase.auth.startAutoRefresh()
        supabase.auth.refreshSession().catch(function () { /* ไม่มี session ก็ไม่ต้องทำอะไร */ })
      } else {
        supabase.auth.stopAutoRefresh()
      }
    }).then(function (h) { ตัวฟัง = h })

    supabase.auth.startAutoRefresh()
    return function () { ตัวฟัง?.remove?.() }
  }, [])

  // รับ callback ของ Google Sign-In ที่เด้งกลับเข้าแอปผ่าน custom scheme (Android เท่านั้น)
  // ต้องผูกที่ระดับ App ไม่ใช่หน้า Login เพราะระหว่างที่ผู้ใช้อยู่ในเบราว์เซอร์ระบบ
  // Android อาจเก็บแอปเราไว้เบื้องหลังแล้วสร้าง component ใหม่ตอนกลับมา
  // ตัว session ที่ตั้งสำเร็จจะไปเข้า onAuthStateChange ด้านล่างเองตามปกติ
  useEffect(function () {
    return ผูกตัวรับDeepLink(function (err, path) {
      if (err) toastError(ข้อความError(err, 'เข้าสู่ระบบด้วย Google'))
      // ลิงก์ลืมรหัสผ่านจากอีเมลจะส่ง path มาด้วย — พาไปหน้าตั้งรหัสใหม่
      // ใช้กลไกเดียวกับตอนแตะแจ้งเตือน (ดู นำทางจากแจ้งเตือน ด้านบน)
      else if (path) setหน้าจากแจ้งเตือน(path)
    })
  }, [toastError])

  // ลงทะเบียนรับแจ้งเตือนเด้งบนมือถือ — ต้องรอให้รู้ก่อนว่าใครล็อกอินอยู่
  // เพราะ device token ต้องผูกกับ user_id ถึงจะส่งถูกคน
  // บนเว็บฟังก์ชันนี้จะข้ามทั้งหมดเอง ไม่ต้องเช็คตรงนี้
  useEffect(function () {
    if (!user?.id) return
    let ถอด = function () {}
    let ยกเลิกแล้ว = false

    ลงทะเบียนPush(function (path) { setหน้าจากแจ้งเตือน(path) })
      .then(function (f) {
        if (ยกเลิกแล้ว) f()          // component ถูก unmount ระหว่างรอ — ถอดทิ้งเลย
        else ถอด = f
      })

    return function () { ยกเลิกแล้ว = true; ถอด() }
  }, [user?.id])

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
          // เข้าสู่ระบบใหม่ (หรือ session ใหม่) — ล้างสถานะ "ถูกระงับ" ค้างจากรอบก่อนทิ้ง
          setถูกระงับ(false)
          setRoleพร้อม(false)

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
        setRoleพร้อม(true)
      } else if (data.status === 'suspended') {
        // บัญชีถูกระงับ — Global Block: ตัดการเชื่อมต่อทันที ไม่ปล่อยให้เข้าแอป
        await บังคับออกเพราะถูกระงับ()
      } else {
        setUser({
          id:    authUser.id,
          email: authUser.email,
          name:  data.name  || fallback.name,
          role:  data.role  || 'user',
        })
        setRoleพร้อม(true)
      }
    } catch {
      setUser(fallback)
      setRoleพร้อม(true)
    }
  }

  // ตัดการเชื่อมต่อทันทีเมื่อพบว่าบัญชีถูกระงับ (ตอน login หรือ realtime ระหว่างใช้งานอยู่)
  async function บังคับออกเพราะถูกระงับ() {
    setถูกระงับ(true)
    setUser(null)
    await supabase.auth.signOut()
  }

  // ฟัง realtime: ถ้าแอดมินกดระงับบัญชีระหว่างที่ผู้ใช้กำลังใช้งานอยู่ ให้เตะออกทันที ไม่ต้องรอ refresh
  useEffect(function () {
    if (!user?.id) return
    const channel = supabase
      .channel('user-status-' + user.id)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'users', filter: `id=eq.${user.id}` },
        function (payload) {
          if (payload.new?.status === 'suspended') บังคับออกเพราะถูกระงับ()
        }
      )
      .subscribe()

    return function () { supabase.removeChannel(channel) }
  }, [user?.id])

  // Logout จริงผ่าน Supabase Auth
  async function handleLogout() {
    // ลบ device token ก่อน signOut — ไม่งั้นเครื่องนี้จะยังได้แจ้งเตือนของคนเดิม
    // หลังมีคนอื่นมาล็อกอินต่อ (เครื่องที่ใช้ร่วมกันในสำนักงานเจอกรณีนี้ได้จริง)
    await ยกเลิกPush()
    await supabase.auth.signOut()
    setUser(null)
  }

  // Global Block — บัญชีถูกระงับ: แสดงหน้านี้แทนแอปทั้งหมด เข้าหน้าไหนไม่ได้เลย
  if (ถูกระงับ) {
    return <SuspendedPage onBackToLogin={() => setถูกระงับ(false)} />
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
    return user ? component : <Navigate to="/login" />
  }

  // เหมือน ต้องLogin แต่เช็ค role ตรงตัวด้วย — กันไม่ให้ user ทั่วไป/role อื่น
  // เข้าหน้า admin หรือ volunteer ได้แค่เพราะพิมพ์ URL ตรงๆ (เดิมเช็คแค่ login แล้วหรือยัง)
  function ต้องRole(component, role) {
    if (!user) return <Navigate to="/login" />
    if (user.role === role) return component
    if (!roleพร้อม) {
      // user.role ตั้งต้นเป็น 'user' เสมอระหว่างรอโหลด role จริงจาก DB (ดู setUser ใน onAuthStateChange)
      // ถ้า redirect ทันทีตรงนี้ admin/volunteer ที่ refresh หน้าจะโดนเด้งออกผิดๆ ก่อน role จริงมาถึง
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-gray-300 border-t-transparent rounded-full animate-spin" />
        </div>
      )
    }
    return <Navigate to="/home" />
  }

  return (
    <BrowserRouter>
      <ToastHost />
      <นำทางจากแจ้งเตือน path={หน้าจากแจ้งเตือน} onเสร็จ={() => setหน้าจากแจ้งเตือน(null)} />
      <Layoutเนื้อหา user={user}>
      <Routes>

        {/* หน้าแรกสาธารณะ — อธิบายแอป ไม่ใช่ฟอร์ม login ตรงๆ (ดู LandingPage.jsx เรื่อง Google OAuth branding) */}
        <Route path="/" element={user ? <Navigate to="/home" /> : <LandingPage />} />

        {/* หน้า Login — ไม่ส่ง onLogin แล้ว Supabase Auth จัดการเอง */}
        <Route path="/login" element={user ? <Navigate to="/home" /> : <Login />} />

        {/* ตั้งรหัสผ่านใหม่ — ปลายทางของลิงก์ในอีเมล ต้องเข้าได้ทั้งที่ยังไม่ได้ล็อกอิน
            และตอนที่ Supabase สร้าง session จาก token ในลิงก์ให้แล้ว จึงไม่ผูกกับ user */}
        <Route path="/reset-password" element={<ResetPasswordPage />} />

        {/* นโยบายความเป็นส่วนตัว — public ไม่ต้อง login
            Google ต้องเปิด URL นี้ได้ตอนตรวจสอบ OAuth consent screen และผู้ใช้ต้องอ่านได้ก่อนสมัคร */}
        <Route path="/privacy" element={<PrivacyPolicyPage />} />

        {/* หน้าเมนูหลัก */}
        <Route path="/home" element={ต้องLogin(<Home user={user} onLogout={handleLogout} />)} />

        {/* === ผู้ใช้ทั่วไป === */}
        <Route path="/report"        element={ต้องLogin(<ReportAnimal user={user} />)} />
        <Route path="/find-pet"      element={ต้องLogin(<FindPet />)} />
        <Route path="/lost-found"    element={ต้องLogin(<LostAndFoundPage user={user} />)} />
        <Route path="/track"         element={ต้องLogin(<TrackReport user={user} />)} />
        <Route path="/pet/:id"       element={ต้องLogin(<PetDetail />)} />
        <Route path="/profile"       element={ต้องLogin(<ProfilePage user={user} />)} />
        <Route path="/contact"       element={ต้องLogin(<ContactPage />)} />
        <Route path="/notifications" element={ต้องLogin(<NotificationPage user={user} />)} />

        {/* === เจ้าหน้าที่ / อาสาสมัคร === */}
        {/* /volunteer เปล่าๆ คือสิ่งที่คนพิมพ์เองเมื่อเห็น /volunteer/reports — พาไปหน้าแรกของกลุ่มแทนที่จะตกไป 404 */}
        <Route path="/volunteer" element={<Navigate to="/volunteer/reports" replace />} />
        <Route path="/volunteer/reports" element={ต้องRole(<VolunteerPage หน้า="reports" />, 'volunteer')} />
        <Route path="/volunteer/update"  element={ต้องRole(<VolunteerPage หน้า="update" />, 'volunteer')} />
        <Route path="/volunteer/animals" element={ต้องRole(<VolunteerPage หน้า="animals" />, 'volunteer')} />
        <Route path="/volunteer/stats"   element={ต้องRole(<VolunteerPage หน้า="stats" />, 'volunteer')} />
        <Route path="/volunteer/map"     element={ต้องRole(<VolunteerPage หน้า="map" />, 'volunteer')} />

        {/* === Admin === */}
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="/admin/dashboard" element={ต้องRole(<AdminPage หน้า="dashboard" user={user} />, 'admin')} />
        <Route path="/admin/users"     element={ต้องRole(<AdminPage หน้า="users"     user={user} />, 'admin')} />
        <Route path="/admin/areas"     element={ต้องRole(<AdminPage หน้า="areas"     user={user} />, 'admin')} />
        <Route path="/admin/export"    element={ต้องRole(<AdminPage หน้า="export"    user={user} />, 'admin')} />
        <Route path="/admin/settings"  element={ต้องRole(<AdminPage หน้า="settings"  user={user} />, 'admin')} />

        {/* ต้องอยู่ท้ายสุดเสมอ — URL ที่ไม่ตรง route ไหนเลยเคยได้หน้าขาวไม่มีตัวอักษรสักตัว */}
        <Route path="*" element={<NotFoundPage user={user} />} />

      </Routes>
      </Layoutเนื้อหา>

      {/* แถบนำทางล่าง — ซ่อนเองเมื่ออยู่หน้า login / ฝั่ง admin */}
      <BottomNav user={user} />
    </BrowserRouter>
  )
}

export default App
