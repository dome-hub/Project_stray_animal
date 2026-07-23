// VolunteerPage.jsx — เจ้าหน้าที่ / อาสาสมัคร
//
// reports  → Inbox: ดูรายงานทั้งหมด, กดการ์ด → Bottom sheet รายละเอียด + รับเรื่อง
// update   → Workflow: เลือกเคส → Bottom sheet อัปเดตสถานะ + auto-add animals
// animals  → จัดการสัตว์ในศูนย์ (รวมที่มาจากรายงาน)
// stats    → สถิติ

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Circle, CircleDot, Plus, X, FileSpreadsheet, Navigation, Camera, Star,
  PawPrint, HelpCircle, HardHat, PartyPopper, ClipboardList, MapPin,
  AlertTriangle, Search, FileText, Map, MessageSquare, User, Trash2,
  Phone, Loader2, CheckCircle2, XCircle, Save, Zap, Link2, Lock, Megaphone, Home,
  Hourglass, Heart, ExternalLink, ArrowLeft, ChevronRight, Check, Calendar, LocateFixed
} from 'lucide-react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { supabase } from '../supabase'
import { ตรวจสอบไฟล์รูปภาพ } from '../utils/fileValidation'
import AnimalIcon from '../components/AnimalIcon'

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
  { key: 'ด่วนมาก', label: 'สัตว์ดุร้าย/อันตราย', short: 'ดุร้าย',   hex: '#ef4444', dot: 'bg-red-500',    badge: 'bg-red-100 text-red-700 border border-red-500',       activeChip: 'border-red-500 bg-red-500 text-white' },
  { key: 'ด่วน',    label: 'สัตว์บาดเจ็บ/ป่วย',   short: 'บาดเจ็บ', hex: '#f97316', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border border-orange-500', activeChip: 'border-orange-500 bg-orange-500 text-white' },
  { key: 'ปานกลาง', label: 'สัตว์พลัดหลง/จรจัด',  short: 'พลัดหลง', hex: '#eab308', dot: 'bg-yellow-500', badge: 'bg-yellow-100 text-yellow-700 border border-yellow-500', activeChip: 'border-yellow-500 bg-yellow-500 text-white' },
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

// หมุดตำแหน่งตัวเอง — จุดกลมทึบสีน้ำเงินมีวงแหวน แยกจากหมุดหยดน้ำสีเคสตั้งใจ กันสับสนว่าจุดไหนคือเจ้าหน้าที่เอง
const หมุดตัวเอง = L.divIcon({
  html: `<div style="width:18px;height:18px;border-radius:9999px;background:#2563eb;border:3px solid white;box-shadow:0 0 0 4px rgba(37,99,235,0.35)"></div>`,
  className: '',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
})

// ตัวคุมแผนที่ — บินไปที่จุดที่เลือกจาก List
function MapController({ โฟกัส }) {
  const map = useMap()
  useEffect(function () {
    if (โฟกัส) map.flyTo([โฟกัส.lat, โฟกัส.lng], 16, { duration: 0.8 })
  }, [โฟกัส, map])
  return null
}

// ---- ค่าคงที่ ----
// step index สำหรับ Progress Stepper — ยุบเหลือ 4 ขั้น: แจ้งเข้า → รับเรื่อง → ลงพื้นที่ → ล่าสุด/ปิดเคส
// ทุกสถานะทางแยก (dynamic) และสถานะปิดเคส (terminal) นับเป็นขั้นสุดท้าย (3)
const ขั้นตอนตามสถานะ = {
  'รอดำเนินการ':        0,
  'รับเรื่องแล้ว':       1,
  'ลงพื้นที่แล้ว':       2,
  'เข้าควบคุมแล้ว':      3,
  'ส่งรักษาสถานพยาบาล':  3,
  'ประกาศตามหาเจ้าของ':  3,
  'อยู่ศูนย์พักพิง':      3,
  'ส่งคืนเจ้าของสำเร็จ':  3,
  'ปล่อยกลับถิ่นเดิม':    3,
  'เสียชีวิต':           3,
  'มีผู้รับเลี้ยง':       3,
  'ยุติการค้นหา':        3,
  'เคสซ้ำซ้อน':          3,
  'ยกเลิกโดยผู้แจ้ง':    3,
}
const ขั้นตอนทั้งหมด = ['แจ้งเข้า', 'รับเรื่อง', 'ลงพื้นที่', 'ปิดเคส']

// สีสถานะ (Progress Status) — ใช้โทนกลาง (neutral) เจตนาไม่ใช้แดง/ส้ม/เหลือง เพราะสามสีนั้นถูกจองไว้
// สื่อความหมาย "ความเร่งด่วนของประเภทการแจ้ง" ที่แถบซ้ายการ์ด/ป้ายประเภทแล้ว (ดู ประเภทแจ้งเรียง) — กันสับสนว่าสีไหนบอกอะไร
// เทา=ยังไม่เริ่ม, เขียว=กำลังดำเนินการ/รับเรื่องแล้ว, น้ำเงิน=ศูนย์พักพิง, เขียว=ปิดเคสสำเร็จ, เทา=ยุติ/เสียชีวิต
const สีสถานะ = {
  'รอดำเนินการ':        'text-gray-600 bg-gray-100 border-gray-200',
  'รับเรื่องแล้ว':       'text-green-700 bg-green-50 border-green-200',
  'ลงพื้นที่แล้ว':       'text-green-700 bg-green-50 border-green-200',
  'เข้าควบคุมแล้ว':      'text-green-700 bg-green-50 border-green-200',
  'ส่งรักษาสถานพยาบาล':  'text-green-700 bg-green-50 border-green-200',
  'ประกาศตามหาเจ้าของ':  'text-green-700 bg-green-50 border-green-200',
  'อยู่ศูนย์พักพิง':      'text-blue-700 bg-blue-50 border-blue-200',
  'ส่งคืนเจ้าของสำเร็จ':  'text-green-700 bg-green-50 border-green-200',
  'ปล่อยกลับถิ่นเดิม':    'text-green-700 bg-green-50 border-green-200',
  'มีผู้รับเลี้ยง':       'text-green-700 bg-green-50 border-green-200',
  'เสียชีวิต':           'text-gray-600 bg-gray-100 border-gray-200',
  'ยุติการค้นหา':        'text-gray-600 bg-gray-100 border-gray-200',
  'เคสซ้ำซ้อน':          'text-gray-600 bg-gray-100 border-gray-200',
  'ยกเลิกโดยผู้แจ้ง':    'text-gray-600 bg-gray-100 border-gray-200',
}

// สถานะปิดเคส (terminal) เริ่มต้น — ใช้กับสัตว์บาดเจ็บ/พลัดหลง
const สถานะปิดเคสเริ่มต้น = [
  { value: 'ส่งคืนเจ้าของสำเร็จ', label: 'ส่งคืนเจ้าของสำเร็จ' },
  { value: 'มีผู้รับเลี้ยง',       label: 'มีผู้รับเลี้ยงแล้ว' },
  { value: 'ยุติการค้นหา',        label: 'ยุติการค้นหา / หาตัวไม่พบ' },
]

// ---- Workflow สถานะที่แปรผันตามประเภทการแจ้ง (report type = urgency) ----
// core (1→2→3) ใช้ร่วมทุกประเภท; dynamic = ทางแยกระหว่างปฏิบัติงาน, close = ตัวเลือกปิดเคส
// ทั้ง dynamic + close จะโผล่ก็ต่อเมื่อสถานะปัจจุบันถึง "ลงพื้นที่แล้ว" (ON_SITE) ขึ้นไป
const เวิร์กโฟลว์ตามประเภท = {
  // DANGEROUS — สัตว์ดุร้าย/เสี่ยงอันตราย: เป้าหมายคือระงับเหตุ ไม่ใช่หาบ้าน
  // ระหว่างงานมีแค่ "เข้าควบคุม"; จบเคสได้ 3 ทาง (นำส่งศูนย์ = ปิดเคส, ไม่ใช่รอรับเลี้ยง)
  'ด่วนมาก': {
    dynamic: [
      { value: 'เข้าควบคุมแล้ว', label: 'เข้าควบคุมพื้นที่ / จับกุมตัวแล้ว' },
    ],
    close: [
      { value: 'อยู่ศูนย์พักพิง',    label: 'นำส่งศูนย์กักกัน/พักพิงสำเร็จ' },
      { value: 'ส่งคืนเจ้าของสำเร็จ', label: 'ส่งคืนเจ้าของ / ทำข้อตกลงแล้ว' },
      { value: 'ยุติการค้นหา',       label: 'ยุติการค้นหา / สัตว์หลบหนี' },
    ],
  },
  // INJURED — สัตว์บาดเจ็บ/ป่วย: ห้ามปิดเคสด้วย "มีผู้รับเลี้ยงแล้ว" โดยตรง — สัตว์ที่รอดต้องผ่าน
  // "พักฟื้นที่ศูนย์พักพิง" (เข้าระบบจัดการข้อมูลสัตว์) ก่อนเสมอ กันข้ามขั้นตอน
  'ด่วน': {
    dynamic: [
      { value: 'ส่งรักษาสถานพยาบาล', label: 'ส่งรักษาสถานพยาบาล' },
      { value: 'อยู่ศูนย์พักพิง',     label: 'พักฟื้นที่ศูนย์พักพิง' },
    ],
    close: [
      { value: 'ส่งคืนเจ้าของสำเร็จ', label: 'ส่งคืนเจ้าของสำเร็จ' },
      { value: 'ปล่อยกลับถิ่นเดิม',   label: 'ปล่อยกลับถิ่นเดิม' },
      { value: 'เสียชีวิต',          label: 'เสียชีวิต' },
      { value: 'ยุติการค้นหา',       label: 'ยุติการค้นหา / หาตัวไม่พบ' },
    ],
  },
  // STRAY — พบสัตว์พลัดหลง/สัตว์จรจัด
  'ปานกลาง': {
    dynamic: [
      { value: 'ประกาศตามหาเจ้าของ', label: 'ประกาศตามหาเจ้าของ' },
      { value: 'อยู่ศูนย์พักพิง',     label: 'อยู่ศูนย์พักพิง' },
    ],
  },
}

// เคสถือว่า "ปิด" (จบภารกิจฝั่ง dispatch) แล้ว → หมุดหายจากแผนที่ + ออกจากหน้าอัปเดตสถานะ + ย้ายไปแท็บประวัติ
// "อยู่ศูนย์พักพิง" นับเป็นปิดภารกิจภาคสนามของ "ทุกประเภท" (ไม่ใช่แค่สัตว์ดุร้าย) — พอสัตว์มาถึงศูนย์แล้ว
// การดูแลต่อ (รักษา / พักฟื้น / หาบ้าน) จะย้ายไปทำที่หน้า "จัดการข้อมูลสัตว์" ซึ่งสร้าง profile ให้อัตโนมัติแล้ว
const สถานะปิดร่วม = ['อยู่ศูนย์พักพิง', 'ส่งคืนเจ้าของสำเร็จ', 'มีผู้รับเลี้ยง', 'ยุติการค้นหา', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'เคสซ้ำซ้อน', 'ยกเลิกโดยผู้แจ้ง']
function เป็นเคสปิด(report) {
  return สถานะปิดร่วม.includes(report.status)
}

// ---- ตรวจจับ "เคสที่อาจซ้ำ" จากข้อมูลที่โหลดมาแล้ว (ไม่ต้อง query เพิ่ม) ----
// เตือนเฉพาะเคสที่ยังไม่ปิดและมีพิกัด — คืน object: report.id -> { เคส, ระยะ } ของเคสที่ใกล้ที่สุด
// O(n²) แต่ n = จำนวนเคสที่ยัง active ในตำบลเดียว ซึ่งน้อยมาก จึงคำนวณสดตอน render ได้
const รัศมีเตือนซ้ำเมตร = 50
function สร้างแผนที่เคสซ้ำ(รายงาน) {
  const active = รายงาน.filter(function (r) { return !เป็นเคสปิด(r) && r.latitude && r.longitude })
  const ผล = {}
  for (let i = 0; i < active.length; i++) {
    for (let j = i + 1; j < active.length; j++) {
      const a = active[i]
      const b = active[j]
      const ระยะ = ระยะทางเมตร(a.latitude, a.longitude, b.latitude, b.longitude)
      if (ระยะ > รัศมีเตือนซ้ำเมตร) continue
      if (!ผล[a.id] || ระยะ < ผล[a.id].ระยะ) ผล[a.id] = { เคส: b, ระยะ }
      if (!ผล[b.id] || ระยะ < ผล[b.id].ระยะ) ผล[b.id] = { เคส: a, ระยะ }
    }
  }
  return ผล
}

// ช่องรูปเล็กสำหรับเทียบภาพ 2 เคสใน modal รวมเคส (นิยามนอก component กัน remount รูปทุกครั้งที่ re-render)
function ช่องเทียบเคส({ เคส, ป้าย, สี }) {
  return (
    <div className="flex-1 min-w-0">
      <p className={`text-[10px] font-bold mb-1 text-center ${สี}`}>{ป้าย}</p>
      <div className="aspect-square rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center">
        {เคส?.image_url
          ? <img src={เคส.image_url} alt={ป้าย} className="w-full h-full object-cover" />
          : (เคส ? <PawPrint size={28} className="text-gray-400" /> : <HelpCircle size={28} className="text-gray-300" />)}
      </div>
      <p className="text-[11px] font-bold text-gray-700 mt-1 text-center truncate">
        {เคส ? `#${String(เคส.id).padStart(6, '0')}` : 'ยังไม่เลือก'}
      </p>
      <p className="text-[10px] text-gray-400 text-center truncate">
        {เคส ? (เคส.animal_type || 'ไม่ระบุ') : '—'}
      </p>
    </div>
  )
}

// สร้างตัวเลือกสถานะสำหรับ report หนึ่งๆ — แยกเป็นกลุ่ม "อัปเดตความคืบหน้า" และ "ปิดเคส"
function ตัวเลือกอัปเดตสถานะ(report) {
  const stepIdx    = ขั้นตอนตามสถานะ[report.status] ?? 0
  const ถึงลงพื้นที่ = stepIdx >= 2
  const wf = เวิร์กโฟลว์ตามประเภท[report.urgency] || เวิร์กโฟลว์ตามประเภท['ปานกลาง']
  const progress = []
  if (stepIdx < 1) progress.push({ value: 'รับเรื่องแล้ว', label: 'รับเรื่องแล้ว' })
  if (stepIdx < 2) progress.push({ value: 'ลงพื้นที่แล้ว', label: 'ลงพื้นที่แล้ว' })
  if (ถึงลงพื้นที่) progress.push(...wf.dynamic)
  return { progress, close: ถึงลงพื้นที่ ? (wf.close || สถานะปิดเคสเริ่มต้น) : [] }
}

const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง':  'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง':   'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา': 'text-orange-600 bg-orange-50',
  'มีผู้รับเลี้ยง':    'text-gray-500 bg-gray-100',
}

// ตัวเลือกช่วงอายุ (ใช้ทั้งฟอร์มเพิ่ม/แก้ไข) — ต้องเป็นชุดค่าคงที่เดียวกันเสมอ
// เพราะ FindPet.jsx (ฝั่ง user) กรอง "เด็ก/โต" โดย match ตรงกับ string ชุดนี้
const ตัวเลือกอายุสัตว์ = ['น้อยกว่า 1 ปี', '1–2 ปี', '2–5 ปี', '5–10 ปี', 'มากกว่า 10 ปี', 'ไม่ทราบ']

// ---- Helper: ชื่อ/สายพันธุ์ ที่แสดงผลได้จริง — กัน "ไม่สามารถวิเคราะห์ได้" (AI วิเคราะห์พันธุ์ไม่ได้) หลุดมาโชว์เป็นชื่อ ----
function แสดงสายพันธุ์สัตว์(breed) {
  if (!breed || breed === 'ไม่สามารถวิเคราะห์ได้') return 'รอระบุสายพันธุ์'
  return breed
}
function แสดงชื่อสัตว์(สัตว์) {
  if (สัตว์.name && สัตว์.name !== 'ยังไม่ตั้งชื่อ') return สัตว์.name
  if (สัตว์.report_id) return `ยังไม่ตั้งชื่อ (รหัส #${String(สัตว์.report_id).padStart(6, '0')})`
  return `${สัตว์.breed?.includes('แมว') ? 'แมว' : 'สุนัข'} รอระบุชื่อ`
}

// ---- Helper: คลังรูปสัตว์ (multi-image) — คืน array เสมอ ----
// รองรับข้อมูลเก่าที่มีแค่ photo_url (ก่อนมีคอลัมน์ photos): ถ้าไม่มี photos[] ให้ fallback เป็น [photo_url]
// convention: photos[0] = รูปโปรไฟล์หลัก (cover) เสมอ
function คลังรูปสัตว์(สัตว์) {
  if (Array.isArray(สัตว์?.photos) && สัตว์.photos.length > 0) return สัตว์.photos
  if (สัตว์?.photo_url) return [สัตว์.photo_url]
  return []
}

// ---- โหมดการเผยแพร่ (publish_mode) ----
// แยก "ประกาศอะไรอยู่" ออกจาก status ที่บอกแค่ "ตอนนี้สัตว์อยู่ไหน"
// เดิมใช้ status ทำสองหน้าที่ พอเปลี่ยนเป็น "อยู่ศูนย์พักพิง" ประกาศตามหาเจ้าของเลยถูกทับหายไป
// ตอนนี้สัตว์ "อยู่ศูนย์พักพิง" + "ยังตามหาเจ้าของเดิม" พร้อมกันได้แล้ว
const โหมดเผยแพร่ = [
  {
    value: 'none',
    label: 'ไม่เผยแพร่ (ข้อมูลภายใน)',
    desc:  'เห็นเฉพาะเจ้าหน้าที่ ผู้ใช้ทั่วไปจะไม่เห็นน้องเลย',
    Icon:  Lock,
    active: 'border-gray-400 bg-gray-100 text-gray-700',
    dot:   'text-gray-500',
  },
  {
    value: 'lost_and_found',
    label: 'ประกาศตามหาเจ้าของเดิม',
    desc:  'ขึ้นหน้า "สัตว์หาย / พลัดหลง" — ใช้ตอนคาดว่าน้องมีเจ้าของอยู่แล้ว',
    Icon:  Megaphone,
    active: 'border-rose-500 bg-rose-50 text-rose-700',
    dot:   'text-rose-500',
  },
  {
    value: 'adoption',
    label: 'ประกาศหาบ้านใหม่',
    desc:  'ขึ้นหน้า "ค้นหาสัตว์เลี้ยง" — ใช้เมื่อแน่ใจว่าไม่มีเจ้าของเดิมมารับแล้ว',
    Icon:  Home,
    active: 'border-teal-600 bg-teal-50 text-teal-700',
    dot:   'text-teal-600',
  },
]

// สถานะที่แปลว่าสัตว์ออกจากความดูแลไปแล้ว → ประกาศต่อไม่ได้ ต้องบังคับเป็น 'none'
const สถานะสัตว์ออกไปแล้ว = ['มีผู้รับเลี้ยง', 'ส่งคืนเจ้าของสำเร็จ']

function โหมดจาก(สัตว์) {
  return สัตว์?.publish_mode || 'none'
}

// ---- Helper: ข้อมูลขั้นต่ำก่อน "ประกาศหาบ้านใหม่" ----
// บังคับเฉพาะโหมด adoption เพราะตัวกรอง "ค้นหาแบบละเอียด" ฝั่ง user (FindPet) ต้องใช้ ประเภท/เพศ/อายุ/ขนาด
// ส่วนโหมดตามหาเจ้าของไม่บังคับ — ยิ่งประกาศเร็วยิ่งดี เจ้าของจำน้องได้จากรูปอยู่แล้ว
// อายุต้องเป็นช่วงจริง ไม่ใช่ "ไม่ทราบ" เพราะตัวกรอง เด็ก/โต ของ user จับคู่กับช่วงอายุที่ชัดเจนเท่านั้น
function ข้อมูลครบพอเผยแพร่(สัตว์) {
  if (!สัตว์) return false
  const มีประเภท = สัตว์.species === 'สุนัข' || สัตว์.species === 'แมว'
  const มีเพศ    = ['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].includes(สัตว์.gender)
  const มีอายุ   = !!สัตว์.age && สัตว์.age !== 'ไม่ทราบ' && ตัวเลือกอายุสัตว์.includes(สัตว์.age)
  const มีขนาด   = ['เล็ก', 'กลาง', 'ใหญ่'].includes(สัตว์.size)
  return มีประเภท && มีเพศ && มีอายุ && มีขนาด
}

// Haversine — ระยะทางระหว่าง 2 พิกัด (เมตร) ใช้เรียงเคสใกล้เคียงตอนเลือกเคสหลักเพื่อรวมเคสซ้ำ
function ระยะทางเมตร(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const rad = (d) => (d * Math.PI) / 180
  const dLat = rad(lat2 - lat1)
  const dLon = rad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(a))
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
// วันที่รับเข้าศูนย์ (แบบสั้น มีปี พ.ศ.) เช่น "20 ก.ค. 2569" — ใช้บนการ์ดหน้าจัดการข้อมูลสัตว์
function วันที่รับเข้า(str) {
  if (!str) return 'รอระบุ'
  return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---- Helper: ป้ายกลุ่มวันที่ — วันนี้ / เมื่อวาน / วันที่จริง ----
function เท่ากันวัน(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}
function ป้ายวันที่กลุ่ม(str) {
  const d        = new Date(str)
  const วันนี้   = new Date()
  const เมื่อวาน = new Date(วันนี้)
  เมื่อวาน.setDate(วันนี้.getDate() - 1)
  const วันที่ตัวเลข = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
  if (เท่ากันวัน(d, วันนี้))   return `วันนี้ (${วันที่ตัวเลข})`
  if (เท่ากันวัน(d, เมื่อวาน)) return `เมื่อวาน (${วันที่ตัวเลข})`
  return วันที่ตัวเลข
}
// จัดกลุ่มรายการที่เรียงจากใหม่ไปเก่าอยู่แล้ว (created_at desc) ให้เป็น section ตามวันที่ต่อเนื่อง
function จัดกลุ่มตามวันที่(รายการ) {
  return รายการ.reduce(function (กลุ่ม, ร) {
    const label = ป้ายวันที่กลุ่ม(ร.created_at)
    const กลุ่มล่าสุด = กลุ่ม[กลุ่ม.length - 1]
    if (กลุ่มล่าสุด && กลุ่มล่าสุด.label === label) {
      กลุ่มล่าสุด.items.push(ร)
    } else {
      กลุ่ม.push({ label, items: [ร] })
    }
    return กลุ่ม
  }, [])
}

// ---- Helper: Progress Bar ----
function ProgressBar({ status }) {
  const stepIdx = ขั้นตอนตามสถานะ[status] ?? 0
  // ขั้นสุดท้ายแสดงชื่อสถานะจริงเมื่อไปถึงแล้ว (เช่น "อยู่ศูนย์พักพิง") แทนคำว่า "ปิดเคส"
  const labels = ขั้นตอนทั้งหมด.map(function (ข, i) {
    return i === ขั้นตอนทั้งหมด.length - 1 && stepIdx >= i ? status : ข
  })
  return (
    <div className="flex items-center">
      {labels.map(function (ขั้น, idx) {
        const done    = idx <= stepIdx
        const current = idx === stepIdx
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done
                  ? current
                    ? 'bg-teal-600 text-white ring-2 ring-teal-200'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {done && !current ? <Check size={14} strokeWidth={3} /> : idx + 1}
              </div>
              <p className={`text-center mt-1 leading-tight ${
                done ? (current ? 'text-teal-700' : 'text-green-600') : 'text-gray-400'
              }`} style={{ fontSize: '10px', maxWidth: 52 }}>
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
    <div className={`${dim} rounded-xl overflow-hidden bg-teal-50 flex items-center justify-center`}>
      {imageUrl
        ? <img src={imageUrl} alt="สัตว์" className="w-full h-full object-cover" />
        : <AnimalIcon ชนิด={type} size={size === 'lg' ? 64 : 28} className="text-teal-300" />
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

  // ---- Merge duplicate (รวมเคสซ้ำซ้อน) ----
  // เคสที่จะรวม = ใบที่กำลังจะถูกปิดเป็น "เคสซ้ำซ้อน" — แยกจาก รายงานที่เปิด เพราะเปิด modal ได้
  // ทั้งจากปุ่มในหน้าอัปเดตสถานะ และจากป้าย "อาจซ้ำ" บนการ์ดหน้ารายการ (ที่ไม่ควรเปิด bottom sheet ค้างไว้)
  const [เคสที่จะรวม,     setเคสที่จะรวม]     = useState(null)
  const [แสดงModalรวมเคส, setแสดงModalรวมเคส] = useState(false)
  const [เคสหลักที่เลือก,  setเคสหลักที่เลือก]  = useState('')     // id ของเคสหลักที่จะรวมเข้า
  const [กำลังรวมเคส,     setกำลังรวมเคส]     = useState(false)

  // ---- Filter (reports) ----
  const [แท็บรายงาน, setแท็บรายงาน] = useState('active')  // active = กำลังดำเนินการ, history = ประวัติการทำงาน
  const [ประเภทเลือกReports, setประเภทเลือกReports] = useState([])  // multi-select ประเภทการแจ้ง; [] = แสดงทั้งหมด
  const [ค้นหาReports, setค้นหาReports] = useState('')
  const [เรียงตามReports, setเรียงตามReports] = useState('date')  // date = ล่าสุดก่อน (จัดกลุ่มตามวัน), urgency = ดุร้าย→บาดเจ็บ→พลัดหลง
  const [เรียงตามUpdate,  setเรียงตามUpdate]  = useState('date')  // เหมือนกันแต่แยก state เพราะเป็นคนละหน้า สลับอันหนึ่งไม่กระทบอีกอัน

  // ---- Animals ----
  const [สัตว์จากDB,        setSัตว์จากDB]        = useState([])
  const [โหลดสัตว์,         setโหลดสัตว์]         = useState(true)
  const [แท็บสัตว์,         setแท็บสัตว์]         = useState('shelter')  // shelter | waiting | adopted
  const [ค้นหาสัตว์,       setค้นหาสัตว์]        = useState('')
  const [สัตว์ที่แก้ไข,      setSัตว์ที่แก้ไข]      = useState(null)
  const [inputนิสัย,        setinputนิสัย]        = useState('')      // ช่องพิมพ์ก่อนกลายเป็น chip
  const [ข้อมูลรายงานสัตว์,  setข้อมูลรายงานสัตว์]  = useState(null)   // { report + reporter }
  const [โหลดรายงานสัตว์,   setโหลดรายงานสัตว์]   = useState(false)
  const [แสดงฟอร์มเพิ่ม, setแสดงฟอร์มเพิ่ม] = useState(false)
  const [กำลังอัปโหลดรูป,   setกำลังอัปโหลดรูป]   = useState(false)   // กำลังอัปโหลดรูปเข้าคลังอยู่ไหม
  const inputรูปสัตว์ = useRef(null)
  const [ชื่อสัตว์,       setชื่อสัตว์]       = useState('')
  const [เพศสัตว์,       setเพศสัตว์]       = useState('')
  const [สายพันธุ์,      setSายพันธุ์]      = useState('')
  const [อายุสัตว์,      setอายุสัตว์]      = useState('')
  const [สุขภาพสัตว์,    setSุขภาพสัตว์]    = useState('ปกติ')

  // ---- Stats ----
  const [สถิติ, setSถิติ] = useState({ รายงาน: 0, รอดำเนินการ: 0, สัตว์: 0, รับเลี้ยงแล้ว: 0 })
  const [สถิติเดือนนี้, setSถิติเดือนนี้]   = useState({ รายงาน: 0, รับเลี้ยงแล้ว: 0 })
  const [สถิติเดือนก่อน, setSถิติเดือนก่อน] = useState({ รายงาน: 0, รับเลี้ยงแล้ว: 0 })
  const [กำลังExport, setกำลังExport] = useState(false)
  const [วันที่เริ่ม,   setวันที่เริ่ม]   = useState('')  // ว่าง = ไม่กรอง
  const [วันที่สิ้นสุด, setวันที่สิ้นสุด] = useState('')

  // ---- แผนที่จุดเกิดเหตุ ----
  const [รายงานพิกัด, setรายงานพิกัด] = useState([])
  const [โหลดแผนที่, setโหลดแผนที่] = useState(true)
  const [filterMap, setFilterMap]   = useState([])  // multi-select ประเภทการแจ้ง; [] = แสดงทั้งหมด
  const [ประเภทเลือกUpdate, setประเภทเลือกUpdate] = useState([])  // multi-select ประเภทการแจ้ง; [] = แสดงทั้งหมด
  const [โฟกัสจุด, setโฟกัสจุด]     = useState(null)   // { lat, lng } ที่ให้แผนที่บินไป
  const [ตำแหน่งฉัน, setตำแหน่งฉัน] = useState(null)   // { lat, lng } ของเจ้าหน้าที่ — ใช้เรียงเคสใกล้สุดก่อน
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)

  // ================================================================
  // FETCH
  // ================================================================
  useEffect(function () {
    if (หน้า === 'reports' || หน้า === 'update') ดึงรายงาน()
    if (หน้า === 'animals') ดึงสัตว์()
    if (หน้า === 'stats')   ดึงสถิติ()
    if (หน้า === 'map')     ดึงรายงานพิกัด()
  }, [หน้า])

  // สัตว์ที่ออกจากความดูแลไปแล้ว (มีผู้รับเลี้ยง / ส่งคืนเจ้าของ) ประกาศต่อไม่ได้ → บังคับเป็น 'none'
  // ครอบคลุมทั้งตอนกดเปลี่ยนสถานะ และตอนเปิดฟอร์มเจอข้อมูลเก่าที่ไม่สอดคล้อง
  // หมายเหตุ: ไม่บังคับปิดตอน "อยู่ศูนย์พักพิง/อยู่ระหว่างรักษา" อีกแล้ว เพราะสัตว์อยู่ศูนย์
  // แล้วยังประกาศตามหาเจ้าของเดิมต่อได้ (คือหัวใจของการแยก publish_mode ออกจาก status)
  useEffect(function () {
    if (สัตว์ที่แก้ไข && โหมดจาก(สัตว์ที่แก้ไข) !== 'none' && สถานะสัตว์ออกไปแล้ว.includes(สัตว์ที่แก้ไข.status)) {
      setSัตว์ที่แก้ไข(function (prev) { return { ...prev, publish_mode: 'none' } })
    }
  }, [สัตว์ที่แก้ไข?.status, สัตว์ที่แก้ไข?.publish_mode])

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
    if (data) {
      // แปะประเภทการแจ้ง (urgency) ของรายงานต้นทางเข้าไปในแต่ละตัว — ใช้โชว์ป้ายประเภทบนการ์ด
      // ดึงเฉพาะ report ที่ถูกอ้างถึงจริง (ไม่ดึงทั้งตาราง) แล้ว join ฝั่ง client — ไม่ต้องพึ่ง FK/แก้ schema
      const รหัสรายงาน = [...new Set(data.map((a) => a.report_id).filter(Boolean))]
      const urgencyMap = {}
      if (รหัสรายงาน.length > 0) {
        const { data: reps } = await supabase
          .from('reports')
          .select('id, urgency')
          .in('id', รหัสรายงาน)
        if (reps) reps.forEach((r) => { urgencyMap[r.id] = r.urgency })
      }
      setSัตว์จากDB(data.map((a) => ({ ...a, _urgency: a.report_id ? (urgencyMap[a.report_id] || null) : null })))
    }
    setโหลดสัตว์(false)
  }

  async function ดึงสถิติ() {
    // วันแรกของเดือนนี้ + เดือนก่อน (ไว้เทียบแนวโน้ม)
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    startOfMonth.setHours(0, 0, 0, 0)
    const startOfLastMonth = new Date(startOfMonth)
    startOfLastMonth.setMonth(startOfLastMonth.getMonth() - 1)

    const [ร1, ร2, ร3, ร4, ร5, ร6, ร7, ร8] = await Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'รอดำเนินการ'),
      // "สัตว์ในดูแล" ควรนับเฉพาะตัวที่ยังอยู่ในความรับผิดชอบจริง (เดิมนับสัตว์ทั้งหมดที่เคยเพิ่ม รวมตัวที่รับเลี้ยงไปแล้วด้วย ทำให้ตัวเลขไม่ตรงชื่อหัวข้อ)
      supabase.from('animals').select('id', { count: 'exact', head: true }).in('status', ['อยู่ศูนย์พักพิง', 'อยู่ระหว่างรักษา', 'รอการรับเลี้ยง']),
      supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
      // เดือนนี้ — ไว้เทียบแนวโน้ม
      supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', startOfMonth.toISOString()),
      supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง').gte('created_at', startOfMonth.toISOString()),
      // เดือนก่อน
      supabase.from('reports').select('id', { count: 'exact', head: true }).gte('created_at', startOfLastMonth.toISOString()).lt('created_at', startOfMonth.toISOString()),
      supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง').gte('created_at', startOfLastMonth.toISOString()).lt('created_at', startOfMonth.toISOString()),
    ])
    setSถิติ({ รายงาน: ร1.count || 0, รอดำเนินการ: ร2.count || 0, สัตว์: ร3.count || 0, รับเลี้ยงแล้ว: ร4.count || 0 })
    setSถิติเดือนนี้({ รายงาน: ร5.count || 0, รับเลี้ยงแล้ว: ร6.count || 0 })
    setSถิติเดือนก่อน({ รายงาน: ร7.count || 0, รับเลี้ยงแล้ว: ร8.count || 0 })
  }

  // ---- หาตำแหน่งปัจจุบันของเจ้าหน้าที่ (GPS เบราว์เซอร์) — ใช้เรียงเคสบนแผนที่ตามระยะใกล้สุด ----
  function หาตำแหน่งฉัน() {
    if (!navigator.geolocation) {
      toast('เบราว์เซอร์นี้ไม่รองรับการระบุตำแหน่ง')
      return
    }
    setกำลังหาตำแหน่ง(true)
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        const ตำแหน่ง = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setตำแหน่งฉัน(ตำแหน่ง)
        setกำลังหาตำแหน่ง(false)
        setโฟกัสจุด({ ...ตำแหน่ง, id: 'me', t: Date.now() })
      },
      function () {
        setกำลังหาตำแหน่ง(false)
        toast('ไม่สามารถระบุตำแหน่งได้ กรุณาอนุญาตการเข้าถึงตำแหน่งในเบราว์เซอร์')
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
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

  // เปิด modal จัดการจากหน้าแผนที่ (double-click การ์ด) — ดึงข้อมูลเต็มของรายงานก่อน
  // เพราะ ดึงรายงานพิกัด() เลือกมาไม่ครบทุกฟิลด์ (ไม่มี reporter_id / image_url / volunteer_notes)
  async function เปิดจัดการจากแผนที่(r) {
    const { data } = await supabase.from('reports').select('*').eq('id', r.id).single()
    เปิดรายละเอียด(data || r)
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
        if (notiErr) console.error('ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
        else console.log('ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
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
      toast('รับเรื่องสำเร็จ! แจ้งเตือนผู้แจ้งแล้ว')
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
        // สืบทอดการประกาศตามหาเจ้าของมาด้วย — report.status ยังเป็นสถานะ "ก่อนหน้า" ตรงนี้
        // ถ้าเคยประกาศตามหาเจ้าของไว้ หรือเป็นเคสสัตว์พลัดหลง (ปานกลาง = น่าจะมีเจ้าของ)
        // ให้ประกาศต่อทันทีที่ศูนย์ ไม่ให้หลุดหายจากหน้า "สัตว์หาย / พลัดหลง" ตอนย้ายเข้าศูนย์
        const โหมดเริ่มต้น =
          (report.status === 'ประกาศตามหาเจ้าของ' || report.urgency === 'ปานกลาง')
            ? 'lost_and_found'
            : 'none'

        const { error: animalErr } = await supabase.from('animals').insert({
          name:         'ยังไม่ตั้งชื่อ',
          breed:        report.animal_type || 'ไม่ระบุ',
          status:       'อยู่ศูนย์พักพิง',
          health:       'ยังไม่ตรวจ',
          photo_url:    report.image_url || null,                     // รูปหลัก (cover) — sync กับ photos[0]
          photos:       report.image_url ? [report.image_url] : null, // เริ่มคลังรูปด้วยรูปจากจุดเกิดเหตุ
          location:     report.location_text || 'กำแพงแสน นครปฐม',
          report_id:    report.id,
          publish_mode: โหมดเริ่มต้น,
          is_adoptable: false,
        })
        if (animalErr) console.error('เพิ่มสัตว์ไม่สำเร็จ:', animalErr.message)
        else console.log('เพิ่มสัตว์ในระบบอัตโนมัติสำเร็จ (report_id:', report.id, ')')
      }
    }

    // ส่ง notification ให้ผู้แจ้ง — ทุกสถานะที่เปลี่ยน
    const รหัส = String(report.id).padStart(6, '0')
    const msgMap = {
      'รับเรื่องแล้ว':       `เจ้าหน้าที่รับเรื่องรายงาน #${รหัส} ของคุณแล้ว กำลังเตรียมลงพื้นที่`,
      'ลงพื้นที่แล้ว':       `เจ้าหน้าที่ลงพื้นที่แล้ว (รายงาน #${รหัส}) กำลังดำเนินการรับสัตว์`,
      'เข้าควบคุมแล้ว':      `เจ้าหน้าที่เข้าควบคุมสัตว์ในรายงาน #${รหัส} เรียบร้อยแล้ว`,
      'ส่งรักษาสถานพยาบาล':  `สัตว์ที่คุณแจ้ง (#${รหัส}) ถูกนำส่งสถานพยาบาลเพื่อรักษาแล้ว 🏥`,
      'ประกาศตามหาเจ้าของ':  `เจ้าหน้าที่กำลังประกาศตามหาเจ้าของสัตว์ในรายงาน #${รหัส} 📢`,
      'อยู่ศูนย์พักพิง':      `สัตว์ที่คุณแจ้ง (#${รหัส}) มาถึงศูนย์พักพิงแล้ว กำลังรับการดูแล 🏠`,
      'ส่งคืนเจ้าของสำเร็จ':  `สัตว์ที่คุณแจ้ง (#${รหัส}) ถูกส่งคืนเจ้าของเรียบร้อยแล้ว 🎉`,
      'ปล่อยกลับถิ่นเดิม':    `สัตว์ที่คุณแจ้ง (#${รหัส}) รักษาหายดีแล้ว และถูกปล่อยกลับจุดเดิมเรียบร้อยแล้ว 🐾`,
      'เสียชีวิต':           `เจ้าหน้าที่ขอแจ้งว่าสัตว์ในรายงาน #${รหัส} ได้เสียชีวิตแล้ว ขอบคุณที่ช่วยแจ้งเหตุและดูแล 🙏`,
      'มีผู้รับเลี้ยง':       `สัตว์ที่คุณแจ้ง (#${รหัส}) ได้รับการรับเลี้ยงแล้ว ขอบคุณที่ช่วยเหลือ 🎉`,
      'ยุติการค้นหา':        `รายงาน #${รหัส} ได้ยุติการดำเนินการแล้ว ขอบคุณที่ช่วยแจ้งเหตุ`,
      'เคสซ้ำซ้อน':          `รายงาน #${รหัส} ถูกรวมกับเคสที่มีผู้แจ้งไว้ก่อนแล้ว เจ้าหน้าที่กำลังดำเนินการอยู่ ขอบคุณที่ช่วยแจ้งเหตุ 🔗`,
    }
    if (report.reporter_id && msgMap[สถานะใหม่]) {
      const { error: notiErr } = await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        title:   `อัปเดตรายงาน #${String(report.id).padStart(6, '0')}`,
        body:    msgMap[สถานะใหม่],
        type:    'report_update',
        is_read: false,
      })
      if (notiErr) console.error('ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
      else console.log('ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
    }

    // อัปเดต local state
    setรายงานทั้งหมด(function (prev) {
      return prev.map(function (r) {
        return r.id === report.id
          ? { ...r, status: สถานะใหม่, volunteer_notes: หมายเหตุ.trim() }
          : r
      })
    })
    toast('บันทึกสถานะสำเร็จ!')
    ปิดรายละเอียด()
    setกำลังบันทึก(false)
  }

  // ================================================================
  // รวมเคสซ้ำซ้อน — ปิดเคสนี้เป็น "เคสซ้ำซ้อน" แล้วโยงไปเคสหลัก
  // ================================================================
  // เปิด modal รวมเคส — ใช้ได้ทั้งจากปุ่มในหน้าอัปเดต และจากป้าย "อาจซ้ำ" (ส่งเคสหลักมา pre-fill ได้เลย)
  function เปิดรวมเคส(เคสนี้, เคสหลัก) {
    setเคสที่จะรวม(เคสนี้)
    setเคสหลักที่เลือก(เคสหลัก ? String(เคสหลัก.id) : '')
    setแสดงModalรวมเคส(true)
  }

  function ปิดรวมเคส() {
    setแสดงModalรวมเคส(false)
    setเคสที่จะรวม(null)
    setเคสหลักที่เลือก('')
  }

  async function รวมเคสซ้ำซ้อน() {
    const master = Number(เคสหลักที่เลือก)
    if (!เคสที่จะรวม || !master || กำลังรวมเคส) return
    if (master === เคสที่จะรวม.id) { alert('เลือกเคสหลักเป็นใบเดียวกันไม่ได้'); return }
    setกำลังรวมเคส(true)

    // โยนรูปของเคสซ้ำไปรวมในคลังรูปของเคสหลัก เจ้าหน้าที่จะได้เห็นภาพจากผู้แจ้งทุกคน
    if (เคสที่จะรวม.image_url) {
      const { data: เคสหลัก } = await supabase
        .from('reports').select('photos').eq('id', master).single()
      const รูปเดิม = Array.isArray(เคสหลัก?.photos) ? เคสหลัก.photos : []
      if (!รูปเดิม.includes(เคสที่จะรวม.image_url)) {
        await supabase.from('reports')
          .update({ photos: [...รูปเดิม, เคสที่จะรวม.image_url] })
          .eq('id', master)
      }
    }

    const { error } = await supabase.from('reports').update({
      status:       'เคสซ้ำซ้อน',
      duplicate_of: master,
      updated_at:   new Date().toISOString(),
    }).eq('id', เคสที่จะรวม.id)

    if (error) {
      alert('รวมเคสไม่สำเร็จ: ' + error.message)
      setกำลังรวมเคส(false)
      return
    }

    // แจ้งผู้แจ้งของเคสซ้ำว่าเรื่องถูกรวมแล้ว (ไม่ได้ถูกเมิน)
    if (เคสที่จะรวม.reporter_id) {
      await supabase.from('notifications').insert({
        user_id: เคสที่จะรวม.reporter_id,
        title:   `อัปเดตรายงาน #${String(เคสที่จะรวม.id).padStart(6, '0')}`,
        body:    `รายงานของคุณถูกรวมกับเคส #${String(master).padStart(6, '0')} ที่มีผู้แจ้งไว้ก่อนแล้ว เจ้าหน้าที่กำลังดำเนินการอยู่ ขอบคุณที่ช่วยแจ้งเหตุ 🔗`,
        type:    'report_update',
        is_read: false,
      })
    }

    const รวมไปแล้ว = เคสที่จะรวม.id
    setรายงานทั้งหมด(function (prev) {
      return prev.map(function (r) {
        return r.id === รวมไปแล้ว ? { ...r, status: 'เคสซ้ำซ้อน', duplicate_of: master } : r
      })
    })
    setกำลังรวมเคส(false)
    ปิดรวมเคส()
    toast(`รวมเข้าเคส #${String(master).padStart(6, '0')} แล้ว`)
    // ถ้ากำลังเปิด bottom sheet ของใบที่เพิ่งรวมอยู่ ให้ปิดตามไปด้วย
    if (รายงานที่เปิด && รายงานที่เปิด.id === รวมไปแล้ว) ปิดรายละเอียด()
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
      toast('เพิ่มสัตว์สำเร็จ!')
    }
  }

  async function บันทึกแก้ไขสัตว์() {
    if (!สัตว์ที่แก้ไข || กำลังอัปโหลดรูป) return

    // รูปถูกอัปโหลดเข้า storage ทันทีตอนเลือกแล้ว (ดู เลือกรูปสัตว์ใหม่) — ตรงนี้แค่บันทึก array + cover
    const photos    = Array.isArray(สัตว์ที่แก้ไข.photos) ? สัตว์ที่แก้ไข.photos : []
    const photo_url = photos[0] || null // photos[0] = รูปหลักเสมอ — sync ลง photo_url ให้โค้ดเก่าที่อ่าน photo_url ใช้ได้

    const { error } = await supabase.from('animals').update({
      name:         สัตว์ที่แก้ไข.name,
      breed:        สัตว์ที่แก้ไข.breed,
      age:          สัตว์ที่แก้ไข.age,
      gender:       สัตว์ที่แก้ไข.gender,
      health:       สัตว์ที่แก้ไข.health,
      status:       สัตว์ที่แก้ไข.status,
      species:      สัตว์ที่แก้ไข.species      || null,
      publish_mode: โหมดจาก(สัตว์ที่แก้ไข),
      // is_adoptable เป็นคอลัมน์เดิม — เขียนตาม publish_mode ไว้ให้ค่าไม่ค้างเก่า
      // (publish_mode คือแหล่งความจริงหลักแล้ว ทุกหน้าอ่านจากตัวนี้)
      is_adoptable: โหมดจาก(สัตว์ที่แก้ไข) === 'adoption',
      photos:       photos.length > 0 ? photos : null,
      photo_url:    photo_url,
      traits:       สัตว์ที่แก้ไข.traits       || null,
      vaccine_info: สัตว์ที่แก้ไข.vaccine_info || null,
      neutered:     สัตว์ที่แก้ไข.neutered     || null,
      size:         สัตว์ที่แก้ไข.size         || null,
      description:  สัตว์ที่แก้ไข.description  || null,
    }).eq('id', สัตว์ที่แก้ไข.id)

    if (!error) {
      setSัตว์จากDB(function (prev) {
        return prev.map(function (s) { return s.id === สัตว์ที่แก้ไข.id ? { ...สัตว์ที่แก้ไข, photos, photo_url } : s })
      })
      setSัตว์ที่แก้ไข(null)
      setข้อมูลรายงานสัตว์(null)
      toast('บันทึกข้อมูลสัตว์สำเร็จ!')
    } else {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    }
  }

  // เปิด bottom sheet แก้ไขสัตว์ + ดึงข้อมูลรายงาน/ผู้แจ้ง (ถ้ามาจากรายงาน)
  async function เปิดแก้ไขสัตว์(สัตว์) {
    // ถ้า breed เป็นข้อความความล้มเหลวของ AI ("ไม่สามารถวิเคราะห์ได้") ให้เคลียร์เป็นค่าว่าง
    // กันไม่ให้ข้อความนี้โผล่ในช่องกรอกตอนแก้ไข (เจ้าหน้าที่ควรกรอกสายพันธุ์จริงเอง)
    const breedสะอาด = สัตว์.breed === 'ไม่สามารถวิเคราะห์ได้' ? '' : สัตว์.breed
    // normalize คลังรูปให้เป็น array เสมอ (ข้อมูลเก่ามีแค่ photo_url) — ทั้งฟอร์มจะทำงานกับ photos[] อย่างเดียว
    // normalize publish_mode ด้วย — ข้อมูลเก่าที่ยังไม่มีคอลัมน์นี้ ให้เดาจาก is_adoptable เดิม
    const โหมดเดิม = สัตว์.publish_mode || (สัตว์.is_adoptable ? 'adoption' : 'none')
    setSัตว์ที่แก้ไข({ ...สัตว์, breed: breedสะอาด, photos: คลังรูปสัตว์(สัตว์), publish_mode: โหมดเดิม })
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

  // เลือกไฟล์รูปโปรไฟล์ใหม่สำหรับสัตว์ (ยังไม่อัปโหลดจนกว่าจะกดบันทึก)
  // เลือกได้หลายไฟล์พร้อมกัน — validate + อัปโหลดขึ้น storage ทันที แล้วต่อ url เข้าคลังรูป (photos[])
  // (อัปโหลดตอนเลือกเลย ทำให้ set-cover/ลบ ทำงานกับ url จริงทั้งหมด ไม่ต้องจัดการไฟล์ค้างที่ยังไม่อัปโหลด)
  async function เลือกรูปสัตว์ใหม่(event) {
    const ไฟล์ทั้งหมด = Array.from(event.target.files || [])
    event.target.value = ''
    if (ไฟล์ทั้งหมด.length === 0) return
    setกำลังอัปโหลดรูป(true)
    const urlใหม่ = []
    for (const ไฟล์ of ไฟล์ทั้งหมด) {
      const ผลตรวจ = await ตรวจสอบไฟล์รูปภาพ(ไฟล์)
      if (!ผลตรวจ.ok) { alert(`${ไฟล์.name}: ${ผลตรวจ.error}`); continue }
      const ชื่อไฟล์ = `animal_${Date.now()}_${Math.random().toString(36).slice(2, 8)}_${ไฟล์.name.replace(/\s/g, '_')}`
      const { data, error } = await supabase.storage.from('report-images').upload(ชื่อไฟล์, ไฟล์)
      if (error) { alert(`อัปโหลด ${ไฟล์.name} ไม่สำเร็จ: ${error.message}`); continue }
      const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(data.path)
      urlใหม่.push(urlData.publicUrl)
    }
    if (urlใหม่.length > 0) {
      setSัตว์ที่แก้ไข((prev) => ({ ...prev, photos: [...(prev.photos || []), ...urlใหม่] }))
    }
    setกำลังอัปโหลดรูป(false)
  }

  // ตั้งรูปนี้เป็นรูปหลัก (cover) — ย้ายมาไว้หน้าสุดของ array (photos[0])
  function ตั้งเป็นรูปหลัก(url) {
    setSัตว์ที่แก้ไข((prev) => ({ ...prev, photos: [url, ...(prev.photos || []).filter((u) => u !== url)] }))
  }

  // ลบรูปออกจากคลังของสัตว์ตัวนี้ (เอาออกจาก array เท่านั้น ไม่ลบไฟล์ใน storage —
  // กันเผลอลบรูปที่ report ต้นทางยังใช้ร่วมอยู่; ไฟล์กำพร้าใน storage ไม่มีผลเสีย)
  function ลบรูปสัตว์(url) {
    setSัตว์ที่แก้ไข((prev) => ({ ...prev, photos: (prev.photos || []).filter((u) => u !== url) }))
  }

  // ปิด bottom sheet แก้ไขสัตว์
  function ปิดแก้ไขสัตว์() {
    setSัตว์ที่แก้ไข(null)
    setข้อมูลรายงานสัตว์(null)
  }

  // ================================================================
  // กรองรายงาน
  // ================================================================
  // active = สถานะยังไม่สิ้นสุด (แจ้งรายงาน/รับเรื่อง/ลงพื้นที่/ควบคุม/รักษา/ประกาศตามหา/ศูนย์พักพิงที่ยังไม่ปิดเคส)
  // history = สถานะสิ้นสุด (terminal) — ใช้ helper เดียวกับที่หน้าอัปเดต/แผนที่ใช้ตัดสิน เพื่อไม่ให้ตรรกะขัดกันเอง
  const รายงานตามสถานะ = รายงานทั้งหมด.filter(function (ร) {
    return แท็บรายงาน === 'active' ? !เป็นเคสปิด(ร) : เป็นเคสปิด(ร)
  })
  // แสดง chip เฉพาะประเภทที่มีรายงานเข้ามาจริง (นับภายใน tab สถานะที่เลือกอยู่)
  const ประเภทที่มีReports = ประเภทแจ้งเรียง
    .map((p) => ({ ...p, count: รายงานตามสถานะ.filter((r) => ประเภทจาก(r.urgency).key === p.key).length }))
    .filter((p) => p.count > 0)
  function สลับประเภทReports(key) {
    setประเภทเลือกReports(function (prev) {
      return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    })
  }
  // [] หรือเลือกครบทุกประเภท = แสดงทั้งหมด; เลือกบางประเภท = แสดงเฉพาะที่เลือก
  const รายงานกรอง = ประเภทเลือกReports.length === 0
    ? รายงานตามสถานะ
    : รายงานตามสถานะ.filter((ร) => ประเภทเลือกReports.includes(ประเภทจาก(ร.urgency).key))
  // ค้นหา — จับคู่ชนิดสัตว์ ที่อยู่ หรือเลขที่รายงาน
  const รายงานกรองค้น = ค้นหาReports.trim()
    ? รายงานกรอง.filter(function (ร) {
        const q = ค้นหาReports.trim().toLowerCase()
        return (ร.animal_type || '').toLowerCase().includes(q)
          || (ร.location_text || '').toLowerCase().includes(q)
          || String(ร.id).includes(q)
      })
    : รายงานกรอง
  const รายงานกรองตามวันที่ = จัดกลุ่มตามวันที่(รายงานกรองค้น)
  // เรียงตามความเร่งด่วน (ดุร้าย → บาดเจ็บ → พลัดหลง) — ใช้ตอนเลือก "เรียงตามความเร่งด่วน" แทนกลุ่มตามวันที่
  const รายงานกรองเรียงเร่งด่วน = [...รายงานกรองค้น].sort(function (a, b) {
    const ต่าง = ประเภทแจ้งเรียง.indexOf(ประเภทจาก(a.urgency)) - ประเภทแจ้งเรียง.indexOf(ประเภทจาก(b.urgency))
    return ต่าง !== 0 ? ต่าง : new Date(b.created_at) - new Date(a.created_at)
  })

  // เคสที่ยังทำงานอยู่ (แสดงในหน้าอัปเดตสถานะ = To-Do List ภาคสนาม) — เฉพาะสถานะระหว่างดำเนินการ
  // "อยู่ศูนย์พักพิง" ไม่อยู่ในลิสต์นี้แล้ว: พอถึงศูนย์ = เป็นเคสปิด() → หลุดจากหน้านี้ทันที (ไปต่อที่จัดการข้อมูลสัตว์)
  const รายงานActive = รายงานทั้งหมด.filter(function (ร) {
    return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'เข้าควบคุมแล้ว', 'ส่งรักษาสถานพยาบาล', 'ประกาศตามหาเจ้าของ'].includes(ร.status)
      && !เป็นเคสปิด(ร)
  })

  // แผนที่เคสที่อาจซ้ำ (id -> เคสใกล้สุด) — คำนวณสดจากรายงานที่โหลดมาแล้ว ใช้โชว์ป้าย "อาจซ้ำ" บนการ์ด
  const เคสซ้ำแผนที่ = สร้างแผนที่เคสซ้ำ(รายงานทั้งหมด)

  // การ์ดรายงานหน้า "รายการแจ้งสัตว์จร" — แยกเป็นฟังก์ชันเดียวเพราะใช้ทั้งมุมมองจัดกลุ่มตามวันที่และมุมมองเรียงตามความเร่งด่วน
  function การ์ดรายงาน(ร) {
    const ประเภท = ประเภทจาก(ร.urgency)
    const รอสายพันธุ์ = ร.animal_type === 'ไม่สามารถวิเคราะห์ได้'
    const ปิดเคสแล้ว = แท็บรายงาน === 'history'
    return (
      <div key={ร.id}
        style={{ borderLeftColor: ปิดเคสแล้ว ? '#d1d5db' : ประเภท.hex }}
        className={`w-full text-left rounded-2xl shadow-sm overflow-hidden transition-all active:scale-95 cursor-pointer border-l-4 ${
          ปิดเคสแล้ว ? 'bg-gray-50 opacity-75' : 'bg-white'
        }`}
        onClick={() => เปิดรายละเอียด(ร)}
      >
        <div className="p-4 flex items-center gap-3">
          <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
          <div className="flex-1 min-w-0">
            <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full mb-1 ${ประเภท.badge}`}>
              <span className={`w-2 h-2 rounded-full shrink-0 ${ประเภท.dot}`} /> {ประเภท.short}
            </span>
            <div className="flex items-start justify-between gap-2 mb-0.5">
              {รอสายพันธุ์ ? (
                <p className="text-gray-400 text-sm">รอระบุสายพันธุ์</p>
              ) : (
                <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุประเภท'}</p>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${
                ปิดเคสแล้ว ? 'text-gray-500 bg-gray-100 border-gray-200' : (สีสถานะ[ร.status] || 'text-gray-600 bg-gray-50 border-gray-200')
              }`}>
                {ร.status}
              </span>
            </div>

            {/* ตำแหน่ง — กดได้ถ้ามีพิกัด */}
            {ร.latitude && ร.longitude ? (
              <a
                href={`https://www.google.com/maps?q=${ร.latitude},${ร.longitude}`}
                target="_blank" rel="noreferrer"
                onClick={function (e) { e.stopPropagation() }}
                className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold max-w-full"
              >
                <MapPin size={13} className="shrink-0" />
                <span className="truncate">{ร.location_text || 'ดูตำแหน่ง'}</span>
                <span className="shrink-0 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5">Maps <ExternalLink size={9} className="shrink-0" /></span>
              </a>
            ) : (
              <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {ร.location_text || '-'}</p>
            )}

            <p className="text-xs text-gray-400 mt-0.5">{แปลงวันที่เวลา(ร.created_at)} · #{String(ร.id).padStart(6, '0')}</p>
            {ร.detail && (
              <p className="text-xs text-gray-400 italic mt-0.5 truncate">"{ร.detail}"</p>
            )}

            {/* ป้ายเตือนเคสอาจซ้ำ — กดแล้วเปิด modal รวมเคสพร้อม pre-fill เคสหลักให้เลย */}
            {!ปิดเคสแล้ว && เคสซ้ำแผนที่[ร.id] && (
              <button
                onClick={function (e) { e.stopPropagation(); เปิดรวมเคส(ร, เคสซ้ำแผนที่[ร.id].เคส) }}
                className="mt-1.5 inline-flex items-center gap-1 bg-orange-100 text-orange-600 text-[11px] font-bold px-2 py-1 rounded-full active:bg-orange-200"
              >
                <AlertTriangle size={12} className="shrink-0" /> อาจซ้ำกับ #{String(เคสซ้ำแผนที่[ร.id].เคส.id).padStart(6, '0')}
                <span className="font-normal text-orange-400">· ห่าง {Math.round(เคสซ้ำแผนที่[ร.id].ระยะ)} ม.</span>
              </button>
            )}
          </div>
          <ChevronRight size={20} className="text-gray-300 shrink-0" />
        </div>
      </div>
    )
  }

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
        <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-teal-600 flex items-center gap-1"><HardHat size={12} className="shrink-0" /> เจ้าหน้าที่ / อาสาสมัคร</p>
        </div>
      </div>

      {/* ============================================================
          REPORTS — Inbox
          ============================================================ */}
      {หน้า === 'reports' && (
        <div className="pt-4">

          {/* Tabs — กำลังดำเนินการ / ประวัติการทำงาน (ปิดเคสแล้วยังดูย้อนหลังได้เสมอ ไม่หายไปไหน) */}
          <div className="px-4 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[
                { key: 'active',  label: 'กำลังดำเนินการ', count: รายงานทั้งหมด.filter(function (r) { return !เป็นเคสปิด(r) }).length },
                { key: 'history', label: 'ประวัติการทำงาน', count: รายงานทั้งหมด.filter(function (r) { return เป็นเคสปิด(r) }).length },
              ].map(function (tab) {
                const isActive = แท็บรายงาน === tab.key
                return (
                  <button key={tab.key} onClick={() => setแท็บรายงาน(tab.key)}
                    className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                      isActive ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                    <span className={`text-xs font-bold ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>({tab.count})</span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* ค้นหา — จับคู่ชนิดสัตว์ ที่อยู่ หรือเลขที่รายงาน */}
          <div className="px-4 mb-3">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 shrink-0" />
              <input
                value={ค้นหาReports}
                onChange={(e) => setค้นหาReports(e.target.value)}
                placeholder="ค้นหาชนิดสัตว์ ที่อยู่ หรือเลขที่รายงาน..."
                className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-400"
              />
            </div>
          </div>

          {/* Filter chips — แยกตามประเภทการแจ้ง (กดเลือกได้หลายประเภท) — เลื่อนแนวนอน */}
          {ประเภทที่มีReports.length > 0 && (
            <div className="px-4 mb-3 flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {ประเภทที่มีReports.map(function (p) {
                const active = ประเภทเลือกReports.includes(p.key)
                return (
                  <button key={p.key} onClick={() => สลับประเภทReports(p.key)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border-2 whitespace-nowrap shrink-0 transition-all ${
                      active ? p.activeChip : 'border-gray-200 bg-white text-gray-600'
                    }`}
                  >
                    {!active && <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />}
                    {p.short} <span className={active ? 'text-white/80' : 'text-gray-400'}>({p.count})</span>
                  </button>
                )
              })}
            </div>
          )}

          {/* เรียงตาม — ล่าสุด (จัดกลุ่มตามวัน) หรือความเร่งด่วน (ดุร้าย → บาดเจ็บ → พลัดหลง) */}
          <div className="px-4 mb-4 flex items-center gap-2">
            <span className="text-xs text-gray-400 shrink-0">เรียงตาม</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {[
                { key: 'date',    label: 'ล่าสุด' },
                { key: 'urgency', label: 'ความเร่งด่วน' },
              ].map(function (opt) {
                const isActive = เรียงตามReports === opt.key
                return (
                  <button key={opt.key} onClick={() => setเรียงตามReports(opt.key)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                      isActive ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Loading */}
          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดรายงาน && รายงานกรองค้น.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              {รายงานตามสถานะ.length === 0
                ? (แท็บรายงาน === 'active' ? <PartyPopper size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" /> : <ClipboardList size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />)
                : <Search size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
              }
              <p className="font-medium">
                {รายงานตามสถานะ.length === 0
                  ? (แท็บรายงาน === 'active' ? 'ไม่มีงานที่ต้องดำเนินการในขณะนี้' : 'ยังไม่มีประวัติการปฏิบัติงาน')
                  : 'ไม่พบรายงานที่ตรงกับตัวกรองหรือคำค้นหา'
                }
              </p>
            </div>
          )}

          {/* รายการการ์ด — เรียงตามความเร่งด่วนจะโชว์เป็นลิสต์เรียบ (หัวข้อวันที่ใช้ไม่ได้แล้วเพราะลำดับไม่ตรงวัน) */}
          {เรียงตามReports === 'urgency' ? (
            <div className="px-4 space-y-3">
              {รายงานกรองเรียงเร่งด่วน.map((ร) => การ์ดรายงาน(ร))}
            </div>
          ) : (
            <div className="px-4 space-y-4">
              {รายงานกรองตามวันที่.map(function (กลุ่ม) {
                return (
                  <div key={กลุ่ม.label}>
                    <p className="text-xs font-semibold text-gray-400 mb-2 px-1 flex items-center gap-1.5"><Calendar size={12} className="shrink-0" /> {กลุ่ม.label}</p>
                    <div className="space-y-3">
                      {กลุ่ม.items.map((ร) => การ์ดรายงาน(ร))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
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

          {!โหลดรายงาน && (function () {
            const ประเภทที่มีUpdate = ประเภทแจ้งเรียง
              .map((p) => ({ ...p, count: รายงานActive.filter((r) => ประเภทจาก(r.urgency).key === p.key).length }))
              .filter((p) => p.count > 0)
            // [] หรือเลือกครบทุกประเภท = แสดงทั้งหมด; เลือกบางประเภท = แสดงเฉพาะที่เลือก
            const รายงานActiveกรอง = ประเภทเลือกUpdate.length === 0
              ? รายงานActive
              : รายงานActive.filter((r) => ประเภทเลือกUpdate.includes(ประเภทจาก(r.urgency).key))
            // เรียงตามความเร่งด่วน (ดุร้าย → บาดเจ็บ → พลัดหลง) เมื่อเลือกไว้ — ไม่งั้นเรียงตามวันที่แจ้งเข้าล่าสุดก่อนตามเดิม
            const รายงานActiveเรียง = เรียงตามUpdate === 'urgency'
              ? [...รายงานActiveกรอง].sort(function (a, b) {
                  const ต่าง = ประเภทแจ้งเรียง.indexOf(ประเภทจาก(a.urgency)) - ประเภทแจ้งเรียง.indexOf(ประเภทจาก(b.urgency))
                  return ต่าง !== 0 ? ต่าง : new Date(b.created_at) - new Date(a.created_at)
                })
              : รายงานActiveกรอง
            function สลับประเภท(key) {
              setประเภทเลือกUpdate(function (prev) {
                return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
              })
            }

            return (
            <>
              {/* บอกจำนวนงานค้างตรงๆ ไม่ต้องมีกล่องสีอธิบายวิธีใช้ — ชื่อหน้า "อัปเดตสถานะสัตว์" กับรายการด้านล่างสื่อสารพอแล้ว */}
              <p className="text-sm text-gray-500 px-1">{รายงานActive.length.toLocaleString('th-TH')} รายการรอดำเนินการ</p>

              {/* Filter chips — แยกตามประเภทการแจ้ง (กดเลือกได้หลายประเภท) แสดงเฉพาะประเภทที่มีข้อมูล — เลื่อนแนวนอน */}
              {ประเภทที่มีUpdate.length > 0 && (
                <div className="flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                  {ประเภทที่มีUpdate.map(function (p) {
                    const active = ประเภทเลือกUpdate.includes(p.key)
                    return (
                      <button key={p.key} onClick={() => สลับประเภท(p.key)}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border-2 whitespace-nowrap shrink-0 transition-all ${
                          active ? p.activeChip : 'border-gray-200 bg-white text-gray-600'
                        }`}
                      >
                        {!active && <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />}
                        {p.label} <span className={active ? 'text-white/80' : 'text-gray-400'}>({p.count})</span>
                      </button>
                    )
                  })}
                </div>
              )}

              {/* เรียงตาม — ล่าสุด หรือความเร่งด่วน (ดุร้าย → บาดเจ็บ → พลัดหลง) */}
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 shrink-0">เรียงตาม</span>
                <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                  {[
                    { key: 'date',    label: 'ล่าสุด' },
                    { key: 'urgency', label: 'ความเร่งด่วน' },
                  ].map(function (opt) {
                    const isActive = เรียงตามUpdate === opt.key
                    return (
                      <button key={opt.key} onClick={() => setเรียงตามUpdate(opt.key)}
                        className={`px-3 py-1 rounded-md text-xs font-medium transition-all ${
                          isActive ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              {รายงานActiveกรอง.length === 0 && (
                <div className="text-center py-16">
                  {รายงานActive.length === 0 ? <PartyPopper size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" /> : <Search size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />}
                  <p className="font-medium text-gray-600">
                    {รายงานActive.length === 0 ? 'ไม่มีรายงานค้างอยู่' : 'ไม่มีรายงานในตัวกรองนี้'}
                  </p>
                  {รายงานActive.length === 0 && (
                    <p className="text-xs text-gray-400 mt-1">ทุกรายงานได้รับการดูแลเรียบร้อย</p>
                  )}
                </div>
              )}

              {รายงานActiveเรียง.map(function (ร) {
                return (
                  <div key={ร.id}
                    style={{ borderLeftColor: ประเภทจาก(ร.urgency).hex }}
                    className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-all cursor-pointer border-l-4"
                    onClick={() => เปิดรายละเอียด(ร)}
                  >
                    <div className="p-4 flex items-center gap-3">
                      <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold mb-0.5" style={{ color: ประเภทจาก(ร.urgency).hex }}>
                          ● {ประเภทจาก(ร.urgency).label}
                        </p>
                        <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุ'}</p>

                        {/* ตำแหน่ง — กดได้ถ้ามีพิกัด */}
                        {ร.latitude && ร.longitude ? (
                          <a
                            href={`https://www.google.com/maps?q=${ร.latitude},${ร.longitude}`}
                            target="_blank" rel="noreferrer"
                            onClick={function (e) { e.stopPropagation() }}
                            className="inline-flex items-center gap-1 text-xs text-teal-700 font-semibold max-w-full"
                          >
                            <MapPin size={13} className="shrink-0" />
                            <span className="truncate">{ร.location_text || 'ดูตำแหน่ง'}</span>
                            <span className="shrink-0 bg-teal-100 text-teal-700 px-1.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-0.5">Maps <ExternalLink size={9} className="shrink-0" /></span>
                          </a>
                        ) : (
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {ร.location_text}</p>
                        )}

                        <p className="text-xs text-gray-400">{แปลงวันที่เวลา(ร.created_at)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border mt-1 inline-block ${สีสถานะ[ร.status] || ''}`}>
                          {ร.status}
                        </span>
                      </div>
                      <ChevronRight size={20} className="text-gray-300 shrink-0" />
                    </div>
                  </div>
                )
              })}
            </>
            )
          })()}
        </div>
      )}

      {/* ============================================================
          ANIMALS — จัดการสัตว์ในศูนย์
          ============================================================ */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4 pb-20">

          {/* FAB — เพิ่มสัตว์ใหม่ */}
          <button onClick={() => setแสดงฟอร์มเพิ่ม(!แสดงฟอร์มเพิ่ม)}
            className="fixed bottom-20 right-5 z-30 w-14 h-14 rounded-full bg-teal-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-all"
            title={แสดงฟอร์มเพิ่ม ? 'ปิดฟอร์ม' : 'เพิ่มสัตว์ใหม่'}
            aria-label={แสดงฟอร์มเพิ่ม ? 'ปิดฟอร์ม' : 'เพิ่มสัตว์ใหม่'}
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
                  {ตัวเลือกอายุสัตว์.map(function (a) {
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

          {/* ค้นหา — จับคู่ชื่อ สายพันธุ์ หรือสถานที่พบ */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 shrink-0" />
            <input
              value={ค้นหาสัตว์}
              onChange={(e) => setค้นหาสัตว์(e.target.value)}
              placeholder="ค้นหาชื่อ สายพันธุ์ หรือสถานที่พบ..."
              className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-400"
            />
          </div>

          {(function () {
            // Tabs กรองสถานะ — อยู่ศูนย์พักพิง (รวมอยู่ระหว่างรักษา) / รอหาบ้าน / รับเลี้ยงแล้ว
            const กลุ่มสถานะตามแท็บ = {
              shelter: ['อยู่ศูนย์พักพิง', 'อยู่ระหว่างรักษา'],
              waiting: ['รอการรับเลี้ยง'],
              adopted: ['มีผู้รับเลี้ยง'],
            }
            const นับตามแท็บ = function (key) {
              return สัตว์จากDB.filter(function (s) { return กลุ่มสถานะตามแท็บ[key].includes(s.status) }).length
            }
            const แท็บทั้งหมด = [
              { key: 'shelter', label: 'อยู่ศูนย์พักพิง', count: นับตามแท็บ('shelter') },
              { key: 'waiting', label: 'รอหาบ้าน',        count: นับตามแท็บ('waiting') },
              { key: 'adopted', label: 'รับเลี้ยงแล้ว',    count: นับตามแท็บ('adopted') },
            ]
            const สัตว์ตามแท็บ = สัตว์จากDB.filter(function (s) {
              return กลุ่มสถานะตามแท็บ[แท็บสัตว์].includes(s.status)
            })
            const สัตว์ตามแท็บค้น = ค้นหาสัตว์.trim()
              ? สัตว์ตามแท็บ.filter(function (s) {
                  const q = ค้นหาสัตว์.trim().toLowerCase()
                  return (s.name || '').toLowerCase().includes(q)
                    || (s.breed || '').toLowerCase().includes(q)
                    || (s.location || '').toLowerCase().includes(q)
                })
              : สัตว์ตามแท็บ
            const ข้อความว่างตามแท็บ = {
              shelter: 'ไม่มีสัตว์ในศูนย์ตอนนี้',
              waiting: 'ยังไม่มีสัตว์ที่รอหาบ้าน',
              adopted: 'ยังไม่มีสัตว์ที่มีผู้รับเลี้ยง',
            }

            return (
              <>
                {/* Tabs */}
                <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
                  {แท็บทั้งหมด.map(function (tab) {
                    const isActive = แท็บสัตว์ === tab.key
                    return (
                      <button key={tab.key} onClick={() => setแท็บสัตว์(tab.key)}
                        className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all flex items-center justify-center gap-1 ${
                          isActive ? 'bg-white text-teal-700 shadow-sm' : 'text-gray-500'
                        }`}
                      >
                        {tab.label}
                        <span className={`font-bold ${isActive ? 'text-teal-600' : 'text-gray-400'}`}>({tab.count})</span>
                      </button>
                    )
                  })}
                </div>

                {โหลดสัตว์ && (
                  <div className="text-center py-6">
                    <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto" />
                  </div>
                )}

                {!โหลดสัตว์ && สัตว์ตามแท็บค้น.length === 0 && (
                  <div className="text-center py-12 text-gray-400">
                    {สัตว์ตามแท็บ.length === 0
                      ? <PawPrint size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
                      : <Search size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
                    }
                    <p className="text-sm">
                      {สัตว์ตามแท็บ.length !== 0
                        ? 'ไม่พบสัตว์ที่ตรงกับคำค้นหา'
                        : (สัตว์จากDB.length === 0 ? 'ยังไม่มีสัตว์ในระบบ' : ข้อความว่างตามแท็บ[แท็บสัตว์])
                      }
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {สัตว์ตามแท็บค้น.map(function (สัตว์) {
                    // สายพันธุ์ที่ใช้ได้จริง — ตัด sentinel ของ AI + ค่าว่างออก (เหลือ null ให้โชว์ "รอระบุ")
                    const สายพันธุ์ = (สัตว์.breed && สัตว์.breed !== 'ไม่สามารถวิเคราะห์ได้' && สัตว์.breed !== 'ไม่ระบุ') ? สัตว์.breed : null
                    // ป้ายประเภทการแจ้งเหตุที่ส่งไม้ต่อมาจากรายงาน (สีตาม urgency) — โชว์เฉพาะตัวที่มาจากรายงาน
                    const ประเภทแจ้ง = สัตว์._urgency ? ประเภทจาก(สัตว์._urgency) : null
                    // ค่าที่ยังไม่มี → "รอระบุ" สีเทาอ่อน
                    const บริบท = (v) => v
                      ? <span className="text-gray-600">{v}</span>
                      : <span className="text-gray-400">รอระบุ</span>
                    return (
                      <button key={สัตว์.id} onClick={() => เปิดแก้ไขสัตว์(สัตว์)}
                        className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all"
                      >
                        <div className="flex items-start gap-3">
                          <div className="w-14 h-14 rounded-2xl bg-teal-50 overflow-hidden flex items-center justify-center shrink-0">
                            {สัตว์.photo_url
                              ? <img src={สัตว์.photo_url} alt={แสดงชื่อสัตว์(สัตว์)} className="w-full h-full object-cover" />
                              : <AnimalIcon ชนิด={สัตว์.species || สัตว์.breed} size={28} className="text-teal-500" />
                            }
                          </div>
                          <div className="flex-1 min-w-0">
                            {/* Row 1: ชื่อ/รหัส (ซ้าย) + ป้ายประเภทการแจ้ง (ขวา) */}
                            <div className="flex items-start justify-between gap-2">
                              <p className="font-bold text-gray-800 text-sm truncate">{แสดงชื่อสัตว์(สัตว์)}</p>
                              {ประเภทแจ้ง ? (
                                <span className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 ${ประเภทแจ้ง.badge}`}>
                                  <span className={`w-2 h-2 rounded-full shrink-0 ${ประเภทแจ้ง.dot}`} /> {ประเภทแจ้ง.short}
                                </span>
                              ) : สัตว์.report_id ? (
                                <span className="text-[11px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0 inline-flex items-center gap-1"><ClipboardList size={10} className="shrink-0" /> จากรายงาน</span>
                              ) : null}
                            </div>

                            {/* Row 2: สายพันธุ์ • เพศ • อายุ */}
                            <p className="text-xs mt-0.5 flex items-center gap-1.5 flex-wrap">
                              {บริบท(สายพันธุ์)}
                              <span className="text-gray-300">•</span>
                              {บริบท(สัตว์.gender)}
                              <span className="text-gray-300">•</span>
                              {บริบท(สัตว์.age)}
                            </p>

                            {/* Row 3: สถานที่พบ */}
                            <p className="text-xs text-gray-500 mt-1 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {สัตว์.location || 'รอระบุ'}</p>

                            {/* Row 4: วันที่รับเข้า */}
                            <p className="text-xs text-gray-500 mt-0.5 flex items-center gap-1"><Calendar size={12} className="shrink-0" /> รับเข้า {วันที่รับเข้า(สัตว์.created_at)}</p>

                            {/* Row 5: ป้ายสถานะ + สถานะเผยแพร่ */}
                            <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                              <span className={`text-xs px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.status] || 'text-gray-600 bg-gray-50'}`}>
                                {สัตว์.status}
                              </span>
                              {(function () {
                                const โหมด = โหมดจาก(สัตว์)
                                if (โหมด === 'lost_and_found') return (
                                  <span className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium text-rose-700 bg-rose-50">
                                    <Megaphone size={11} className="shrink-0" /> ตามหาเจ้าของ
                                  </span>
                                )
                                if (โหมด === 'adoption') return (
                                  <span className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium text-teal-700 bg-teal-50">
                                    <Home size={11} className="shrink-0" /> ประกาศหาบ้าน
                                  </span>
                                )
                                return (
                                  <span className="text-xs px-2 py-0.5 rounded-full inline-flex items-center gap-1 font-medium text-gray-500 bg-gray-100">
                                    <Lock size={11} className="shrink-0" /> ไม่เผยแพร่
                                  </span>
                                )
                              })()}
                            </div>
                          </div>
                          <ChevronRight size={20} className="text-gray-300 shrink-0 self-center" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )
          })()}
        </div>
      )}

      {/* ============================================================
          STATS
          ============================================================ */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              // ใช้โทน teal/เทาเท่านั้น — แดง/ส้ม/เหลือง สงวนไว้สื่อ "ความเร่งด่วนของการแจ้ง" อย่างเดียว
              // (ดู ประเภทแจ้งเรียง) ถ้าเอามาใช้กับตัวเลขสถิติด้วย จะอ่านผิดว่าตัวเลขไหนเร่งด่วน
              { ชื่อ: 'รายงานทั้งหมด',  ค่า: สถิติ.รายงาน,       Icon: ClipboardList, bg: 'bg-teal-50',   text: 'text-teal-700', เดือนนี้: สถิติเดือนนี้.รายงาน,      เดือนก่อน: สถิติเดือนก่อน.รายงาน },
              { ชื่อ: 'รอดำเนินการ',    ค่า: สถิติ.รอดำเนินการ,  Icon: Hourglass,     bg: 'bg-slate-100', text: 'text-slate-600' },
              { ชื่อ: 'สัตว์ในดูแล',    ค่า: สถิติ.สัตว์,         Icon: PawPrint,      bg: 'bg-teal-50',   text: 'text-teal-700' },
              { ชื่อ: 'รับเลี้ยงแล้ว',   ค่า: สถิติ.รับเลี้ยงแล้ว, Icon: Heart,         bg: 'bg-slate-100', text: 'text-slate-600', เดือนนี้: สถิติเดือนนี้.รับเลี้ยงแล้ว, เดือนก่อน: สถิติเดือนก่อน.รับเลี้ยงแล้ว },
            ].map(function (stat) {
              // ต่าง = เทียบเดือนนี้กับเดือนก่อน — มีเฉพาะสถิติที่เป็น "ยอดใหม่ต่อเดือน" จริงๆ (รอดำเนินการ/สัตว์ในดูแล เป็นยอดคงเหลือ ณ ปัจจุบัน เทียบแบบนี้ไม่ได้ความหมาย)
              const มีแนวโน้ม = stat.เดือนนี้ != null
              const ต่าง = มีแนวโน้ม ? stat.เดือนนี้ - stat.เดือนก่อน : 0
              return (
                <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.bg}`}>
                  <stat.Icon size={26} strokeWidth={1.5} className={`mb-1 ${stat.text}`} />
                  <p className={`text-3xl font-bold ${stat.text}`}>{stat.ค่า}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
                  {มีแนวโน้ม && (
                    <p className="text-[11px] text-gray-400 mt-1">
                      เดือนนี้ {stat.เดือนนี้} ({ต่าง > 0 ? `+${ต่าง}` : ต่าง < 0 ? ต่าง : 'เท่าเดิม'}{ต่าง !== 0 ? ' จากเดือนก่อน' : ''})
                    </p>
                  )}
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
                className="inline-flex items-center gap-1.5 text-xs text-teal-600 font-medium py-2 px-3 -ml-3 rounded-lg hover:bg-teal-50 transition-colors">
                <X size={13} className="shrink-0" /> ล้างช่วงวันที่ (ดึงข้อมูลทั้งหมด)
              </button>
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
        // เคสที่ปิดแล้ว (ปิดเคส / สัตว์ดุร้ายที่นำส่งศูนย์แล้ว) → เอาหมุดออกจากแผนที่
        const พิกัดเปิด = รายงานพิกัด.filter((r) => !เป็นเคสปิด(r))
        // [] หรือเลือกครบทุกประเภท = แสดงทั้งหมด; เลือกบางประเภท = แสดงเฉพาะที่เลือก
        const จุดกรอง = filterMap.length === 0
          ? พิกัดเปิด
          : พิกัดเปิด.filter((r) => filterMap.includes(ประเภทจาก(r.urgency).key))
        // มีตำแหน่งเจ้าหน้าที่แล้ว → เรียงเคสใกล้สุดก่อน ให้รู้ว่าควรไปจุดไหนก่อนโดยไม่ต้องกะระยะเอง
        const จุดกรองแสดง = ตำแหน่งฉัน
          ? จุดกรอง
              .map((r) => ({ ...r, _ระยะ: ระยะทางเมตร(ตำแหน่งฉัน.lat, ตำแหน่งฉัน.lng, r.latitude, r.longitude) }))
              .sort((a, b) => a._ระยะ - b._ระยะ)
          : จุดกรอง
        // แสดง chip เฉพาะประเภทที่มีรายงานเข้ามาจริง (count > 0)
        const ประเภทที่มี = ประเภทแจ้งเรียง
          .map((p) => ({ ...p, count: พิกัดเปิด.filter((r) => ประเภทจาก(r.urgency).key === p.key).length }))
          .filter((p) => p.count > 0)
        function สลับประเภทMap(key) {
          setFilterMap(function (prev) {
            return prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
          })
        }

        return (
          <div className="pt-4 space-y-3">

            {/* Filter chips — แยกตามประเภทการแจ้ง (กดเลือกได้หลายประเภท) — เลื่อนแนวนอน */}
            {ประเภทที่มี.length > 0 && (
              <div className="px-4 flex flex-nowrap gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
                {ประเภทที่มี.map(function (p) {
                  const active = filterMap.includes(p.key)
                  return (
                    <button key={p.key} onClick={() => สลับประเภทMap(p.key)}
                      className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border-2 whitespace-nowrap shrink-0 transition-all ${
                        active ? p.activeChip : 'border-gray-200 bg-white text-gray-600'
                      }`}
                    >
                      {!active && <span className={`w-2 h-2 rounded-full shrink-0 ${p.dot}`} />}
                      {p.label} <span className={active ? 'text-white/80' : 'text-gray-400'}>({p.count})</span>
                    </button>
                  )
                })}
              </div>
            )}

            {โหลดแผนที่ ? (
              <div className="text-center py-10">
                <div className="w-8 h-8 border-4 border-teal-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-sm text-gray-400">กำลังโหลดตำแหน่งรายงาน...</p>
              </div>
            ) : (
              <>
                {/* แผนที่ — isolate: กัก z-index ภายในของ Leaflet (สูงถึง 1000) ไม่ให้ทะลุขึ้นทับ modal */}
                <div className="px-4">
                  <div className="relative isolate rounded-2xl overflow-hidden border border-gray-200 shadow-sm" style={{ height: 340 }}>
                    <MapContainer center={ศูนย์กลางแผนที่} zoom={13} style={{ height: '100%', width: '100%' }}>
                      <MapController โฟกัส={โฟกัสจุด} />
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      {ตำแหน่งฉัน && (
                        <Marker position={[ตำแหน่งฉัน.lat, ตำแหน่งฉัน.lng]} icon={หมุดตัวเอง}>
                          <Popup>ตำแหน่งของคุณ</Popup>
                        </Marker>
                      )}
                      {จุดกรองแสดง.map((r) => (
                        <Marker key={r.id} position={[r.latitude, r.longitude]} icon={หมุดสี(ประเภทจาก(r.urgency).hex)}>
                          <Popup>
                            <div className="text-sm">
                              <p className="font-bold">#{String(r.id).padStart(6, '0')} — {r.animal_type || 'ไม่ระบุ'}</p>
                              <p className="text-gray-600">{r.location_text}</p>
                              <p className="text-xs mt-1" style={{ color: ประเภทจาก(r.urgency).hex }}>● {ประเภทจาก(r.urgency).label}</p>
                              {r.detail && <p className="text-xs text-gray-600 mt-1 flex items-start gap-1"><FileText size={11} className="shrink-0 mt-0.5" /> {r.detail}</p>}
                              <p className="text-xs mt-1">สถานะ: {r.status}</p>
                              <a
                                href={`https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="mt-2 inline-flex items-center gap-1 bg-teal-600 text-white px-3 py-1.5 rounded-lg text-xs font-semibold no-underline"
                              >
                                <Navigation size={12} className="shrink-0" /> นำทาง (Google Maps)
                              </a>
                            </div>
                          </Popup>
                        </Marker>
                      ))}
                    </MapContainer>

                    {/* ปุ่มหาตำแหน่งฉัน — ลอยมุมล่างขวาของแผนที่ แบบเดียวกับปุ่ม locate ทั่วไปที่เจ้าหน้าที่คุ้นเคย */}
                    <button
                      onClick={หาตำแหน่งฉัน}
                      disabled={กำลังหาตำแหน่ง}
                      aria-label="หาตำแหน่งของฉัน"
                      title="หาตำแหน่งของฉัน"
                      className="absolute bottom-3 right-3 z-[1000] w-11 h-11 rounded-full bg-white shadow-md flex items-center justify-center text-teal-600 active:scale-95 transition-all disabled:opacity-60"
                    >
                      {กำลังหาตำแหน่ง ? <Loader2 size={20} className="animate-spin" /> : <LocateFixed size={20} />}
                    </button>
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
                  <p className="text-xs text-gray-400">
                    {จุดกรองแสดง.length} จุดในมุมมองนี้ · แตะเพื่อซูมแผนที่ · แตะสองครั้งเพื่อจัดการ
                    {ตำแหน่งฉัน ? ' · เรียงตามระยะใกล้ฉันที่สุด' : ''}
                  </p>
                  {จุดกรองแสดง.length === 0 && (
                    <div className="text-center py-8 text-gray-400 text-sm">ไม่มีจุดในตัวกรองนี้</div>
                  )}
                  {จุดกรองแสดง.map((r) => (
                    <div key={r.id}
                      onClick={() => setโฟกัสจุด({ lat: r.latitude, lng: r.longitude, id: r.id, t: Date.now() })}
                      onDoubleClick={() => เปิดจัดการจากแผนที่(r)}
                      style={{ borderLeftColor: ประเภทจาก(r.urgency).hex }}
                      className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer active:scale-95 transition-all border-l-4"
                    >
                      <div className="p-3 flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ background: ประเภทจาก(r.urgency).hex }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm truncate">{r.animal_type || 'ไม่ระบุ'}</p>
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1">
                            <MapPin size={12} className="shrink-0" /> {r.location_text || '-'} · #{String(r.id).padStart(6, '0')}
                            {r._ระยะ != null && (
                              <span className="text-teal-600 font-medium shrink-0">
                                · ห่าง {r._ระยะ < 1000 ? `${Math.round(r._ระยะ)} ม.` : `${(r._ระยะ / 1000).toFixed(1)} กม.`}
                              </span>
                            )}
                          </p>
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
          ใช้ทั้งหน้า reports และหน้า map (double-click การ์ดในแผนที่)
          ============================================================ */}
      {รายงานที่เปิด && (หน้า === 'reports' || หน้า === 'map') && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')}</p>
              <button onClick={ปิดรายละเอียด} aria-label="ปิด"
                className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
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
                <MapPin size={18} className="text-gray-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">ตำแหน่งที่พบสัตว์</p>
                  <p className="text-sm font-semibold text-gray-800">{รายงานที่เปิด.location_text || '-'}</p>
                  {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-teal-600 px-3 py-1.5 rounded-full font-medium"
                    >
                      <Map size={14} className="shrink-0" /> เปิดใน Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <MessageSquare size={18} className="text-gray-500 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">รายละเอียดจากผู้แจ้ง</p>
                    <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                  </div>
                </div>
              )}

              {/* ข้อมูลผู้แจ้ง */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-3 flex items-center gap-1.5"><User size={12} className="shrink-0" /> ข้อมูลผู้แจ้ง</p>
                {!รายงานที่เปิด.reporter_id && (
                  <p className="text-sm text-gray-400 italic flex items-center gap-1.5"><Trash2 size={13} className="shrink-0" /> บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
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
                          : <User size={20} className="text-blue-400" />
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
                        <Phone size={20} className="text-blue-500 shrink-0" />
                        <div>
                          <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                          <p className="text-base font-bold text-blue-600">{ข้อมูลผู้แจ้ง.phone}</p>
                        </div>
                        <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-2 border border-dashed border-blue-200">
                        <span className="inline-flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> ผู้แจ้งยังไม่ได้ระบุเบอร์โทร</span>
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
                  <p className="text-xs font-semibold text-purple-600 mb-1 flex items-center gap-1.5"><FileText size={12} className="shrink-0" /> บันทึกเจ้าหน้าที่</p>
                  <p className="text-sm text-gray-700">{รายงานที่เปิด.volunteer_notes}</p>
                </div>
              )}

              {/* ปุ่มหลัก */}
              {รายงานที่เปิด.status === 'รอดำเนินการ' ? (
                <button onClick={รับเรื่อง} disabled={กำลังรับเรื่อง}
                  className="w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60 active:scale-95 transition-all flex items-center justify-center gap-2">
                  {กำลังรับเรื่อง ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังรับเรื่อง...</> : <><CheckCircle2 size={16} className="shrink-0" /> รับเรื่อง (แจ้งเตือนผู้แจ้งอัตโนมัติ)</>}
                </button>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-2">รับเรื่องแล้ว — ไปอัปเดตความคืบหน้า</p>
                  <button onClick={function () { ปิดรายละเอียด(); navigate('/volunteer/update') }}
                    className="text-teal-700 font-semibold text-sm underline">
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
              <button onClick={ปิดรายละเอียด} aria-label="ปิด"
                className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูป + ข้อมูล + ความคืบหน้า — คอนเทนเนอร์เดียวกัน คั่นด้วยเส้นบาง แทนสองกล่องสีเทาติดกันที่แยกกันโดยไม่มีเหตุผล */}
              <div className="bg-gray-50 rounded-2xl p-3 divide-y divide-gray-200/70">
                <div className="flex gap-3 items-start pb-3">
                  <AnimalThumb imageUrl={รายงานที่เปิด.image_url} type={รายงานที่เปิด.animal_type} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800">{รายงานที่เปิด.animal_type || 'ไม่ระบุ'}</p>
                    <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {รายงานที่เปิด.location_text}</p>
                    <p className="text-xs text-gray-400">{แปลงวันที่เวลา(รายงานที่เปิด.created_at)}</p>
                    {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                      <a
                        href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                        target="_blank" rel="noreferrer"
                        className="inline-flex items-center gap-1 mt-1.5 text-xs text-white bg-teal-600 px-3 py-1.5 rounded-full font-medium"
                      >
                        <Map size={13} className="shrink-0" /> Google Maps →
                      </a>
                    )}
                  </div>
                </div>
                <div className="pt-3">
                  <ProgressBar status={รายงานที่เปิด.status} />
                </div>
              </div>

              {/* ข้อมูลผู้แจ้ง (compact) */}
              <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                <p className="text-xs font-semibold text-blue-600 mb-2 flex items-center gap-1.5"><User size={12} className="shrink-0" /> ผู้แจ้ง</p>
                {!รายงานที่เปิด.reporter_id ? (
                  <p className="text-xs text-gray-400 italic flex items-center gap-1.5"><Trash2 size={12} className="shrink-0" /> บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
                ) : โหลดผู้แจ้ง ? (
                  <p className="text-xs text-gray-400">กำลังโหลด...</p>
                ) : ข้อมูลผู้แจ้ง ? (
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-9 h-9 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        {ข้อมูลผู้แจ้ง.avatar_url
                          ? <img src={ข้อมูลผู้แจ้ง.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                          : <User size={18} className="text-blue-400" />
                        }
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{ข้อมูลผู้แจ้ง.name || '-'}</p>
                        <p className="text-xs text-gray-500">{ข้อมูลผู้แจ้ง.email || '-'}</p>
                      </div>
                    </div>
                    {ข้อมูลผู้แจ้ง.phone && (
                      <a href={`tel:${ข้อมูลผู้แจ้ง.phone}`}
                         className="bg-blue-500 text-white text-xs px-3 py-2 rounded-xl font-semibold shrink-0 flex items-center gap-1.5">
                        <Phone size={13} className="shrink-0" /> {ข้อมูลผู้แจ้ง.phone}
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

              {/* เลือกสถานะใหม่ — ตัวเลือกแปรผันตามประเภทการแจ้ง แบ่งกลุ่ม "อัปเดตความคืบหน้า" / "ปิดเคส" */}
              {(function () {
                const { progress, close } = ตัวเลือกอัปเดตสถานะ(รายงานที่เปิด)
                function ปุ่มสถานะ(opt) {
                  const isCurrent  = รายงานที่เปิด.status === opt.value
                  const isSelected = สถานะใหม่ === opt.value
                  return (
                    <button key={opt.value} onClick={() => setSถานะใหม่(opt.value)} disabled={isCurrent}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium border-2 text-left flex items-center gap-2.5 transition-all ${
                        isCurrent
                          ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                          : isSelected
                          ? 'border-teal-500 bg-teal-50 text-teal-700'
                          : 'border-gray-200 bg-white text-gray-700 hover:border-teal-200'
                      }`}
                    >
                      {isSelected && !isCurrent
                        ? <CircleDot size={16} className="shrink-0 text-teal-500" />
                        : <Circle size={16} className="shrink-0 text-gray-300" />}
                      <span className="flex-1">{opt.label}</span>
                      {isCurrent && <span className="text-[11px] font-semibold bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full shrink-0">ปัจจุบัน</span>}
                      {opt.value === 'อยู่ศูนย์พักพิง' && !isCurrent && !isSelected && (
                        <span className="text-xs text-teal-500">→ เพิ่มเข้าจัดการสัตว์</span>
                      )}
                    </button>
                  )
                }
                return (
                  <div>
                    <p className="text-sm font-semibold text-gray-700 mb-2">
                      เปลี่ยนสถานะ
                      <span className="text-xs font-normal text-gray-400 ml-2">ปัจจุบัน: {รายงานที่เปิด.status}</span>
                    </p>

                    {/* กลุ่ม 1: อัปเดตความคืบหน้า */}
                    <p className="text-xs font-semibold text-gray-400 mb-1.5">อัปเดตความคืบหน้า</p>
                    <div className="space-y-2">
                      {progress.map(ปุ่มสถานะ)}
                    </div>

                    {/* กลุ่ม 2: ปิดเคส — แสดงเมื่อถึงลงพื้นที่แล้ว */}
                    {close.length > 0 && (
                      <>
                        <hr className="my-3 border-gray-100" />
                        <p className="text-xs font-semibold text-gray-400 mb-1.5">ปิดเคส (Close Case)</p>
                        <div className="space-y-2">
                          {close.map(ปุ่มสถานะ)}
                        </div>

                        {/* รวมเคสซ้ำซ้อน — เป็น action แยก เพราะต้องเลือกเคสหลักก่อน ไม่ใช่แค่เปลี่ยนสถานะ */}
                        <button
                          onClick={function () { เปิดรวมเคส(รายงานที่เปิด, เคสซ้ำแผนที่[รายงานที่เปิด.id]?.เคส) }}
                          className="w-full mt-2 py-3 px-4 rounded-xl text-sm font-medium border-2 border-dashed border-gray-300 text-gray-600 text-left flex items-center gap-2.5 active:bg-gray-50"
                        >
                          <Link2 size={16} className="shrink-0" />
                          <span className="flex-1">แจ้งซ้ำซ้อน / รวมเคส</span>
                          <span className="text-xs text-gray-400">เลือกเคสหลัก →</span>
                        </button>
                      </>
                    )}
                  </div>
                )
              })()}

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
                className="w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2">
                {กำลังบันทึก ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังบันทึก...</> : <><Save size={16} className="shrink-0" /> บันทึกการอัปเดต</>}
              </button>

              {สถานะใหม่ === 'อยู่ศูนย์พักพิง' && (
                <p className="text-xs text-center text-teal-600">
                  <span className="inline-flex items-center gap-1"><Zap size={12} className="shrink-0" /> เมื่อบันทึก ข้อมูลสัตว์จะถูกเพิ่มใน "จัดการข้อมูลสัตว์" โดยอัตโนมัติ</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          MODAL: รวมเคสซ้ำซ้อน — เลือกเคสหลักที่จะรวมเข้า
          ============================================================ */}
      {แสดงModalรวมเคส && เคสที่จะรวม && (function () {
        // เคสหลักที่เลือกได้ = เคสที่ยังไม่ปิด และไม่ใช่ใบนี้ — เรียงตามระยะทางจากใบนี้ (ใกล้สุดก่อน)
        const ตัวเลือกเคสหลัก = รายงานทั้งหมด
          .filter(function (r) { return r.id !== เคสที่จะรวม.id && !เป็นเคสปิด(r) })
          .map(function (r) {
            const วัดได้ = เคสที่จะรวม.latitude && เคสที่จะรวม.longitude && r.latitude && r.longitude
            return { ...r, ระยะ: วัดได้ ? ระยะทางเมตร(เคสที่จะรวม.latitude, เคสที่จะรวม.longitude, r.latitude, r.longitude) : null }
          })
          .sort(function (a, b) { return (a.ระยะ ?? Infinity) - (b.ระยะ ?? Infinity) })

        // เคสหลักที่ถูกเลือกอยู่ (ใช้โชว์เทียบภาพซ้าย-ขวา)
        const เคสหลักObj = ตัวเลือกเคสหลัก.find(function (r) { return String(r.id) === String(เคสหลักที่เลือก) }) || null

        return (
          <div className="fixed inset-0 bg-black/60 z-[60] flex items-end"
               onClick={ปิดรวมเคส}>
            <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto"
                 onClick={function (e) { e.stopPropagation() }}>
              <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
              <div className="flex items-center justify-between px-5 py-3">
                <p className="font-bold text-gray-800 flex items-center gap-2"><Link2 size={18} className="shrink-0" /> รวมเคสซ้ำซ้อน</p>
                <button onClick={ปิดรวมเคส} aria-label="ปิด"
                  className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="px-5 pb-8 space-y-4">
                {/* เทียบภาพซ้าย-ขวา ก่อนตัดสินใจ */}
                <div className="bg-gray-50 border border-gray-200 rounded-2xl p-3">
                  <p className="text-xs font-semibold text-gray-500 text-center mb-2">เทียบภาพก่อนยืนยัน</p>
                  <div className="flex items-start gap-2">
                    <ช่องเทียบเคส เคส={เคสที่จะรวม} ป้าย="ใบนี้ (จะถูกปิด)" สี="text-orange-500" />
                    <div className="flex items-center self-center pt-4">
                      <span className="text-xl text-gray-300">→</span>
                    </div>
                    <ช่องเทียบเคส เคส={เคสหลักObj} ป้าย="เคสหลัก (คงไว้)" สี="text-teal-600" />
                  </div>
                  {เคสหลักObj?.ระยะ != null && (
                    <p className="text-[11px] text-center text-teal-600 font-medium mt-2">
                      <span className="inline-flex items-center gap-1"><MapPin size={12} className="shrink-0" /> ห่างกัน {Math.round(เคสหลักObj.ระยะ)} เมตร</span>
                    </p>
                  )}
                </div>

                <div>
                  <p className="text-sm font-semibold text-gray-700 mb-2">ซ้ำซ้อนกับรายงานหมายเลขใด?</p>
                  {ตัวเลือกเคสหลัก.length === 0 ? (
                    <p className="text-sm text-gray-400 bg-gray-50 rounded-xl px-4 py-6 text-center">
                      ไม่มีเคสที่กำลังดำเนินการอยู่ให้รวมด้วย
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {ตัวเลือกเคสหลัก.map(function (r) {
                        const เลือกอยู่ = String(เคสหลักที่เลือก) === String(r.id)
                        return (
                          <button key={r.id}
                            onClick={function () { setเคสหลักที่เลือก(String(r.id)) }}
                            className={`w-full text-left rounded-xl border-2 p-3 flex items-center gap-3 transition-all ${
                              เลือกอยู่ ? 'border-teal-500 bg-teal-50' : 'border-gray-200 bg-white'
                            }`}
                          >
                            <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                              {r.image_url
                                ? <img src={r.image_url} alt="" className="w-full h-full object-cover" />
                                : <PawPrint size={20} className="text-gray-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-gray-800 truncate">
                                #{String(r.id).padStart(6, '0')} · {r.animal_type || 'ไม่ระบุ'}
                              </p>
                              <p className="text-xs text-gray-500 truncate flex items-center gap-1"><MapPin size={12} className="shrink-0" /> {r.location_text || '-'}</p>
                              <p className="text-xs text-gray-400">
                                {แปลงวันที่เวลา(r.created_at)}
                                {r.ระยะ != null && <span className="text-teal-600 font-medium"> · ห่าง {Math.round(r.ระยะ)} ม.</span>}
                              </p>
                            </div>
                            {เลือกอยู่ && <Check size={18} className="text-teal-600 shrink-0" />}
                          </button>
                        )
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-400">
                  เมื่อยืนยัน ใบนี้จะถูกปิดเป็น "เคสซ้ำซ้อน" และหายจากหน้าอัปเดตสถานะ พร้อมโยนรูปไปรวมในเคสหลักให้อัตโนมัติ
                </p>

                <button
                  onClick={รวมเคสซ้ำซ้อน}
                  disabled={!เคสหลักที่เลือก || กำลังรวมเคส}
                  className="w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {กำลังรวมเคส ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังรวมเคส...</> : <><Link2 size={16} className="shrink-0" /> ยืนยันรวมเคส</>}
                </button>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ============================================================
          BOTTOM SHEET: แก้ไขสัตว์
          ============================================================ */}
      {สัตว์ที่แก้ไข && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end"
             onClick={ปิดแก้ไขสัตว์}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            {/* จำกัดความกว้างและจัดกึ่งกลาง กันฟอร์มยืดเต็มจอตอนเปิดบนหน้าจอกว้าง (desktop) */}
            <div className="max-w-4xl mx-auto w-full">
              <div className="flex items-center justify-between px-5 md:px-6 py-3">
                <p className="font-bold text-gray-800">แก้ไขข้อมูลสัตว์</p>
                <button onClick={ปิดแก้ไขสัตว์} aria-label="ปิด"
                  className="w-10 h-10 -mr-2 shrink-0 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                  <X size={20} />
                </button>
              </div>

              <div className="px-5 md:px-6 pb-8 grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* คลังรูปสัตว์ (หลายรูป) — รูปหลักใหญ่ด้านบน + thumbnail grid ตั้ง cover/ลบได้ */}
              <div className="md:col-span-2">
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  รูปภาพสัตว์ <span className="text-xs font-normal text-gray-400">(รูปแรก = รูปหลักที่โชว์บนการ์ด)</span>
                </p>
                {(function () {
                  const รูป   = สัตว์ที่แก้ไข.photos || []
                  const cover = รูป[0] || null
                  return (
                    <>
                      {/* รูปหลักขนาดใหญ่ */}
                      <div className="relative w-full h-44 rounded-2xl overflow-hidden bg-teal-50 flex items-center justify-center">
                        {cover
                          ? <img src={cover} alt="รูปหลัก" className="w-full h-full object-cover" />
                          : <AnimalIcon ชนิด={สัตว์ที่แก้ไข.species || สัตว์ที่แก้ไข.breed} size={56} className="text-teal-400" />}
                        {cover && (
                          <span className="absolute top-2 left-2 bg-teal-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full inline-flex items-center gap-1"><Star size={10} className="fill-white shrink-0" /> รูปหลัก</span>
                        )}
                        {กำลังอัปโหลดรูป && (
                          <div className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white">
                            <div className="w-7 h-7 border-4 border-white border-t-transparent rounded-full animate-spin mb-1.5" />
                            <span className="text-xs font-medium">กำลังอัปโหลด...</span>
                          </div>
                        )}
                      </div>

                      {/* Thumbnail grid + ปุ่มเพิ่มรูป */}
                      <div className="grid grid-cols-4 gap-2 mt-2">
                        {รูป.map(function (url, i) {
                          return (
                            <div key={url} className={`relative aspect-square rounded-xl overflow-hidden border-2 ${i === 0 ? 'border-teal-500' : 'border-gray-100'}`}>
                              <img src={url} alt={`รูปที่ ${i + 1}`} className="w-full h-full object-cover" />
                              {i === 0 ? (
                                <span className="absolute bottom-0 inset-x-0 bg-teal-600/90 text-white text-[9px] text-center py-0.5 font-bold">หลัก</span>
                              ) : (
                                <button type="button" onClick={() => ตั้งเป็นรูปหลัก(url)} title="ตั้งเป็นรูปหลัก" aria-label="ตั้งเป็นรูปหลัก"
                                  className="absolute bottom-0.5 left-0.5 bg-white/90 text-teal-600 rounded-md w-5 h-5 flex items-center justify-center shadow-sm"><Star size={11} className="fill-teal-600" /></button>
                              )}
                              <button type="button" onClick={() => ลบรูปสัตว์(url)} title="ลบรูปนี้" aria-label="ลบรูปนี้"
                                className="absolute top-0.5 right-0.5 bg-black/55 text-white rounded-full w-5 h-5 flex items-center justify-center">
                                <X size={12} />
                              </button>
                            </div>
                          )
                        })}
                        {/* ปุ่มเพิ่มรูป (เลือกได้หลายรูป) */}
                        <button type="button" onClick={() => inputรูปสัตว์.current.click()} disabled={กำลังอัปโหลดรูป}
                          className="aspect-square rounded-xl border-2 border-dashed border-teal-300 bg-teal-50/50 text-teal-500 flex flex-col items-center justify-center disabled:opacity-50">
                          <Camera size={18} />
                          <span className="text-[10px] mt-0.5 font-medium">เพิ่มรูป</span>
                        </button>
                      </div>

                      <input ref={inputรูปสัตว์} type="file" multiple accept="image/jpeg,image/png,image/webp" className="hidden" onChange={เลือกรูปสัตว์ใหม่} />
                      <p className="text-xs text-gray-400 mt-1.5">
                        เพิ่มได้หลายรูปให้ผู้สนใจรับเลี้ยงเห็นน้องหลายมุม • แตะรูปดาวเพื่อตั้งเป็นรูปหลัก • แตะกากบาทเพื่อลบรูป
                      </p>
                    </>
                  )
                })()}
              </div>

              {สัตว์ที่แก้ไข.report_id && (
                <div className="md:col-span-2 bg-slate-100 rounded-xl px-4 py-2.5 text-xs text-slate-600 font-medium">
                  <span className="inline-flex items-center gap-1.5"><ClipboardList size={12} className="shrink-0" /> มาจากรายงาน #{String(สัตว์ที่แก้ไข.report_id).padStart(6, '0')}</span>
                </div>
              )}

              {/* ข้อมูลรายงาน + ผู้แจ้ง (เฉพาะสัตว์ที่มาจากรายงาน) */}
              {สัตว์ที่แก้ไข.report_id && (
                <div className="md:col-span-2 bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-700 flex items-center gap-1.5"><User size={12} className="shrink-0" /> ข้อมูลผู้แจ้ง</p>

                  {โหลดรายงานสัตว์ && (
                    <p className="text-xs text-gray-400">กำลังโหลด...</p>
                  )}

                  {!โหลดรายงานสัตว์ && ข้อมูลรายงานสัตว์ && (
                    <>
                      {/* ตำแหน่งที่พบ */}
                      {ข้อมูลรายงานสัตว์.location_text && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <MapPin size={15} className="text-gray-500 mt-0.5 shrink-0" />
                          <div className="flex-1">
                            <p className="text-xs text-gray-400">ตำแหน่งที่พบสัตว์</p>
                            <p className="text-sm font-semibold text-gray-800">{ข้อมูลรายงานสัตว์.location_text}</p>
                            {ข้อมูลรายงานสัตว์.latitude && ข้อมูลรายงานสัตว์.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${ข้อมูลรายงานสัตว์.latitude},${ข้อมูลรายงานสัตว์.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-teal-600 px-3 py-1.5 rounded-full font-medium"
                              >
                                <Map size={14} className="shrink-0" /> เปิดใน Google Maps →
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
                                : <User size={20} className="text-blue-400" />
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
                              <Phone size={20} className="text-blue-500 shrink-0" />
                              <div>
                                <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                                <p className="text-base font-bold text-blue-600">{ข้อมูลรายงานสัตว์.reporter.phone}</p>
                              </div>
                              <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400 bg-white rounded-xl px-3 py-2 border border-dashed border-blue-200">
                              <span className="inline-flex items-center gap-1"><AlertTriangle size={11} className="shrink-0" /> ผู้แจ้งยังไม่ได้ระบุเบอร์โทร</span>
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic flex items-center gap-1.5"><Trash2 size={12} className="shrink-0" /> บัญชีผู้ใช้ถูกลบแล้ว (Deleted User)</p>
                      )}
                    </>
                  )}

                  {!โหลดรายงานสัตว์ && !ข้อมูลรายงานสัตว์ && (
                    <p className="text-xs text-gray-400 italic">ไม่พบข้อมูลรายงาน</p>
                  )}
                </div>
              )}

              {/* ---- ข้อมูลทั่วไป ---- */}
              <div className="md:col-span-2 flex items-center gap-2 pt-1">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">ข้อมูลทั่วไป</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              {/* แถวที่ 1: ประเภทสัตว์ (สุนัข/แมว) & เพศ — ประเภทจำเป็นต่อการค้นหาแบบละเอียดฝั่ง user */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">ประเภทสัตว์ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['สุนัข', 'แมว'].map(function (v) {
                    return (
                      <button key={v}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, species: v } }) }}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 flex items-center justify-center gap-1.5 ${
                          สัตว์ที่แก้ไข.species === v ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'
                        }`}>
                        <AnimalIcon ชนิด={v} size={18} className="shrink-0" /> {v}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
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

              {/* แถวที่ 2: ชื่อสัตว์ & อายุ — อายุใช้ select ชุดตัวเลือกเดียวกับฟอร์มเพิ่ม เพราะหน้า "ค้นหาสัตว์เลี้ยง"
                  ฝั่ง user กรอง "เด็ก/โต" โดย match ตรงกับ string ชุดนี้ ถ้าเป็นข้อความอิสระ ตัวกรองจะหาไม่เจอ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ชื่อสัตว์</p>
                <input value={สัตว์ที่แก้ไข.name || ''} placeholder="ชื่อสัตว์"
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, name: e.target.value } }) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ <span className="text-red-400">*</span></p>
                <select value={สัตว์ที่แก้ไข.age || ''}
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, age: e.target.value } }) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-teal-400">
                  <option value="">-- เลือก --</option>
                  {ตัวเลือกอายุสัตว์.map(function (a) {
                    return <option key={a}>{a}</option>
                  })}
                </select>
              </div>

              {/* แถวที่ 3: สายพันธุ์ & ขนาดตัว */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">สายพันธุ์</p>
                <input value={สัตว์ที่แก้ไข.breed || ''} placeholder="เช่น สุนัขพันธุ์ไทย"
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, breed: e.target.value } }) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">ขนาดตัว <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['เล็ก', 'กลาง', 'ใหญ่'].map(function (ข) {
                    return (
                      <button key={ข}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, size: ข } }) }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.size === ข ? 'border-teal-500 bg-teal-50 text-teal-700' : 'border-gray-200 text-gray-600'
                        }`}>{ข}</button>
                    )
                  })}
                </div>
              </div>

              {/* สุขภาพ — เต็มแถวเสมอ */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">สุขภาพ</p>
                <input value={สัตว์ที่แก้ไข.health || ''} placeholder="เช่น ปกติ, บาดเจ็บ, รักษาอยู่"
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, health: e.target.value } }) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400" />
              </div>

              {/* ---- สถานะและสุขภาพ ---- */}
              <div className="md:col-span-2 flex items-center gap-2 pt-2">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">สถานะและสุขภาพ</p>
                <div className="flex-1 h-px bg-gray-100" />
              </div>

              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  สถานะ
                  <span className="text-gray-400 font-normal ml-1.5">— บอกแค่ว่าตอนนี้น้องอยู่ไหน ส่วนจะประกาศอะไรเลือกที่หัวข้อถัดไป</span>
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {['อยู่ศูนย์พักพิง', 'อยู่ระหว่างรักษา', 'รอการรับเลี้ยง', 'มีผู้รับเลี้ยง'].map(function (ส) {
                    const isWaiting  = ส === 'รอการรับเลี้ยง'
                    const isSelected = สัตว์ที่แก้ไข.status === ส
                    return (
                      <button key={ส}
                        onClick={function () {
                          setSัตว์ที่แก้ไข(function (prev) {
                            // สถานะบอกแค่ที่อยู่ ไม่ยุ่งกับการประกาศแล้ว
                            // ยกเว้นสถานะที่แปลว่าน้องออกไปแล้ว → ประกาศต่อไม่ได้ ปิดให้อัตโนมัติ
                            const publish_mode = สถานะสัตว์ออกไปแล้ว.includes(ส) ? 'none' : โหมดจาก(prev)
                            return { ...prev, status: ส, publish_mode }
                          })
                        }}
                        className={`py-2.5 rounded-xl text-xs font-medium border-2 flex items-center justify-center gap-1 ${
                          isSelected
                            ? isWaiting
                              ? 'border-teal-600 bg-teal-600 text-white shadow-sm'
                              : 'border-teal-500 bg-teal-50 text-teal-700'
                            : 'border-gray-200 text-gray-700'
                        }`}>
                        {isWaiting && <Star size={12} className={isSelected ? 'fill-white' : 'text-gray-400'} />}
                        {ส}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ลักษณะนิสัย — Tag/Chip input */}
              <div className="md:col-span-2">
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
                          aria-label={`ลบแท็ก ${tag}`}
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

              {/* ประวัติการฉีดวัคซีน — flex-wrap แทน flex-1 กันปุ่มยืดเต็มแถวเกินความจำเป็น */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-600 mb-2">ประวัติการฉีดวัคซีน</p>
                <div className="flex flex-wrap gap-2">
                  {['ฉีดแล้ว', 'ยังไม่ฉีด', 'ไม่ทราบ'].map(function (ว) {
                    const สี = ว === 'ฉีดแล้ว' ? 'border-green-500 bg-green-500 text-white'
                              : ว === 'ยังไม่ฉีด' ? 'border-red-400 bg-red-400 text-white'
                              : 'border-gray-400 bg-gray-400 text-white'
                    return (
                      <button key={ว}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, vaccine_info: ว } }) }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-medium border-2 flex items-center gap-1 ${
                          สัตว์ที่แก้ไข.vaccine_info === ว ? สี : 'border-gray-200 text-gray-600'
                        }`}>
                        {ว === 'ฉีดแล้ว' ? <><CheckCircle2 size={13} className="shrink-0" /> ฉีดแล้ว</> : ว === 'ยังไม่ฉีด' ? <><XCircle size={13} className="shrink-0" /> ยังไม่ฉีด</> : <><HelpCircle size={13} className="shrink-0" /> ไม่ทราบ</>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* ทำหมันแล้วหรือยัง — flex-wrap แทน flex-1 กันปุ่มยืดเต็มแถวเกินความจำเป็น */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-600 mb-2">ทำหมันแล้วหรือยัง</p>
                <div className="flex flex-wrap gap-2">
                  {['ทำแล้ว', 'ยังไม่ทำ', 'ไม่ทราบ'].map(function (น) {
                    const สี = น === 'ทำแล้ว' ? 'border-green-500 bg-green-500 text-white'
                              : น === 'ยังไม่ทำ' ? 'border-red-400 bg-red-400 text-white'
                              : 'border-gray-400 bg-gray-400 text-white'
                    return (
                      <button key={น}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, neutered: น } }) }}
                        className={`px-4 py-2.5 rounded-xl text-xs font-medium border-2 flex items-center gap-1 ${
                          สัตว์ที่แก้ไข.neutered === น ? สี : 'border-gray-200 text-gray-600'
                        }`}>
                        {น === 'ทำแล้ว' ? <><CheckCircle2 size={13} className="shrink-0" /> ทำแล้ว</> : น === 'ยังไม่ทำ' ? <><XCircle size={13} className="shrink-0" /> ยังไม่ทำ</> : <><HelpCircle size={13} className="shrink-0" /> ไม่ทราบ</>}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* เรื่องราว/นิสัย — Bio สั้นๆ แสดงในหน้ารับเลี้ยงของ user */}
              <div className="md:col-span-2">
                <p className="text-xs font-semibold text-gray-600 mb-1">เรื่องราว/นิสัย (แสดงในหน้ารับเลี้ยง)</p>
                <textarea
                  value={สัตว์ที่แก้ไข.description || ''}
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, description: e.target.value } }) }}
                  placeholder="เช่น ขี้อ้อน เข้ากับคนง่าย กินเก่ง ชอบเล่นลูกบอล"
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-teal-400 resize-none"
                />
              </div>

              {/* การเผยแพร่สู่สาธารณะ — แยกจาก status โดยสิ้นเชิง
                  สัตว์ "อยู่ศูนย์พักพิง" + "ประกาศตามหาเจ้าของเดิม" พร้อมกันได้ (เดิมทำไม่ได้เพราะใช้ status ตัวเดียว) */}
              {(function () {
                const โหมดปัจจุบัน = โหมดจาก(สัตว์ที่แก้ไข)
                const ออกไปแล้ว   = สถานะสัตว์ออกไปแล้ว.includes(สัตว์ที่แก้ไข.status)
                const ข้อมูลครบ   = ข้อมูลครบพอเผยแพร่(สัตว์ที่แก้ไข)

                function เลือกโหมด(ค่า) {
                  if (ออกไปแล้ว && ค่า !== 'none') {
                    toast(`ประกาศไม่ได้: น้องมีสถานะ "${สัตว์ที่แก้ไข.status}" แล้ว`)
                    return
                  }
                  // โหมดหาบ้านใหม่เท่านั้นที่บังคับข้อมูลครบ เพราะ FindPet ต้องใช้กรอง
                  if (ค่า === 'adoption' && !ข้อมูลครบ) {
                    toast('กรุณาระบุ ประเภท, เพศ, อายุ และขนาดตัว ก่อนประกาศหาบ้านใหม่')
                    return
                  }
                  setSัตว์ที่แก้ไข(function (prev) { return { ...prev, publish_mode: ค่า } })
                }

                return (
                  <div className="md:col-span-2">
                    <p className="text-xs font-semibold text-gray-600 mb-2">
                      การเผยแพร่สู่สาธารณะ
                      <span className="text-gray-400 font-normal ml-1.5">— เลือกได้อิสระจากสถานะด้านบน</span>
                    </p>

                    <div className="space-y-2">
                      {โหมดเผยแพร่.map(function (m) {
                        const เลือกอยู่ = โหมดปัจจุบัน === m.value
                        const ปิดกั้น   = (ออกไปแล้ว && m.value !== 'none') ||
                                          (m.value === 'adoption' && !ข้อมูลครบ)
                        return (
                          <button key={m.value} onClick={() => เลือกโหมด(m.value)}
                            className={`w-full text-left rounded-xl border-2 px-4 py-3 flex items-start gap-3 transition-all ${
                              เลือกอยู่ ? m.active : ปิดกั้น ? 'border-gray-200 bg-gray-50 opacity-60' : 'border-gray-200 bg-white'
                            }`}
                          >
                            {เลือกอยู่
                              ? <CircleDot size={17} className={`shrink-0 mt-0.5 ${m.dot}`} />
                              : <Circle size={17} className="shrink-0 mt-0.5 text-gray-300" />}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium flex items-center gap-1.5">
                                <m.Icon size={14} className="shrink-0" /> {m.label}
                              </p>
                              <p className={`text-xs mt-0.5 ${เลือกอยู่ ? 'opacity-80' : 'text-gray-400'}`}>{m.desc}</p>
                            </div>
                          </button>
                        )
                      })}
                    </div>

                    {/* เหตุผลที่บางโหมดกดไม่ได้ */}
                    {ออกไปแล้ว && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-orange-600 bg-orange-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="mt-px shrink-0" />
                        <span>น้องมีสถานะ <b>"{สัตว์ที่แก้ไข.status}"</b> แล้ว จึงประกาศต่อไม่ได้</span>
                      </div>
                    )}
                    {!ออกไปแล้ว && !ข้อมูลครบ && (
                      <div className="mt-2 flex items-start gap-1.5 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">
                        <AlertTriangle size={13} className="mt-px shrink-0" />
                        <span>ยังประกาศ <b>หาบ้านใหม่</b> ไม่ได้ — ต้องระบุ <b>ประเภท, เพศ, อายุ, ขนาดตัว</b> ให้ครบก่อน (ประกาศตามหาเจ้าของใช้ได้เลย ไม่ต้องกรอกครบ)</span>
                      </div>
                    )}
                  </div>
                )
              })()}

              <button onClick={บันทึกแก้ไขสัตว์}
                className="md:col-span-2 w-full bg-teal-600 text-white rounded-2xl py-4 font-bold text-base active:scale-95 transition-all flex items-center justify-center gap-2">
                <Save size={18} className="shrink-0" /> บันทึกการแก้ไข
              </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default VolunteerPage
