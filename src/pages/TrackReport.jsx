// TrackReport.jsx — ติดตามสถานะรายงาน
// ผู้ใช้ทั่วไปดูสถานะรายงานของตัวเอง + กดดูข้อมูลเจ้าหน้าที่/ศูนย์พักพิง

import { useState, useEffect, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Pencil, Trash2, X, ClipboardList, Clock, FolderClosed, MapPin,
  MessageSquare, FileText, Camera, Save, Ban, HardHat, User, Home,
  Map, Phone, CheckCircle2, Hourglass, ArrowLeft, ChevronRight, Check
} from 'lucide-react'
import { supabase } from '../supabase'
import { ตรวจสอบไฟล์รูปภาพ } from '../utils/fileValidation'
import AnimalIcon from '../components/AnimalIcon'

// สีป้ายสถานะ (badge) — ครอบคลุมทุกสถานะจริงที่ backend เขียนได้ (ดู VolunteerPage เวิร์กโฟลว์ตามประเภท)
const สีสถานะTR = {
  'รอดำเนินการ':        'text-yellow-600 bg-yellow-50',
  'รับเรื่องแล้ว':       'text-blue-600 bg-blue-50',
  'ลงพื้นที่แล้ว':       'text-indigo-600 bg-indigo-50',
  'เข้าควบคุมแล้ว':      'text-indigo-600 bg-indigo-50',
  'ส่งรักษาสถานพยาบาล':  'text-indigo-600 bg-indigo-50',
  'ประกาศตามหาเจ้าของ':  'text-indigo-600 bg-indigo-50',
  'อยู่ศูนย์พักพิง':      'text-blue-600 bg-blue-50',
  'ส่งคืนเจ้าของสำเร็จ':  'text-green-600 bg-green-50',
  'ปล่อยกลับถิ่นเดิม':    'text-green-600 bg-green-50',
  'มีผู้รับเลี้ยง':       'text-green-600 bg-green-50',
  'เสียชีวิต':           'text-gray-600 bg-gray-100',
  'ยุติการค้นหา':        'text-gray-600 bg-gray-100',
  'เคสซ้ำซ้อน':          'text-gray-600 bg-gray-100',
  'ยกเลิกโดยผู้แจ้ง':    'text-gray-600 bg-gray-100',
}
function สีจากสถานะTR(status) {
  return สีสถานะTR[status] || 'text-gray-600 bg-gray-50'
}

// สถานะที่เจ้าหน้าที่รับเรื่องแล้ว (ทุกสถานะตั้งแต่ "รับเรื่องแล้ว" เป็นต้นไป)
const สถานะที่รับเรื่อง = [
  'รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'เข้าควบคุมแล้ว', 'ส่งรักษาสถานพยาบาล', 'ประกาศตามหาเจ้าของ',
  'อยู่ศูนย์พักพิง', 'ส่งคืนเจ้าของสำเร็จ', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'มีผู้รับเลี้ยง', 'ยุติการค้นหา',
  'เคสซ้ำซ้อน',
]

// parse เป็น UTC เสมอ แล้วบวก +7 → เวลาไทย
function parseUTCtr(str) {
  if (!str) return new Date(NaN)
  if (/[Zz]$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  return new Date(str + 'Z')
}

const เดือนTR = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

// เวลาอย่างเดียว (ไม่มีวันที่) — ใช้บนการ์ดหลังแยกกลุ่มตามวันที่แล้ว วันที่ไม่ต้องซ้ำ
function เวลาTR(dateString) {
  const bkk = new Date(parseUTCtr(dateString).getTime() + 7 * 60 * 60 * 1000)
  const hh  = String(bkk.getUTCHours()).padStart(2, '0')
  const mm  = String(bkk.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} น.`
}

// ---- ประเภทการแจ้ง (จาก urgency) — สีของ badge บนการ์ด ----
const ประเภทแจ้งTR = {
  'ด่วนมาก': { dot: 'bg-red-500',    label: 'ดุร้าย/อันตราย', badge: 'bg-red-50 text-red-700' },
  'ด่วน':    { dot: 'bg-orange-500', label: 'บาดเจ็บ',        badge: 'bg-orange-50 text-orange-700' },
  'ปานกลาง': { dot: 'bg-yellow-500', label: 'พลัดหลง/จรจัด',  badge: 'bg-yellow-50 text-yellow-700' },
}
function ประเภทจากTR(urgency) {
  return ประเภทแจ้งTR[urgency] || ประเภทแจ้งTR['ปานกลาง']
}

// ---- จัดกลุ่มรายงานตามวันที่ (Section Header) ----
function เท่ากันวันTR(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() && a.getUTCMonth() === b.getUTCMonth() && a.getUTCDate() === b.getUTCDate()
}
function ป้ายวันที่กลุ่มTR(dateString) {
  const bkk  = new Date(parseUTCtr(dateString).getTime() + 7 * 60 * 60 * 1000)
  const now  = new Date(Date.now() + 7 * 60 * 60 * 1000)
  const yest = new Date(now.getTime() - 86400000)
  const dNum = `${bkk.getUTCDate()} ${เดือนTR[bkk.getUTCMonth()]}`
  if (เท่ากันวันTR(bkk, now))  return `วันนี้ (${dNum})`
  if (เท่ากันวันTR(bkk, yest)) return `เมื่อวาน (${dNum})`
  return dNum
}
// รายงานเรียงใหม่→เก่าอยู่แล้ว (created_at desc) → group ต่อเนื่องได้เลย
function จัดกลุ่มตามวันที่TR(รายการ) {
  return รายการ.reduce(function (กลุ่ม, ร) {
    const label = ป้ายวันที่กลุ่มTR(ร.created_at)
    const ล่าสุด = กลุ่ม[กลุ่ม.length - 1]
    if (ล่าสุด && ล่าสุด.label === label) ล่าสุด.items.push(ร)
    else กลุ่ม.push({ label, items: [ร] })
    return กลุ่ม
  }, [])
}

// ================================================================
// Timeline (Progress Stepper) — Dynamic ตามประเภทการแจ้ง + สถานะปัจจุบัน
// ================================================================

// สถานะปิดเคสร่วมทุกประเภท
const สถานะปิดเคสร่วมTR = ['ส่งคืนเจ้าของสำเร็จ', 'มีผู้รับเลี้ยง', 'ยุติการค้นหา', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'เคสซ้ำซ้อน', 'ยกเลิกโดยผู้แจ้ง']

// ป้ายจุดที่ 3 ต่อประเภท
const ป้ายจุด3TR = {
  'ด่วนมาก': 'ลงพื้นที่/ควบคุม',
  'ด่วน':    'ส่งรักษาสถานพยาบาล',
  'ปานกลาง': 'ลงพื้นที่ค้นหา',
}
// ป้ายจุดที่ 4 ระหว่างยังไม่ปิดเคส (placeholder) — พอปิดเคสแล้วจะโชว์ชื่อสถานะจริงแทน
const ป้ายจุด4PlaceholderTR = {
  'ด่วนมาก': 'ระงับเหตุ',
  'ด่วน':    'รักษาตัว',
  'ปานกลาง': 'ค้นหาเจ้าของ',
}

// เคสถือว่าปิดแล้วหรือยัง — "อยู่ศูนย์พักพิง" นับเป็นปิดเคสเฉพาะสัตว์ดุร้าย (เหมือน VolunteerPage)
// ส่วนสัตว์บาดเจ็บ/พลัดหลง "อยู่ศูนย์พักพิง" ยังไม่ปิดเคส เจ้าหน้าที่ยังต้องอัปเดตสถานะสุดท้ายต่อ
function เป็นเคสปิดTR(status, reportType) {
  if (สถานะปิดเคสร่วมTR.includes(status)) return true
  if (reportType === 'ด่วนมาก' && status === 'อยู่ศูนย์พักพิง') return true
  return false
}

// คำนวณ label 4 จุด + activeIndex (จำนวนจุดสีเขียว) จากประเภทการแจ้งและสถานะปัจจุบัน
function getTimelineConfig(reportType, currentStatus) {
  const จุด3 = ป้ายจุด3TR[reportType] || ป้ายจุด3TR['ปานกลาง']
  const ปิดแล้ว = เป็นเคสปิดTR(currentStatus, reportType)
  const จุด4 = ปิดแล้ว ? currentStatus : (ป้ายจุด4PlaceholderTR[reportType] || ป้ายจุด4PlaceholderTR['ปานกลาง'])
  const labels = ['แจ้งรายงาน', 'รับเรื่อง', จุด3, จุด4]

  // ทุกสถานะที่ไม่ใช่ PENDING/ACCEPTED และยังไม่ปิดเคส ถือว่า "กำลังทำงาน" (จุดที่ 3)
  // ครอบคลุมทั้งลงพื้นที่/ควบคุม/รักษา/ประกาศตามหา และ "อยู่ศูนย์พักพิง" ที่ยังไม่ปิดเคส
  let activeIndex
  if (currentStatus === 'รอดำเนินการ')       activeIndex = 1
  else if (currentStatus === 'รับเรื่องแล้ว') activeIndex = 2
  else if (ปิดแล้ว)                          activeIndex = 4
  else                                        activeIndex = 3

  return { labels, activeIndex }
}

// Component เส้น Timeline — ใช้ร่วมกันทั้งการ์ดย่อและ bottom sheet (ปรับขนาดผ่าน size)
function TimelineStepper({ reportType, currentStatus, size = 'sm' }) {
  const { labels, activeIndex } = getTimelineConfig(reportType, currentStatus)
  const dot     = size === 'lg' ? 'w-6 h-6' : 'w-5 h-5'
  const maxW    = size === 'lg' ? 52 : 48

  return (
    <div className="flex items-center">
      {labels.map(function (label, idx) {
        const step = idx + 1
        const done = step <= activeIndex
        const nextDone = (idx + 2) <= activeIndex
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`${dot} rounded-full flex items-center justify-center text-xs font-bold ${
                done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
              }`}>
                {done ? <Check size={size === 'lg' ? 14 : 11} strokeWidth={3} /> : (size === 'lg' ? step : '')}
              </div>
              <p className={`text-center mt-1 leading-tight ${done ? 'text-green-600' : 'text-gray-400'}`}
                style={{ fontSize: '9px', maxWidth: maxW }}>
                {label}
              </p>
            </div>
            {idx < labels.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${done && nextDone ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Tabs: กำลังดำเนินการ / ประวัติการแจ้ง (Pill style) ----
function TabsNav({ active, onChange, countInProgress, countHistory }) {
  const tabs = [
    { key: 'in-progress', label: 'กำลังดำเนินการ', count: countInProgress },
    { key: 'history',     label: 'ประวัติการแจ้ง',  count: countHistory },
  ]
  return (
    <div className="px-4 pt-3">
      <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
        {tabs.map(function (tab) {
          const isActive = active === tab.key
          return (
            <button key={tab.key} onClick={() => onChange(tab.key)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                isActive ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500'
              }`}
            >
              {tab.label}
              <span className={`text-xs font-bold ${isActive ? 'text-indigo-500' : 'text-gray-400'}`}>
                ({tab.count})
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

function TrackReport({ user }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [รายการรายงาน, setรายการรายงาน] = useState([])
  const [กำลังโหลด,    setกำลังโหลด]    = useState(true)

  // Tab: 'in-progress' = กำลังดำเนินการ, 'history' = ประวัติการแจ้ง (ปิดเคสแล้ว)
  const [แท็บ, setแท็บ] = useState('in-progress')

  // Bottom sheet
  const [รายงานที่เปิด,   setรายงานที่เปิด]   = useState(null)
  const [ข้อมูลศูนย์,     setข้อมูลศูนย์]     = useState(null)   // volunteer + shelter info
  const [โหลดศูนย์,      setโหลดศูนย์]      = useState(false)

  // แก้ไข/ยกเลิก — ทำได้เฉพาะตอนสถานะยัง "รอดำเนินการ" (เจ้าหน้าที่ยังไม่รับเรื่อง)
  const [โหมดแก้ไข,       setโหมดแก้ไข]       = useState(false)
  const [ตำแหน่งแก้ไข,    setตำแหน่งแก้ไข]    = useState('')
  const [รายละเอียดแก้ไข, setรายละเอียดแก้ไข] = useState('')
  const [ไฟล์รูปแก้ไข,    setไฟล์รูปแก้ไข]    = useState(null)     // File ใหม่ (ถ้าเลือกเปลี่ยนรูป)
  const [พรีวิวรูปแก้ไข,  setพรีวิวรูปแก้ไข]  = useState(null)     // object URL สำหรับพรีวิว
  const [กำลังบันทึกแก้ไข, setกำลังบันทึกแก้ไข] = useState(false)
  const inputรูปแก้ไข = useRef(null)

  const [แสดงModalยกเลิก, setแสดงModalยกเลิก] = useState(false)
  const [กำลังยกเลิก,     setกำลังยกเลิก]     = useState(false)

  const [ข้อความสำเร็จ, setข้อความสำเร็จ] = useState('')   // toast สั้นๆ หลังบันทึก/ยกเลิก
  function toast(msg) {
    setข้อความสำเร็จ(msg)
    setTimeout(() => setข้อความสำเร็จ(''), 3000)
  }

  // ดึงรายงาน
  useEffect(function () {
    async function ดึงรายงาน() {
      if (!user?.id) { setกำลังโหลด(false); return }
      setกำลังโหลด(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setรายการรายงาน(data)
      setกำลังโหลด(false)
    }
    ดึงรายงาน()
  }, [])

  // ดึงข้อมูลศูนย์/เจ้าหน้าที่ครั้งเดียวตอนโหลด
  useEffect(function () {
    supabase
      .from('users')
      .select('name, phone, shelter_name, shelter_location, service_area, avatar_url')
      .eq('role', 'volunteer')
      .not('shelter_name', 'is', null)
      .limit(1)
      .then(function ({ data }) {
        if (data && data.length > 0) setข้อมูลศูนย์(data[0])
      })
  }, [])

  // Deep-link: มากับ ?open=<id> (จากการกดการ์ดแจ้งเตือน) → เปิดรายละเอียดรายงานนั้นอัตโนมัติ
  useEffect(function () {
    const openId = searchParams.get('open')
    if (!openId || รายการรายงาน.length === 0) return
    const found = รายการรายงาน.find(function (r) { return String(r.id) === String(openId) })
    if (found) setรายงานที่เปิด(found)
  }, [รายการรายงาน, searchParams])

  function เปิดรายละเอียด(รายงาน) {
    setรายงานที่เปิด(รายงาน)
  }

  function ปิดรายละเอียด() {
    setรายงานที่เปิด(null)
    ปิดโหมดแก้ไข()
  }

  // ---- โหมดแก้ไข ----
  function เปิดโหมดแก้ไข() {
    setตำแหน่งแก้ไข(รายงานที่เปิด.location_text || '')
    setรายละเอียดแก้ไข(รายงานที่เปิด.detail || '')
    setไฟล์รูปแก้ไข(null)
    setพรีวิวรูปแก้ไข(null)
    setโหมดแก้ไข(true)
  }

  function ปิดโหมดแก้ไข() {
    if (พรีวิวรูปแก้ไข) URL.revokeObjectURL(พรีวิวรูปแก้ไข)
    setไฟล์รูปแก้ไข(null)
    setพรีวิวรูปแก้ไข(null)
    setโหมดแก้ไข(false)
  }

  async function เลือกรูปแก้ไข(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return
    const ผลตรวจ = await ตรวจสอบไฟล์รูปภาพ(ไฟล์)
    if (!ผลตรวจ.ok) {
      alert(ผลตรวจ.error)
      event.target.value = ''
      return
    }
    if (พรีวิวรูปแก้ไข) URL.revokeObjectURL(พรีวิวรูปแก้ไข)
    setไฟล์รูปแก้ไข(ไฟล์)
    setพรีวิวรูปแก้ไข(URL.createObjectURL(ไฟล์))
    event.target.value = ''
  }

  async function บันทึกแก้ไขรายงาน() {
    if (!รายงานที่เปิด || กำลังบันทึกแก้ไข) return
    if (!ตำแหน่งแก้ไข.trim()) { alert('กรุณากรอกสถานที่พบสัตว์'); return }
    setกำลังบันทึกแก้ไข(true)

    let image_url = รายงานที่เปิด.image_url || null
    if (ไฟล์รูปแก้ไข) {
      const ชื่อไฟล์ = `${Date.now()}_${ไฟล์รูปแก้ไข.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images').upload(ชื่อไฟล์, ไฟล์รูปแก้ไข)
      if (uploadError) {
        alert('อัปโหลดรูปไม่สำเร็จ: ' + uploadError.message)
        setกำลังบันทึกแก้ไข(false)
        return
      }
      const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(uploadData.path)
      image_url = urlData.publicUrl
    }

    const { error } = await supabase.from('reports').update({
      location_text: ตำแหน่งแก้ไข.trim(),
      detail:        รายละเอียดแก้ไข.trim(),
      image_url:     image_url,
      updated_at:    new Date().toISOString(),
    }).eq('id', รายงานที่เปิด.id)

    setกำลังบันทึกแก้ไข(false)
    if (error) { alert('บันทึกไม่สำเร็จ: ' + error.message); return }

    const อัปเดตแล้ว = { ...รายงานที่เปิด, location_text: ตำแหน่งแก้ไข.trim(), detail: รายละเอียดแก้ไข.trim(), image_url }
    setรายงานที่เปิด(อัปเดตแล้ว)
    setรายการรายงาน(function (prev) { return prev.map((r) => (r.id === อัปเดตแล้ว.id ? อัปเดตแล้ว : r)) })
    ปิดโหมดแก้ไข()
    toast('บันทึกการแก้ไขสำเร็จ')
  }

  // ---- ยกเลิกรายงาน ----
  async function ยกเลิกรายงาน() {
    if (!รายงานที่เปิด || กำลังยกเลิก) return
    setกำลังยกเลิก(true)
    const { error } = await supabase.from('reports')
      .update({ status: 'ยกเลิกโดยผู้แจ้ง', updated_at: new Date().toISOString() })
      .eq('id', รายงานที่เปิด.id)
    setกำลังยกเลิก(false)
    if (error) { alert('ยกเลิกไม่สำเร็จ: ' + error.message); return }

    setรายการรายงาน(function (prev) {
      return prev.map((r) => (r.id === รายงานที่เปิด.id ? { ...r, status: 'ยกเลิกโดยผู้แจ้ง' } : r))
    })
    setแสดงModalยกเลิก(false)
    ปิดรายละเอียด()
    toast('ยกเลิกรายงานแล้ว')
  }

  // แยกเคสกำลังดำเนินการ vs ประวัติ (ปิดเคสแล้ว) — ใช้ helper เป็นเคสปิดTR เดิม (นับ "อยู่ศูนย์พักพิง"
  // เป็นปิดเคสเฉพาะสัตว์ดุร้ายเท่านั้น เหมือนที่ TimelineStepper ใช้ตัดสิน activeIndex อยู่แล้ว)
  const เคสกำลังดำเนินการ = รายการรายงาน.filter(function (ร) { return !เป็นเคสปิดTR(ร.status, ร.urgency) })
  const เคสประวัติ        = รายการรายงาน.filter(function (ร) { return เป็นเคสปิดTR(ร.status, ร.urgency) })
  const รายการที่แสดง     = แท็บ === 'in-progress' ? เคสกำลังดำเนินการ : เคสประวัติ
  const รายงานตามวันที่   = จัดกลุ่มตามวันที่TR(รายการที่แสดง)

  // ---- Loading ----
  if (กำลังโหลด) {
    return (
      <div className="min-h-screen bg-indigo-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-indigo-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 text-sm">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-indigo-50 pb-8">

      {/* Toast */}
      {ข้อความสำเร็จ && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
          {ข้อความสำเร็จ}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ติดตามรายงาน</h1>
          <p className="text-gray-500 text-xs">ตรวจสอบสถานะการช่วยเหลือสัตว์</p>
        </div>
      </div>

      {/* Tabs — กำลังดำเนินการ / ประวัติการแจ้ง (แสดงเมื่อมีรายงานอย่างน้อย 1 รายการ) */}
      {รายการรายงาน.length > 0 && (
        <TabsNav
          active={แท็บ}
          onChange={setแท็บ}
          countInProgress={เคสกำลังดำเนินการ.length}
          countHistory={เคสประวัติ.length}
        />
      )}

      <div className="px-4 pt-4 space-y-4">

        {/* ไม่มีรายงานเลยสักรายการ */}
        {!กำลังโหลด && รายการรายงาน.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <ClipboardList size={56} strokeWidth={1.5} className="text-gray-300 mb-4" />
            <p className="text-gray-600 font-semibold">คุณยังไม่มีรายงาน</p>
            <p className="text-gray-400 text-sm mt-1">รายการแจ้งสัตว์จรของคุณจะแสดงที่นี่</p>
            <button onClick={() => navigate('/report')}
              className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              แจ้งสัตว์จร
            </button>
          </div>
        )}

        {/* มีรายงาน แต่ไม่มีรายการในแท็บที่เลือกอยู่ */}
        {!กำลังโหลด && รายการรายงาน.length > 0 && รายการที่แสดง.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-16 text-center">
            {แท็บ === 'in-progress' ? <Clock size={48} strokeWidth={1.5} className="text-gray-300 mb-3" /> : <FolderClosed size={48} strokeWidth={1.5} className="text-gray-300 mb-3" />}
            <p className="text-gray-600 font-semibold">
              {แท็บ === 'in-progress' ? 'ไม่มีรายการที่กำลังดำเนินการ' : 'ยังไม่มีประวัติการแจ้ง'}
            </p>
            <p className="text-gray-400 text-sm mt-1">
              {แท็บ === 'in-progress' ? 'เคสที่กำลังดำเนินการจะแสดงที่นี่' : 'เคสที่ปิดแล้วจะย้ายมาแสดงที่นี่'}
            </p>
          </div>
        )}

        {รายงานตามวันที่.map(function (กลุ่ม) {
          return (
            <div key={กลุ่ม.label}>
              <p className="text-xs font-semibold text-gray-500 mb-2 px-1">📅 {กลุ่ม.label}</p>
              <div className="space-y-3">
                {กลุ่ม.items.map(function (รายงาน) {
                  const รับเรื่องแล้ว = สถานะที่รับเรื่อง.includes(รายงาน.status)
                  const ประเภท = ประเภทจากTR(รายงาน.urgency)
                  const รอสายพันธุ์ = รายงาน.animal_type === 'ไม่สามารถวิเคราะห์ได้'

                  return (
                    <div key={รายงาน.id}
                      className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-95 transition-all"
                      onClick={() => เปิดรายละเอียด(รายงาน)}
                    >
                      {/* แถวบน */}
                      <div className="flex items-start justify-between gap-2 mb-4">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-12 h-12 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center shrink-0">
                            {รายงาน.image_url
                              ? <img src={รายงาน.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                              : <AnimalIcon ชนิด={รายงาน.animal_type} size={24} className="text-indigo-400" />
                            }
                          </div>
                          <div className="min-w-0">
                            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mb-1 ${ประเภท.badge}`}>
                              <span className={`w-2 h-2 rounded-full shrink-0 ${ประเภท.dot}`} /> {ประเภท.label}
                            </span>
                            {รอสายพันธุ์ ? (
                              <p className="text-gray-400 text-sm">รอยืนยันสายพันธุ์</p>
                            ) : (
                              <p className="font-bold text-gray-800 text-sm">{รายงาน.animal_type || 'ไม่ระบุประเภท'}</p>
                            )}
                            <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {รายงาน.location_text}</p>
                            <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1"><Clock size={11} className="shrink-0" /> {เวลาTR(รายงาน.created_at)}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 shrink-0">
                          <span className={`text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap ${สีจากสถานะTR(รายงาน.status)}`}>
                            {รายงาน.status}
                          </span>
                          {รับเรื่องแล้ว && (
                            <span className="text-[10px] text-indigo-500 font-medium whitespace-nowrap inline-flex items-center gap-0.5">
                              กดดูข้อมูลเจ้าหน้าที่ <ChevronRight size={11} className="shrink-0" />
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Timeline — Dynamic ตามประเภทการแจ้ง + สถานะปัจจุบัน */}
                      <TimelineStepper reportType={รายงาน.urgency} currentStatus={รายงาน.status} size="sm" />

                      {/* รหัส */}
                      <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                        <span className="text-xs text-gray-400">รหัสรายงาน</span>
                        <span className="text-xs font-bold text-indigo-600">#{String(รายงาน.id).padStart(6, '0')}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================
          BOTTOM SHEET: รายละเอียด + ข้อมูลเจ้าหน้าที่
          ============================================================ */}
      {รายงานที่เปิด && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Title + Action menu (แก้ไข/ยกเลิก เฉพาะสถานะ "รอดำเนินการ") + ปิด */}
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">
                รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')}
              </p>
              <div className="flex items-center gap-1">
                {รายงานที่เปิด.status === 'รอดำเนินการ' && !โหมดแก้ไข && (
                  <>
                    <button onClick={เปิดโหมดแก้ไข} title="แก้ไขข้อมูล" aria-label="แก้ไขข้อมูล"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200">
                      <Pencil size={18} strokeWidth={2} />
                    </button>
                    <button onClick={() => setแสดงModalยกเลิก(true)} title="ยกเลิกรายงาน" aria-label="ยกเลิกรายงาน"
                      className="w-8 h-8 rounded-full flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors duration-200">
                      <Trash2 size={18} strokeWidth={2} />
                    </button>
                    <div className="w-px h-5 bg-gray-200 mx-1" />
                  </>
                )}
                <button onClick={ปิดรายละเอียด} title="ปิด" aria-label="ปิด"
                  className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200">
                  <X size={20} strokeWidth={2} />
                </button>
              </div>
            </div>

            {/* ============================================================
                โหมดแก้ไข — สลับมาจากโหมดดูรายละเอียด ใช้ได้เฉพาะสถานะ "รอดำเนินการ"
                ============================================================ */}
            {โหมดแก้ไข ? (
              <div className="px-5 pb-8 space-y-4">

                {/* รูปสัตว์ — แตะเพื่อเปลี่ยนรูป */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5">ภาพถ่ายสัตว์</p>
                  <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center">
                    {พรีวิวรูปแก้ไข ? (
                      <img src={พรีวิวรูปแก้ไข} alt="รูปใหม่ (พรีวิว)" className="w-full h-full object-contain" />
                    ) : รายงานที่เปิด.image_url ? (
                      <img src={รายงานที่เปิด.image_url} alt="สัตว์" className="w-full h-full object-contain" />
                    ) : (
                      <AnimalIcon ชนิด={รายงานที่เปิด.animal_type} size={56} className="text-indigo-300" />
                    )}
                    {พรีวิวรูปแก้ไข && (
                      <span className="absolute top-2 left-2 bg-orange-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                        รูปใหม่ (ยังไม่บันทึก)
                      </span>
                    )}
                  </div>
                  <input ref={inputรูปแก้ไข} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={เลือกรูปแก้ไข} />
                  <button onClick={() => inputรูปแก้ไข.current.click()}
                    className="w-full mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-orange-300 rounded-xl py-2.5 text-sm font-medium text-orange-600 bg-orange-50/50">
                    <Camera size={16} className="shrink-0" /> {รายงานที่เปิด.image_url || พรีวิวรูปแก้ไข ? 'เปลี่ยนรูปภาพ' : 'อัปโหลดรูปภาพ'}
                  </button>
                </div>

                {/* สถานที่พบ */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5"><MapPin size={13} className="shrink-0" /> สถานที่พบ <span className="text-red-400">*</span></p>
                  <input value={ตำแหน่งแก้ไข} onChange={(e) => setตำแหน่งแก้ไข(e.target.value)}
                    placeholder="เช่น หน้าวัดกำแพงแสน หรือ ถนนสาย 1"
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-orange-400" />
                </div>

                {/* รายละเอียดเพิ่มเติม */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5"><MessageSquare size={13} className="shrink-0" /> รายละเอียดเพิ่มเติม</p>
                  <textarea value={รายละเอียดแก้ไข} onChange={(e) => setรายละเอียดแก้ไข(e.target.value)}
                    placeholder="เช่น สัตว์อยู่ใต้ร่มไม้ ขาเป๋ข้างซ้าย"
                    rows={3}
                    className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
                </div>

                {/* ปุ่มบันทึก/ยกเลิกการแก้ไข */}
                <div className="flex gap-2 pt-1">
                  <button onClick={ปิดโหมดแก้ไข} disabled={กำลังบันทึกแก้ไข}
                    className="flex-1 border-2 border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium disabled:opacity-50">
                    ยกเลิก
                  </button>
                  <button onClick={บันทึกแก้ไขรายงาน} disabled={กำลังบันทึกแก้ไข}
                    className="flex-[2] bg-orange-500 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                    {กำลังบันทึกแก้ไข
                      ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังบันทึก...</>
                      : <><Save size={15} className="shrink-0" /> บันทึกการแก้ไข</>}
                  </button>
                </div>
              </div>
            ) : (
            <div className="px-5 pb-8 space-y-4">

              {/* รูปสัตว์ */}
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center">
                {รายงานที่เปิด.image_url
                  ? <img src={รายงานที่เปิด.image_url} alt="สัตว์" className="w-full h-full object-contain" />
                  : <AnimalIcon ชนิด={รายงานที่เปิด.animal_type} size={56} className="text-indigo-300" />
                }
              </div>

              {/* ชื่อ + สถานะ */}
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-800 text-lg truncate min-w-0">{รายงานที่เปิด.animal_type || 'ไม่ระบุ'}</p>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0 ${สีจากสถานะTR(รายงานที่เปิด.status)}`}>
                  {รายงานที่เปิด.status}
                </span>
              </div>

              {/* Timeline — Dynamic ตามประเภทการแจ้ง + สถานะปัจจุบัน */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <TimelineStepper reportType={รายงานที่เปิด.urgency} currentStatus={รายงานที่เปิด.status} size="lg" />
              </div>

              {/* ตำแหน่งที่พบสัตว์ */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={12} className="shrink-0" /> ตำแหน่งที่พบสัตว์</p>
                <p className="text-sm font-semibold text-gray-800">{รายงานที่เปิด.location_text || '-'}</p>
                {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-full"
                  >
                    <Map size={14} className="shrink-0" /> เปิดใน Google Maps →
                  </a>
                )}
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><MessageSquare size={12} className="shrink-0" /> รายละเอียดที่แจ้ง</p>
                  <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                </div>
              )}

              {/* บันทึกเจ้าหน้าที่ */}
              {รายงานที่เปิด.volunteer_notes && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs text-purple-500 font-semibold mb-1 flex items-center gap-1.5"><FileText size={12} className="shrink-0" /> บันทึกจากเจ้าหน้าที่</p>
                  <p className="text-sm text-gray-700">{รายงานที่เปิด.volunteer_notes}</p>
                </div>
              )}

              {/* ข้อมูลเจ้าหน้าที่/ศูนย์พักพิง (แสดงเฉพาะเมื่อรับเรื่องแล้ว) */}
              {รายงานที่เปิด.status === 'ยกเลิกโดยผู้แจ้ง' ? (
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4 text-center">
                  <Ban size={28} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-gray-600">คุณได้ยกเลิกรายงานนี้แล้ว</p>
                  <p className="text-xs text-gray-400 mt-1">หากยังพบสัตว์ตัวนี้อยู่ สามารถแจ้งใหม่ได้ทุกเมื่อ</p>
                </div>
              ) : สถานะที่รับเรื่อง.includes(รายงานที่เปิด.status) ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><HardHat size={13} className="shrink-0" /> ข้อมูลเจ้าหน้าที่ผู้รับผิดชอบ</p>

                  {ข้อมูลศูนย์ ? (
                    <>
                      {/* ชื่อเจ้าหน้าที่ */}
                      {ข้อมูลศูนย์.name && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                            {ข้อมูลศูนย์.avatar_url
                              ? <img src={ข้อมูลศูนย์.avatar_url} alt="เจ้าหน้าที่" className="w-full h-full object-cover" />
                              : <User size={20} className="text-blue-400" />
                            }
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{ข้อมูลศูนย์.name}</p>
                            <p className="text-xs text-blue-600">เจ้าหน้าที่อาสาสมัคร</p>
                          </div>
                        </div>
                      )}

                      {/* ชื่อศูนย์พักพิง */}
                      {ข้อมูลศูนย์.shelter_name && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <Home size={15} className="text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">ศูนย์พักพิง</p>
                            <p className="text-sm font-semibold text-gray-800">{ข้อมูลศูนย์.shelter_name}</p>
                          </div>
                        </div>
                      )}

                      {/* ที่ตั้งศูนย์ */}
                      {ข้อมูลศูนย์.shelter_location && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <MapPin size={15} className="text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">ที่ตั้งศูนย์</p>
                            <p className="text-sm text-gray-700">{ข้อมูลศูนย์.shelter_location}</p>
                          </div>
                        </div>
                      )}

                      {/* พื้นที่รับผิดชอบ */}
                      {ข้อมูลศูนย์.service_area && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <Map size={15} className="text-gray-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-xs text-gray-400">พื้นที่รับผิดชอบ</p>
                            <p className="text-sm text-gray-700">{ข้อมูลศูนย์.service_area}</p>
                          </div>
                        </div>
                      )}

                      {/* เบอร์โทร */}
                      {ข้อมูลศูนย์.phone && (
                        <a href={`tel:${ข้อมูลศูนย์.phone}`}
                          className="flex items-center gap-3 bg-blue-500 rounded-xl px-4 py-3 w-full">
                          <Phone size={20} className="text-white shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-blue-100">โทรติดต่อเจ้าหน้าที่</p>
                            <p className="text-base font-bold text-white">{ข้อมูลศูนย์.phone}</p>
                          </div>
                          <span className="text-white font-semibold text-sm">โทรเลย →</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">กำลังโหลดข้อมูลเจ้าหน้าที่...</p>
                  )}
                </div>
              ) : (
                /* ยังรอดำเนินการ */
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                  <Hourglass size={28} className="text-yellow-500 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-yellow-700">รอเจ้าหน้าที่รับเรื่อง</p>
                  <p className="text-xs text-yellow-600 mt-1">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>
                </div>
              )}

            </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: ยืนยันยกเลิกรายงาน
          ============================================================ */}
      {แสดงModalยกเลิก && รายงานที่เปิด && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end"
             onClick={() => setแสดงModalยกเลิก(false)}>
          <div className="bg-white w-full rounded-t-3xl px-5 pt-4 pb-8"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            <div className="text-center mb-5">
              <Ban size={40} strokeWidth={1.5} className="text-red-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-gray-800">ยกเลิกการแจ้งเหตุนี้?</h2>
              <p className="text-sm text-gray-500 mt-1">
                คุณต้องการยกเลิกการแจ้งเหตุนี้ใช่หรือไม่? รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')} จะถูกปิดและไม่มีเจ้าหน้าที่มาดำเนินการ
              </p>
            </div>

            <button onClick={ยกเลิกรายงาน} disabled={กำลังยกเลิก}
              className="w-full bg-red-500 text-white rounded-xl py-3.5 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2">
              {กำลังยกเลิก
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังยกเลิก...</>
                : <><CheckCircle2 size={18} className="shrink-0" /> ยืนยัน ยกเลิกรายงาน</>}
            </button>
            <button onClick={() => setแสดงModalยกเลิก(false)} disabled={กำลังยกเลิก}
              className="w-full mt-2 border-2 border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm disabled:opacity-50">
              ไม่ ขอคิดดูก่อน
            </button>
          </div>
        </div>
      )}

    </div>
  )
}

export default TrackReport
