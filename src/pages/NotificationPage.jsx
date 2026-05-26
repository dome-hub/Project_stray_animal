// NotificationPage.jsx — หน้าการแจ้งเตือน

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ข้อมูลแจ้งเตือนจำลอง (ในของจริงดึงจาก Database)
const แจ้งเตือนทั้งหมด = [
  { id: 1, ประเภท: 'report', ข้อความ: 'รายงาน #RPT001234 มีผู้รับเลี้ยงสัตว์แล้ว!', เวลา: '2 ชั่วโมงที่แล้ว', อ่านแล้ว: false, emoji: '✅' },
  { id: 2, ประเภท: 'adoption', ข้อความ: 'คำขอรับเลี้ยง "มะม่วง" ได้รับการอนุมัติแล้ว', เวลา: '5 ชั่วโมงที่แล้ว', อ่านแล้ว: false, emoji: '🎉' },
  { id: 3, ประเภท: 'report', ข้อความ: 'รายงาน #RPT001055 เจ้าหน้าที่ลงพื้นที่แล้ว', เวลา: 'เมื่อวาน', อ่านแล้ว: true, emoji: '🦺' },
  { id: 4, ประเภท: 'system', ข้อความ: 'มีสัตว์ใหม่เพิ่มเข้าระบบ 5 ตัว ใกล้บ้านคุณ', เวลา: '2 วันที่แล้ว', อ่านแล้ว: true, emoji: '🐾' },
  { id: 5, ประเภท: 'adoption', ข้อความ: 'คำขอรับเลี้ยง "ส้ม" อยู่ระหว่างการพิจารณา', เวลา: '3 วันที่แล้ว', อ่านแล้ว: true, emoji: '⏳' },
]

function NotificationPage() {
  const navigate = useNavigate()

  // เก็บรายการแจ้งเตือน (อัปเดตสถานะ อ่านแล้ว ได้)
  const [รายการ, setรายการ] = useState(แจ้งเตือนทั้งหมด)

  // จำนวนที่ยังไม่ได้อ่าน
  const ยังไม่อ่าน = รายการ.filter((n) => !n.อ่านแล้ว).length

  // ฟังก์ชันกดอ่านแจ้งเตือน → เปลี่ยนสถานะเป็น อ่านแล้ว
  function กดอ่าน(id) {
    setรายการ(รายการ.map((n) =>
      n.id === id ? { ...n, อ่านแล้ว: true } : n
    ))
  }

  // ฟังก์ชันอ่านทั้งหมด
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
            <h1 className="font-bold text-gray-800">การแจ้งเตือน</h1>
            {/* แสดงจำนวนที่ยังไม่อ่าน */}
            {ยังไม่อ่าน > 0 && (
              <p className="text-xs text-orange-500">{ยังไม่อ่าน} รายการยังไม่ได้อ่าน</p>
            )}
          </div>
        </div>

        {/* ปุ่มอ่านทั้งหมด */}
        {ยังไม่อ่าน > 0 && (
          <button
            onClick={อ่านทั้งหมด}
            className="text-xs text-blue-500 font-medium"
          >
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* รายการแจ้งเตือน */}
      <div className="px-4 pt-4 space-y-3">
        {รายการ.map((แจ้งเตือน) => (
          <button
            key={แจ้งเตือน.id}
            onClick={() => กดอ่าน(แจ้งเตือน.id)}
            className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all ${
              แจ้งเตือน.อ่านแล้ว ? 'bg-white' : 'bg-yellow-50 border-2 border-yellow-200'
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
              {/* จุดสีส้มถ้ายังไม่อ่าน */}
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
