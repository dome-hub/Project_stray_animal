// LostAndFoundPage.jsx — ศูนย์กลางประกาศสัตว์หาย/พลัดหลง (ฝั่งผู้ใช้ทั่วไป)
//
// แท็บ "ศูนย์พบสัตว์พลัดหลง" = รายงานที่เจ้าหน้าที่กดสถานะ "ประกาศตามหาเจ้าของ" ไว้
//   (ปลายทางของปุ่มฝั่งเจ้าหน้าที่ที่เดิมไม่มีหน้าไหนของ user มารับเลย)
// แท็บ "ตามหาสัตว์เลี้ยง"   = โพสต์ที่ประชาชนแจ้งว่าสัตว์เลี้ยงตัวเองหาย (ตาราง lost_pets)

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Megaphone, Search, MapPin, Calendar, Loader2, X, Camera,
  PawPrint, Home, HeartCrack, CheckCircle2, Phone, Building2, Info,
  Eye, Hospital, ExternalLink, Gift, Pencil, Save, Trash2, Ban,
} from 'lucide-react'
import { MapContainer, TileLayer, Marker } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import { supabase } from '../supabase'
import { ตรวจสอบไฟล์รูปภาพ } from '../utils/fileValidation'
import AnimalIcon from '../components/AnimalIcon'

// แก้ปัญหา Leaflet หาไอคอนหมุดไม่เจอตอน build ผ่าน Vite (idempotent — เรียกซ้ำได้)
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
})

// สถานะที่เจ้าหน้าที่ตั้งไว้แปลว่า "กำลังประกาศตามหาเจ้าของ" — แท็บที่ 1 ดึงเฉพาะอันนี้
const สถานะประกาศหาเจ้าของ = 'ประกาศตามหาเจ้าของ'

// สถานะของโพสต์ตามหาสัตว์ที่ผู้ใช้แจ้งเอง (อีกสถานะคือ 'เจอแล้ว' ซึ่งจะไม่ถูกดึงมาแสดง)
const กำลังตามหา = 'กำลังตามหา'

// ดึงข้อมูลทั้ง 2 แท็บพร้อมกัน — แยกออกนอก component เพราะไม่ได้ใช้ state ใดๆ
// คืนค่าเฉยๆ ไม่ setState เอง เพื่อให้ทั้ง effect ตอน mount และปุ่มรีเฟรชเรียกใช้ร่วมกันได้
//
// แท็บ "ศูนย์พบสัตว์พลัดหลง" รวม 2 แหล่ง เพราะสัตว์ตัวหนึ่งตามหาเจ้าของได้ตั้งแต่ก่อนถึงศูนย์:
//   1) animals ที่ publish_mode = 'lost_and_found'  → รับตัวเข้าศูนย์แล้ว แต่ยังรอเจ้าของเดิมมารับ
//   2) reports ที่ status = 'ประกาศตามหาเจ้าของ'    → ประกาศแล้วแต่ยังไม่ได้รับตัวเข้าศูนย์
// ปกติจะไม่ซ้ำกันอยู่แล้ว (report เปลี่ยนเป็น "อยู่ศูนย์พักพิง" ตอนสร้าง animals) แต่กัน
// ข้อมูลเพี้ยนด้วยการตัด report ที่มี animals ผูกอยู่แล้วออก
async function โหลดรายการ() {
  const [ผลAnimals, ผลReports, ผลLost] = await Promise.all([
    supabase
      .from('animals')
      .select('*')
      .eq('publish_mode', 'lost_and_found')
      .order('created_at', { ascending: false }),
    supabase
      .from('reports')
      .select('id, animal_type, image_url, location_text, latitude, longitude, created_at')
      .eq('status', สถานะประกาศหาเจ้าของ)
      .order('created_at', { ascending: false }),
    supabase
      .from('lost_pets')
      .select('*')
      .eq('status', กำลังตามหา)
      .order('created_at', { ascending: false }),
  ])

  // ตารางใหม่อาจยังไม่ถูกสร้าง (ยังไม่รัน migration) → log ไว้ แต่ไม่ให้ทั้งหน้าพัง
  if (ผลAnimals.error) console.error('ดึง animals (lost_and_found) ไม่สำเร็จ:', ผลAnimals.error.message)
  if (ผลLost.error)    console.error('ดึง lost_pets ไม่สำเร็จ:', ผลLost.error.message)

  const สัตว์ในศูนย์ = ผลAnimals.data || []
  const รายงานที่เข้าศูนย์แล้ว = new Set(สัตว์ในศูนย์.map((a) => a.report_id).filter(Boolean))

  // ดึง report ต้นทางของสัตว์ในศูนย์ เพื่อเอา "เวลาที่มีคนแจ้งพบครั้งแรก" + พิกัดจุดที่พบมาแสดง
  // (สัตว์ที่เข้าศูนย์แล้ว report จะเปลี่ยนสถานะไปจาก 'ประกาศตามหาเจ้าของ' แล้ว จึงไม่อยู่ในชุด ผลReports)
  const idต้นทาง = [...รายงานที่เข้าศูนย์แล้ว]
  const reportต้นทาง = {}
  if (idต้นทาง.length > 0) {
    const { data: ต้นทาง } = await supabase
      .from('reports')
      .select('id, created_at, latitude, longitude, location_text')
      .in('id', idต้นทาง)
    ;(ต้นทาง || []).forEach(function (r) { reportต้นทาง[r.id] = r })
  }

  const found = [
    // 1) เข้าศูนย์แล้ว แต่ยังตามหาเจ้าของเดิม
    ...สัตว์ในศูนย์.map(function (a) {
      const มีชื่อ = a.name && a.name !== 'ยังไม่ตั้งชื่อ'
      const รูปทั้งหมด = (Array.isArray(a.photos) ? a.photos : []).filter(Boolean)
      if (รูปทั้งหมด.length === 0 && a.photo_url) รูปทั้งหมด.push(a.photo_url)
      const ต้นทาง = a.report_id ? reportต้นทาง[a.report_id] : null
      return {
        key:      'a' + a.id,
        รูป:      รูปทั้งหมด[0] || null,
        รูปทั้งหมด,
        ชนิด:     a.species || a.breed,
        ชื่อ:     มีชื่อ ? a.name : (a.species || a.breed || 'รอระบุสายพันธุ์'),
        สายพันธุ์: a.breed || null,
        เพศ:      a.gender || null,
        อายุ:     a.age || null,
        ขนาด:     a.size || null,
        สุขภาพ:   a.health || null,
        สถานที่:  a.location || ต้นทาง?.location_text || null,
        วันที่:    a.created_at,
        พบเห็นเมื่อ: ต้นทาง?.created_at || null,   // เวลาที่มีคนแจ้งพบครั้งแรก
        รับเข้าเมื่อ: a.created_at,                  // เวลาที่สร้างเรคคอร์ดสัตว์ = รับเข้าศูนย์
        lat:      ต้นทาง?.latitude ?? null,
        lng:      ต้นทาง?.longitude ?? null,
        ที่ศูนย์:  true,
        รหัส:     a.report_id ? `รหัสรายงาน #${String(a.report_id).padStart(6, '0')}` : 'รับเข้าโดยเจ้าหน้าที่',
        reportId: a.report_id || null,
      }
    }),
    // 2) ประกาศแล้ว แต่ยังไม่ได้รับตัวเข้าศูนย์
    ...(ผลReports.data || [])
      .filter(function (r) { return !รายงานที่เข้าศูนย์แล้ว.has(r.id) })
      .map(function (r) {
        const รอสายพันธุ์ = !r.animal_type || r.animal_type === 'ไม่สามารถวิเคราะห์ได้'
        return {
          key:      'r' + r.id,
          รูป:      r.image_url,
          รูปทั้งหมด: r.image_url ? [r.image_url] : [],
          ชนิด:     r.animal_type,
          ชื่อ:     รอสายพันธุ์ ? 'รอระบุสายพันธุ์' : r.animal_type,
          สายพันธุ์: รอสายพันธุ์ ? null : r.animal_type,
          เพศ:      null,
          อายุ:     null,
          ขนาด:     null,
          สุขภาพ:   null,
          สถานที่:  r.location_text,
          วันที่:    r.created_at,
          พบเห็นเมื่อ: r.created_at,   // เวลาที่มีคนแจ้งพบครั้งแรก
          รับเข้าเมื่อ: null,          // ยังไม่รับตัวเข้าศูนย์
          lat:      r.latitude ?? null,
          lng:      r.longitude ?? null,
          ที่ศูนย์:  false,
          รหัส:     `รหัสรายงาน #${String(r.id).padStart(6, '0')}`,
          reportId: r.id,
        }
      }),
  ]

  return { found, lost: ผลLost.data || [] }
}

// ---- Helper: วันที่แบบสั้น มีปี พ.ศ. เช่น "20 ก.ค. 2569" ----
function วันที่สั้น(str) {
  if (!str) return 'ไม่ระบุ'
  return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// ---- Helper: วันที่ + เวลา เช่น "20 ก.ค. 2569 เวลา 08:30 น." ----
function วันเวลาไทย(str) {
  if (!str) return null
  const d = new Date(str)
  const วัน  = d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  const เวลา = d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
  return `${วัน} เวลา ${เวลา} น.`
}

// ================================================================
// การ์ดแสดงผล — ใช้ร่วมกันทั้ง 2 แท็บ ต่างกันแค่ป้าย tag กับสี
// ================================================================
function การ์ดประกาศ({ รูป, ชนิด, ชื่อ, สถานที่, วันที่, ป้าย, สีป้าย, PIcon, ข้อมูลรอง, รางวัล, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
    >
      {/* รูปสัตว์ — เน้นให้เห็นชัด เต็มความกว้างการ์ด */}
      <div className="relative w-full aspect-square bg-gray-100 flex items-center justify-center">
        {รูป
          ? <img src={รูป} alt={ชื่อ} className="w-full h-full object-cover" />
          : <AnimalIcon ชนิด={ชนิด} size={48} className="text-gray-300" />}

        {/* ป้าย tag มุมซ้ายบน */}
        <span className={`absolute top-2 left-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm ${สีป้าย}`}>
          <PIcon size={11} className="shrink-0" /> {ป้าย}
        </span>

        {/* ป้ายเงินรางวัล มุมขวาบน — ดึงดูดให้คนช่วยสังเกตเบาะแส */}
        {รางวัล > 0 && (
          <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full shadow-sm bg-amber-400 text-amber-900">
            <Gift size={11} className="shrink-0" /> ฿{รางวัล.toLocaleString('th-TH')}
          </span>
        )}
      </div>

      <div className="p-3">
        <p className="font-bold text-gray-800 text-sm truncate">{ชื่อ}</p>

        <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
          <MapPin size={12} className="shrink-0 mt-0.5" />
          <span className="line-clamp-2">{สถานที่ || 'ไม่ระบุตำแหน่ง'}</span>
        </p>

        <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
          <Calendar size={12} className="shrink-0" /> {วันที่สั้น(วันที่)}
        </p>

        {ข้อมูลรอง && (
          <p className="text-[11px] text-gray-400 mt-1 truncate">{ข้อมูลรอง}</p>
        )}
      </div>
    </button>
  )
}

// หน่วยงานที่ดูแลสัตว์พลัดหลง — ใช้ในปุ่ม "ติดต่อยืนยันความเป็นเจ้าของ"
// (ตรงกับข้อมูลเทศบาลตำบลกำแพงแสนในหน้า ContactPage)
const ศูนย์ดูแล = {
  ชื่อ:    'งานสัตวแพทย์ เทศบาลตำบลกำแพงแสน',
  ที่อยู่:  'สำนักงานเทศบาลตำบลกำแพงแสน เลขที่ 377 หมู่ 1 ตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม 73140',
  โทร:     '034351083',
}

// ================================================================
// Modal รายละเอียดสัตว์ที่ศูนย์พบ + ช่องทางยืนยันความเป็นเจ้าของ
// เปิดเมื่อผู้ใช้กดการ์ดในแท็บ "ศูนย์พบสัตว์พลัดหลง"
// (แทนการพาไปหน้าติดตามรายงาน ซึ่งเป็นมุมมองของผู้แจ้ง ไม่ใช่ผู้ตามหาเจ้าของ)
// ================================================================
function FoundPetDetailModal({ สัตว์, onClose }) {
  const รูปทั้งหมด = (สัตว์.รูปทั้งหมด || []).filter(Boolean)
  const มีหลายรูป = รูปทั้งหมด.length > 1
  const ที่ศูนย์ = สัตว์.ที่ศูนย์

  // พิกัดจุดที่พบ (มาจาก report ที่ผู้แจ้งปักหมุดไว้) — แสดงเป็นแผนที่ถ้ามีครบ
  const lat = สัตว์.lat != null ? Number(สัตว์.lat) : null
  const lng = สัตว์.lng != null ? Number(สัตว์.lng) : null
  const มีพิกัด = Number.isFinite(lat) && Number.isFinite(lng)

  // 2 ช่วงเวลาที่สื่อความหมายชัด กันผู้ใช้/เจ้าหน้าที่สับสน
  const พบเห็นเมื่อ  = วันเวลาไทย(สัตว์.พบเห็นเมื่อ)   // เวลาที่มีคนแจ้งพบครั้งแรก
  const รับเข้าเมื่อ = วันเวลาไทย(สัตว์.รับเข้าเมื่อ)  // เวลาที่รับตัวเข้าศูนย์

  // แสดงเฉพาะฟิลด์ที่มีค่า — รายงานที่ยังไม่เข้าศูนย์จะไม่มีเพศ/อายุ/ขนาด
  const ข้อมูลพื้นฐาน = [
    { label: 'สายพันธุ์', value: สัตว์.สายพันธุ์ },
    { label: 'เพศ',       value: สัตว์.เพศ },
    { label: 'อายุ',       value: สัตว์.อายุ },
    { label: 'ขนาดตัว',    value: สัตว์.ขนาด },
  ].filter((x) => x.value)

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center sm:justify-center" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl max-h-[92vh] overflow-y-auto"
           onClick={function (e) { e.stopPropagation() }}>

        {/* รูปภาพ — เลื่อนดูได้ถ้ามีหลายรูป */}
        <div className="relative">
          {รูปทั้งหมด.length > 0 ? (
            <div className="flex overflow-x-auto snap-x snap-mandatory bg-gray-100">
              {รูปทั้งหมด.map(function (url, i) {
                return (
                  <img key={i} src={url} alt={สัตว์.ชื่อ}
                    className="w-full shrink-0 snap-center aspect-square object-cover" />
                )
              })}
            </div>
          ) : (
            <div className="w-full aspect-square bg-gray-100 flex items-center justify-center">
              <AnimalIcon ชนิด={สัตว์.ชนิด} size={64} className="text-gray-300" />
            </div>
          )}

          {/* ปุ่มปิด ลอยมุมขวาบน */}
          <button onClick={onClose}
            className="absolute top-3 right-3 w-9 h-9 rounded-full bg-black/45 text-white flex items-center justify-center backdrop-blur-sm active:scale-90 transition-transform">
            <X size={18} />
          </button>

          {/* ป้ายบอกจำนวนรูป */}
          {มีหลายรูป && (
            <span className="absolute bottom-3 right-3 text-[11px] bg-black/50 text-white px-2.5 py-0.5 rounded-full">
              เลื่อนดูรูป ({รูปทั้งหมด.length})
            </span>
          )}

          {/* แท็กสถานะ ลอยมุมซ้ายบน */}
          <span className={`absolute top-3 left-3 inline-flex items-center gap-1 text-xs font-bold px-3 py-1 rounded-full shadow-sm ${
            ที่ศูนย์ ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'
          }`}>
            {ที่ศูนย์ ? <Home size={12} /> : <Megaphone size={12} />}
            {ที่ศูนย์ ? 'อยู่ในการดูแลของศูนย์' : 'กำลังประกาศตามหาเจ้าของ'}
          </span>
        </div>

        <div className="p-5 space-y-4">

          {/* ชื่อ + รหัสอ้างอิง */}
          <div>
            <h2 className="text-lg font-bold text-gray-800">{สัตว์.ชื่อ}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{สัตว์.รหัส}</p>
          </div>

          {/* ข้อมูลพื้นฐาน */}
          {ข้อมูลพื้นฐาน.length > 0 && (
            <div className="grid grid-cols-2 gap-2">
              {ข้อมูลพื้นฐาน.map(function (item) {
                return (
                  <div key={item.label} className="bg-gray-50 rounded-xl px-3 py-2">
                    <p className="text-[11px] text-gray-400">{item.label}</p>
                    <p className="text-sm font-medium text-gray-800">{item.value}</p>
                  </div>
                )
              })}
            </div>
          )}

          {/* ตำแหน่งที่พบสัตว์ — มีป้ายกำกับชัดเจนเสมอ กันคนเข้าใจผิดว่าแผนที่คือที่อยู่ศูนย์ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <MapPin size={14} className="text-rose-400" /> ตำแหน่งที่พบสัตว์ตัวนี้
            </p>

            {มีพิกัด ? (
              <div className="rounded-2xl overflow-hidden border border-gray-100">
                <MapContainer
                  center={[lat, lng]} zoom={16}
                  scrollWheelZoom={false} dragging={false} doubleClickZoom={false}
                  zoomControl={false} attributionControl={false}
                  style={{ height: 150, width: '100%' }}
                >
                  <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                  <Marker position={[lat, lng]} />
                </MapContainer>
                {สัตว์.สถานที่ && (
                  <p className="text-sm text-gray-700 px-3 pt-2.5 pb-1">{สัตว์.สถานที่}</p>
                )}
                <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
                  target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 bg-gray-50 text-gray-700 text-xs font-medium py-2.5 mt-1 hover:bg-gray-100 transition-colors">
                  <ExternalLink size={13} /> เปิดใน Google Maps
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-700">{สัตว์.สถานที่ || 'ไม่ระบุตำแหน่ง'}</p>
            )}
          </div>

          {/* 2 ช่วงเวลา แยกให้ชัด: พบเห็นครั้งแรก vs รับเข้าศูนย์ */}
          {(พบเห็นเมื่อ || รับเข้าเมื่อ) && (
            <div className="bg-gray-50 rounded-xl divide-y divide-gray-100">
              {พบเห็นเมื่อ && (
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <Eye size={16} className="shrink-0 mt-0.5 text-sky-500" />
                  <div>
                    <p className="text-[11px] text-gray-400">พบเห็นครั้งแรกเมื่อ</p>
                    <p className="text-sm text-gray-700">{พบเห็นเมื่อ}</p>
                  </div>
                </div>
              )}
              {รับเข้าเมื่อ && (
                <div className="flex items-start gap-2.5 px-3 py-2.5">
                  <Hospital size={16} className="shrink-0 mt-0.5 text-teal-500" />
                  <div>
                    <p className="text-[11px] text-gray-400">รับเข้าศูนย์พักพิงเมื่อ</p>
                    <p className="text-sm text-gray-700">{รับเข้าเมื่อ}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* คำแนะนำก่อนติดต่อ */}
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
            <Info size={15} className="shrink-0 mt-0.5 text-amber-500" />
            <p className="text-xs text-amber-700 leading-relaxed">
              หากนี่คือสัตว์เลี้ยงของคุณ กรุณาเตรียมหลักฐานความเป็นเจ้าของ (เช่น รูปถ่าย สมุดวัคซีน)
              เพื่อยืนยันกับเจ้าหน้าที่
            </p>
          </div>

          {/* กล่องข้อมูลหน่วยงานที่ดูแล */}
          <div className="bg-rose-50 rounded-2xl px-4 py-3 space-y-1.5">
            <p className="text-xs font-bold text-rose-700 flex items-center gap-1.5">
              <Building2 size={14} /> หน่วยงานที่ดูแล
            </p>
            <p className="text-sm font-semibold text-gray-800">{ศูนย์ดูแล.ชื่อ}</p>
            <p className="text-xs text-gray-500 flex items-start gap-1.5">
              <MapPin size={13} className="shrink-0 mt-0.5" /> {ศูนย์ดูแล.ที่อยู่}
            </p>
          </div>

          {/* ปุ่มโทรยืนยันความเป็นเจ้าของ */}
          <a href={`tel:${ศูนย์ดูแล.โทร}`}
            className="w-full bg-rose-500 text-white rounded-2xl py-4 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all">
            <Phone size={18} className="shrink-0" /> ติดต่อยืนยันความเป็นเจ้าของ
          </a>

          {/* ปุ่มปิดด้านล่าง */}
          <button onClick={onClose}
            className="w-full text-gray-500 text-sm font-medium py-2">
            ปิด
          </button>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// Modal ฟอร์มแจ้งสัตว์เลี้ยงสูญหาย
// ================================================================
function Modalแจ้งสัตว์หาย({ user, onClose, onSaved }) {
  const inputรูป = useRef(null)

  const [ชื่อสัตว์,   setชื่อสัตว์]   = useState('')
  const [ชนิด,       setชนิด]       = useState('')
  const [สายพันธุ์,  setSายพันธุ์]  = useState('')
  const [ลักษณะ,     setลักษณะ]     = useState('')
  const [สถานที่หาย, setSถานที่หาย] = useState('')
  const [วันที่หาย,  setวันที่หาย]  = useState('')
  const [เบอร์ติดต่อ, setเบอร์ติดต่อ] = useState('')
  const [เงินรางวัล, setเงินรางวัล] = useState('')
  const [ไฟล์รูป,    setไฟล์รูป]    = useState(null)
  const [พรีวิว,     setพรีวิว]     = useState(null)
  const [กำลังบันทึก, setกำลังบันทึก] = useState(false)
  const [error,       setError]       = useState('')

  // ดึงเบอร์จากโปรไฟล์มาเติมให้อัตโนมัติ (ผู้ใช้แก้ได้)
  useEffect(function () {
    if (!user?.id) return
    supabase.from('users').select('phone').eq('id', user.id).single()
      .then(function ({ data }) { if (data?.phone) setเบอร์ติดต่อ(data.phone) })
  }, [user?.id])

  // เคลียร์ object URL ตอนปิด กันหลุดค้างใน memory
  useEffect(function () {
    return function () { if (พรีวิว) URL.revokeObjectURL(พรีวิว) }
  }, [พรีวิว])

  async function เลือกรูป(event) {
    const ไฟล์ = event.target.files[0]
    event.target.value = ''
    if (!ไฟล์) return
    const ผลตรวจ = await ตรวจสอบไฟล์รูปภาพ(ไฟล์)
    if (!ผลตรวจ.ok) { setError(ผลตรวจ.error); return }
    if (พรีวิว) URL.revokeObjectURL(พรีวิว)
    setError('')
    setไฟล์รูป(ไฟล์)
    setพรีวิว(URL.createObjectURL(ไฟล์))
  }

  async function บันทึก() {
    if (กำลังบันทึก) return
    if (!ชื่อสัตว์.trim())   { setError('กรุณากรอกชื่อสัตว์เลี้ยง'); return }
    if (!ชนิด)               { setError('กรุณาเลือกประเภทสัตว์'); return }
    if (!สถานที่หาย.trim())  { setError('กรุณากรอกสถานที่ที่หาย'); return }
    if (!เบอร์ติดต่อ.trim()) { setError('กรุณากรอกเบอร์ติดต่อกลับ'); return }
    if (เงินรางวัล && (isNaN(Number(เงินรางวัล)) || Number(เงินรางวัล) < 0)) {
      setError('กรุณากรอกเงินรางวัลเป็นตัวเลขที่ถูกต้อง'); return
    }
    setError('')
    setกำลังบันทึก(true)

    // อัปโหลดรูปก่อน (ถ้ามี) — ใช้ bucket เดียวกับรูปรายงาน
    let photo_url = null
    if (ไฟล์รูป) {
      const ชื่อไฟล์ = `lost_${Date.now()}_${ไฟล์รูป.name.replace(/\s/g, '_')}`
      const { data, error: upErr } = await supabase.storage.from('report-images').upload(ชื่อไฟล์, ไฟล์รูป)
      if (upErr) { setError('อัปโหลดรูปไม่สำเร็จ: ' + upErr.message); setกำลังบันทึก(false); return }
      photo_url = supabase.storage.from('report-images').getPublicUrl(data.path).data.publicUrl
    }

    const { error: insErr } = await supabase.from('lost_pets').insert({
      owner_id:      user?.id || null,
      pet_name:      ชื่อสัตว์.trim(),
      species:       ชนิด,
      breed:         สายพันธุ์.trim() || null,
      traits:        ลักษณะ.trim() || null,
      lost_location: สถานที่หาย.trim(),
      lost_date:     วันที่หาย || null,
      contact_phone: เบอร์ติดต่อ.trim(),
      reward_amount: เงินรางวัล ? Number(เงินรางวัล) : null,
      photo_url,
      status:        กำลังตามหา,
    })

    setกำลังบันทึก(false)
    if (insErr) { setError('บันทึกไม่สำเร็จ: ' + insErr.message); return }
    onSaved()
  }

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
      <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
           onClick={function (e) { e.stopPropagation() }}>

        <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
        <div className="flex items-center justify-between px-5 py-3">
          <p className="font-bold text-gray-800">แจ้งสัตว์เลี้ยงสูญหาย</p>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-700 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="px-5 pb-8 space-y-4">

          {/* รูปสัตว์ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">รูปสัตว์เลี้ยง</p>
            <div className="w-full h-40 rounded-2xl overflow-hidden bg-rose-50 flex items-center justify-center">
              {พรีวิว
                ? <img src={พรีวิว} alt="พรีวิว" className="w-full h-full object-contain" />
                : <AnimalIcon ชนิด={ชนิด} size={48} className="text-rose-300" />}
            </div>
            <input ref={inputรูป} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={เลือกรูป} />
            <button onClick={() => inputรูป.current.click()}
              className="w-full mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-rose-300 rounded-xl py-2.5 text-sm font-medium text-rose-600 bg-rose-50/50">
              <Camera size={16} /> {พรีวิว ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
            </button>
          </div>

          {/* ชื่อสัตว์ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">ชื่อสัตว์เลี้ยง <span className="text-red-400">*</span></p>
            <input value={ชื่อสัตว์} onChange={(e) => setชื่อสัตว์(e.target.value)}
              placeholder="เช่น มะม่วง, ขาว"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
          </div>

          {/* ประเภท */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-2">ประเภทสัตว์ <span className="text-red-400">*</span></p>
            <div className="flex gap-2">
              {['สุนัข', 'แมว'].map(function (v) {
                return (
                  <button key={v} onClick={() => setชนิด(v)}
                    className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 flex items-center justify-center gap-1.5 ${
                      ชนิด === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600'
                    }`}>
                    <AnimalIcon ชนิด={v} size={18} className="shrink-0" /> {v}
                  </button>
                )
              })}
            </div>
          </div>

          {/* สายพันธุ์ + ลักษณะ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">สายพันธุ์</p>
            <input value={สายพันธุ์} onChange={(e) => setSายพันธุ์(e.target.value)}
              placeholder="เช่น ไทยหลังอาน, เปอร์เซีย"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">ลักษณะเด่น</p>
            <textarea value={ลักษณะ} onChange={(e) => setลักษณะ(e.target.value)}
              placeholder="เช่น สีน้ำตาล มีปลอกคอสีแดง ขาหลังซ้ายเป๋"
              rows={2}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" />
          </div>

          {/* สถานที่ + วันที่ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">สถานที่ที่หาย <span className="text-red-400">*</span></p>
            <input value={สถานที่หาย} onChange={(e) => setSถานที่หาย(e.target.value)}
              placeholder="เช่น หน้าตลาดกำแพงแสน"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">วันที่หาย</p>
            <input type="date" value={วันที่หาย} onChange={(e) => setวันที่หาย(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-rose-400" />
          </div>

          {/* เบอร์ติดต่อ */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5">เบอร์ติดต่อกลับ <span className="text-red-400">*</span></p>
            <input type="tel" inputMode="numeric" value={เบอร์ติดต่อ} onChange={(e) => setเบอร์ติดต่อ(e.target.value)}
              placeholder="เช่น 0812345678"
              className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
            <p className="text-xs text-gray-400 mt-1">คนที่พบสัตว์ของคุณจะใช้เบอร์นี้ติดต่อกลับ</p>
          </div>

          {/* เงินรางวัล — ไม่บังคับ ช่วยจูงใจให้คนช่วยสังเกตและแจ้งเบาะแส */}
          <div>
            <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
              <Gift size={14} className="text-amber-500" /> เงินรางวัลสำหรับผู้พบเบาะแส (ถ้ามี)
            </p>
            <div className="relative">
              <input type="number" min="0" inputMode="numeric" value={เงินรางวัล}
                onChange={(e) => setเงินรางวัล(e.target.value)}
                placeholder="เช่น 1000"
                className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
            </div>
            <p className="text-xs text-gray-400 mt-1">จะแสดงเป็นป้ายบนประกาศของคุณ เพื่อจูงใจให้คนช่วยสังเกตมากขึ้น</p>
          </div>

          {error && (
            <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>
          )}

          <button onClick={บันทึก} disabled={กำลังบันทึก}
            className="w-full bg-rose-500 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2 active:scale-95 transition-all">
            {กำลังบันทึก
              ? <><Loader2 size={18} className="animate-spin shrink-0" /> กำลังโพสต์...</>
              : <><Megaphone size={18} className="shrink-0" /> โพสต์ประกาศตามหา</>}
          </button>
        </div>
      </div>
    </div>
  )
}

// ================================================================
// Modal รายละเอียดโพสต์ตามหาสัตว์เลี้ยง — ใช้ทั้งเจ้าของโพสต์และคนอื่นที่กดเข้ามาดู
// รูปแบบเดียวกับ bottom sheet รายละเอียดรายงานใน TrackReport.jsx: header เดียว
// มีปุ่มแก้ไข/ลบ (เฉพาะเจ้าของ) สลับเนื้อหาโหมดดู ↔ โหมดแก้ไข ภายใน sheet เดียวกัน
// ไม่ใช่การเปิด modal ซ้อน modal
// ================================================================
function LostPetDetailModal({ โพสต์, user, onClose, onSaved, onDeleted }) {
  const inputรูป = useRef(null)
  const เป็นเจ้าของ = !!user?.id && โพสต์.owner_id === user.id
  const มีรางวัล = โพสต์.reward_amount > 0

  const [โหมดแก้ไข, setโหมดแก้ไข] = useState(false)

  // ฟิลด์ฟอร์มแก้ไข — เติมค่าตอนกด "แก้ไขข้อมูล" ผ่าน เปิดโหมดแก้ไข()
  const [ชื่อสัตว์,   setชื่อสัตว์]   = useState('')
  const [ชนิด,       setชนิด]       = useState('')
  const [สายพันธุ์,  setSายพันธุ์]  = useState('')
  const [ลักษณะ,     setลักษณะ]     = useState('')
  const [สถานที่หาย, setSถานที่หาย] = useState('')
  const [วันที่หาย,  setวันที่หาย]  = useState('')
  const [เบอร์ติดต่อ, setเบอร์ติดต่อ] = useState('')
  const [เงินรางวัล, setเงินรางวัล] = useState('')
  const [ไฟล์รูป,    setไฟล์รูป]    = useState(null)
  const [พรีวิว,     setพรีวิว]     = useState(null)
  const [กำลังบันทึก, setกำลังบันทึก] = useState(false)
  const [error,       setError]       = useState('')

  const [แสดงยืนยันลบ, setแสดงยืนยันลบ] = useState(false)
  const [กำลังลบ,      setกำลังลบ]      = useState(false)

  function เปิดโหมดแก้ไข() {
    setชื่อสัตว์(โพสต์.pet_name || '')
    setชนิด(โพสต์.species || '')
    setSายพันธุ์(โพสต์.breed || '')
    setลักษณะ(โพสต์.traits || '')
    setSถานที่หาย(โพสต์.lost_location || '')
    setวันที่หาย(โพสต์.lost_date || '')
    setเบอร์ติดต่อ(โพสต์.contact_phone || '')
    setเงินรางวัล(โพสต์.reward_amount != null ? String(โพสต์.reward_amount) : '')
    setไฟล์รูป(null)
    setพรีวิว(null)
    setError('')
    setโหมดแก้ไข(true)
  }

  function ปิดโหมดแก้ไข() {
    if (พรีวิว) URL.revokeObjectURL(พรีวิว)
    setไฟล์รูป(null)
    setพรีวิว(null)
    setError('')
    setโหมดแก้ไข(false)
  }

  async function เลือกรูป(event) {
    const ไฟล์ = event.target.files[0]
    event.target.value = ''
    if (!ไฟล์) return
    const ผลตรวจ = await ตรวจสอบไฟล์รูปภาพ(ไฟล์)
    if (!ผลตรวจ.ok) { setError(ผลตรวจ.error); return }
    if (พรีวิว) URL.revokeObjectURL(พรีวิว)
    setError('')
    setไฟล์รูป(ไฟล์)
    setพรีวิว(URL.createObjectURL(ไฟล์))
  }

  async function บันทึกแก้ไข() {
    if (กำลังบันทึก) return
    if (!ชื่อสัตว์.trim())   { setError('กรุณากรอกชื่อสัตว์เลี้ยง'); return }
    if (!ชนิด)               { setError('กรุณาเลือกประเภทสัตว์'); return }
    if (!สถานที่หาย.trim())  { setError('กรุณากรอกสถานที่ที่หาย'); return }
    if (!เบอร์ติดต่อ.trim()) { setError('กรุณากรอกเบอร์ติดต่อกลับ'); return }
    if (เงินรางวัล && (isNaN(Number(เงินรางวัล)) || Number(เงินรางวัล) < 0)) {
      setError('กรุณากรอกเงินรางวัลเป็นตัวเลขที่ถูกต้อง'); return
    }
    setError('')
    setกำลังบันทึก(true)

    // ถ้าไม่ได้เลือกรูปใหม่ ให้คงรูปเดิมไว้
    let photo_url = โพสต์.photo_url || null
    if (ไฟล์รูป) {
      const ชื่อไฟล์ = `lost_${Date.now()}_${ไฟล์รูป.name.replace(/\s/g, '_')}`
      const { data, error: upErr } = await supabase.storage.from('report-images').upload(ชื่อไฟล์, ไฟล์รูป)
      if (upErr) { setError('อัปโหลดรูปไม่สำเร็จ: ' + upErr.message); setกำลังบันทึก(false); return }
      photo_url = supabase.storage.from('report-images').getPublicUrl(data.path).data.publicUrl
    }

    const ข้อมูล = {
      pet_name:      ชื่อสัตว์.trim(),
      species:       ชนิด,
      breed:         สายพันธุ์.trim() || null,
      traits:        ลักษณะ.trim() || null,
      lost_location: สถานที่หาย.trim(),
      lost_date:     วันที่หาย || null,
      contact_phone: เบอร์ติดต่อ.trim(),
      reward_amount: เงินรางวัล ? Number(เงินรางวัล) : null,
      photo_url,
    }

    const { error: updErr } = await supabase.from('lost_pets').update(ข้อมูล).eq('id', โพสต์.id)

    setกำลังบันทึก(false)
    if (updErr) { setError('บันทึกไม่สำเร็จ: ' + updErr.message); return }

    setโหมดแก้ไข(false)
    onSaved({ ...โพสต์, ...ข้อมูล })
  }

  async function ลบโพสต์() {
    if (กำลังลบ) return
    setกำลังลบ(true)
    const { error: delErr } = await supabase.from('lost_pets').delete().eq('id', โพสต์.id)
    setกำลังลบ(false)
    if (delErr) { setError('ลบไม่สำเร็จ: ' + delErr.message); return }
    setแสดงยืนยันลบ(false)
    onDeleted(โพสต์.id)
  }

  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={onClose}>
        <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
             onClick={function (e) { e.stopPropagation() }}>

          {/* Handle */}
          <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

          {/* Title + Action menu (แก้ไข/ลบ เฉพาะเจ้าของโพสต์) + ปิด */}
          <div className="flex items-center justify-between px-5 py-3">
            <p className="font-bold text-gray-800 truncate pr-2">{โพสต์.pet_name}</p>
            <div className="flex items-center gap-1 shrink-0">
              {เป็นเจ้าของ && !โหมดแก้ไข && (
                <>
                  <button onClick={เปิดโหมดแก้ไข} title="แก้ไขข้อมูล"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 active:bg-gray-200 transition-colors duration-200">
                    <Pencil size={18} strokeWidth={2} />
                  </button>
                  <button onClick={() => setแสดงยืนยันลบ(true)} title="ลบประกาศ"
                    className="w-8 h-8 rounded-full flex items-center justify-center text-red-300 hover:text-red-600 hover:bg-red-50 active:bg-red-100 transition-colors duration-200">
                    <Trash2 size={18} strokeWidth={2} />
                  </button>
                  <div className="w-px h-5 bg-gray-200 mx-1" />
                </>
              )}
              <button onClick={โหมดแก้ไข ? ปิดโหมดแก้ไข : onClose} title={โหมดแก้ไข ? 'ยกเลิกแก้ไข' : 'ปิด'}
                className="w-8 h-8 rounded-full flex items-center justify-center text-gray-400 hover:text-gray-800 hover:bg-gray-100 transition-colors duration-200">
                <X size={20} strokeWidth={2} />
              </button>
            </div>
          </div>

          {โหมดแก้ไข ? (
            // ============================================================
            // โหมดแก้ไข — สลับมาจากโหมดดูรายละเอียด
            // ============================================================
            <div className="px-5 pb-8 space-y-4">

              {/* รูปสัตว์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">รูปสัตว์เลี้ยง</p>
                <div className="w-full h-36 rounded-2xl overflow-hidden bg-rose-50 flex items-center justify-center">
                  {พรีวิว ? (
                    <img src={พรีวิว} alt="รูปใหม่ (พรีวิว)" className="w-full h-full object-contain" />
                  ) : โพสต์.photo_url ? (
                    <img src={โพสต์.photo_url} alt={โพสต์.pet_name} className="w-full h-full object-contain" />
                  ) : (
                    <AnimalIcon ชนิด={ชนิด} size={56} className="text-rose-300" />
                  )}
                </div>
                <input ref={inputรูป} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={เลือกรูป} />
                <button onClick={() => inputรูป.current.click()}
                  className="w-full mt-2 flex items-center justify-center gap-2 border-2 border-dashed border-rose-300 rounded-xl py-2.5 text-sm font-medium text-rose-600 bg-rose-50/50">
                  <Camera size={16} className="shrink-0" /> {พรีวิว || โพสต์.photo_url ? 'เปลี่ยนรูป' : 'อัปโหลดรูป'}
                </button>
              </div>

              {/* ชื่อสัตว์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">ชื่อสัตว์เลี้ยง <span className="text-red-400">*</span></p>
                <input value={ชื่อสัตว์} onChange={(e) => setชื่อสัตว์(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
              </div>

              {/* ประเภท */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">ประเภทสัตว์ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['สุนัข', 'แมว'].map(function (v) {
                    return (
                      <button key={v} onClick={() => setชนิด(v)}
                        className={`flex-1 py-2.5 rounded-xl text-sm font-medium border-2 flex items-center justify-center gap-1.5 ${
                          ชนิด === v ? 'border-rose-500 bg-rose-50 text-rose-700' : 'border-gray-200 text-gray-600'
                        }`}>
                        <AnimalIcon ชนิด={v} size={18} className="shrink-0" /> {v}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* สายพันธุ์ + ลักษณะ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">สายพันธุ์</p>
                <input value={สายพันธุ์} onChange={(e) => setSายพันธุ์(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">ลักษณะเด่น</p>
                <textarea value={ลักษณะ} onChange={(e) => setลักษณะ(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400 resize-none" />
              </div>

              {/* สถานที่ + วันที่ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">สถานที่ที่หาย <span className="text-red-400">*</span></p>
                <input value={สถานที่หาย} onChange={(e) => setSถานที่หาย(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">วันที่หาย</p>
                <input type="date" value={วันที่หาย} onChange={(e) => setวันที่หาย(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none focus:border-rose-400" />
              </div>

              {/* เบอร์ติดต่อ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5">เบอร์ติดต่อกลับ <span className="text-red-400">*</span></p>
                <input type="tel" inputMode="numeric" value={เบอร์ติดต่อ} onChange={(e) => setเบอร์ติดต่อ(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
              </div>

              {/* เงินรางวัล */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1.5">
                  <Gift size={14} className="text-amber-500" /> เงินรางวัลสำหรับผู้พบเบาะแส (ถ้ามี)
                </p>
                <div className="relative">
                  <input type="number" min="0" inputMode="numeric" value={เงินรางวัล}
                    onChange={(e) => setเงินรางวัล(e.target.value)}
                    placeholder="เช่น 1000"
                    className="w-full border border-gray-200 rounded-xl pl-4 pr-12 py-2.5 text-sm focus:outline-none focus:border-rose-400" />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-gray-400">บาท</span>
                </div>
              </div>

              {error && (
                <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2">{error}</p>
              )}

              {/* ปุ่มบันทึก/ยกเลิกการแก้ไข */}
              <div className="flex gap-2 pt-1">
                <button onClick={ปิดโหมดแก้ไข} disabled={กำลังบันทึก}
                  className="flex-1 border-2 border-gray-200 text-gray-600 rounded-xl py-3 text-sm font-medium disabled:opacity-50">
                  ยกเลิก
                </button>
                <button onClick={บันทึกแก้ไข} disabled={กำลังบันทึก}
                  className="flex-[2] bg-rose-500 text-white rounded-xl py-3 text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2">
                  {กำลังบันทึก
                    ? <><Loader2 size={15} className="animate-spin shrink-0" /> กำลังบันทึก...</>
                    : <><Save size={15} className="shrink-0" /> บันทึกการแก้ไข</>}
                </button>
              </div>
            </div>
          ) : (
            // ============================================================
            // โหมดดูรายละเอียด
            // ============================================================
            <div className="px-5 pb-8 space-y-4">

              {/* รูปสัตว์ */}
              <div className="relative w-full h-36 rounded-2xl overflow-hidden bg-rose-50 flex items-center justify-center">
                {โพสต์.photo_url
                  ? <img src={โพสต์.photo_url} alt={โพสต์.pet_name} className="w-full h-full object-contain" />
                  : <AnimalIcon ชนิด={โพสต์.species || โพสต์.breed} size={56} className="text-rose-300" />}

                {/* ป้ายเงินรางวัล — ลอยเด่นบนรูปด้านบน ให้เห็นก่อนอย่างอื่นทั้งหมด */}
                {มีรางวัล && (
                  <span className="absolute top-2 right-2 inline-flex items-center gap-1.5 text-sm font-extrabold px-3 py-1.5 rounded-full shadow-lg bg-amber-400 text-amber-900 animate-pulse">
                    <Gift size={15} className="shrink-0" /> ฿{Number(โพสต์.reward_amount).toLocaleString('th-TH')}
                  </span>
                )}
              </div>

              {/* ชื่อ + สถานะ */}
              <div className="flex items-center justify-between gap-2">
                <p className="font-bold text-gray-800 text-lg truncate min-w-0">{โพสต์.pet_name}</p>
                <span className="text-xs px-3 py-1.5 rounded-full font-semibold whitespace-nowrap shrink-0 bg-rose-100 text-rose-700">
                  สัตว์สูญหาย
                </span>
              </div>

              {/* ข้อมูลพื้นฐาน — แยกทุกฟิลด์ให้เห็นชัด ไม่รวมกันเป็นบรรทัดเดียว */}
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-gray-400">ประเภทสัตว์</p>
                  <p className="text-sm font-medium text-gray-800">{โพสต์.species || 'ไม่ระบุ'}</p>
                </div>
                <div className="bg-gray-50 rounded-xl px-3 py-2">
                  <p className="text-[11px] text-gray-400">สายพันธุ์</p>
                  <p className="text-sm font-medium text-gray-800">{โพสต์.breed || 'ไม่ระบุ'}</p>
                </div>
              </div>

              {/* เงินรางวัล */}
              {มีรางวัล && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 flex items-start gap-2">
                  <Gift size={16} className="shrink-0 mt-0.5 text-amber-500" />
                  <p className="text-sm text-amber-700">
                    เจ้าของเสนอเงินรางวัล <span className="font-bold">฿{Number(โพสต์.reward_amount).toLocaleString('th-TH')}</span> สำหรับผู้ที่ช่วยตามหาจนเจอ
                  </p>
                </div>
              )}

              {/* ลักษณะเด่น */}
              {โพสต์.traits && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">ลักษณะเด่น</p>
                  <p className="text-sm text-gray-700">{โพสต์.traits}</p>
                </div>
              )}

              {/* สถานที่ + วันที่หาย + เบอร์ติดต่อ */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1 flex items-center gap-1.5"><MapPin size={12} className="shrink-0" /> สถานที่ที่หาย</p>
                  <p className="text-sm font-semibold text-gray-800">{โพสต์.lost_location || 'ไม่ระบุ'}</p>
                </div>
                <p className="text-xs text-gray-400 flex items-center gap-1.5"><Calendar size={12} className="shrink-0" /> หายเมื่อ {วันที่สั้น(โพสต์.lost_date || โพสต์.created_at)}</p>
                {โพสต์.contact_phone && (
                  <p className="text-xs text-gray-400 flex items-center gap-1.5"><Phone size={12} className="shrink-0" /> เบอร์ติดต่อกลับ {โพสต์.contact_phone}</p>
                )}
              </div>

              {/* ปุ่มติดต่อ — เฉพาะคนอื่นที่ไม่ใช่เจ้าของโพสต์ */}
              {!เป็นเจ้าของ && (
                <a href={`tel:${โพสต์.contact_phone}`}
                  className="w-full bg-rose-500 text-white rounded-2xl py-3.5 font-bold text-base flex items-center justify-center gap-2 active:scale-95 transition-all">
                  <Phone size={18} className="shrink-0" /> โทรติดต่อเจ้าของ
                </a>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal ยืนยันลบ */}
      {แสดงยืนยันลบ && (
        <div className="fixed inset-0 bg-black/60 z-[60] flex items-end" onClick={() => setแสดงยืนยันลบ(false)}>
          <div className="bg-white w-full rounded-t-3xl px-5 pt-4 pb-8" onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center mb-3"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>

            <div className="text-center mb-5">
              <Ban size={40} strokeWidth={1.5} className="text-red-400 mx-auto mb-2" />
              <h2 className="text-lg font-bold text-gray-800">ลบประกาศนี้?</h2>
              <p className="text-sm text-gray-500 mt-1">
                ประกาศตามหา "{โพสต์.pet_name}" จะถูกลบออกจากระบบถาวร และคนอื่นจะไม่เห็นประกาศนี้อีก
              </p>
            </div>

            {error && (
              <p className="text-red-500 text-xs bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
            )}

            <button onClick={ลบโพสต์} disabled={กำลังลบ}
              className="w-full bg-red-500 text-white rounded-xl py-3.5 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2">
              {กำลังลบ
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังลบ...</>
                : <><Trash2 size={18} className="shrink-0" /> ยืนยัน ลบประกาศ</>}
            </button>
            <button onClick={() => setแสดงยืนยันลบ(false)} disabled={กำลังลบ}
              className="w-full mt-2 border-2 border-gray-200 text-gray-600 rounded-xl py-3 font-medium text-sm disabled:opacity-50">
              ไม่ ขอคิดดูก่อน
            </button>
          </div>
        </div>
      )}
    </>
  )
}

// ================================================================
// หน้าหลัก
// ================================================================
function LostAndFoundPage({ user }) {
  const navigate = useNavigate()

  const [แท็บ, setแท็บ] = useState('found')   // 'found' = ศูนย์พบ, 'lost' = ตามหา
  const [สัตว์ที่ศูนย์พบ, setSัตว์ที่ศูนย์พบ] = useState([])
  const [โพสต์ตามหา,     setโพสต์ตามหา]     = useState([])
  const [กำลังโหลด,      setกำลังโหลด]      = useState(true)
  const [แสดงฟอร์ม,      setแสดงฟอร์ม]      = useState(false)
  const [สัตว์ที่เลือก,   setSัตว์ที่เลือก]   = useState(null)  // การ์ดที่กดในแท็บศูนย์พบ → เปิด modal
  const [โพสต์ที่ดู,      setโพสต์ที่ดู]      = useState(null)  // การ์ดที่กดในแท็บตามหา → เปิดดูรายละเอียด (แก้ไข/ลบได้ถ้าเป็นเจ้าของ)
  const [toast,           setToast]           = useState('')

  // โหลดครั้งแรกตอนเข้าหน้า — ใส่ธงยกเลิกกัน setState หลัง component ถูก unmount ไปแล้ว
  useEffect(function () {
    let ยกเลิก = false
    โหลดรายการ().then(function (ผล) {
      if (ยกเลิก) return
      setSัตว์ที่ศูนย์พบ(ผล.found)
      setโพสต์ตามหา(ผล.lost)
      setกำลังโหลด(false)
    })
    return function () { ยกเลิก = true }
  }, [])

  // โหลดซ้ำหลังโพสต์ประกาศใหม่
  async function รีเฟรช() {
    setกำลังโหลด(true)
    const ผล = await โหลดรายการ()
    setSัตว์ที่ศูนย์พบ(ผล.found)
    setโพสต์ตามหา(ผล.lost)
    setกำลังโหลด(false)
  }

  function โพสต์สำเร็จ() {
    setแสดงฟอร์ม(false)
    setแท็บ('lost')
    setToast('โพสต์ประกาศตามหาเรียบร้อยแล้ว')
    setTimeout(() => setToast(''), 3000)
    รีเฟรช()
  }

  // แก้ไขในโหมด view/edit เดียวกัน — อัปเดตทั้ง list และ modal ที่เปิดอยู่ ไม่ต้อง refetch ใหม่ทั้งหมด
  function โพสต์แก้ไขสำเร็จ(อัปเดตแล้ว) {
    setโพสต์ตามหา(function (prev) { return prev.map((p) => (p.id === อัปเดตแล้ว.id ? อัปเดตแล้ว : p)) })
    setโพสต์ที่ดู(อัปเดตแล้ว)
    setToast('บันทึกการแก้ไขเรียบร้อยแล้ว')
    setTimeout(() => setToast(''), 3000)
  }

  function โพสต์ลบสำเร็จ(id) {
    setโพสต์ตามหา(function (prev) { return prev.filter((p) => p.id !== id) })
    setโพสต์ที่ดู(null)
    setToast('ลบประกาศแล้ว')
    setTimeout(() => setToast(''), 3000)
  }

  const รายการที่แสดง = แท็บ === 'found' ? สัตว์ที่ศูนย์พบ : โพสต์ตามหา

  return (
    <div className="min-h-screen bg-rose-50 pb-24">

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <CheckCircle2 size={16} className="shrink-0" /> {toast}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ประกาศสัตว์หาย / พลัดหลง</h1>
          <p className="text-gray-500 text-xs">ตามหาเจ้าของ และตามหาสัตว์เลี้ยงที่หายไป</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          {[
            { key: 'found', label: 'ศูนย์พบสัตว์พลัดหลง', count: สัตว์ที่ศูนย์พบ.length },
            { key: 'lost',  label: 'ตามหาสัตว์เลี้ยง',     count: โพสต์ตามหา.length },
          ].map(function (tab) {
            const active = แท็บ === tab.key
            return (
              <button key={tab.key} onClick={() => setแท็บ(tab.key)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
                  active ? 'bg-white text-rose-700 shadow-sm' : 'text-gray-500'
                }`}
              >
                {tab.label}
                <span className={`text-xs font-bold ${active ? 'text-rose-500' : 'text-gray-400'}`}>({tab.count})</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* คำอธิบายของแต่ละแท็บ */}
      <div className="px-4 pt-3">
        <div className="bg-white border border-rose-100 rounded-xl px-4 py-2.5">
          <p className="text-xs text-gray-500">
            {แท็บ === 'found'
              ? 'สัตว์ที่เจ้าหน้าที่เก็บได้และกำลังประกาศตามหาเจ้าของ — ถ้าใช่สัตว์ของคุณ กดเพื่อดูรายละเอียดและติดต่อศูนย์'
              : 'ประกาศจากประชาชนที่สัตว์เลี้ยงหาย — ถ้าคุณพบเห็น กรุณาติดต่อเจ้าของตามเบอร์ในประกาศ'}
          </p>
        </div>
      </div>

      {/* Loading */}
      {กำลังโหลด && (
        <div className="text-center py-16">
          <Loader2 size={32} className="animate-spin text-rose-400 mx-auto mb-2" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      )}

      {/* Empty */}
      {!กำลังโหลด && รายการที่แสดง.length === 0 && (
        <div className="text-center py-16 px-6">
          {แท็บ === 'found'
            ? <PawPrint size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
            : <HeartCrack size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />}
          <p className="font-medium text-gray-600">
            {แท็บ === 'found' ? 'ยังไม่มีสัตว์ที่กำลังตามหาเจ้าของ' : 'ยังไม่มีประกาศตามหาสัตว์เลี้ยง'}
          </p>
          <p className="text-xs text-gray-400 mt-1">
            {แท็บ === 'found'
              ? 'เมื่อเจ้าหน้าที่ประกาศตามหาเจ้าของ จะแสดงที่นี่'
              : 'ถ้าสัตว์เลี้ยงของคุณหาย กดปุ่มด้านล่างเพื่อโพสต์ประกาศ'}
          </p>
        </div>
      )}

      {/* Grid การ์ด */}
      {!กำลังโหลด && รายการที่แสดง.length > 0 && (
        <div className="px-4 pt-4 grid grid-cols-2 gap-3">
          {แท็บ === 'found'
            ? สัตว์ที่ศูนย์พบ.map(function (a) {
                return (
                  <การ์ดประกาศ
                    key={a.key}
                    รูป={a.รูป}
                    ชนิด={a.ชนิด}
                    ชื่อ={a.ชื่อ}
                    สถานที่={a.สถานที่}
                    วันที่={a.วันที่}
                    ป้าย={a.ที่ศูนย์ ? 'อยู่ในการดูแลของศูนย์' : 'กำลังตามหาเจ้าของ'}
                    สีป้าย={a.ที่ศูนย์ ? 'bg-teal-500 text-white' : 'bg-amber-500 text-white'}
                    PIcon={a.ที่ศูนย์ ? Home : Megaphone}
                    ข้อมูลรอง={a.รหัส}
                    onClick={() => setSัตว์ที่เลือก(a)}
                  />
                )
              })
            : โพสต์ตามหา.map(function (p) {
                const เป็นเจ้าของโพสต์ = !!user?.id && p.owner_id === user.id
                return (
                  <การ์ดประกาศ
                    key={p.id}
                    รูป={p.photo_url}
                    ชนิด={p.species || p.breed}
                    ชื่อ={p.pet_name}
                    สถานที่={p.lost_location}
                    วันที่={p.lost_date || p.created_at}
                    ป้าย={เป็นเจ้าของโพสต์ ? 'ประกาศของคุณ' : 'สัตว์สูญหาย'}
                    สีป้าย={เป็นเจ้าของโพสต์ ? 'bg-blue-500 text-white' : 'bg-rose-500 text-white'}
                    PIcon={เป็นเจ้าของโพสต์ ? Pencil : Search}
                    ข้อมูลรอง={[p.species, p.breed].filter(Boolean).join(' · ')}
                    รางวัล={p.reward_amount}
                    onClick={() => setโพสต์ที่ดู(p)}
                  />
                )
              })}
        </div>
      )}

      {/* ปุ่มลอยแจ้งสัตว์หาย */}
      <button
        onClick={() => setแสดงฟอร์ม(true)}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30 bg-rose-500 text-white rounded-full pl-5 pr-6 py-3.5 shadow-lg flex items-center gap-2 font-bold text-sm active:scale-95 transition-all"
      >
        <Megaphone size={18} className="shrink-0" /> แจ้งสัตว์เลี้ยงสูญหาย
      </button>

      {/* Modal ฟอร์มโพสต์ใหม่ */}
      {แสดงฟอร์ม && (
        <Modalแจ้งสัตว์หาย
          user={user}
          onClose={() => setแสดงฟอร์ม(false)}
          onSaved={โพสต์สำเร็จ}
        />
      )}

      {/* Modal รายละเอียดสัตว์ที่ศูนย์พบ */}
      {สัตว์ที่เลือก && (
        <FoundPetDetailModal
          สัตว์={สัตว์ที่เลือก}
          onClose={() => setSัตว์ที่เลือก(null)}
        />
      )}

      {/* Modal รายละเอียดโพสต์ตามหา — แก้ไข/ลบได้ถ้าเป็นเจ้าของ, ปุ่มโทรถ้าเป็นคนอื่น */}
      {โพสต์ที่ดู && (
        <LostPetDetailModal
          โพสต์={โพสต์ที่ดู}
          user={user}
          onClose={() => setโพสต์ที่ดู(null)}
          onSaved={โพสต์แก้ไขสำเร็จ}
          onDeleted={โพสต์ลบสำเร็จ}
        />
      )}
    </div>
  )
}

export default LostAndFoundPage
