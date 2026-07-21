// UrgentLostPetsBanner.jsx — แถบแจ้งเตือน "สัตว์หายด่วน" แบบกะทัดรัด (ad-style) บนหน้า Home
// ดึงโพสต์ตามหาสัตว์เลี้ยงจริงจากตาราง lost_pets (status = 'กำลังตามหา')
// เป้าหมาย: ให้คนเปิดแอปเห็นสัตว์หาย + เงินรางวัลทันที เพิ่มโอกาสพบเบาะแสแบบ real-time
// ถ้าไม่มีสัตว์หายในระบบ → ซ่อนอัตโนมัติ

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Siren, MapPin, Calendar, ChevronRight, Gift } from 'lucide-react'
import { supabase } from '../supabase'
import AnimalIcon from './AnimalIcon'

// วันที่แบบสั้น มีปี พ.ศ. เช่น "21 ก.ค. 2569"
function วันที่สั้น(str) {
  if (!str) return 'ไม่ระบุ'
  return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
}

// โหลดโพสต์ตามหาล่าสุด — แยกนอก component เพราะไม่ได้ใช้ state ใดๆ
// คืนค่าเฉยๆ ไม่ setState เอง (กัน lint react-hooks/set-state-in-effect)
async function โหลดสัตว์หายด่วน() {
  const { data, error } = await supabase
    .from('lost_pets')
    .select('id, pet_name, species, breed, lost_location, lost_date, photo_url, reward_amount, created_at')
    .eq('status', 'กำลังตามหา')
    .order('created_at', { ascending: false })
    .limit(10)
  if (error) { console.error('ดึงสัตว์หายด่วนไม่สำเร็จ:', error.message); return [] }
  return data || []
}

function UrgentLostPetsBanner() {
  const navigate = useNavigate()
  const [รายการ, setรายการ] = useState([])

  useEffect(function () {
    let ยกเลิก = false
    โหลดสัตว์หายด่วน().then(function (ผล) { if (!ยกเลิก) setรายการ(ผล) })
    return function () { ยกเลิก = true }
  }, [])

  // ไม่มีสัตว์หาย → ไม่แสดงอะไรเลย
  if (รายการ.length === 0) return null

  const หลายตัว = รายการ.length > 1

  return (
    <div className="mt-4">

      {/* หัวข้อกะทัดรัด บอกว่านี่คือประกาศอะไร */}
      <div className="flex items-center gap-1.5 px-4 mb-1.5">
        <Siren size={14} className="text-orange-500 shrink-0" />
        <p className="text-xs font-bold text-orange-700">ประกาศสัตว์หายใกล้คุณ</p>
        <span className="ml-auto text-[11px] font-semibold text-orange-400">{รายการ.length} รายการ</span>
      </div>

      {/* Carousel เลื่อนปัดซ้าย-ขวา — ถ้ามีหลายตัว การ์ดถัดไปจะโผล่ให้เห็นเล็กน้อย */}
      <div className="flex gap-2.5 overflow-x-auto pb-1 px-4 snap-x snap-mandatory">
      {รายการ.map(function (p) {
        const มีรางวัล = p.reward_amount > 0
        return (
          <button
            key={p.id}
            onClick={() => navigate(`/lost-found?open=${p.id}`)}
            className={`snap-start shrink-0 ${หลายตัว ? 'w-[88%]' : 'w-full'}
              flex items-center gap-3 bg-orange-50 border border-orange-200 rounded-2xl p-3 shadow-sm
              cursor-pointer active:scale-[0.98] transition-transform text-left`}
          >
            {/* ซ้าย: รูปสัตว์ + ป้าย "ด่วน" */}
            <div className="relative w-14 h-14 rounded-xl overflow-hidden bg-white flex items-center justify-center shrink-0">
              {p.photo_url
                ? <img src={p.photo_url} alt={p.pet_name} className="w-full h-full object-cover" />
                : <AnimalIcon ชนิด={p.species || p.breed} size={26} className="text-orange-300" />}
              <span className="absolute top-0 left-0 bg-red-500 text-white text-[8px] font-bold px-1.5 py-0.5 rounded-br-lg flex items-center gap-0.5">
                <Siren size={8} className="shrink-0" /> ด่วน
              </span>
            </div>

            {/* กลาง: ข้อมูลชิดกัน */}
            <div className="min-w-0 flex-1 leading-tight">
              <p className="font-bold text-gray-800 text-sm truncate">{p.pet_name}</p>
              <p className="text-[11px] text-gray-500 flex items-center gap-0.5 truncate">
                <MapPin size={10} className="shrink-0" />
                <span className="truncate">{p.lost_location || 'ไม่ระบุ'}</span>
              </p>
              <p className="text-[11px] text-gray-400 flex items-center gap-0.5 truncate">
                <Calendar size={10} className="shrink-0" />
                <span className="truncate">หาย {วันที่สั้น(p.lost_date || p.created_at)}</span>
              </p>
            </div>

            {/* ขวา: เงินรางวัล (เด่นสุด) + ลูกศร */}
            <div className="flex items-center gap-1 shrink-0">
              {มีรางวัล && (
                <div className="text-right">
                  <p className="text-[9px] font-semibold text-amber-500 leading-none">รางวัล</p>
                  <p className="text-base font-extrabold text-amber-600 leading-tight flex items-center gap-0.5">
                    <Gift size={14} className="shrink-0" /> ฿{Number(p.reward_amount).toLocaleString('th-TH')}
                  </p>
                </div>
              )}
              <ChevronRight size={18} className="text-orange-400 shrink-0" />
            </div>
          </button>
        )
      })}
      </div>
    </div>
  )
}

export default UrgentLostPetsBanner
