// VolunteerPage.jsx — เจ้าหน้าที่ / อาสาสมัคร
//
// reports  → Inbox: ดูรายงานทั้งหมด, กดการ์ด → Bottom sheet รายละเอียด + รับเรื่อง
// update   → Workflow: เลือกเคส → Bottom sheet อัปเดตสถานะ + auto-add animals
// animals  → จัดการสัตว์ในศูนย์ (รวมที่มาจากรายงาน)
// stats    → สถิติ

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Circle, CircleDot, Plus, X, FileSpreadsheet, Navigation } from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
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

// ---- ประเภทการแจ้ง (อิงจาก urgency ที่ผู้ใช้เลือกตอนแจ้ง) พร้อมสีเฉพาะ ----
// แดง = สัตว์ดุร้าย/เสี่ยงอันตราย, ส้ม = สัตว์บาดเจ็บ, เหลือง = พบสัตว์พลัดหลง/จรจัด
const ประเภทแจ้งเรียง = [
  { key: 'ด่วนมาก', label: 'สัตว์ดุร้าย / เสี่ยงก่ออันตราย', hex: '#ef4444', dot: 'bg-red-500',    activeChip: 'border-red-500 bg-red-500 text-white' },
  { key: 'ด่วน',    label: 'สัตว์บาดเจ็บ',                 hex: '#f97316', dot: 'bg-orange-500', activeChip: 'border-orange-500 bg-orange-500 text-white' },
  { key: 'ปานกลาง', label: 'พบสัตว์พลัดหลง / สัตว์จรจัด',   hex: '#eab308', dot: 'bg-yellow-500', activeChip: 'border-yellow-500 bg-yellow-500 text-white' },
]
function ประเภทจาก(urgency) {
  if (urgency === 'ด่วนมาก') return ประเภทแจ้งเรียง[0]
  if (urgency === 'ด่วน')    return ประเภทแจ้งเรียง[1]
  return ประเภทแจ้งเรียง[2] // ปานกลาง / null
}

// cache หมุด divIcon ตามสี เพื่อไม่สร้างใหม่ทุก render
const _หมุดCache = {}
function หมุดสี(color) {
  if (_หมุดCache[color]) return _หมุดCache[color]
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="26" height="38" viewBox="0 0 26 38">
    <path d="M13 0C5.8 0 0 5.8 0 13c0 9.2 13 25 13 25s13-15.8 13-25C26 5.8 20.2 0 13 0z" fill="${color}" stroke="white" stroke-width="2"/>
    <circle cx="13" cy="13" r="5" fill="white"/>
  </svg>`
  const icon = L.divIcon({
    html: svg,
    className: '',
    iconSize: [26, 38],
    iconAnchor: [13, 38],
    popupAnchor: [0, -34],
  })
  _หมุดCache[color] = icon
  return icon
}

// ตัวคุมแผนที่ — บินไปที่จุดที่เลือกจาก List
function MapController({ โฟกัส }) {
  const map = useMap()
  useEffect(function () {
    if (โฟกัส) map.flyTo([โฟกัส.lat, โฟกัส.lng], 16, { duration: 0.8 })
  }, [โฟกัส, map])
  return null
}

// ---- ค่าคงที่ ----
const ขั้นตอนตามสถานะ = {
  'รอดำเนินการ':    0,
  'รับเรื่องแล้ว':   1,
  'ลงพื้นที่แล้ว':   2,
  'อยู่ศูนย์พักพิง': 3,
  'มีผู้รับเลี้ยง':   4,
}
const ขั้นตอนทั้งหมด = ['แจ้งเข้า', 'รับเรื่อง', 'ลงพื้นที่', 'ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

// สีสถานะ — สอดคล้องกับตัวกรองด้านบน: แดง=ใหม่, เหลือง=กำลังดำเนินการ, น้ำเงิน=ศูนย์พักพิง, เขียว=สำเร็จ
const สีสถานะ = {
  'รอดำเนินการ':    'text-red-700 bg-red-50 border-red-200',
  'รับเรื่องแล้ว':   'text-yellow-700 bg-yellow-50 border-yellow-200',
  'ลงพื้นที่แล้ว':   'text-yellow-700 bg-yellow-50 border-yellow-200',
  'อยู่ศูนย์พักพิง': 'text-blue-700 bg-blue-50 border-blue-200',
  'มีผู้รับเลี้ยง':   'text-green-700 bg-green-50 border-green-200',
}

// แถบสีขอบซ้ายของการ์ด — ใช้โทนเดียวกับ สีสถานะ ด้านบน
const แถบสีสถานะ = {
  'รอดำเนินการ':    'border-l-red-400',
  'รับเรื่องแล้ว':   'border-l-yellow-400',
  'ลงพื้นที่แล้ว':   'border-l-yellow-400',
  'อยู่ศูนย์พักพิง': 'border-l-blue-400',
  'มีผู้รับเลี้ยง':   'border-l-green-400',
}

const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง':  'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง':   'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา': 'text-orange-600 bg-orange-50',
  'มีผู้รับเลี้ยง':    'text-gray-500 bg-gray-100',
}

// ---- Helper: แปลงวันที่ ----
function แปลงวันที่เวลา(str) {
  if (!str) return ''
  const d = new Date(str)
  return (
    d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) +
    ' น.'
  )
}

// ---- Helper: Progress Bar ----
function ProgressBar({ status }) {
  const stepIdx = ขั้นตอนตามสถานะ[status] ?? 0
  return (
    <div className="flex items-center">
      {ขั้นตอนทั้งหมด.map(function (ขั้น, idx) {
        const done    = idx <= stepIdx
        const current = idx === stepIdx
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done
                  ? current
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {done && !current ? '✓' : idx + 1}
              </div>
              <p className={`text-center mt-1 leading-tight ${
                done ? (current ? 'text-orange-600' : 'text-green-600') : 'text-gray-400'
              }`} style={{ fontSize: '8px', maxWidth: 44 }}>
                {ขั้น}
              </p>
            </div>
            {idx < ขั้นตอนทั้งหมด.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${idx < stepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Helper: รูปสัตว์ ----
function AnimalThumb({ imageUrl, type, size = 'md' }) {
  const dim = size === 'lg' ? 'w-full h-52' : 'w-16 h-16 shrink-0'
  return (
    <div className={`${dim} rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center`}>
      {imageUrl
        ? <img src={imageUrl} alt="สัตว์" className="w-full h-full object-cover" />
        : <span className={size === 'lg' ? 'text-7xl' : 'text-3xl'}>
            {type?.includes('แมว') ? '🐈' : '🐕'}
          </span>
      }
    </div>
  )
}

// ===========================================================================
function VolunteerPage({ หน้า }) {
  const navigate = useNavigate()

  // ---- รายงาน (shared: reports + update) ----
  const [รายงานทั้งหมด, setรายงานทั้งหมด] = useState([])
  const [โหลดรายงาน,   setโหลดรายงาน]   = useState(true)

  // ---- Bottom sheet รายละเอียด (ใช้ทั้ง reports และ update) ----
  const [รายงานที่เปิด,  setรายงานที่เปิด]  = useState(null)   // report object
  const [ข้อมูลผู้แจ้ง,  setข้อมูลผู้แจ้ง]  = useState(null)   // { name, phone, email }
  const [โหลดผู้แจ้ง,   setโหลดผู้แจ้ง]   = useState(false)
  const [กำลังรับเรื่อง, setกำลังรับเรื่อง] = useState(false)

  // ---- อัปเดตสถานะ ----
  const [สถานะใหม่,   setSถานะใหม่]   = useState('')
  const [หมายเหตุ,    setหมายเหตุ]    = useState('')
  const [กำลังบันทึก, setกำลังบันทึก] = useState(false)
  const [แจ้งสำเร็จ,  setแจ้งสำเร็จ]  = useState('')   // ข้อความ toast

  // ---- Filter (reports) ----
  const [filterTab, setFilterTab] = useState('all')

  // ---- Animals ----
  const [สัตว์จากDB,        setSัตว์จากDB]        = useState([])
  const [โหลดสัตว์,         setโหลดสัตว์]         = useState(true)
  const [สัตว์ที่แก้ไข,      setSัตว์ที่แก้ไข]      = useState(null)
  const [inputนิสัย,        setinputนิสัย]        = useState('')      // ช่องพิมพ์ก่อนกลายเป็น chip
  const [ข้อมูลรายงานสัตว์,  setข้อมูลรายงานสัตว์]  = useState(null)   // { report + reporter }
  const [โหลดรายงานสัตว์,   setโหลดรายงานสัตว์]   = useState(false)
  const [แสดงฟอร์มเพิ่ม, setแสดงฟอร์มเพิ่ม] = useState(false)
  const [ชื่อสัตว์,       setชื่อสัตว์]       = useState('')
  const [เพศสัตว์,       setเพศสัตว์]       = useState('')
  const [สายพันธุ์,      setSายพันธุ์]      = useState('')
  const [อายุสัตว์,      setอายุสัตว์]      = useState('')
  const [สุขภาพสัตว์,    setSุขภาพสัตว์]    = useState('ปกติ')

  // ---- Stats ----
  const [สถิติ, setSถิติ] = useState({ รายงาน: 0, รอดำเนินการ: 0, สัตว์: 0, รับเลี้ยงแล้ว: 0 })
  const [กำลังExport, setกำลังExport] = useState(false)
  const [วันที่เริ่ม,   setวันที่เริ่ม]   = useState('')  // ว่าง = ไม่กรอง
  const [วันที่สิ้นสุด, setวันที่สิ้นสุด] = useState('')

  // ---- แผนที่จุดเกิดเหตุ ----
  const [รายงานพิกัด, setรายงานพิกัด] = useState([])
  const [โหลดแผนที่, setโหลดแผนที่] = useState(true)
  const [filterMap, setFilterMap]   = useState('all')  // all | urgent
  const [โฟกัสจุด, setโฟกัสจุด]     = useState(null)   // { lat, lng } ที่ให้แผนที่บินไป

  // ================================================================
  // FETCH
  // ================================================================
  useEffect(function () {
    if (หน้า === 'reports' || หน้า === 'update') ดึงรายงาน()
    if (หน้า === 'animals') ดึงสัตว์()
    if (หน้า === 'stats')   ดึงสถิติ()
    if (หน้า === 'map')     ดึงรายงานพิกัด()
  }, [หน้า])

  async function ดึงรายงานพิกัด() {
    setโหลดแผนที่(true)
    const { data, error } = await supabase
      .from('reports')
      .select('id, animal_type, location_text, detail, status, urgency, latitude, longitude, created_at')
      .not('latitude', 'is', null)
      .not('longitude', 'is', null)
    if (!error && data) setรายงานพิกัด(data)
    setโหลดแผนที่(false)
  }

  async function ดึงรายงาน() {
    setโหลดรายงาน(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setรายงานทั้งหมด(data)
    setโหลดรายงาน(false)
  }

  async function ดึงสัตว์() {
    setโหลดสัตว์(true)
    const { data } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSัตว์จากDB(data)
    setโหลดสัตว์(false)
  }

  async function ดึงสถิติ() {
    const [ร1, ร2, ร3, ร4] = await Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'รอดำเนินการ'),
      supabase.from('animals').select('id', { count: 'exact', head: true }),
      supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
    ])
    setSถิติ({ รายงาน: ร1.count || 0, รอดำเนินการ: ร2.count || 0, สัตว์: ร3.count || 0, รับเลี้ยงแล้ว: ร4.count || 0 })
  }

  // ---- ดาวน์โหลดข้อมูลสัตว์เป็น CSV (เปิดได้ด้วย Excel) — กรองตามช่วงวันที่ได้ ----
  async function ดาวน์โหลดข้อมูลสัตว์() {
    if (วันที่เริ่ม && วันที่สิ้นสุด && วันที่เริ่ม > วันที่สิ้นสุด) {
      alert('วันที่เริ่มต้องไม่มากกว่าวันที่สิ้นสุด')
      return
    }

    setกำลังExport(true)
    let query = supabase.from('animals').select('*').order('created_at', { ascending: false })
    if (วันที่เริ่ม)   query = query.gte('created_at', `${วันที่เริ่ม}T00:00:00`)
    if (วันที่สิ้นสุด) query = query.lte('created_at', `${วันที่สิ้นสุด}T23:59:59`)
    const { data, error } = await query

    setกำลังExport(false)
    if (error) { alert('ดึงข้อมูลไม่สำเร็จ: ' + error.message); return }
    if (!data || data.length === 0) { alert('ไม่มีข้อมูลสัตว์ในช่วงวันที่ที่เลือก'); return }

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
    const ช่วงชื่อไฟล์ = (วันที่เริ่ม || วันที่สิ้นสุด) ? `_${วันที่เริ่ม || 'เริ่ม'}_ถึง_${วันที่สิ้นสุด || 'ล่าสุด'}` : ''
    a.download = `ข้อมูลสัตว์${ช่วงชื่อไฟล์}_${new Date().toLocaleDateString('th-TH')}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  // ================================================================
  // DETAIL SHEET: เปิด / ปิด
  // ================================================================
  async function เปิดรายละเอียด(report) {
    setรายงานที่เปิด(report)
    setSถานะใหม่('')
    setหมายเหตุ(report.volunteer_notes || '')
    setข้อมูลผู้แจ้ง(null)

    if (report.reporter_id) {
      setโหลดผู้แจ้ง(true)
      const { data } = await supabase
        .from('users')
        .select('name, phone, email, avatar_url')
        .eq('id', report.reporter_id)
        .single()
      setข้อมูลผู้แจ้ง(data || null)
      setโหลดผู้แจ้ง(false)
    }
  }

  function ปิดรายละเอียด() {
    setรายงานที่เปิด(null)
    setข้อมูลผู้แจ้ง(null)
    setSถานะใหม่('')
    setหมายเหตุ('')
  }

  function toast(msg) {
    setแจ้งสำเร็จ(msg)
    setTimeout(() => setแจ้งสำเร็จ(''), 3500)
  }

  // ================================================================
  // รับเรื่อง (จาก reports inbox)
  // ================================================================
  async function รับเรื่อง() {
    if (!รายงานที่เปิด || กำลังรับเรื่อง) return
    setกำลังรับเรื่อง(true)

    const report = รายงานที่เปิด
    const { error } = await supabase
      .from('reports')
      .update({ status: 'รับเรื่องแล้ว', updated_at: new Date().toISOString() })
      .eq('id', report.id)

    if (!error) {
      // ส่ง notification ให้ผู้แจ้ง
      if (report.reporter_id) {
        const { error: notiErr } = await supabase.from('notifications').insert({
          user_id: report.reporter_id,
          title:   'เจ้าหน้าที่รับเรื่องแล้ว 🦺',
          body:    `รายงาน #${String(report.id).padStart(6, '0')} ของคุณได้รับการดูแลแล้ว เจ้าหน้าที่จะลงพื้นที่เพื่อรับสัตว์โดยเร็ว`,
          type:    'report_update',
          is_read: false,
        })
        if (notiErr) console.error('❌ ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
        else console.log('✅ ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
      }
      // อัปเดต local state
      setรายงานทั้งหมด(function (prev) {
        return prev.map(function (r) {
          return r.id === report.id ? { ...r, status: 'รับเรื่องแล้ว' } : r
        })
      })
      setรายงานที่เปิด(function (prev) {
        return prev ? { ...prev, status: 'รับเรื่องแล้ว' } : prev
      })
      toast('✅ รับเรื่องสำเร็จ! แจ้งเตือนผู้แจ้งแล้ว')
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setกำลังรับเรื่อง(false)
  }

  // ================================================================
  // บันทึกการอัปเดตสถานะ (จาก update workflow)
  // ================================================================
  async function บันทึกการอัปเดต() {
    if (!รายงานที่เปิด || !สถานะใหม่ || กำลังบันทึก) return
    setกำลังบันทึก(true)

    const report = รายงานที่เปิด
    const { error } = await supabase
      .from('reports')
      .update({
        status:          สถานะใหม่,
        volunteer_notes: หมายเหตุ.trim() || null,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', report.id)

    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
      setกำลังบันทึก(false)
      return
    }

    // ถ้าสถานะถึง "อยู่ศูนย์พักพิง" → สร้างสัตว์ใน animals table อัตโนมัติ
    if (สถานะใหม่ === 'อยู่ศูนย์พักพิง') {
      const { data: existing } = await supabase
        .from('animals')
        .select('id')
        .eq('report_id', report.id)
        .maybeSingle()

      if (!existing) {
        const { error: animalErr } = await supabase.from('animals').insert({
          name:      'ยังไม่ตั้งชื่อ',
          breed:     report.animal_type || 'ไม่ระบุ',
          status:    'อยู่ศูนย์พักพิง',
          health:    'ยังไม่ตรวจ',
          photo_url: report.image_url || null,
          location:  report.location_text || 'กำแพงแสน นครปฐม',
          report_id: report.id,
        })
        if (animalErr) console.error('❌ เพิ่มสัตว์ไม่สำเร็จ:', animalErr.message)
        else console.log('✅ เพิ่มสัตว์ในระบบอัตโนมัติสำเร็จ (report_id:', report.id, ')')
      }
    }

    // ส่ง notification ให้ผู้แจ้ง — ทุกสถานะที่เปลี่ยน
    const msgMap = {
      'รับเรื่องแล้ว':   `เจ้าหน้าที่รับเรื่องรายงาน #${String(report.id).padStart(6, '0')} ของคุณแล้ว กำลังเตรียมลงพื้นที่`,
      'ลงพื้นที่แล้ว':   `เจ้าหน้าที่ลงพื้นที่แล้ว (รายงาน #${String(report.id).padStart(6, '0')}) กำลังดำเนินการรับสัตว์`,
      'อยู่ศูนย์พักพิง': `สัตว์ที่คุณแจ้ง (#${String(report.id).padStart(6, '0')}) มาถึงศูนย์พักพิงแล้ว กำลังรับการดูแล 🏠`,
      'มีผู้รับเลี้ยง':   `สัตว์ที่คุณแจ้ง (#${String(report.id).padStart(6, '0')}) ได้รับการรับเลี้ยงแล้ว ขอบคุณที่ช่วยเหลือ 🎉`,
    }
    if (report.reporter_id && msgMap[สถานะใหม่]) {
      const { error: notiErr } = await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        title:   `อัปเดตรายงาน #${String(report.id).padStart(6, '0')}`,
        body:    msgMap[สถานะใหม่],
        type:    'report_update',
        is_read: false,
      })
      if (notiErr) console.error('❌ ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
      else console.log('✅ ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
    }

    // อัปเดต local state
    setรายงานทั้งหมด(function (prev) {
      return prev.map(function (r) {
        return r.id === report.id
          ? { ...r, status: สถานะใหม่, volunteer_notes: หมายเหตุ.trim() }
          : r
      })
    })
    toast('💾 บันทึกสถานะสำเร็จ!')
    ปิดรายละเอียด()
    setกำลังบันทึก(false)
  }

  // ================================================================
  // Animals: เพิ่ม + แก้ไข
  // ================================================================
  async function บันทึกสัตว์ใหม่() {
    if (!ชื่อสัตว์ || !เพศสัตว์) return
    const { error } = await supabase.from('animals').insert({
      name:     ชื่อสัตว์,
      gender:   เพศสัตว์,
      breed:    สายพันธุ์,
      age:      อายุสัตว์,
      health:   สุขภาพสัตว์ || 'ปกติ',
      status:   'อยู่ศูนย์พักพิง',
      location: 'กำแพงแสน นครปฐม',
    })
    if (!error) {
      setชื่อสัตว์(''); setเพศสัตว์(''); setSายพันธุ์('')
      setอายุสัตว์(''); setSุขภาพสัตว์('ปกติ')
      setแสดงฟอร์มเพิ่ม(false)
      ดึงสัตว์()
      toast('✅ เพิ่มสัตว์สำเร็จ!')
    }
  }

  async function บันทึกแก้ไขสัตว์() {
    if (!สัตว์ที่แก้ไข) return
    const { error } = await supabase.from('animals').update({
      name:         สัตว์ที่แก้ไข.name,
      breed:        สัตว์ที่แก้ไข.breed,
      age:          สัตว์ที่แก้ไข.age,
      gender:       สัตว์ที่แก้ไข.gender,
      health:       สัตว์ที่แก้ไข.health,
      status:       สัตว์ที่แก้ไข.status,
      traits:       สัตว์ที่แก้ไข.traits       || null,
      vaccine_info: สัตว์ที่แก้ไข.vaccine_info || null,
    }).eq('id', สัตว์ที่แก้ไข.id)

    if (!error) {
      setSัตว์จากDB(function (prev) {
        return prev.map(function (s) { return s.id === สัตว์ที่แก้ไข.id ? สัตว์ที่แก้ไข : s })
      })
      setSัตว์ที่แก้ไข(null)
      setข้อมูลรายงานสัตว์(null)
      toast('✅ บันทึกข้อมูลสัตว์สำเร็จ!')
    } else {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    }
  }

  // เปิด bottom sheet แก้ไขสัตว์ + ดึงข้อมูลรายงาน/ผู้แจ้ง (ถ้ามาจากรายงาน)
  async function เปิดแก้ไขสัตว์(สัตว์) {
    setSัตว์ที่แก้ไข({ ...สัตว์ })
    setinputนิสัย('')
    setข้อมูลรายงานสัตว์(null)

    if (!สัตว์.report_id) return

    setโหลดรายงานสัตว์(true)
    const { data: report } = await supabase
      .from('reports')
      .select('id, animal_type, location_text, latitude, longitude, detail, reporter_id, created_at')
      .eq('id', สัตว์.report_id)
      .single()

    if (report) {
      let reporter = null
      if (report.reporter_id) {
        const { data } = await supabase
          .from('users')
          .select('name, phone, email, avatar_url')
          .eq('id', report.reporter_id)
          .single()
        reporter = data || null
      }
      setข้อมูลรายงานสัตว์({ ...report, reporter })
    }
    setโหลดรายงานสัตว์(false)
  }

  // ================================================================
  // กรองรายงาน
  // ================================================================
  const รายงานกรอง = รายงานทั้งหมด.filter(function (ร) {
    if (filterTab === 'pending')    return ร.status === 'รอดำเนินการ'
    if (filterTab === 'inprogress') return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว'].includes(ร.status)
    if (filterTab === 'sheltered')  return ร.status === 'อยู่ศูนย์พักพิง'
    if (filterTab === 'done')       return ร.status === 'มีผู้รับเลี้ยง'
    return true
  })

  const รายงานActive = รายงานทั้งหมด.filter(function (ร) {
    return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง'].includes(ร.status)
  })

  const titleMap = {
    reports: 'รายการแจ้งสัตว์จร',
    update:  'อัปเดตสถานะสัตว์',
    animals: 'จัดการข้อมูลสัตว์',
    stats:   'ภาพรวมและออกรายงาน',
    map:     'แผนที่จุดเกิดเหตุ',
  }

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="min-h-screen bg-teal-50 pb-8">

      {/* Toast */}
      {แจ้งสำเร็จ && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
          {แจ้งสำเร็จ}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-teal-600">🦺 เจ้าหน้าที่ / อาสาสมัคร</p>
        </div>
      </div>

      {/* ============================================================
          REPORTS — Inbox
          ============================================================ */}
      {หน้า === 'reports' && (
        <div className="pt-4">

          {/* Filter Tabs — สีตรงกับป้ายสถานะบนการ์ด */}
          <div className="px-4 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1 overflow-x-auto">
              {[
                { key: 'all',        label: 'ทั้งหมด',        dot: null,      count: รายงานทั้งหมด.length },
                { key: 'pending',    label: 'ใหม่',           dot: 'bg-red-500',    count: รายงานทั้งหมด.filter(function (r) { return r.status === 'รอดำเนินการ' }).length },
                { key: 'inprogress', label: 'ดำเนินการ',      dot: 'bg-yellow-500', count: รายงานทั้งหมด.filter(function (r) { return ['รับเรื่องแล้ว','ลงพื้นที่แล้ว'].includes(r.status) }).length },
                { key: 'sheltered',  label: 'ศูนย์พักพิง',    dot: 'bg-blue-500',   count: รายงานทั้งหมด.filter(function (r) { return r.status === 'อยู่ศูนย์พักพิง' }).length },
                { key: 'done',       label: 'เสร็จ',          dot: 'bg-green-500',  count: รายงานทั้งหมด.filter(function (r) { return r.status === 'มีผู้รับเลี้ยง' }).length },
              ].map(function (tab) {
                return (
                  <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                    className={`flex-1 shrink-0 min-w-fit px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                      filterTab === tab.key ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab.dot && <span className={`w-1.5 h-1.5 rounded-full ${tab.dot}`} />}
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`font-bold ${filterTab === tab.key ? 'text-teal-600' : 'text-gray-400'}`}>
                        ({tab.count})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Loading */}
          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดรายงาน && รายงานกรอง.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">ไม่มีรายงานในกลุ่มนี้</p>
            </div>
          )}

          {/* รายการการ์ด */}
          <div className="px-4 space-y-3">
            {รายงานกรอง.map(function (ร) {
              const เร่งด่วน = ร.urgency === 'ด่วน' || ร.urgency === 'ด่วนมาก'
              return (
                <div key={ร.id}
                  className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden transition-all active:scale-95 cursor-pointer border-l-4 ${แถบสีสถานะ[ร.status] || 'border-l-gray-300'}`}
                  onClick={() => เปิดรายละเอียด(ร)}
                >
                  <div className="p-4 flex items-center gap-3">
                    <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
                    <div className="flex-1 min-w-0">
                      {เร่งด่วน && (
                        <p className="text-xs font-bold text-red-600 flex items-center gap-1 mb-0.5">
                          ⚠️ {ร.urgency === 'ด่วนมาก' ? 'เร่งด่วนมาก — เสี่ยงอันตราย' : 'เร่งด่วน — สัตว์บาดเจ็บ'}
                        </p>
                      )}
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุประเภท'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${สีสถานะ[ร.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          {ร.status}
                        </span>
                      </div>

                      {/* ตำแหน่ง — กดได้ถ้ามีพิกัด */}
                      {ร.latitude && ร.longitude ? (
                        <a
                          href={`https://www.google.com/maps?q=${ร.latitude},${ร.longitude}`}
                          target="_blank" rel="noreferrer"
                          onClick={function (e) { e.stopPropagation() }}
                          className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold max-w-full"
                        >
                          <span className="text-sm">📍</span>
                          <span className="truncate">{ร.location_text || 'ดูตำแหน่ง'}</span>
                          <span className="shrink-0 bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">Maps ↗</span>
                        </a>
                      ) : (
                        <p className="text-xs text-gray-500 truncate">📍 {ร.location_text || '-'}</p>
                      )}

                      <p className="text-xs text-gray-400 mt-0.5">{แปลงวันที่เวลา(ร.created_at)} · #{String(ร.id).padStart(6, '0')}</p>
                      {ร.detail && (
                        <p className="text-xs text-gray-400 italic mt-0.5 truncate">"{ร.detail}"</p>
                      )}
                    </div>
                    <span className="text-gray-300 text-xl shrink-0">›</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          UPDATE — Workflow
          ============================================================ */}
      {หน้า === 'update' && (
        <div className="px-4 pt-4 space-y-4">

          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            </div>
          )}

          {!โหลดรายงาน && (
            <>
              <div className="bg-teal-50 border border-teal-200 rounded-2xl p-3">
                <p className="text-xs text-teal-700 font-medium">⚙️ เลือกรายงานเพื่ออัปเดตสถานะ</p>
                <p className="text-xs text-teal-600 mt-0.5">{รายงานActive.length} รายการรอดำเนินการ</p>
              </div>

              {รายงานActive.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="font-medium text-gray-600">ไม่มีรายงานค้างอยู่</p>
                  <p className="text-xs text-gray-400 mt-1">ทุกรายงานได้รับการดูแลเรียบร้อย</p>
                </div>
              )}

              {รายงานActive.map(function (ร) {
                return (
                  <div key={ร.id}
                    className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-all cursor-pointer border-l-4 ${แถบสีสถานะ[ร.status] || 'border-l-gray-300'}`}
                    onClick={() => เปิดรายละเอียด(ร)}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุ'}</p>

                        {/* ตำแหน่ง — กดได้ถ้ามีพิกัด */}
                        {ร.latitude && ร.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${ร.latitude},${ร.longitude}`}
                            target="_blank" rel="noreferrer"
                            onClick={function (e) { e.stopPropagation() }}
                            className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold max-w-full"
                          >
                            <span className="text-sm">📍</span>
                            <span className="truncate">{ร.location_text || 'ดูตำแหน่ง'}</span>
                            <span className="shrink-0 bg-green-100 text-green-600 px-1.5 py-0.5 rounded-full text-[10px] font-bold">Maps ↗</span>
                          </a>
                        ) : (
                          <p className="text-xs text-gray-500 truncate">📍 {ร.location_text}</p>
                        )}

                        <p className="text-xs text-gray-400">{แปลงวันที่เวลา(ร.created_at)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border mt-1 inline-block ${สีสถานะ[ร.status] || ''}`}>
                          {ร.status}
                        </span>
                      </div>
                      <span className="text-gray-300 text-xl shrink-0">›</span>
                    </div>
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ============================================================
          ANIMALS — จัดการสัตว์ในศูนย์
          ============================================================ */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4 pb-20">

          {/* FAB — เพิ่มสัตว์ใหม่ */}
          <button onClick={() => setแสดงฟอร์มเพิ่ม(!แสดงฟอร์มเพิ่ม)}
            className="fixed bottom-6 right-5 z-30 w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-all"
            title={แสดงฟอร์มเพิ่ม ? 'ปิดฟอร์ม' : 'เพิ่มสัตว์ใหม่'}
          >
            {แสดงฟอร์มเพิ่ม ? <X size={24} /> : <Plus size={24} />}
          </button>

          {แสดงฟอร์มเพิ่ม && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-800">เพิ่มสัตว์เข้าศูนย์พักพิง</p>
              {[
                { label: 'ชื่อสัตว์', val: ชื่อสัตว์, set: setชื่อสัตว์, placeholder: 'เช่น มะม่วง, ขาว', required: true },
                { label: 'สายพันธุ์', val: สายพันธุ์, set: setSายพันธุ์, placeholder: 'เช่น สุนัขพันธุ์ไทย', required: false },
                { label: 'สุขภาพ',   val: สุขภาพสัตว์, set: setSุขภาพสัตว์, placeholder: 'เช่น ปกติ, บาดเจ็บ', required: false },
              ].map(function (f) {
                return (
                  <div key={f.label}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </p>
                    <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                )
              })}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map(function (เพศ) {
                    return (
                      <button key={เพศ} onClick={() => setเพศสัตว์(เพศ)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 ${
                          เพศสัตว์ === เพศ ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-700'
                        }`}>{เพศ}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ</p>
                <select value={อายุสัตว์} onChange={(e) => setอายุสัตว์(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white">
                  <option value="">-- เลือก --</option>
                  {['น้อยกว่า 1 ปี','1–2 ปี','2–5 ปี','5–10 ปี','มากกว่า 10 ปี','ไม่ทราบ'].map(function (a) {
                    return <option key={a}>{a}</option>
                  })}
                </select>
              </div>
              <button onClick={บันทึกสัตว์ใหม่} disabled={!ชื่อสัตว์ || !เพศสัตว์}
                className="w-full bg-teal-600 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                บันทึกข้อมูลสัตว์
              </button>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700">สัตว์ในความดูแล ({สัตว์จากDB.length} ตัว)</p>
            <p className="text-xs text-gray-400 mt-0.5">รวมสัตว์ที่มาจากรายงาน (สถานะ อยู่ศูนย์พักพิง)</p>
          </div>

          {โหลดสัตว์ && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!โหลดสัตว์ && สัตว์จากDB.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🐾</p>
              <p className="text-sm">ยังไม่มีสัตว์ในระบบ</p>
            </div>
          )}

          <div className="space-y-3">
            {สัตว์จากDB.map(function (สัตว์) {
              const ยังไม่ตั้งชื่อ = สัตว์.name === 'ยังไม่ตั้งชื่อ'
              return (
                <button key={สัตว์.id} onClick={() => เปิดแก้ไขสัตว์(สัตว์)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-teal-50 overflow-hidden flex items-center justify-center shrink-0">
                      {สัตว์.photo_url
                        ? <img src={สัตว์.photo_url} alt={สัตว์.name} className="w-full h-full object-cover" />
                        : <span className="text-3xl">{สัตว์.breed?.includes('แมว') ? '🐈' : '🐕'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{ยังไม่ตั้งชื่อ ? (สัตว์.breed || 'ไม่ระบุสายพันธุ์') : สัตว์.name}</p>
                        {สัตว์.report_id && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">📋 จากรายงาน</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">
                        {ยังไม่ตั้งชื่อ
                          ? `${สัตว์.age || '-'} · ${สัตว์.gender || '-'}`
                          : `${สัตว์.breed || 'ไม่ระบุ'} · ${สัตว์.age || '-'} · ${สัตว์.gender || '-'}`}
                      </p>
                      <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.status] || 'text-gray-600 bg-gray-50'}`}>
                        {สัตว์.status}
                      </span>
                    </div>
                    <span className="text-gray-300 text-xl shrink-0">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          STATS
          ============================================================ */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'รายงานทั้งหมด',  ค่า: สถิติ.รายงาน,       emoji: '📋', bg: 'bg-orange-50', text: 'text-orange-600' },
              { ชื่อ: 'รอดำเนินการ',    ค่า: สถิติ.รอดำเนินการ,  emoji: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-600' },
              { ชื่อ: 'สัตว์ในดูแล',    ค่า: สถิติ.สัตว์,         emoji: '🐾', bg: 'bg-green-50',  text: 'text-green-600' },
              { ชื่อ: 'รับเลี้ยงแล้ว',   ค่า: สถิติ.รับเลี้ยงแล้ว, emoji: '❤️', bg: 'bg-red-50',   text: 'text-red-600' },
            ].map(function (stat) {
              return (
                <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.bg}`}>
                  <p className="text-3xl mb-1">{stat.emoji}</p>
                  <p className={`text-3xl font-bold ${stat.text}`}>{stat.ค่า}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
                </div>
              )
            })}
          </div>

          {/* เลือกช่วงวันที่สำหรับ Export */}
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <p className="text-sm font-semibold text-gray-700">เลือกช่วงวันที่ (ไม่บังคับ)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">จากวันที่</label>
                <input
                  type="date"
                  value={วันที่เริ่ม}
                  max={วันที่สิ้นสุด || undefined}
                  onChange={(e) => setวันที่เริ่ม(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ถึงวันที่</label>
                <input
                  type="date"
                  value={วันที่สิ้นสุด}
                  min={วันที่เริ่ม || undefined}
                  onChange={(e) => setวันที่สิ้นสุด(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-teal-400"
                />
              </div>
            </div>
            {(วันที่เริ่ม || วันที่สิ้นสุด) && (
              <button onClick={() => { setวันที่เริ่ม(''); setวันที่สิ้นสุด('') }}
                className="text-xs text-teal-600 font-medium">✕ ล้างช่วงวันที่ (ดึงข้อมูลทั้งหมด)</button>
            )}
          </div>

          <button
            onClick={ดาวน์โหลดข้อมูลสัตว์}
            disabled={กำลังExport}
            className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white rounded-2xl py-4 font-bold text-base shadow-sm active:scale-95 transition-all disabled:opacity-60"
          >
            <FileSpreadsheet size={20} />
            {กำลังExport ? 'กำลังเตรียมไฟล์...' : 'ดาวน์โหลดข้อมูลสัตว์ (Excel)'}
          </button>
          <p className="text-xs text-gray-400 text-center">
            {(วันที่เริ่ม || วันที่สิ้นสุด)
              ? `เฉพาะข้อมูลที่เพิ่มในช่วง ${วันที่เริ่ม || 'เริ่มต้น'} ถึง ${วันที่สิ้นสุด || 'ล่าสุด'}`
              : 'ไม่ได้เลือกช่วงวันที่ — จะดาวน์โหลดข้อมูลสัตว์ทุกตัวในระบบ'}
          </p>
        </div>
      )}

      {/* ============================================================
          MAP — แผนที่จุดเกิดเหตุ
          ============================================================ */}
      {หน้า === 'map' && (function () {
        const จุดกรอง = filterMap === 'all'
          ? รายงานพิกัด
          : รายงานพิกัด.filter((r) => ประเภทจาก(r.urgency).key === filterMap)
        // แสดง chip เฉพาะประเภทที่มีรายงานเข้ามาจริง (count > 0)
        const ประเภทที่มี = ประเภทแจ้งเรียง
          .map((p) => ({ ...p, count: รายงานพิกัด.filter((r) => ประเภทจาก(r.urgency).key === p.key).length }))
          .filter((p) => p.count > 0)

        return (
          <div className="pt-4 space-y-3">

            {/* Filter chips — แยกตามประเภทการแจ้ง */}
            <div className="px-4 flex flex-wrap gap-2">
              <button onClick={() => setFilterMap('all')}
                className={`px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                  filterMap === 'all' ? 'border-teal-500 bg-teal-500 text-white' : 'border-gray-200 bg-white text-gray-600'
                }`}
              >
                ดูทั้งหมด <span className={filterMap === 'all' ? 'text-white/80' : 'text-gray-400'}>({รายงานพิกัด.length})</span>
              </button>
              {ประเภทที่มี.map(function (p) {
                const active = filterMap === p.key
                return (
                  <button key={p.key} onClick={() => setFilterMap(p.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                      active ? p.activeChip : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {!active && <span className={`w-2 h-2 rounded-full ${p.dot}`} />}
                    {p.label} <span className={active ? 'text-white/80' : 'text-gray-400'}>({p.count})</span>
                  </button>
                )
              })}
            </div>

            {โหลดแผนที่ ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">กำลังโหลดตำแหน่งรายงาน...</p>
              </div>
            ) : (
              <>
                {/* แผนที่ */}
                <div className="px-4">
                  <div className="rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 340 }}>
                    <MapContainer center={ศูนย์กลางแผนที่} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <MapController โฟกัส={โฟกัสจุด} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {จุดกรอง.map((r) => (
                        <Marker key={r.id} position={[r.latitude, r.longitude]} icon={หมุดสี(ประเภทจาก(r.urgency).hex)}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold">#{String(r.id).padStart(6, '0')} — {r.animal_type || 'ไม่ระบุ'}</p>
                              <p className="text-gray-600">{r.location_text}</p>
                              <p className="text-xs mt-1" style={{ color: ประเภทจาก(r.urgency).hex }}>● {ประเภทจาก(r.urgency).label}</p>
                              {r.detail && <p className="text-xs text-gray-600 mt-1">📝 {r.detail}</p>}
                              <p className="text-xs mt-1">สถานะ: {r.status}</p>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                              >
                                🧭 นำทาง (Google Maps)
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>
                  </div>
                </div>

                {/* คำอธิบายสีหมุด — ตามประเภทการแจ้ง */}
                <div className="px-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /> สัตว์ดุร้าย/เสี่ยงอันตราย</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-orange-500" /> สัตว์บาดเจ็บ</span>
                  <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-yellow-500" /> พบสัตว์พลัดหลง/จรจัด</span>
                </div>

                {/* List รายการเคส — กดแล้วแผนที่บินไปที่จุดนั้น */}
                <div className="px-4 space-y-2 pb-4">
                  <p className="text-xs text-gray-400">{จุดกรอง.length} จุดในมุมมองนี้</p>
                  {จุดกรอง.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">ไม่มีจุดในตัวกรองนี้</div>
                  )}
                  {จุดกรอง.map((r) => (
                    <div key={r.id}
                      onClick={() => setโฟกัสจุด({ lat: r.latitude, lng: r.longitude, id: r.id, t: Date.now() })}
                      style={{ borderLeftColor: ประเภทจาก(r.urgency).hex }}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-all border-l-4"
                    >
                      <div className="p-3 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ประเภทจาก(r.urgency).hex }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{r.animal_type || 'ไม่ระบุ'}</p>
                          <p className="text-xs text-gray-500 truncate">📍 {r.location_text || '-'} · #{String(r.id).padStart(6, '0')}</p>
                        </div>
                        <a
                          href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                          target="_blank" rel="noreferrer"
                          onClick={function (e) { e.stopPropagation() }}
                          className="flex items-center gap-1 bg-teal-50 text-teal-700 px-2.5 py-1.5 rounded-lg text-xs font-semibold shrink-0"
                        >
                          <Navigation size={13} /> นำทาง
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )
      })()}

      {/* ============================================================
          BOTTOM SHEET: รายละเอียดรายงาน (Reports Inbox)
          ============================================================ */}
      {รายงานที่เปิด && หน้า === 'reports' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')}</p>
              <button onClick={ปิดรายละเอียด} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูปสัตว์ */}
              <AnimalThumb imageUrl={รายงานที่เปิด.image_url} type={รายงานที่เปิด.animal_type} size="lg" />

              {/* ชื่อ + สถานะ + progress */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{รายงานที่เปิด.animal_type || 'ไม่ระบุประเภท'}</p>
                    <p className="text-xs text-gray-400">{แปลงวันที่เวลา(รายงานที่เปิด.created_at)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${สีสถานะ[รายงานที่เปิด.status] || ''}`}>
                    {รายงานที่เปิด.status}
                  </span>
                </div>
                <ProgressBar status={รายงานที่เปิด.status} />
              </div>

              {/* ตำแหน่ง */}
              <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <span className="text-xl mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">ตำแหน่งที่พบสัตว์</p>
                  <p className="text-sm font-semibold text-gray-800">{รายงานที่เปิด.location_text || '-'}</p>
                  {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                    >
                      🗺️ เปิดใน Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <span className="text-xl mt-0.5">💬</span>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">รายละเอียดจากผู้แจ้ง</p>
                    <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                  </div>
                </div>
              )}

              {/* ข้อมูลผู้แจ้ง */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-3">👤 ข้อมูลผู้แจ้ง</p>
                {!รายงานที่เปิด.reporter_id && (
                  <p className="text-sm text-gray-400 italic">🗑️ บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
                )}
                {รายงานที่เปิด.reporter_id && โหลดผู้แจ้ง && (
                  <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                )}
                {รายงานที่เปิด.reporter_id && !โหลดผู้แจ้ง && ข้อมูลผู้แจ้ง && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        {ข้อมูลผู้แจ้ง.avatar_url
                          ? <img src={ข้อมูลผู้แจ้ง.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                          : <span className="text-xl">👤</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{ข้อมูลผู้แจ้ง.name || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-500">{ข้อมูลผู้แจ้ง.email || '-'}</p>
                      </div>
                    </div>
                    {ข้อมูลผู้แจ้ง.phone ? (
                      <a href={`tel:${ข้อมูลผู้แจ้ง.phone}`}
                         className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-blue-200 w-full"
                      >
                        <span className="text-xl">📞</span>
                        <div>
                          <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                          <p className="text-base font-bold text-blue-600">{ข้อมูลผู้แจ้ง.phone}</p>
                        </div>
                        <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-2 border border-dashed border-blue-200">
                        ⚠️ ผู้แจ้งยังไม่ได้ระบุเบอร์โทร
                      </p>
                    )}
                  </div>
                )}
                {รายงานที่เปิด.reporter_id && !โหลดผู้แจ้ง && !ข้อมูลผู้แจ้ง && (
                  <p className="text-sm text-gray-400 italic">ไม่พบข้อมูลในระบบ</p>
                )}
              </div>

              {/* หมายเหตุเจ้าหน้าที่ */}
              {รายงานที่เปิด.volunteer_notes && (
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 mb-1">📝 บันทึกเจ้าหน้าที่</p>
                  <p className="text-sm text-gray-700">{รายงานที่เปิด.volunteer_notes}</p>
                </div>
              )}

              {/* ปุ่มหลัก */}
              {รายงานที่เปิด.status === 'รอดำเนินการ' ? (
                <button onClick={รับเรื่อง} disabled={กำลังรับเรื่อง}
                  className="w-full bg-orange-500 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60 active:scale-95 transition-all">
                  {กำลังรับเรื่อง ? '⏳ กำลังรับเรื่อง...' : '✅ รับเรื่อง (แจ้งเตือนผู้แจ้งอัตโนมัติ)'}
                </button>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-2">รับเรื่องแล้ว — ไปอัปเดตความคืบหน้า</p>
                  <button onClick={function () { ปิดรายละเอียด(); navigate('/volunteer/update') }}
                    className="text-orange-600 font-semibold text-sm underline">
                    → ไปหน้าอัปเดตสถานะ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM SHEET: อัปเดตสถานะ (Update Workflow)
          ============================================================ */}
      {รายงานที่เปิด && หน้า === 'update' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">อัปเดต #{String(รายงานที่เปิด.id).padStart(6, '0')}</p>
              <button onClick={ปิดรายละเอียด} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูป + ข้อมูล */}
              <div className="flex gap-3 items-start bg-gray-50 rounded-2xl p-3">
                <AnimalThumb imageUrl={รายงานที่เปิด.image_url} type={รายงานที่เปิด.animal_type} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{รายงานที่เปิด.animal_type || 'ไม่ระบุ'}</p>
                  <p className="text-xs text-gray-500 truncate">📍 {รายงานที่เปิด.location_text}</p>
                  <p className="text-xs text-gray-400">{แปลงวันที่เวลา(รายงานที่เปิด.created_at)}</p>
                  {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                    >
                      🗺️ Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <ProgressBar status={รายงานที่เปิด.status} />
              </div>

              {/* ข้อมูลผู้แจ้ง (compact) */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-600 mb-2">👤 ผู้แจ้ง</p>
                {!รายงานที่เปิด.reporter_id ? (
                  <p className="text-xs text-gray-400 italic">🗑️ บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
                ) : โหลดผู้แจ้ง ? (
                  <p className="text-xs text-gray-400">กำลังโหลด...</p>
                ) : ข้อมูลผู้แจ้ง ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        {ข้อมูลผู้แจ้ง.avatar_url
                          ? <img src={ข้อมูลผู้แจ้ง.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                          : <span className="text-lg">👤</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ข้อมูลผู้แจ้ง.name || '-'}</p>
                        <p className="text-xs text-gray-500">{ข้อมูลผู้แจ้ง.email || '-'}</p>
                      </div>
                    </div>
                    {ข้อมูลผู้แจ้ง.phone && (
                      <a href={`tel:${ข้อมูลผู้แจ้ง.phone}`}
                         className="bg-blue-500 text-white text-xs px-3 py-2 rounded-xl font-semibold shrink-0">
                        📞 {ข้อมูลผู้แจ้ง.phone}
                      </a>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400">ไม่พบข้อมูล</p>
                )}
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">รายละเอียดจากผู้แจ้ง</p>
                  <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                </div>
              )}

              {/* เลือกสถานะใหม่ */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  เปลี่ยนสถานะ
                  <span className="text-xs font-normal text-gray-400 ml-2">ปัจจุบัน: {รายงานที่เปิด.status}</span>
                </p>
                <div className="space-y-2">
                  {['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง'].map(function (ส) {
                    const isCurrent = รายงานที่เปิด.status === ส
                    const isSelected = สถานะใหม่ === ส
                    return (
                      <button key={ส} onClick={() => setSถานะใหม่(ส)} disabled={isCurrent}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-medium border-2 text-left flex items-center gap-2.5 transition-all ${
                          isCurrent
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200'
                        }`}
                      >
                        {isCurrent
                          ? <Circle size={16} className="shrink-0 text-gray-300" />
                          : isSelected
                          ? <CircleDot size={16} className="shrink-0 text-teal-500" />
                          : <Circle size={16} className="shrink-0 text-gray-300" />}
                        <span className="flex-1">{ส}</span>
                        {isCurrent && <span className="text-xs">← ปัจจุบัน</span>}
                        {ส === 'อยู่ศูนย์พักพิง' && !isCurrent && !isSelected && (
                          <span className="text-xs text-teal-500">→ เพิ่มเข้าจัดการสัตว์อัตโนมัติ</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  บันทึกหมายเหตุ
                </p>
                <textarea value={หมายเหตุ} onChange={(e) => setหมายเหตุ(e.target.value)}
                  placeholder="เช่น ลงพื้นที่แล้ว สัตว์มีบาดแผล นำส่งสัตวแพทย์เรียบร้อย..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-teal-400 resize-none" />
              </div>

              {/* ปุ่มบันทึก */}
              <button onClick={บันทึกการอัปเดต} disabled={!สถานะใหม่ || กำลังบันทึก}
                className="w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all">
                {กำลังบันทึก ? '⏳ กำลังบันทึก...' : '💾 บันทึกการอัปเดต'}
              </button>

              {สถานะใหม่ === 'อยู่ศูนย์พักพิง' && (
                <p className="text-xs text-center text-teal-600">
                  ⚡ เมื่อบันทึก ข้อมูลสัตว์จะถูกเพิ่มใน "จัดการข้อมูลสัตว์" โดยอัตโนมัติ
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM SHEET: แก้ไขสัตว์
          ============================================================ */}
      {สัตว์ที่แก้ไข && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end"
             onClick={() => { setSัตว์ที่แก้ไข(null); setข้อมูลรายงานสัตว์(null) }}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">แก้ไขข้อมูลสัตว์</p>
              <button onClick={() => { setSัตว์ที่แก้ไข(null); setข้อมูลรายงานสัตว์(null) }} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูป */}
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-teal-50 flex items-center justify-center">
                {สัตว์ที่แก้ไข.photo_url
                  ? <img src={สัตว์ที่แก้ไข.photo_url} alt={สัตว์ที่แก้ไข.name} className="w-full h-full object-contain" />
                  : <span className="text-6xl">{สัตว์ที่แก้ไข.breed?.includes('แมว') ? '🐈' : '🐕'}</span>
                }
              </div>

              {สัตว์ที่แก้ไข.report_id && (
                <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-xs text-orange-600 font-medium">
                  📋 มาจากรายงาน #{String(สัตว์ที่แก้ไข.report_id).padStart(6, '0')}
                </div>
              )}

              {/* ข้อมูลรายงาน + ผู้แจ้ง (เฉพาะสัตว์ที่มาจากรายงาน) */}
              {สัตว์ที่แก้ไข.report_id && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-700">👤 ข้อมูลผู้แจ้ง</p>

                  {โหลดรายงานสัตว์ && (
                    <p className="text-xs text-gray-400">กำลังโหลด...</p>
                  )}

                  {!โหลดรายงานสัตว์ && ข้อมูลรายงานสัตว์ && (
                    <>
                      {/* ตำแหน่งที่พบ */}
                      {ข้อมูลรายงานสัตว์.location_text && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <span className="text-base mt-0.5">📍</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-400">ตำแหน่งที่พบสัตว์</p>
                            <p className="text-sm font-semibold text-gray-800">{ข้อมูลรายงานสัตว์.location_text}</p>
                            {ข้อมูลรายงานสัตว์.latitude && ข้อมูลรายงานสัตว์.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${ข้อมูลรายงานสัตว์.latitude},${ข้อมูลรายงานสัตว์.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                              >
                                🗺️ เปิดใน Google Maps →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* รายละเอียดจากผู้แจ้ง */}
                      {ข้อมูลรายงานสัตว์.detail && (
                        <div className="bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <p className="text-xs text-gray-400 mb-0.5">รายละเอียด</p>
                          <p className="text-sm text-gray-700">"{ข้อมูลรายงานสัตว์.detail}"</p>
                        </div>
                      )}

                      {/* ข้อมูลผู้แจ้ง */}
                      {ข้อมูลรายงานสัตว์.reporter ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                              {ข้อมูลรายงานสัตว์.reporter.avatar_url
                                ? <img src={ข้อมูลรายงานสัตว์.reporter.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                                : <span className="text-xl">👤</span>
                              }
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{ข้อมูลรายงานสัตว์.reporter.name || 'ไม่ระบุ'}</p>
                              <p className="text-xs text-gray-500">{ข้อมูลรายงานสัตว์.reporter.email || '-'}</p>
                            </div>
                          </div>
                          {ข้อมูลรายงานสัตว์.reporter.phone ? (
                            <a href={`tel:${ข้อมูลรายงานสัตว์.reporter.phone}`}
                               className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-blue-200 w-full">
                              <span className="text-xl">📞</span>
                              <div>
                                <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                                <p className="text-base font-bold text-blue-600">{ข้อมูลรายงานสัตว์.reporter.phone}</p>
                              </div>
                              <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400 bg-white rounded-xl px-3 py-2 border border-dashed border-blue-200">
                              ⚠️ ผู้แจ้งยังไม่ได้ระบุเบอร์โทร
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">🗑️ บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
                      )}
                    </>
                  )}

                  {!โหลดรายงานสัตว์ && !ข้อมูลรายงานสัตว์ && (
                    <p className="text-xs text-gray-400 italic">ไม่พบข้อมูลรายงาน</p>
                  )}
                </div>
              )}

              {/* ---- ข้อมูลทั่วไป ---- */}
              <div className="flex items-center gap-2 pt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">ข้อมูลทั่วไป</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {[
                { label: 'ชื่อสัตว์', key: 'name',   placeholder: 'ชื่อสัตว์' },
                { label: 'สายพันธุ์', key: 'breed',  placeholder: 'เช่น สุนัขพันธุ์ไทย' },
                { label: 'อายุ',      key: 'age',    placeholder: 'เช่น 2–3 ปี' },
                { label: 'สุขภาพ',   key: 'health', placeholder: 'เช่น ปกติ, บาดเจ็บ, รักษาอยู่' },
              ].map(function (f) {
                return (
                  <div key={f.key}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">{f.label}</p>
                    <input value={สัตว์ที่แก้ไข[f.key] || ''} placeholder={f.placeholder}
                      onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, [f.key]: e.target.value } }) }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
                  </div>
                )
              })}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ</p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map(function (เพศ) {
                    return (
                      <button key={เพศ}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, gender: เพศ } }) }}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.gender === เพศ ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-700'
                        }`}>{เพศ}</button>
                    )
                  })}
                </div>
              </div>

              {/* ---- สถานะและสุขภาพ ---- */}
              <div className="flex items-center gap-2 pt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">สถานะและสุขภาพ</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">สถานะ</p>
                <div className="grid grid-cols-2 gap-2">
                  {['อยู่ศูนย์พักพิง', 'รอการรับเลี้ยง', 'อยู่ระหว่างรักษา', 'มีผู้รับเลี้ยง'].map(function (ส) {
                    return (
                      <button key={ส}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, status: ส } }) }}
                        className={`py-2.5 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.status === ส ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-700'
                        }`}>{ส}</button>
                    )
                  })}
                </div>
              </div>

              {/* ลักษณะนิสัย — Tag/Chip input */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ลักษณะนิสัย</p>
                <div className="w-full border border-gray-200 rounded-xl px-3 py-2 flex flex-wrap gap-1.5 focus-within:border-teal-400">
                  {(สัตว์ที่แก้ไข.traits || '').split(',').map(function (t) { return t.trim() }).filter(Boolean).map(function (tag, i) {
                    return (
                      <span key={tag + i} className="flex items-center gap-1 bg-teal-50 text-teal-700 text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full">
                        {tag}
                        <button
                          onClick={function () {
                            setSัตว์ที่แก้ไข(function (prev) {
                              const เหลือ = (prev.traits || '').split(',').map(function (t) { return t.trim() }).filter(Boolean).filter(function (_, idx) { return idx !== i })
                              return { ...prev, traits: เหลือ.join(', ') }
                            })
                          }}
                          className="text-teal-400 hover:text-teal-700"
                        ><X size={12} /></button>
                      </span>
                    )
                  })}
                  <input
                    value={inputนิสัย}
                    placeholder="พิมพ์แล้วกด Enter หรือเว้นวรรค"
                    onChange={function (e) { setinputนิสัย(e.target.value) }}
                    onKeyDown={function (e) {
                      if (e.key === 'Enter' || e.key === ' ' || e.key === ',') {
                        e.preventDefault()
                        const ค่าใหม่ = inputนิสัย.trim()
                        if (!ค่าใหม่) return
                        setSัตว์ที่แก้ไข(function (prev) {
                          const เดิม = (prev.traits || '').split(',').map(function (t) { return t.trim() }).filter(Boolean)
                          return { ...prev, traits: [...เดิม, ค่าใหม่].join(', ') }
                        })
                        setinputนิสัย('')
                      } else if (e.key === 'Backspace' && !inputนิสัย) {
                        setSัตว์ที่แก้ไข(function (prev) {
                          const เดิม = (prev.traits || '').split(',').map(function (t) { return t.trim() }).filter(Boolean)
                          เดิม.pop()
                          return { ...prev, traits: เดิม.join(', ') }
                        })
                      }
                    }}
                    className="flex-1 min-w-[100px] text-sm focus:outline-none py-1"
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">เช่น เป็นมิตร, ขี้เล่น, สงบเสงี่ยม</p>
              </div>

              {/* ประวัติการฉีดวัคซีน */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">ประวัติการฉีดวัคซีน</p>
                <div className="flex gap-2">
                  {['ฉีดแล้ว', 'ยังไม่ฉีด', 'ไม่ทราบ'].map(function (ว) {
                    const สี = ว === 'ฉีดแล้ว' ? 'border-green-500 bg-green-500 text-white'
                              : ว === 'ยังไม่ฉีด' ? 'border-red-400 bg-red-400 text-white'
                              : 'border-gray-400 bg-gray-400 text-white'
                    return (
                      <button key={ว}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, vaccine_info: ว } }) }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.vaccine_info === ว ? สี : 'border-gray-200 text-gray-600'
                        }`}>
                        {ว === 'ฉีดแล้ว' ? '✅ ฉีดแล้ว' : ว === 'ยังไม่ฉีด' ? '❌ ยังไม่ฉีด' : '❓ ไม่ทราบ'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={บันทึกแก้ไขสัตว์}
                className="w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base active:scale-95 transition-all">
                💾 บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default VolunteerPage
