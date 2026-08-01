// BreedInput.jsx — ช่องกรอกสายพันธุ์ พร้อม autocomplete จาก breeds.js
//
// เดิมหน้าแจ้งเหตุ (ReportAnimal) มี autocomplete แต่ฟอร์มฝั่งเจ้าหน้าที่ (VolunteerPage)
// เป็นช่องพิมพ์อิสระล้วนๆ ชื่อพันธุ์ของสัตว์ตัวเดียวกันเลยไม่ตรงกันระหว่างสองหน้า
// ("หมาไทย" vs "ไทยหลังอาน") ทำให้ค้นหา/กรองตามพันธุ์พลาด
// แยกมาเป็น component เดียวให้ทุกหน้าใช้ร่วมกัน กันไม่ให้หลุดกันอีก
//
// ยังพิมพ์ชื่อนอกรายการได้ตามเดิม — dropdown เป็นตัวช่วย ไม่ใช่ตัวบังคับ
// (เจ้าหน้าที่เจอพันธุ์ที่โมเดลไม่รู้จักได้จริง)

import { useState } from 'react'
import { สายพันธุ์ทั้งหมด } from '../data/breeds'

// จำนวนตัวเลือกสูงสุดใน dropdown — เท่ากับที่ ReportAnimal ใช้เดิม
const จำนวนตัวเลือกสูงสุด = 6

const ธีม = {
  orange: { ขอบ: 'focus:border-orange-400', hover: 'hover:bg-orange-50' },
  teal:   { ขอบ: 'focus:border-teal-400',   hover: 'hover:bg-teal-50' },
}

function BreedInput({ value, onChange, onSelect, placeholder, สี = 'teal', className }) {
  const [แสดงตัวเลือก, setแสดงตัวเลือก] = useState(false)
  const t = ธีม[สี] || ธีม.teal

  function เลือกจากรายการ(b) {
    onChange(b.ชื่อไทย)
    if (onSelect) onSelect(b)   // ให้หน้าที่เรียกใช้ auto-fill ขนาด/นิสัย ต่อได้
    setแสดงตัวเลือก(false)
  }

  const คำค้น = (value || '').trim().toLowerCase()
  const ที่ตรงกัน = คำค้น === ''
    ? []
    : สายพันธุ์ทั้งหมด
        .filter((b) => b.ชื่อไทย.toLowerCase().includes(คำค้น) || b.id.toLowerCase().includes(คำค้น))
        .slice(0, จำนวนตัวเลือกสูงสุด)

  return (
    <div className="relative">
      <input
        type="text"
        value={value || ''}
        onChange={(e) => { onChange(e.target.value); setแสดงตัวเลือก(true) }}
        onFocus={() => setแสดงตัวเลือก(true)}
        // หน่วงก่อนซ่อน ไม่งั้น blur จะยิงก่อน onMouseDown ของปุ่มในรายการ → เลือกไม่ติด
        onBlur={() => setTimeout(() => setแสดงตัวเลือก(false), 150)}
        placeholder={placeholder}
        autoComplete="off"
        className={className || `w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none ${t.ขอบ}`}
      />

      {แสดงตัวเลือก && ที่ตรงกัน.length > 0 && (
        <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden">
          {ที่ตรงกัน.map((b) => (
            <button
              key={b.id}
              type="button"
              onMouseDown={() => เลือกจากรายการ(b)}
              className={`w-full text-left px-3 py-2 text-sm ${t.hover} flex items-center justify-between`}
            >
              <span>{b.ชื่อไทย}</span>
              <span className="text-xs text-gray-400">{b.ประเภท} · {b.ขนาด}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default BreedInput
