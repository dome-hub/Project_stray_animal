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
} from 'lucide-react'
import { supabase } from '../supabase'
import { ตรวจสอบไฟล์รูปภาพ } from '../utils/fileValidation'
import AnimalIcon from '../components/AnimalIcon'

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
      .select('id, animal_type, image_url, location_text, created_at')
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

  const found = [
    // 1) เข้าศูนย์แล้ว แต่ยังตามหาเจ้าของเดิม
    ...สัตว์ในศูนย์.map(function (a) {
      const มีชื่อ = a.name && a.name !== 'ยังไม่ตั้งชื่อ'
      const รูปทั้งหมด = (Array.isArray(a.photos) ? a.photos : []).filter(Boolean)
      if (รูปทั้งหมด.length === 0 && a.photo_url) รูปทั้งหมด.push(a.photo_url)
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
        สถานที่:  a.location,
        วันที่:    a.created_at,
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

// ================================================================
// การ์ดแสดงผล — ใช้ร่วมกันทั้ง 2 แท็บ ต่างกันแค่ป้าย tag กับสี
// ================================================================
function การ์ดประกาศ({ รูป, ชนิด, ชื่อ, สถานที่, วันที่, ป้าย, สีป้าย, PIcon, ข้อมูลรอง, onClick }) {
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

          {/* ข้อมูลการพบเจอ */}
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <MapPin size={16} className="shrink-0 mt-0.5 text-gray-400" />
              <span>{สัตว์.สถานที่ || 'ไม่ระบุตำแหน่งที่พบ'}</span>
            </div>
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <Calendar size={16} className="shrink-0 mt-0.5 text-gray-400" />
              <span>{ที่ศูนย์ ? 'วันที่รับเข้าศูนย์' : 'วันที่แจ้งพบ'} {วันที่สั้น(สัตว์.วันที่)}</span>
            </div>
          </div>

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
                return (
                  <การ์ดประกาศ
                    key={p.id}
                    รูป={p.photo_url}
                    ชนิด={p.species || p.breed}
                    ชื่อ={p.pet_name}
                    สถานที่={p.lost_location}
                    วันที่={p.lost_date || p.created_at}
                    ป้าย="สัตว์สูญหาย"
                    สีป้าย="bg-rose-500 text-white"
                    PIcon={Search}
                    ข้อมูลรอง={[p.species, p.breed].filter(Boolean).join(' · ')}
                    onClick={() => { if (p.contact_phone) window.location.href = `tel:${p.contact_phone}` }}
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

      {/* Modal ฟอร์ม */}
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
    </div>
  )
}

export default LostAndFoundPage
