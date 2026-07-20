// Login.jsx — ใช้ Supabase Auth จริง
// สมัคร → อีเมลยืนยันเด้งไป → กดลิงก์ → login ได้
// role มาจาก public.users table เท่านั้น ไม่ให้ผู้ใช้เลือกเอง

import { useState } from 'react'
import { Mail, MailOpen, CheckCircle2, Dog, Eye, EyeOff, Loader2, Info } from 'lucide-react'
import { supabase } from '../supabase'

function Login() {
  const [โหมด, setโหมด] = useState('login')   // 'login' | 'register'

  // ---- Login ----
  const [อีเมลLogin,    setอีเมลLogin]    = useState('')
  const [รหัสผ่านLogin, setรหัสผ่านLogin] = useState('')
  const [แสดงรหัส,      setแสดงรหัส]      = useState(false)

  // ---- Register ----
  const [ชื่อ,             setชื่อ]             = useState('')
  const [อีเมลRegister,    setอีเมลRegister]    = useState('')
  const [รหัสผ่านRegister, setรหัสผ่านRegister] = useState('')

  // ---- ทั่วไป ----
  const [กำลังโหลด,      setกำลังโหลด]      = useState(false)
  const [กำลังGoogle,    setกำลังGoogle]    = useState(false)
  const [ข้อผิดพลาด,    setข้อผิดพลาด]    = useState('')
  const [รอยืนยันเมล,   setรอยืนยันเมล]   = useState(false)
  const [ช้า,            setช้า]            = useState(false)

  function เปลี่ยนโหมด(โหมดใหม่) {
    setโหมด(โหมดใหม่)
    setข้อผิดพลาด('')
  }

  // ---- Login ด้วย Google OAuth ----
  async function handleGoogleLogin() {
    setกำลังGoogle(true)
    setข้อผิดพลาด('')
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,  // redirect กลับมาหน้าแรกของแอป
        },
      })
      if (error) {
        setข้อผิดพลาด('Google login ไม่สำเร็จ: ' + error.message)
        setกำลังGoogle(false)
      }
      // ถ้าสำเร็จ → browser จะ redirect ไปหน้า Google consent เอง
      // เมื่อกลับมา onAuthStateChange ใน App.jsx จะ set user ให้อัตโนมัติ
    } catch {
      setข้อผิดพลาด('เชื่อมต่อ Google ไม่ได้ กรุณาลองใหม่')
      setกำลังGoogle(false)
    }
  }

  // ---- Login ด้วย Supabase Auth ----
  async function handleLogin(e) {
    e.preventDefault()
    if (!อีเมลLogin || !รหัสผ่านLogin) {
      setข้อผิดพลาด('กรุณากรอกอีเมลและรหัสผ่าน')
      return
    }

    setกำลังโหลด(true)
    setข้อผิดพลาด('')
    setช้า(false)

    // หลัง 8 วิ → แสดงข้อความว่า Supabase กำลังตื่น (free tier sleep)
    const slowTimer = setTimeout(function () { setช้า(true) }, 8000)

    try {
      // ไม่มี timeout แล้ว — ปล่อยให้รอจนกว่า Supabase จะตอบ
      // free tier อาจใช้ 20-40 วิในการตื่นจาก sleep ครั้งแรก
      const { error } = await supabase.auth.signInWithPassword({
        email:    อีเมลLogin.trim(),
        password: รหัสผ่านLogin,
      })

      if (error) {
        if (error.message.includes('Email not confirmed')) {
          setข้อผิดพลาด('กรุณายืนยันอีเมลก่อน — ตรวจสอบกล่องจดหมายของคุณ')
        } else if (
          error.message.includes('Invalid login credentials') ||
          error.message.includes('invalid_credentials')
        ) {
          setข้อผิดพลาด('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
        } else {
          setข้อผิดพลาด('เกิดข้อผิดพลาด: ' + error.message)
        }
      }
      // ถ้าสำเร็จ → onAuthStateChange ใน App.jsx จะ set user → navigate อัตโนมัติ
    } catch (err) {
      setข้อผิดพลาด('เชื่อมต่อไม่ได้: ' + err.message)
    } finally {
      clearTimeout(slowTimer)
      setกำลังโหลด(false)
      setช้า(false)
    }
  }

  // ---- สมัครสมาชิก ด้วย Supabase Auth ----
  async function handleRegister(e) {
    e.preventDefault()
    if (!ชื่อ || !อีเมลRegister || !รหัสผ่านRegister) {
      setข้อผิดพลาด('กรุณากรอกข้อมูลให้ครบทุกช่อง')
      return
    }
    if (รหัสผ่านRegister.length < 6) {
      setข้อผิดพลาด('รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร')
      return
    }

    setกำลังโหลด(true)
    setข้อผิดพลาด('')

    const { error } = await supabase.auth.signUp({
      email:    อีเมลRegister.trim(),
      password: รหัสผ่านRegister,
      options: {
        data: { name: ชื่อ.trim() },  // เก็บชื่อใน user_metadata → Trigger ดึงไปใส่ใน public.users
      },
    })

    if (error) {
      if (error.message.includes('already registered')) {
        setข้อผิดพลาด('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ')
      } else {
        setข้อผิดพลาด(error.message)
      }
    } else {
      // สมัครสำเร็จ → แสดงหน้า "รอยืนยันอีเมล"
      setรอยืนยันเมล(true)
    }

    setกำลังโหลด(false)
  }

  // ---- หน้า: รอยืนยันอีเมล ----
  if (รอยืนยันเมล) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <Mail size={64} strokeWidth={1.5} className="text-blue-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-800 mb-2">ตรวจสอบอีเมลของคุณ</h2>
          <p className="text-gray-500 text-sm mb-1">เราส่งลิงก์ยืนยันไปที่</p>
          <p className="font-bold text-blue-600 mb-4">{อีเมลRegister}</p>
          <div className="bg-blue-50 rounded-2xl p-4 mb-6 text-left space-y-2">
            <p className="text-xs text-gray-600 flex items-start gap-1.5">
              <MailOpen size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <span>เปิดอีเมลแล้วกด <strong>"Confirm your mail"</strong></span>
            </p>
            <p className="text-xs text-gray-600 flex items-start gap-1.5">
              <CheckCircle2 size={14} className="text-green-500 shrink-0 mt-0.5" />
              <span>กลับมาที่แอปแล้ว Login ได้เลย</span>
            </p>
            <p className="text-xs text-gray-400">* เช็คโฟลเดอร์ Spam ถ้าไม่เห็นอีเมล</p>
          </div>
          <button
            onClick={() => { setรอยืนยันเมล(false); เปลี่ยนโหมด('login') }}
            className="w-full bg-blue-500 text-white rounded-xl py-3 font-semibold"
          >
            ไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">

        {/* โลโก้ */}
        <div className="flex flex-col items-center mb-6">
          <Dog size={56} strokeWidth={1.5} className="text-blue-500 mb-3" />
          <h1 className="text-2xl font-bold text-gray-800 text-center">ระบบจัดการสัตว์จร</h1>
          <p className="text-gray-500 text-sm text-center mt-1">
            ช่วยเหลือสัตว์จรและค้นหาเพื่อนใหม่ของคุณ
          </p>
        </div>

        {/* Tab: เข้าสู่ระบบ / สมัครสมาชิก */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-5">
          <button
            onClick={() => เปลี่ยนโหมด('login')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              โหมด === 'login' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            เข้าสู่ระบบ
          </button>
          <button
            onClick={() => เปลี่ยนโหมด('register')}
            className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
              โหมด === 'register' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            สมัครสมาชิก
          </button>
        </div>

        {/* ======== ฟอร์ม Login ======== */}
        {โหมด === 'login' && (
          <form onSubmit={handleLogin} className="space-y-3">

            <input
              type="email"
              value={อีเมลLogin}
              onChange={(e) => setอีเมลLogin(e.target.value)}
              placeholder="อีเมล"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />

            <div className="relative">
              <input
                type={แสดงรหัส ? 'text' : 'password'}
                value={รหัสผ่านLogin}
                onChange={(e) => setรหัสผ่านLogin(e.target.value)}
                placeholder="รหัสผ่าน"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 pr-12"
              />
              <button
                type="button"
                onClick={() => setแสดงรหัส(!แสดงรหัส)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
              >
                {แสดงรหัส ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* แสดงข้อความเตือนว่า Supabase กำลังตื่น (หลัง 8 วิ) */}
            {กำลังโหลด && ช้า && (
              <div className="bg-orange-50 border border-orange-200 rounded-xl px-4 py-3 text-center space-y-1">
                <p className="text-xs text-orange-700 font-semibold flex items-center justify-center gap-1.5">
                  <Loader2 size={14} className="animate-spin shrink-0" /> Supabase กำลังตื่นจาก sleep...
                </p>
                <p className="text-xs text-orange-500">กรุณารอสักครู่ อาจใช้เวลา 20–40 วินาที</p>
                <div className="flex justify-center gap-1 pt-1">
                  {[0,1,2].map(function(i) {
                    return <div key={i} className="w-2 h-2 bg-orange-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
                  })}
                </div>
              </div>
            )}

            {ข้อผิดพลาด && (
              <p className="text-red-500 text-xs text-center bg-red-50 py-2 px-3 rounded-lg">
                {ข้อผิดพลาด}
              </p>
            )}

            <button
              type="submit"
              disabled={กำลังโหลด}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {กำลังโหลด ? (
                <>
                  <Loader2 size={16} className="animate-spin shrink-0" />
                  {ช้า ? 'รอ Supabase...' : 'กำลังเข้าสู่ระบบ...'}
                </>
              ) : 'เข้าสู่ระบบ'}
            </button>

          </form>
        )}

        {/* ======== ฟอร์ม Register ======== */}
        {โหมด === 'register' && (
          <form onSubmit={handleRegister} className="space-y-3">

            <input
              type="text"
              value={ชื่อ}
              onChange={(e) => setชื่อ(e.target.value)}
              placeholder="ชื่อ-นามสกุล"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              type="email"
              value={อีเมลRegister}
              onChange={(e) => setอีเมลRegister(e.target.value)}
              placeholder="อีเมล"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />
            <input
              type="password"
              value={รหัสผ่านRegister}
              onChange={(e) => setรหัสผ่านRegister(e.target.value)}
              placeholder="รหัสผ่าน (อย่างน้อย 6 ตัวอักษร)"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
            />

            <div className="bg-blue-50 rounded-xl px-4 py-3 flex items-start gap-2">
              <Info size={14} className="text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-600 leading-relaxed">
                บัญชีใหม่จะได้รับสิทธิ์ <strong>ผู้ใช้งานทั่วไป</strong> เสมอ<br/>
                ผู้ดูแลระบบเป็นผู้กำหนดสิทธิ์พิเศษ
              </p>
            </div>

            {ข้อผิดพลาด && (
              <p className="text-red-500 text-xs text-center bg-red-50 py-2 px-3 rounded-lg">
                {ข้อผิดพลาด}
              </p>
            )}

            <button
              type="submit"
              disabled={กำลังโหลด}
              className="w-full bg-blue-500 hover:bg-blue-600 text-white rounded-xl py-3 font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {กำลังโหลด
                ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังสมัครสมาชิก...</>
                : 'สมัครสมาชิก'}
            </button>

          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-400">หรือ</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Google Login — เชื่อม Supabase OAuth จริงแล้ว */}
        <button
          onClick={handleGoogleLogin}
          disabled={กำลังGoogle}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 hover:bg-gray-50 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {กำลังGoogle ? (
            <>
              <div className="w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              <span className="font-medium text-gray-500">กำลังเชื่อมต่อ Google...</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <span className="font-medium text-gray-600">เข้าสู่ระบบด้วย Google</span>
            </>
          )}
        </button>

      </div>
    </div>
  )
}

export default Login
