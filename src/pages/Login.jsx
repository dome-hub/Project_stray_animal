// Login.jsx — หน้า Login ของแอป
// ผู้ใช้กด "เข้าสู่ระบบด้วย Google" เพื่อเข้าใช้งาน

import { useState } from 'react' // useState ใช้สำหรับเก็บข้อมูลที่เปลี่ยนแปลงได้

// รับ props "onLogin" มาจาก App.jsx
// onLogin คือฟังก์ชันที่จะเรียกเมื่อ Login สำเร็จ
function Login({ onLogin }) {

  // loading — เก็บสถานะว่ากำลังโหลดอยู่ไหม (true = กำลังโหลด)
  const [loading, setLoading] = useState(false)

  // ฟังก์ชันนี้จะทำงานเมื่อผู้ใช้กดปุ่ม Login
  function handleGoogleLogin() {
    setLoading(true) // เริ่มโหลด → แสดง loading spinner

    // setTimeout จำลองการรอ 1.5 วินาที (เหมือน API จริงที่ต้องรอ)
    setTimeout(function () {
      // Login สำเร็จ → เรียก onLogin พร้อมส่งข้อมูลผู้ใช้
      onLogin({
        name: 'สวัสดี ผู้ใช้งาน',
        email: 'user@gmail.com',
      })
      setLoading(false) // หยุดโหลด
    }, 1500)
  }

  return (
    // div หลัก — ทำให้เนื้อหาอยู่กลางหน้าจอ
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-6">

      {/* กล่องสีขาว */}
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm">

        {/* โลโก้และชื่อแอป */}
        <div className="flex flex-col items-center mb-8">
          <div className="text-6xl mb-4">🐕</div>
          <h1 className="text-2xl font-bold text-gray-800 text-center">
            ระบบจัดการหมาจร
          </h1>
          <p className="text-gray-500 text-sm text-center mt-2">
            ช่วยเหลือสัตว์จรและค้นหาเพื่อนใหม่ของคุณ
          </p>
        </div>

        {/* ปุ่ม Login ด้วย Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 hover:bg-gray-50 transition-all disabled:opacity-60"
        >
          {/* ถ้ากำลังโหลด → แสดง spinner, ถ้าไม่ → แสดงโลโก้ Google */}
          {loading ? (
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            // โลโก้ Google (SVG)
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            {loading ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
          </span>
        </button>

        {/* รายการฟีเจอร์ด้านล่าง */}
        <div className="mt-8 pt-6 border-t border-gray-100">
          <p className="text-xs text-gray-500 font-semibold mb-3">ฟีเจอร์ของเรา:</p>
          <ul className="space-y-2">
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              ถ่ายภาพแจ้งเจอสัตว์จรให้หน่วยงาน
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              AI วิเคราะห์สายพันธุ์และขนาดสัตว์
            </li>
            <li className="flex items-center gap-2 text-sm text-gray-600">
              <span className="text-green-500">✓</span>
              ค้นหาสัตว์เลี้ยงที่เหมาะกับคุณ
            </li>
          </ul>
        </div>

      </div>
    </div>
  )
}

export default Login
