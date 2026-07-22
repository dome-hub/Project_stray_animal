// AdminPage.jsx — หน้าสำหรับผู้ดูแลระบบ
// เชื่อม Supabase จริง ไม่มี mock data

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import {
  Shield, Users, FileText, PawPrint, Heart, User, HardHat, MapPin, Map,
  Download, Lightbulb, Bell, Globe, Settings, Database, Save, Ban,
  CheckCircle2, Home, Lock, ArrowLeft
} from 'lucide-react'
import { supabase } from '../supabase'

// แก้ปัญหา Leaflet หาไอคอนหมุดไม่เจอตอน build ผ่าน Vite
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// ศูนย์กลางตำบลกำแพงแสน อ.กำแพงแสน จ.นครปฐม
const ศูนย์กลางแผนที่ = [14.0206, 99.9673]

// สีของแต่ละ Role
const สีRole = {
  user:      'bg-blue-50 text-blue-700',
  volunteer: 'bg-orange-50 text-orange-700',
  admin:     'bg-purple-50 text-purple-700',
}

function AdminPage({ หน้า, user }) {
  const navigate = useNavigate()

  // ---- State: Dashboard ----
  const [สถิติ, setSถิติ] = useState({ ผู้ใช้: 0, รายงาน: 0, สัตว์: 0, รับเลี้ยง: 0 })
  const [สถิติเดือน, setSถิติเดือน] = useState({ รายงาน: 0, รับเลี้ยง: 0, ผู้ใช้ใหม่: 0 })
  const [โหลดDashboard, setโหลดDashboard] = useState(true)

  // ---- State: Users ----
  const [รายการผู้ใช้, setรายการผู้ใช้] = useState([])
  const [ค้นหาผู้ใช้, setค้นหาผู้ใช้] = useState('')
  const [โหลดผู้ใช้, setโหลดผู้ใช้] = useState(true)

  // ---- State: User Detail Sheet ----
  const [userที่เลือก,   setUserที่เลือก]   = useState(null)
  const [userDetail,     setUserDetail]     = useState(null)
  const [โหลดDetail,    setโหลดDetail]    = useState(false)

  // ---- State: Export ----
  const [จำนวนExport, setจำนวนExport] = useState({ รายงาน: 0, สัตว์: 0, ผู้ใช้: 0 })
  const [โหลดExport, setโหลดExport] = useState(true)

  // ---- State: แผนที่รายงาน (พื้นที่) ----
  const [รายงานพิกัด, setรายงานพิกัด] = useState([])
  const [โหลดแผนที่, setโหลดแผนที่] = useState(true)

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

  // ---- เปิด User Detail Sheet ----
  async function เปิดUserDetail(u) {
    setUserที่เลือก(u)
    setUserDetail(null)
    setโหลดDetail(true)

    // ดึงข้อมูลเพิ่มเติม: นับรายงาน + ข้อมูลศูนย์พักพิง
    const [ร1] = await Promise.all([
      supabase
        .from('reports')
        .select('id', { count: 'exact', head: true })
        .eq('reporter_id', u.id),
    ])

    setUserDetail({
      รายงานทั้งหมด: ร1.count || 0,
    })
    setโหลดDetail(false)
  }

  // ---- ดึงรายงานที่มีพิกัด GPS สำหรับปักหมุดบนแผนที่ ----
  useEffect(function () {
    if (หน้า !== 'areas') return
    async function ดึงรายงานพิกัด() {
      setโหลดแผนที่(true)
      const { data, error } = await supabase
        .from('reports')
        .select('id, animal_type, location_text, detail, status, latitude, longitude, created_at')
        .not('latitude', 'is', null)
        .not('longitude', 'is', null)
      if (!error && data) setรายงานพิกัด(data)
      setโหลดแผนที่(false)
    }
    ดึงรายงานพิกัด()
  }, [หน้า])

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
        <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-purple-600 flex items-center gap-1"><Shield size={12} className="shrink-0" /> ผู้ดูแลระบบ</p>
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
                  { ชื่อ: 'ผู้ใช้งานทั้งหมด', ค่า: สถิติ.ผู้ใช้,    Icon: Users,    สี: 'bg-blue-50 text-blue-600' },
                  { ชื่อ: 'รายงานทั้งหมด',    ค่า: สถิติ.รายงาน,   Icon: FileText, สี: 'bg-orange-50 text-orange-600' },
                  { ชื่อ: 'สัตว์ในระบบ',       ค่า: สถิติ.สัตว์,    Icon: PawPrint, สี: 'bg-green-50 text-green-600' },
                  { ชื่อ: 'รับเลี้ยงแล้ว',     ค่า: สถิติ.รับเลี้ยง, Icon: Heart,    สี: 'bg-red-50 text-red-600' },
                ].map((stat) => (
                  <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                    <stat.Icon size={26} strokeWidth={1.5} className={`mb-1 ${stat.สี.split(" ")[1]}`} />
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
                  <Users size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
                  <p className="font-medium text-gray-500">ยังไม่มีผู้ใช้ในระบบ</p>
                  <p className="text-xs mt-1">ผู้ใช้จะปรากฏหลังจาก Login ด้วย Auth จริง</p>
                </div>
              )}

              {ผู้ใช้กรอง.map((u) => {
                const คือตัวเอง = u.id === user?.id
                return (
                  <div
                    key={u.id}
                    onClick={() => เปิดUserDetail(u)}
                    className={`bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all cursor-pointer ${คือตัวเอง ? 'ring-2 ring-purple-200' : ''}`}
                  >
                    <div className="flex items-center gap-3">
                      {/* Avatar */}
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0">
                        {u.avatar_url
                          ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                          : <User size={20} className="text-gray-400" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-bold text-gray-800 text-sm truncate">{u.name || '(ไม่ระบุชื่อ)'}</p>
                          {คือตัวเอง && (
                            <span className="text-xs bg-purple-100 text-purple-600 px-1.5 py-0.5 rounded-full shrink-0">คุณ</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{u.email}</p>
                        <p className="text-xs text-gray-400">สมัคร {แปลงวันที่(u.created_at)}</p>
                      </div>
                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${u.status === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                          {u.status === 'suspended' ? 'ระงับ' : 'ใช้งาน'}
                        </span>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${สีRole[u.role] || สีRole.user}`}>
                          {u.role === 'admin' ? <><Shield size={11} className="shrink-0" /> Admin</> : u.role === 'volunteer' ? <><HardHat size={11} className="shrink-0" /> เจ้าหน้าที่</> : <><User size={11} className="shrink-0" /> ผู้ใช้</>}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ======== จัดการพื้นที่ ======== */}
      {หน้า === 'areas' && (
        <div className="px-4 pt-4 space-y-4">

          <div className="bg-indigo-50 border border-indigo-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-indigo-600 mb-1 flex items-center gap-1.5"><MapPin size={12} className="shrink-0" /> ขอบเขตพื้นที่ของระบบ</p>
            <p className="text-sm font-semibold text-gray-800">จังหวัดนครปฐม</p>
            <p className="text-sm text-gray-600">ตำบลกำแพงแสน</p>
          </div>

          {/* แผนที่ภาพรวมรายงาน */}
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <p className="font-bold text-gray-800 flex items-center gap-2"><Map size={18} className="text-gray-500 shrink-0" /> แผนที่รายงานทั้งหมด</p>
              {!โหลดแผนที่ && (
                <span className="text-xs text-gray-400">{รายงานพิกัด.length} จุด</span>
              )}
            </div>

            {โหลดแผนที่ ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">กำลังโหลดตำแหน่งรายงาน...</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden border border-gray-200" style={{ height: 350 }}>
                <MapContainer center={ศูนย์กลางแผนที่} zoom={13} style={{ height: '100%', width: '100%' }}>
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {รายงานพิกัด.map((r) => (
                    <Marker key={r.id} position={[r.latitude, r.longitude]}>
                      <Popup>
                        <div className="text-sm">
                          <p className="font-bold">#{String(r.id).padStart(6, '0')} — {r.animal_type || 'ไม่ระบุ'}</p>
                          <p className="text-gray-600">{r.location_text}</p>
                          {r.detail && <p className="text-xs text-gray-600 mt-1 flex items-start gap-1"><FileText size={11} className="shrink-0 mt-0.5" /> {r.detail}</p>}
                          <p className="text-xs mt-1">สถานะ: {r.status}</p>
                          <p className="text-xs text-gray-400">{แปลงวันที่(r.created_at)}</p>
                        </div>
                      </Popup>
                    </Marker>
                  ))}
                </MapContainer>
              </div>
            )}
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
                  <p className="font-bold text-gray-800 text-sm flex items-center gap-1.5"><Map size={14} className="text-gray-500 shrink-0" /> {พื้นที่}</p>
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5"><HardHat size={11} className="shrink-0" /> ยังไม่ได้กำหนดเจ้าหน้าที่</p>
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
                { ชื่อ: 'รายงานสัตว์จรทั้งหมด', จำนวน: `${จำนวนExport.รายงาน} รายการ`, Icon: FileText, สี: 'bg-orange-50', ตาราง: 'reports',  ชื่อไฟล์: 'รายงาน' },
                { ชื่อ: 'ข้อมูลสัตว์ในระบบ',    จำนวน: `${จำนวนExport.สัตว์} ตัว`,    Icon: PawPrint, สี: 'bg-green-50',  ตาราง: 'animals',  ชื่อไฟล์: 'สัตว์' },
                { ชื่อ: 'ข้อมูลผู้ใช้งาน',      จำนวน: `${จำนวนExport.ผู้ใช้} คน`,   Icon: Users,    สี: 'bg-blue-50',   ตาราง: 'users',    ชื่อไฟล์: 'ผู้ใช้งาน' },
              ].map((item, i) => (
                <div key={i} className={`${item.สี} rounded-2xl p-4 shadow-sm flex items-center justify-between`}>
                  <div className="flex items-center gap-3">
                    <item.Icon size={22} className="text-gray-600 shrink-0" />
                    <div>
                      <p className="font-medium text-gray-800 text-sm">{item.ชื่อ}</p>
                      <p className="text-xs text-gray-500">{item.จำนวน}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => exportCSV(item.ตาราง, item.ชื่อไฟล์)}
                    className="text-xs bg-white text-gray-700 px-3 py-1.5 rounded-lg shadow-sm font-medium flex items-center gap-1"
                  >
                    <Download size={14} className="shrink-0" /> CSV
                  </button>
                </div>
              ))}

              <div className="bg-gray-50 rounded-2xl p-4 text-xs text-gray-500 space-y-1">
                <p className="font-medium text-gray-700 flex items-center gap-1.5"><Lightbulb size={14} className="shrink-0" /> เกี่ยวกับไฟล์ CSV</p>
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
            { ชื่อ: 'การแจ้งเตือน', ค่า: 'เปิดใช้งาน',         Icon: Bell },
            { ชื่อ: 'ภาษาระบบ',     ค่า: 'ภาษาไทย',            Icon: Globe },
            { ชื่อ: 'เวอร์ชันระบบ', ค่า: 'v1.0.0',              Icon: Settings },
            { ชื่อ: 'ฐานข้อมูล',    ค่า: 'Supabase (PostgreSQL)', Icon: Database },
            { ชื่อ: 'สำรองข้อมูล',  ค่า: 'Supabase Auto Backup', Icon: Save },
          ].map((item, i) => (
            <div key={i} className="bg-white rounded-2xl px-4 py-3.5 shadow-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <item.Icon size={18} className="text-gray-500 shrink-0" />
                <span className="text-sm font-medium text-gray-800">{item.ชื่อ}</span>
              </div>
              <span className="text-sm text-gray-500">{item.ค่า}</span>
            </div>
          ))}
        </div>
      )}

      {/* ======== User Detail Bottom Sheet ======== */}
      {userที่เลือก && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          {/* Overlay */}
          <div className="absolute inset-0 bg-black/40" onClick={() => setUserที่เลือก(null)} />

          {/* Sheet */}
          <div className="relative bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto">
            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* Header: Avatar + ชื่อ */}
              <div className="flex items-center gap-4 py-2">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-purple-100 flex items-center justify-center shrink-0">
                  {userที่เลือก.avatar_url
                    ? <img src={userที่เลือก.avatar_url} alt={userที่เลือก.name} className="w-full h-full object-cover" />
                    : <User size={36} strokeWidth={1.5} className="text-gray-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-gray-800 text-lg">{userที่เลือก.name || '(ไม่ระบุชื่อ)'}</h2>
                  <p className="text-sm text-gray-500">{userที่เลือก.email}</p>
                  <div className="flex gap-2 mt-1">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${สีRole[userที่เลือก.role] || สีRole.user}`}>
                      {userที่เลือก.role === 'admin' ? <><Shield size={11} className="shrink-0" /> Admin</> : userที่เลือก.role === 'volunteer' ? <><HardHat size={11} className="shrink-0" /> เจ้าหน้าที่</> : <><User size={11} className="shrink-0" /> ผู้ใช้งาน</>}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${userที่เลือก.status === 'suspended' ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      {userที่เลือก.status === 'suspended' ? <><Ban size={11} className="shrink-0" /> ระงับ</> : <><CheckCircle2 size={11} className="shrink-0" /> ใช้งาน</>}
                    </span>
                  </div>
                </div>
              </div>

              {/* ข้อมูลส่วนตัว — อ่านอย่างเดียว แอดมินแก้ไขไม่ได้ (แก้ได้แค่ Role) */}
              <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">ข้อมูลส่วนตัว</p>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">ชื่อ</span>
                  <span className={`text-sm font-medium text-right break-all ${!userที่เลือก.name ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                    {userที่เลือก.name || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">อีเมล</span>
                  <span className="text-sm font-medium text-gray-800 text-right max-w-[60%] break-all">{userที่เลือก.email || '-'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">เบอร์ติดต่อ</span>
                  <span className={`text-sm font-medium text-right ${!userที่เลือก.phone ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                    {userที่เลือก.phone || '-'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">วันที่สมัคร</span>
                  <span className="text-sm font-medium text-gray-800">{แปลงวันที่(userที่เลือก.created_at)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-500">User ID</span>
                  <span className="text-sm font-medium text-gray-800">{String(userที่เลือก.id).slice(0, 8)}...</span>
                </div>
              </div>

              {/* สถิติ */}
              {โหลดDetail ? (
                <div className="bg-blue-50 rounded-2xl p-4 text-center">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : userDetail && (
                <div className="bg-blue-50 rounded-2xl p-4 space-y-2">
                  <p className="text-xs font-bold text-blue-600 uppercase tracking-wide">สถิติการใช้งาน</p>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">รายงานที่แจ้ง</span>
                    <span className="text-sm font-bold text-blue-700">{userDetail.รายงานทั้งหมด} รายการ</span>
                  </div>
                </div>
              )}

              {/* ข้อมูลศูนย์พักพิง (volunteer เท่านั้น) — อ่านอย่างเดียว */}
              {userที่เลือก.role === 'volunteer' && (
                <div className="bg-orange-50 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-orange-600 uppercase tracking-wide flex items-center gap-1.5"><Home size={12} className="shrink-0" /> ข้อมูลศูนย์พักพิง</p>
                  {[
                    { label: 'ชื่อศูนย์',       value: userที่เลือก.shelter_name },
                    { label: 'ที่ตั้ง',           value: userที่เลือก.shelter_location },
                    { label: 'พื้นที่รับผิดชอบ', value: userที่เลือก.service_area },
                  ].map(function (row) {
                    return (
                      <div key={row.label} className="flex justify-between items-center gap-2">
                        <span className="text-sm text-gray-500 shrink-0">{row.label}</span>
                        <span className={`text-sm font-medium text-right max-w-[55%] ${!row.value ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                          {row.value || '-'}
                        </span>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Actions — ไม่แสดงถ้าเป็นตัวเอง */}
              {userที่เลือก.id !== user?.id && (
                <div className="space-y-2 pt-1">
                  <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">จัดการบัญชี</p>
                  {/* เปลี่ยน Role */}
                  <select
                    value={userที่เลือก.role || 'user'}
                    onChange={function (e) {
                      เปลี่ยนRole(userที่เลือก.id, e.target.value)
                      setUserที่เลือก(function (p) { return { ...p, role: e.target.value } })
                      setรายการผู้ใช้(function (prev) {
                        return prev.map(function (u) { return u.id === userที่เลือก.id ? { ...u, role: e.target.value } : u })
                      })
                    }}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-purple-400"
                  >
                    <option value="user">ผู้ใช้งานทั่วไป</option>
                    <option value="volunteer">เจ้าหน้าที่ / อาสาสมัคร</option>
                    <option value="admin">ผู้ดูแลระบบ (Admin)</option>
                  </select>

                  {/* ระงับ / ยกเลิกระงับ — แอดมินระงับแอดมินด้วยกันไม่ได้ */}
                  {userที่เลือก.role === 'admin' ? (
                    <div className="bg-gray-50 rounded-xl p-3 text-center">
                      <p className="text-xs text-gray-500 flex items-center gap-1.5"><Lock size={11} className="shrink-0" /> ไม่สามารถระงับบัญชีผู้ดูแลระบบ (Admin) ได้</p>
                      <p className="text-[11px] text-gray-400 mt-0.5">หากต้องการระงับ ให้เปลี่ยน Role เป็นระดับอื่นก่อน</p>
                    </div>
                  ) : (
                    <button
                      onClick={function () {
                        const สถานะใหม่ = userที่เลือก.status === 'suspended' ? 'active' : 'suspended'
                        สลับสถานะ(userที่เลือก.id, userที่เลือก.status || 'active')
                        setUserที่เลือก(function (p) { return { ...p, status: สถานะใหม่ } })
                      }}
                      className={`w-full py-3 rounded-xl text-sm font-bold ${
                        userที่เลือก.status === 'suspended'
                          ? 'bg-green-500 text-white'
                          : 'bg-red-500 text-white'
                      }`}
                    >
                      {userที่เลือก.status === 'suspended' ? <><CheckCircle2 size={16} className="shrink-0" /> ยกเลิกการระงับบัญชี</> : <><Ban size={16} className="shrink-0" /> ระงับบัญชีนี้</>}
                    </button>
                  )}
                </div>
              )}

              {userที่เลือก.id === user?.id && (
                <div className="bg-purple-50 rounded-2xl p-3 text-center">
                  <p className="text-xs text-purple-500 flex items-center gap-1.5"><Lock size={11} className="shrink-0" /> ไม่สามารถแก้ไขบัญชีตัวเองได้</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default AdminPage
