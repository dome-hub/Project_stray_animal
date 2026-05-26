// Login.jsx — หน้า Login พร้อมเลือกประเภทผู้ใช้งาน

import { useState } from 'react'

// กำหนดข้อมูลของแต่ละ Role
const ประเภทผู้ใช้ = [
  {
    role: 'user',           // ค่าที่เก็บใน state
    emoji: '👤',
    ชื่อ: 'ผู้ใช้งานทั่วไป',
    รายละเอียด: 'แจ้งสัตว์จร, ค้นหาสัตว์เลี้ยง, ยื่นขอรับเลี้ยง',
    สีขอบ: 'border-blue-400 bg-blue-50',
    สีข้อความ: 'text-blue-700',
  },
  {
    role: 'volunteer',
    emoji: '🦺',
    ชื่อ: 'เจ้าหน้าที่ / อาสาสมัคร',
    รายละเอียด: 'ตรวจสอบรายงาน, อัปเดตสถานะ, จัดการข้อมูลสัตว์',
    สีขอบ: 'border-orange-400 bg-orange-50',
    สีข้อความ: 'text-orange-700',
  },
  {
    role: 'admin',
    emoji: '🛡️',
    ชื่อ: 'ผู้ดูแลระบบ',
    รายละเอียด: 'จัดการบัญชีผู้ใช้, ตรวจสอบและดูแลระบบโดยรวม',
    สีขอบ: 'border-purple-400 bg-purple-50',
    สีข้อความ: 'text-purple-700',
  },
]

function Login({ onLogin }) {
  // เก็บ role ที่ผู้ใช้เลือก (ค่าเริ่มต้นเป็น null = ยังไม่เลือก)
  const [roleที่เลือก, setRoleที่เลือก] = useState(null)

  // true = กำลังโหลด (รอ Login)
  const [กำลังโหลด, setกำลังโหลด] = useState(false)

  // ฟังก์ชัน Login เมื่อกดปุ่ม Google
  function handleGoogleLogin() {
    if (!roleที่เลือก) return // ถ้ายังไม่เลือก role → หยุด
    setกำลังโหลด(true)

    // จำลองการ Login 1.5 วินาที
    setTimeout(function () {
      // ส่งข้อมูลผู้ใช้พร้อม role กลับไปที่ App.jsx
      onLogin({
        name: 'สวัสดี ผู้ใช้งาน',
        email: 'user@gmail.com',
        role: roleที่เลือก, // เก็บ role ที่เลือก
      })
      setกำลังโหลด(false)
    }, 1500)
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4 py-8">
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">

        {/* โลโก้และชื่อแอป */}
        <div className="flex flex-col items-center mb-6">
          <div className="text-6xl mb-3">🐕</div>
          <h1 className="text-2xl font-bold text-gray-800 text-center">ระบบจัดการหมาจร</h1>
          <p className="text-gray-500 text-sm text-center mt-1">
            ช่วยเหลือสัตว์จรและค้นหาเพื่อนใหม่ของคุณ
          </p>
        </div>

        {/* ส่วนเลือก Role */}
        <div className="mb-5">
          <p className="text-sm font-semibold text-gray-700 mb-3 text-center">
            เลือกประเภทผู้ใช้งาน
          </p>

          <div className="space-y-3">
            {/* วนแสดงปุ่มเลือก Role ทั้ง 3 ประเภท */}
            {ประเภทผู้ใช้.map((ประเภท) => (
              <button
                key={ประเภท.role}
                onClick={() => setRoleที่เลือก(ประเภท.role)}
                className={`w-full text-left p-4 rounded-2xl border-2 transition-all ${
                  roleที่เลือก === ประเภท.role
                    ? ประเภท.สีขอบ        // ถ้าเลือกอยู่ → แสดงสีของ role นั้น
                    : 'border-gray-200 bg-white hover:border-gray-300' // ถ้ายังไม่เลือก → สีขาว
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ประเภท.emoji}</span>
                  <div>
                    <p className={`font-bold text-sm ${
                      roleที่เลือก === ประเภท.role ? ประเภท.สีข้อความ : 'text-gray-800'
                    }`}>
                      {ประเภท.ชื่อ}
                    </p>
                    <p className="text-gray-500 text-xs mt-0.5">{ประเภท.รายละเอียด}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* ปุ่ม Login ด้วย Google */}
        <button
          onClick={handleGoogleLogin}
          disabled={!roleที่เลือก || กำลังโหลด}
          className="w-full flex items-center justify-center gap-3 border-2 border-gray-200 rounded-xl py-3 px-4 hover:bg-gray-50 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {กำลังโหลด ? (
            <div className="w-5 h-5 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
          ) : (
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
          )}
          <span className="font-medium text-gray-700">
            {กำลังโหลด ? 'กำลังเข้าสู่ระบบ...' : 'เข้าสู่ระบบด้วย Google'}
          </span>
        </button>

        {/* แสดงข้อความแจ้งเตือนถ้ายังไม่เลือก role */}
        {!roleที่เลือก && (
          <p className="text-center text-xs text-gray-400 mt-3">
            กรุณาเลือกประเภทผู้ใช้งานก่อนเข้าสู่ระบบ
          </p>
        )}

      </div>
    </div>
  )
}

export default Login
