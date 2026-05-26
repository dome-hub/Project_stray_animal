// ProfilePage.jsx — หน้าโปรไฟล์ผู้ใช้
// แสดงข้อมูลส่วนตัว ประวัติการแจ้ง และประวัติการรับเลี้ยง

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ข้อมูลจำลอง (ในของจริงดึงจาก Database ตาม user id)
const ประวัติแจ้ง = [
  { id: 'RPT001234', วันที่: '25 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ไทยผสม', สถานะ: 'มีผู้รับเลี้ยง', emoji: '🐕' },
  { id: 'RPT001055', วันที่: '15 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ผสม', สถานะ: 'กำลังดำเนินการ', emoji: '🐕' },
  { id: 'RPT000998', วันที่: '10 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ไทย', สถานะ: 'รอดำเนินการ', emoji: '🐕' },
]

const ประวัติรับเลี้ยง = [
  { id: 'ADT001', วันที่: '20 พ.ค. 2569', ชื่อสัตว์: 'มะม่วง', สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', สถานะ: 'อนุมัติแล้ว', emoji: '🐕' },
  { id: 'ADT002', วันที่: '18 พ.ค. 2569', ชื่อสัตว์: 'ส้ม', สายพันธุ์: 'แมวส้ม', สถานะ: 'รอพิจารณา', emoji: '🐈' },
]

// สีของแต่ละสถานะ
const สีสถานะ = {
  'มีผู้รับเลี้ยง': 'text-green-600 bg-green-50',
  'กำลังดำเนินการ': 'text-blue-600 bg-blue-50',
  'รอดำเนินการ': 'text-yellow-600 bg-yellow-50',
  'อนุมัติแล้ว': 'text-green-600 bg-green-50',
  'รอพิจารณา': 'text-orange-600 bg-orange-50',
}

function ProfilePage({ user }) {
  const navigate = useNavigate()

  // แท็บที่เลือก: 'info', 'reports', 'adoptions'
  const [แท็บ, setแท็บ] = useState('info')

  // เบอร์ติดต่อ — เก็บเบอร์โทรและสถานะว่ากำลังแก้ไขอยู่ไหม
  const [เบอร์ติดต่อ, setเบอร์ติดต่อ] = useState('081-234-5678')
  const [กำลังแก้ไขเบอร์, setกำลังแก้ไขเบอร์] = useState(false)
  const [เบอร์ชั่วคราว, setเบอร์ชั่วคราว] = useState('')  // เก็บค่าระหว่างแก้ไข

  return (
    <div className="min-h-screen bg-blue-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <h1 className="font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
      </div>

      {/* ข้อมูลผู้ใช้ */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm text-center">
        <div className="text-6xl mb-3">👤</div>
        <h2 className="text-xl font-bold text-gray-800">{user?.name || 'ผู้ใช้งาน'}</h2>
        <p className="text-gray-500 text-sm mt-1">{user?.email || 'user@gmail.com'}</p>
        <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mt-2">
          👤 ผู้ใช้งานทั่วไป
        </div>

        {/* สถิติย่อ */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">{ประวัติแจ้ง.length}</p>
            <p className="text-xs text-gray-500">รายงานที่ส่ง</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">{ประวัติรับเลี้ยง.length}</p>
            <p className="text-xs text-gray-500">คำขอรับเลี้ยง</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">1</p>
            <p className="text-xs text-gray-500">อนุมัติแล้ว</p>
          </div>
        </div>
      </div>

      {/* แท็บสลับ */}
      <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'info', ชื่อ: 'ข้อมูล' },
          { key: 'reports', ชื่อ: 'ประวัติแจ้ง' },
          { key: 'adoptions', ชื่อ: 'ประวัติรับเลี้ยง' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setแท็บ(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              แท็บ === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.ชื่อ}
          </button>
        ))}
      </div>

      {/* เนื้อหาแท็บ: ข้อมูลส่วนตัว */}
      {แท็บ === 'info' && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
          <div className="space-y-3">

            {/* ชื่อ */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ชื่อ</span>
              <span className="text-sm font-medium text-gray-800">{user?.name}</span>
            </div>

            {/* อีเมล */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">อีเมล</span>
              <span className="text-sm font-medium text-gray-800">{user?.email}</span>
            </div>

            {/* เบอร์ติดต่อ — แก้ไขได้ */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">เบอร์ติดต่อ</span>
              <div className="flex items-center gap-2">
                {กำลังแก้ไขเบอร์ ? (
                  // โหมดแก้ไข — แสดง input + ปุ่มบันทึก
                  <>
                    <input
                      value={เบอร์ชั่วคราว}
                      onChange={(e) => setเบอร์ชั่วคราว(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="border border-blue-300 rounded-lg px-2 py-1 text-sm text-right w-36 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={() => {
                        // กดบันทึก → เก็บค่าใหม่ + ปิดโหมดแก้ไข
                        setเบอร์ติดต่อ(เบอร์ชั่วคราว)
                        setกำลังแก้ไขเบอร์(false)
                      }}
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg"
                    >
                      บันทึก
                    </button>
                  </>
                ) : (
                  // โหมดแสดงผล — แสดงเบอร์ + ปุ่มแก้ไข
                  <>
                    <span className="text-sm font-medium text-gray-800">{เบอร์ติดต่อ}</span>
                    <button
                      onClick={() => {
                        // กดแก้ไข → เปิดโหมดแก้ไข + ใส่ค่าเดิมลงใน input
                        setเบอร์ชั่วคราว(เบอร์ติดต่อ)
                        setกำลังแก้ไขเบอร์(true)
                      }}
                      className="text-xs text-blue-500 hover:text-blue-700"
                    >
                      แก้ไข
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* วันที่สมัคร */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">สมัครเมื่อ</span>
              <span className="text-sm font-medium text-gray-800">25 พ.ค. 2569</span>
            </div>
          </div>
        </div>
      )}

      {/* เนื้อหาแท็บ: ประวัติแจ้งสัตว์ */}
      {แท็บ === 'reports' && (
        <div className="px-4 mt-4 space-y-3">
          {ประวัติแจ้ง.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.สัตว์}</p>
                    <p className="text-xs text-gray-400">{r.วันที่} • #{r.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีสถานะ[r.สถานะ]}`}>
                  {r.สถานะ}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* เนื้อหาแท็บ: ประวัติรับเลี้ยง */}
      {แท็บ === 'adoptions' && (
        <div className="px-4 mt-4 space-y-3">
          {ประวัติรับเลี้ยง.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{a.ชื่อสัตว์} — {a.สายพันธุ์}</p>
                    <p className="text-xs text-gray-400">{a.วันที่} • #{a.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีสถานะ[a.สถานะ]}`}>
                  {a.สถานะ}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default ProfilePage
