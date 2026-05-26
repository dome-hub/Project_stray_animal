// AdminPage.jsx — หน้าสำหรับผู้ดูแลระบบ
// เชื่อม Supabase จริง ไม่มี mock data

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// สีของแต่ละ Role
const สีRole = {
  user:      'bg-blue-50 text-blue-700',
  volunteer: 'bg-orange-50 text-orange-700',
  admin:     'bg-purple-50 text-purple-700',
}

function AdminPage({ หน้า }) {
  const navigate = useNavigate()

  // ---- State: Dashboard ----
  const [สถิติ, setSถิติ] = useState({ ผู้ใช้: 0, รายงาน: 0, สัตว์: 0, รับเลี้ยง: 0 })
  const [สถิติเดือน, setSถิติเดือน] = useState({ รายงาน: 0, รับเลี้ยง: 0, ผู้ใช้ใหม่: 0 })
  const [โหลดDashboard, setโหลดDashboard] = useState(true)

  // ---- State: Users ----
  const [รายการผู้ใช้, setรายการผู้ใช้] = useState([])
  const [ค้นหาผู้ใช้, setค้นหาผู้ใช้] = useState('')
  const [โหลดผู้ใช้, setโหลดผู้ใช้] = useState(true)

  // ---- State: Export ----
  const [จำนวนExport, setจำนวนExport] = useState({ รายงาน: 0, สัตว์: 0, ผู้ใช้: 0 })
  const [โหลดExport, setโหลดExport] = useState(true)

  // ---- ดึงสถิติ Dashboard ----
  useEffect(function () {
    if (หน้า !== 'dashboard') return
    async function ดึงDashboard() {
      setโหลดDashboard(true)

      // วันแรกของเดือนนี้
      const startOfMonth = new Date()
      startOfMonth.setDate(1)
      startOfMonth.setHours(0, 0, 0, 0)

      const [ร1, ร2, ร3, ร4, ร5, ร6, ร7] = await Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
        // เดือนนี้
        supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง').gte('created_at', startOfMonth.toISOString()),
        supabase.from('users').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      ])

      setSถิติ({
        ผู้ใช้:    ร1.count || 0,
        รายงาน:   ร2.count || 0,
        สัตว์:     ร3.count || 0,
        รับเลี้ยง: ร4.count || 0,
      })
      setSถิติเดือน({
        รายงาน:    ร5.count || 0,
        รับเลี้ยง:  ร6.count || 0,
        ผู้ใช้ใหม่: ร7.count || 0,
      })
      setโหลดDashboard(false)
    }
    ดึงDashboard()
  }, [หน้า])

  // ---- ดึงรายชื่อผู้ใช้ ----
  useEffect(function () {
    if (หน้า !== 'users') return
    ดึงผู้ใช้()
  }, [หน้า])

  async function ดึงผู้ใช้() {
    setโหลดผู้ใช้(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setรายการผู้ใช้(data)
    setโหลดผู้ใช้(false)
  }

  // เปลี่ยน Role → อัปเดตใน Supabase จริง
  async function เปลี่ยนRole(id, roleใหม่) {
    const { error } = await supabase
      .from('users')
      .update({ role: roleใหม่ })
      .eq('id', id)
    if (!error) {
      setรายการผู้ใช้(รายการผู้ใช้.map((u) =>
        u.id === id ? { ...u, role: roleใหม่ } : u
      ))
    } else {
      alert('เปลี่ยน Role ไม่สำเร็จ: ' + error.message)
    }
  }

  // ระงับ / ยกเลิกระงับบัญชี → อัปเดตใน Supabase จริง
  async function สลับสถานะ(id, สถานะปัจจุบัน) {
    const สถานะใหม่ = สถานะปัจจุบัน === 'suspended' ? 'active' : 'suspended'
    const { error } = await supabase
      .from('users')
      .update({ status: สถานะใหม่ })
      .eq('id', id)
    if (!error) {
      setรายการผู้ใช้(รายการผู้ใช้.map((u) =>
        u.id === id ? { ...u, status: สถานะใหม่ } : u
      ))
    } else {
      alert('เปลี่ยนสถานะไม่สำเร็จ: ' + error.message)
    }
  }

  // ---- ดึงจำนวนสำหรับ Export ----
  useEffect(function () {
    if (หน้า !== 'export') return
    async function ดึงExport() {
      setโหลดExport(true)
      const [ร1, ร2, ร3] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('users').select('id', { count: 'exact', head: true }),
      ])
      setจำนวนExport({
        รายงาน: ร1.count || 0,
        สัตว์:   ร2.count || 0,
        ผู้ใช้:  ร3.count || 0,
      })
      setโหลดExport(false)
    }
    ดึงExport()
  }, [หน้า])

  // Export ข้อมูลเป็น CSV จริง
  async function exportCSV(ตาราง, ชื่อไฟล์) {
    const { data, error } = await supabase
      .from(ตาราง)
      .select('*')
      .order('created_at', { ascending: false })

    if (error) { alert('ดึงข้อมูลไม่สำเร็จ: ' + error.message); return }
    if (!data || data.length === 0) { alert('ยังไม่มีข้อมูลในตารางนี้'); return }

    const headers = Object.keys(data[0]).join(',')
    const rows = data.map((row) =>
      Object.values(row)
        .map((v) => `"${String(v ?? '').replace(/"/g, '""')}"`)
        .join(',')
    )
    const csv = '﻿' + [headers, ...rows].join('\n') // BOM สำหรับ Excel ภาษาไทย

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `${ชื่อไฟล์}_${new Date().toLocaleDateString('th-TH')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // แปลงวันที่
  function แปลงวันที่(str) {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric'
    })
  }

  // กรองผู้ใช้ตามคำค้นหา
  const ผู้ใช้กรอง = รายการผู้ใช้.filter((u) =>
    (u.name  || '').toLowerCase().includes(ค้นหาผู้ใช้.toLowerCase()) ||
    (u.email || '').toLowerCase().includes(ค้นหาผู้ใช้.toLowerCase())
  )

  // อัตราการรับเลี้ยง
  const อัตรา = สถิติ.สัตว์ > 0
    ? Math.round((สถิติ.รับเลี้ยง / สถิติ.สัตว์) * 100)
    : 0

  const titleMap = {
    dashboard: 'ภาพรวมระบบ',
    users:     'จัดการผู้ใช้งาน',
    areas:     'จัดการพื้นที่',
    export:    'Export รายงาน',
    settings:  'ตั้งค่าระบบ',
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

      {/* ======== Dashboard ======== */}
      {หน้า === 'dashboard' && (
        <div className="px-4 pt-4 space-y-4">

          {โหลดDashboard ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
            </div>
          ) : (
            <>
              {/* สถิติหลัก 4 กล่อง */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { ชื่อ: 'ผู้ใช้งานทั้งหมด', ค่า: สถิติ.ผู้ใช้,    emoji: '👥', สี: 'bg-blue-50 text-blue-600' },
                  { ชื่อ: 'รายงานทั้งหมด',    ค่า: สถิติ.รายงาน,   emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
                  { ชื่อ: 'สัตว์ในระบบ',       ค่า: สถิติ.สัตว์,    emoji: '🐾', สี: 'bg-green-50 text-green-600' },
                  { ชื่อ: 'รับเลี้ยงแล้ว',     ค่า: สถิติ.รับเลี้ยง, emoji: '❤️', สี: 'bg-red-50 text-red-600' },
                ].map((stat) => (
                  <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                    <p className="text-3xl mb-1">{stat.emoji}</p>
                    <p className={`text-3xl font-bold ${stat.สี.split(' ')[1]}`}>{stat.ค่า}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
                  </div>
                ))}
              </div>

              {/* สรุปเดือนนี้ */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-gray-800 mb-3">สรุปเดือนนี้</p>
                <div className="space-y-3">
                  {[
                    { ชื่อ: 'รายงานใหม่',   ค่า: สถิติเดือน.รายงาน,    สี: 'bg-orange-400' },
                    { ชื่อ: 'การรับเลี้ยง', ค่า: สถิติเดือน.รับเลี้ยง,  สี: 'bg-green-400' },
                    { ชื่อ: 'ผู้ใช้ใหม่',   ค่า: สถิติเดือน.ผู้ใช้ใหม่, สี: 'bg-blue-400' },
                  ].map((item) => (
                    <div key={item.ชื่อ}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.ชื่อ}</span>
                        <span className="font-semibold">{item.ค่า} รายการ</span>
                      </div>
                      <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-2 rounded-full transition-all ${item.สี}`}
                          style={{ width: item.ค่า > 0 ? `${Math.min(item.ค่า * 5, 100)}%` : '4px' }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* อัตราการรับเลี้ยง */}
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <p className="text-gray-500 text-sm mb-1">อัตราการรับเลี้ยงสำเร็จ</p>
                <p className="text-4xl font-bold text-green-600">{อัตรา}%</p>
                <p className="text-xs text-gray-400 mt-1">
                  {สถิติ.รับเลี้ยง} จาก {สถิติ.สัตว์} ตัวในระบบ
                </p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======== จัดการผู้ใช้ ======== */}
      {หน้า === 'users' && (
        <div className="px-4 pt-4 space-y-4">

          <input
            value={ค้นหาผู้ใช้}
            onChange={(e) => setค้นหาผู้ใช้(e.target.value)}
            placeholder="ค้นหาชื่อหรืออีเมล..."
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-purple-400"
          />

          {โหลดผู้ใช้ ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500">ทั้งหมด {ผู้ใช้กรอง.length} คน</p>

              {ผู้ใช้กรอง.length === 0 && (
                <div className="text-center py-12 text-gray-400">
                  <p className="text-5xl mb-3">👥</p>
                  <p className="font-medium text-gray-500">ยังไม่มีผู้ใช้ในระบบ</p>
                  <p className="text-xs mt-1">ผู้ใช้จะปรากฏหลังจาก Login ด้วย Auth จริง</p>
                </div>
              )}

              {ผู้ใช้กรอง.map((u) => (
                <div key={u.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-800">{u.name || '(ไม่ระบุชื่อ)'}</p>
                      <p className="text-xs text-gray-500">{u.email}</p>
                      <p className="text-xs text-gray-400">สมัคร {แปลงวันที่(u.created_at)}</p>
                    </div>
                    {/* Badge สถานะบัญชี */}
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                      u.status === 'suspended'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-green-50 text-green-600'
                    }`}>
                      {u.status === 'suspended' ? 'ระงับ' : 'ใช้งาน'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Dropdown เปลี่ยน Role → บันทึกลง Supabase */}
                    <select
                      value={u.role || 'user'}
                      onChange={(e) => เปลี่ยนRole(u.id, e.target.value)}
                      className={`flex-1 text-xs px-2 py-1.5 rounded-lg border-0 font-medium ${สีRole[u.role] || สีRole.user}`}
                    >
                      <option value="user">👤 ผู้ใช้งาน</option>
                      <option value="volunteer">🦺 เจ้าหน้าที่</option>
                      <option value="admin">🛡️ Admin</option>
                    </select>

                    {/* ปุ่มระงับ / ยกเลิกระงับ → บันทึกลง Supabase */}
                    <button
                      onClick={() => สลับสถานะ(u.id, u.status || 'active')}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium ${
                        u.status === 'suspended'
                          ? 'bg-green-50 text-green-600'
                          : 'bg-red-50 text-red-600'
                      }`}
                    >
                      {u.status === 'suspended' ? 'ยกเลิกระงับ' : 'ระงับ'}
                    </button>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ======== จัดการพื้นที่ ======== */}
      {หน้า === 'areas' && (
        <div className="px-4 pt-4 space-y-4">

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-600 mb-1">📍 ขอบเขตพื้นที่ของระบบ</p>
            <p className="text-sm font-semibold text-gray-800">จังหวัดนครปฐม</p>
            <p className="text-sm text-gray-600">ตำบลกำแพงแสน</p>
          </div>

          {[
            'หมู่ 1 — บ้านกำแพงแสน',
            'หมู่ 2 — บ้านดอนข่อย',
            'หมู่ 3 — บ้านหนองกระทุ่ม',
            'หมู่ 4 — บ้านโคกพระเจดีย์',
          ].map((พื้นที่, i) => (
            <div key={i} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800 text-sm">🗺️ {พื้นที่}</p>
                  <p className="text-xs text-gray-400 mt-0.5">🦺 ยังไม่ได้กำหนดเจ้าหน้าที่</p>
                </div>
                <button className="text-xs bg-purple-50 text-purple-600 px-3 py-1.5 rounded-lg font-medium">
                  แก้ไข
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== Export รายงาน ======== */}
      {หน้า === 'export' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500">ดึงข้อมูลจริงจาก Supabase แล้ว Export เป็น CSV</p>

          {โหลดExport ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังนับข้อมูล...</p>
            </div>
          ) : (
            <>
              {[
                { ชื่อ: 'รายงานสัตว์จรทั้งหมด', จำนวน: `${จำนวนExport.รายงาน} รายการ`, emoji: '📋', สี: 'bg-orange-50', ตาราง: 'reports',  ชื่อไฟล์: 'รายงาน' },
                { ชื่อ: 'ข้อมูลสัตว์ในระบบ',    จำนวน: `${จำนวนExport.สัตว์} ตัว`,    emoji: '🐾', สี: 'bg-green-50',  ตาราง: 'animals',  ชื่อไฟล์: 'สัตว์' },
                { ชื่อ: 'ข้อมูลผู้ใช้งาน',      จำนวน: `${จำนวนExport.ผู้ใช้} คน`,   emoji: '👥', สี: 'bg-blue-50',   ตาราง: 'users',    ชื่อไฟล์: 'ผู้ใช้งาน' },
              ].map((item, i) => (
                <div key={i} className={`${item.สี} rounded-2xl p-4 shadow-sm flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{item.emoji}</span>
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.ชื่อ}</p>
                      <p className="text-xs text-gray-500">{item.จำนวน}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => exportCSV(item.ตาราง, item.ชื่อไฟล์)}
                    className="text-xs bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-medium flex items-center gap-1"
                  >
                    📥 CSV
                  </button>
                </div>
              ))}

              <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700">💡 เกี่ยวกับไฟล์ CSV</p>
                <p>• ไฟล์จะดาวน์โหลดอัตโนมัติ</p>
                <p>• รองรับ Excel (UTF-8 BOM)</p>
                <p>• ข้อมูลจริงจาก Supabase ณ เวลาที่กด</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* ======== ตั้งค่าระบบ ======== */}
      {หน้า === 'settings' && (
        <div className="px-4 pt-4 space-y-4">
          {[
            { ชื่อ: 'การแจ้งเตือน', ค่า: 'เปิดใช้งาน',         emoji: '🔔' },
            { ชื่อ: 'ภาษาระบบ',     ค่า: 'ภาษาไทย',            emoji: '🌐' },
            { ชื่อ: 'เวอร์ชันระบบ', ค่า: 'v1.0.0',              emoji: '⚙️' },
            { ชื่อ: 'ฐานข้อมูล',    ค่า: 'Supabase (PostgreSQL)', emoji: '🗄️' },
            { ชื่อ: 'สำรองข้อมูล',  ค่า: 'Supabase Auto Backup', emoji: '💾' },
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
