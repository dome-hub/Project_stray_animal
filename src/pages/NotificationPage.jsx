// NotificationPage.jsx — การแจ้งเตือน แยกตาม Role
// user / volunteer / admin เห็นการแจ้งเตือนต่างกัน

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ---- Mock การแจ้งเตือน แยกตาม Role ----
// (เก็บ mock ไว้ก่อน รอเชื่อม Supabase จริงในอนาคต)

const แจ้งเตือนของUser = [
  {
    id: 1, emoji: '🦺',
    ข้อความ: 'รายงาน #000001 เจ้าหน้าที่รับเรื่องแล้ว',
    เวลา: '1 ชั่วโมงที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 2, emoji: '🎉',
    ข้อความ: 'คำขอรับเลี้ยง "มะม่วง" ได้รับการอนุมัติแล้ว!',
    เวลา: '3 ชั่วโมงที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 3, emoji: '🐾',
    ข้อความ: 'มีสัตว์ใหม่เพิ่มเข้าระบบในพื้นที่กำแพงแสน 2 ตัว',
    เวลา: 'เมื่อวาน', อ่านแล้ว: true,
  },
  {
    id: 4, emoji: '⏳',
    ข้อความ: 'คำขอรับเลี้ยง "ส้ม" อยู่ระหว่างพิจารณา',
    เวลา: '2 วันที่แล้ว', อ่านแล้ว: true,
  },
]

const แจ้งเตือนของVolunteer = [
  {
    id: 1, emoji: '🚨',
    ข้อความ: 'มีรายงานใหม่ ความเร่งด่วนสูง บริเวณกำแพงแสน รอการดำเนินการ',
    เวลา: '30 นาทีที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 2, emoji: '📋',
    ข้อความ: 'มีรายงานสัตว์จรใหม่ในพื้นที่ของคุณ 3 รายการ',
    เวลา: '2 ชั่วโมงที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 3, emoji: '✅',
    ข้อความ: 'รายงาน #000002 ที่คุณดูแลมีผู้รับเลี้ยงแล้ว',
    เวลา: 'เมื่อวาน', อ่านแล้ว: true,
  },
  {
    id: 4, emoji: '💊',
    ข้อความ: '"ขาว" ถึงเวลาพาไปพบสัตวแพทย์ตามนัด',
    เวลา: '2 วันที่แล้ว', อ่านแล้ว: true,
  },
]

const แจ้งเตือนของAdmin = [
  {
    id: 1, emoji: '👤',
    ข้อความ: 'มีผู้ใช้ใหม่ลงทะเบียน 5 คนวันนี้',
    เวลา: '1 ชั่วโมงที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 2, emoji: '⚠️',
    ข้อความ: 'มีรายงานที่รอดำเนินการเกิน 24 ชั่วโมง จำนวน 2 รายการ',
    เวลา: '3 ชั่วโมงที่แล้ว', อ่านแล้ว: false,
  },
  {
    id: 3, emoji: '📊',
    ข้อความ: 'รายงานประจำสัปดาห์: อัตราการรับเลี้ยงเพิ่มขึ้น 12%',
    เวลา: 'เมื่อวาน', อ่านแล้ว: true,
  },
  {
    id: 4, emoji: '🗺️',
    ข้อความ: 'เจ้าหน้าที่พื้นที่หมู่ 3 ยังไม่มีผู้รับผิดชอบ',
    เวลา: '3 วันที่แล้ว', อ่านแล้ว: true,
  },
]

// เลือก mock ตาม role
function เลือกแจ้งเตือนตามRole(role) {
  if (role === 'volunteer') return แจ้งเตือนของVolunteer
  if (role === 'admin') return แจ้งเตือนของAdmin
  return แจ้งเตือนของUser
}

// ชื่อหัวข้อแยกตาม role
const หัวข้อตามRole = {
  user: 'การแจ้งเตือน',
  volunteer: 'แจ้งเตือนเจ้าหน้าที่',
  admin: 'แจ้งเตือนผู้ดูแลระบบ',
}

function NotificationPage({ user }) {
  const navigate = useNavigate()
  const role = user?.role || 'user'

  // โหลด mock ตาม role ของผู้ใช้ที่ login อยู่
  const [รายการ, setรายการ] = useState(เลือกแจ้งเตือนตามRole(role))

  const ยังไม่อ่าน = รายการ.filter((n) => !n.อ่านแล้ว).length

  function กดอ่าน(id) {
    setรายการ(รายการ.map((n) => n.id === id ? { ...n, อ่านแล้ว: true } : n))
  }

  function อ่านทั้งหมด() {
    setรายการ(รายการ.map((n) => ({ ...n, อ่านแล้ว: true })))
  }

  return (
    <div className="min-h-screen bg-yellow-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
          <div>
            <h1 className="font-bold text-gray-800">{หัวข้อตามRole[role]}</h1>
            {ยังไม่อ่าน > 0 && (
              <p className="text-xs text-orange-500">{ยังไม่อ่าน} รายการยังไม่ได้อ่าน</p>
            )}
          </div>
        </div>
        {ยังไม่อ่าน > 0 && (
          <button onClick={อ่านทั้งหมด} className="text-xs text-blue-500 font-medium">
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Badge บอก role */}
      <div className="px-4 pt-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          role === 'admin' ? 'bg-purple-100 text-purple-700' :
          role === 'volunteer' ? 'bg-orange-100 text-orange-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {role === 'admin' ? '🛡️ แสดงสำหรับ Admin' :
           role === 'volunteer' ? '🦺 แสดงสำหรับเจ้าหน้าที่' :
           '👤 แสดงสำหรับผู้ใช้ทั่วไป'}
        </div>
      </div>

      {/* รายการแจ้งเตือน */}
      <div className="px-4 pt-3 space-y-3">
        {รายการ.map((แจ้งเตือน) => (
          <button
            key={แจ้งเตือน.id}
            onClick={() => กดอ่าน(แจ้งเตือน.id)}
            className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all ${
              แจ้งเตือน.อ่านแล้ว
                ? 'bg-white'
                : 'bg-yellow-50 border-2 border-yellow-200'
            }`}
          >
            <div className="flex items-start gap-3">
              <span className="text-2xl">{แจ้งเตือน.emoji}</span>
              <div className="flex-1">
                <p className={`text-sm ${แจ้งเตือน.อ่านแล้ว ? 'text-gray-600' : 'text-gray-800 font-semibold'}`}>
                  {แจ้งเตือน.ข้อความ}
                </p>
                <p className="text-xs text-gray-400 mt-1">{แจ้งเตือน.เวลา}</p>
              </div>
              {!แจ้งเตือน.อ่านแล้ว && (
                <div className="w-2.5 h-2.5 bg-orange-400 rounded-full mt-1 shrink-0" />
              )}
            </div>
          </button>
        ))}
      </div>

    </div>
  )
}

export default NotificationPage
