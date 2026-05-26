// AdminPage.jsx — หน้าสำหรับผู้ดูแลระบบ
// มี 5 หน้าย่อย: dashboard, users, areas, export, settings

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ข้อมูลผู้ใช้ในระบบ (จำลอง)
const ผู้ใช้ทั้งหมด = [
  { id: 1, ชื่อ: 'สมชาย ใจดี', อีเมล: 'somchai@gmail.com', role: 'user', สถานะ: 'ใช้งาน', สมัคร: '1 ม.ค. 2569' },
  { id: 2, ชื่อ: 'สมหญิง รักสัตว์', อีเมล: 'somying@gmail.com', role: 'volunteer', สถานะ: 'ใช้งาน', สมัคร: '15 ม.ค. 2569' },
  { id: 3, ชื่อ: 'วิชัย เก่งงาน', อีเมล: 'wichai@gmail.com', role: 'user', สถานะ: 'ระงับ', สมัคร: '20 ม.ค. 2569' },
  { id: 4, ชื่อ: 'มาลี ช่วยสัตว์', อีเมล: 'malee@gmail.com', role: 'volunteer', สถานะ: 'ใช้งาน', สมัคร: '1 ก.พ. 2569' },
]

// สีของแต่ละ Role
const สีRole = {
  user:      'bg-blue-50 text-blue-700',
  volunteer: 'bg-orange-50 text-orange-700',
  admin:     'bg-purple-50 text-purple-700',
}

function AdminPage({ หน้า }) {
  const navigate = useNavigate()

  // State สำหรับจัดการผู้ใช้
  const [รายการผู้ใช้, setรายการผู้ใช้] = useState(ผู้ใช้ทั้งหมด)
  const [ค้นหาผู้ใช้, setค้นหาผู้ใช้] = useState('')

  // กรองผู้ใช้ตามคำค้นหา
  const ผู้ใช้กรอง = รายการผู้ใช้.filter((u) =>
    u.ชื่อ.includes(ค้นหาผู้ใช้) || u.อีเมล.includes(ค้นหาผู้ใช้)
  )

  // ฟังก์ชันเปลี่ยน Role ของผู้ใช้
  function เปลี่ยนRole(id, roleใหม่) {
    setรายการผู้ใช้(รายการผู้ใช้.map((u) =>
      u.id === id ? { ...u, role: roleใหม่ } : u
    ))
  }

  // ฟังก์ชันระงับ/ยกเลิกระงับบัญชี
  function สลับสถานะ(id) {
    setรายการผู้ใช้(รายการผู้ใช้.map((u) =>
      u.id === id ? { ...u, สถานะ: u.สถานะ === 'ใช้งาน' ? 'ระงับ' : 'ใช้งาน' } : u
    ))
  }

  const titleMap = {
    dashboard: 'ภาพรวมระบบ',
    users: 'จัดการผู้ใช้งาน',
    areas: 'จัดการพื้นที่',
    export: 'Export รายงาน',
    settings: 'ตั้งค่าระบบ',
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-purple-600">🛡️ ผู้ดูแลระบบ</p>
        </div>
      </div>

      {/* ---- Dashboard ---- */}
      {หน้า === 'dashboard' && (
        <div className="px-4 pt-4 space-y-4">

          {/* สถิติหลัก */}
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'ผู้ใช้งานทั้งหมด', ค่า: '128', emoji: '👥', สี: 'bg-blue-50 text-blue-600' },
              { ชื่อ: 'รายงานทั้งหมด', ค่า: '342', emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
              { ชื่อ: 'สัตว์ในระบบ', ค่า: '87', emoji: '🐾', สี: 'bg-green-50 text-green-600' },
              { ชื่อ: 'รับเลี้ยงแล้ว', ค่า: '61', emoji: '❤️', สี: 'bg-red-50 text-red-600' },
            ].map((stat) => (
              <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                <p className="text-3xl mb-1">{stat.emoji}</p>
                <p className={`text-3xl font-bold ${stat.สี.split(' ')[1]}`}>{stat.ค่า}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
              </div>
            ))}
          </div>

          {/* สถิติย่อย */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-3">สรุปเดือนนี้</p>
            <div className="space-y-3">
              {[
                { ชื่อ: 'รายงานใหม่', ค่า: 24, สูงสุด: 50, สี: 'bg-orange-400' },
                { ชื่อ: 'การรับเลี้ยง', ค่า: 8, สูงสุด: 20, สี: 'bg-green-400' },
                { ชื่อ: 'ผู้ใช้ใหม่', ค่า: 15, สูงสุด: 30, สี: 'bg-blue-400' },
              ].map((item) => (
                <div key={item.ชื่อ}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{item.ชื่อ}</span>
                    <span className="font-semibold">{item.ค่า}</span>
                  </div>
                  {/* Progress bar */}
                  <div className="w-full h-2 bg-gray-100 rounded-full">
                    <div
                      className={`h-2 rounded-full ${item.สี}`}
                      style={{ width: `${(item.ค่า / item.สูงสุด) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* อัตราการรับเลี้ยง */}
          <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
            <p className="text-gray-500 text-sm mb-1">อัตราการรับเลี้ยงสำเร็จ</p>
            <p className="text-4xl font-bold text-green-600">70%</p>
            <p className="text-xs text-gray-400 mt-1">61 จาก 87 ตัวในระบบ</p>
          </div>

        </div>
      )}

      {/* ---- จัดการผู้ใช้ ---- */}
      {หน้า === 'users' && (
        <div className="px-4 pt-4 space-y-4">

          {/* ช่องค้นหา */}
          <input
            value={ค้นหาผู้ใช้}
            onChange={(e) => setค้นหาผู้ใช้(e.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none"
          />

          <p className="text-sm text-gray-500">ทั้งหมด {ผู้ใช้กรอง.length} คน</p>

          {/* รายการผู้ใช้ */}
          {ผู้ใช้กรอง.map((u) => (
            <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-gray-800">{u.ชื่อ}</p>
                  <p className="text-xs text-gray-500">{u.อีเมล}</p>
                  <p className="text-xs text-gray-400">สมัคร {u.สมัคร}</p>
                </div>
                {/* สถานะบัญชี */}
                <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                  u.สถานะ === 'ใช้งาน' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                }`}>
                  {u.สถานะ}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Dropdown เปลี่ยน Role */}
                <select
                  value={u.role}
                  onChange={(e) => เปลี่ยนRole(u.id, e.target.value)}
                  className={`flex-1 text-xs px-2 py-1.5 rounded-lg border-0 font-medium ${สีRole[u.role]}`}
                >
                  <option value="user">👤 ผู้ใช้งาน</option>
                  <option value="volunteer">🦺 เจ้าหน้าที่</option>
                  <option value="admin">🛡️ Admin</option>
                </select>

                {/* ปุ่มระงับ/ยกเลิกระงับ */}
                <button
                  onClick={() => สลับสถานะ(u.id)}
                  className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                    u.สถานะ === 'ใช้งาน'
                      ? 'bg-red-50 text-red-600'
                      : 'bg-green-50 text-green-600'
                  }`}
                >
                  {u.สถานะ === 'ใช้งาน' ? 'ระงับ' : 'ยกเลิกระงับ'}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- จัดการพื้นที่ ---- */}
      {หน้า === 'areas' && (
        <div className="px-4 pt-4 space-y-4">

          {/* แสดงจังหวัดและตำบลที่รับผิดชอบ */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-600 mb-1">📍 ขอบเขตพื้นที่ของระบบ</p>
            <p className="text-sm font-semibold text-gray-800">จังหวัดนครปฐม</p>
            <p className="text-sm text-gray-600">ตำบลกำแพงแสน</p>
          </div>

          {/* รายการพื้นที่ย่อยในตำบลกำแพงแสน */}
          {[
            { พื้นที่: 'หมู่ 1 — บ้านกำแพงแสน', เจ้าหน้าที่: 'สมหญิง รักสัตว์', สัตว์: 8 },
            { พื้นที่: 'หมู่ 2 — บ้านดอนข่อย', เจ้าหน้าที่: 'มาลี ช่วยสัตว์', สัตว์: 5 },
            { พื้นที่: 'หมู่ 3 — บ้านหนองกระทุ่ม', เจ้าหน้าที่: 'ยังไม่มีเจ้าหน้าที่', สัตว์: 3 },
            { พื้นที่: 'หมู่ 4 — บ้านโคกพระเจดีย์', เจ้าหน้าที่: 'ยังไม่มีเจ้าหน้าที่', สัตว์: 2 },
          ].map((area, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-sm">🗺️ {area.พื้นที่}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    🦺 {area.เจ้าหน้าที่}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    🐾 สัตว์ในพื้นที่ {area.สัตว์} ตัว
                  </p>
                </div>
                <button className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg">
                  แก้ไข
                </button>
              </div>
            </div>
          ))}

          {/* สรุปรวม */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">สัตว์ทั้งหมดในพื้นที่</span>
              <span className="font-bold text-gray-800">18 ตัว</span>
            </div>
            <div className="flex justify-between text-sm mt-2">
              <span className="text-gray-500">เจ้าหน้าที่ที่รับผิดชอบ</span>
              <span className="font-bold text-gray-800">2 คน</span>
            </div>
          </div>

        </div>
      )}

      {/* ---- Export รายงาน ---- */}
      {หน้า === 'export' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500">เลือกข้อมูลที่ต้องการ Export</p>
          {[
            { ชื่อ: 'รายงานสัตว์จรทั้งหมด', รายละเอียด: '342 รายการ', emoji: '📋', สี: 'bg-orange-50' },
            { ชื่อ: 'ข้อมูลสัตว์ในระบบ', รายละเอียด: '87 ตัว', emoji: '🐾', สี: 'bg-green-50' },
            { ชื่อ: 'ประวัติการรับเลี้ยง', รายละเอียด: '61 รายการ', emoji: '❤️', สี: 'bg-red-50' },
            { ชื่อ: 'ข้อมูลผู้ใช้งาน', รายละเอียด: '128 คน', emoji: '👥', สี: 'bg-blue-50' },
          ].map((item, i) => (
            <div key={i} className={`${item.สี} rounded-2xl p-4 shadow-sm flex items-center justify-between`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{item.emoji}</span>
                <div>
                  <p className="font-medium text-gray-800 text-sm">{item.ชื่อ}</p>
                  <p className="text-xs text-gray-500">{item.รายละเอียด}</p>
                </div>
              </div>
              <button className="text-xs bg-white text-gray-600 px-3 py-1.5 rounded-lg shadow-sm font-medium">
                📥 CSV
              </button>
            </div>
          ))}
        </div>
      )}

      {/* ---- ตั้งค่าระบบ ---- */}
      {หน้า === 'settings' && (
        <div className="px-4 pt-4 space-y-4">
          {[
            { ชื่อ: 'การแจ้งเตือน', ค่า: 'เปิดใช้งาน', emoji: '🔔' },
            { ชื่อ: 'ภาษาระบบ', ค่า: 'ภาษาไทย', emoji: '🌐' },
            { ชื่อ: 'เวอร์ชันระบบ', ค่า: 'v1.0.0', emoji: '⚙️' },
            { ชื่อ: 'สำรองข้อมูล', ค่า: 'ทุกวัน 00:00 น.', emoji: '💾' },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="text-xl">{item.emoji}</span>
                <span className="text-sm font-medium text-gray-800">{item.ชื่อ}</span>
              </div>
              <span className="text-sm text-gray-500">{item.ค่า}</span>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default AdminPage
