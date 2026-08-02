// LoadFailed.jsx — สถานะ "โหลดข้อมูลไม่สำเร็จ" พร้อมปุ่มลองใหม่
//
// เดิมทุก fetcher เขียนแบบ `if (data) setX(data)` แล้วทิ้ง error ไป พอเน็ตหลุด
// รายการจะว่าง แล้วตกไปที่ empty state ที่เป็นไอคอนฉลอง "ไม่มีงานที่ต้องดำเนินการในขณะนี้"
// เจ้าหน้าที่ภาคสนามในจุดอับสัญญาณอ่านว่าเคลียร์งานหมดแล้ว ทั้งที่ยังมีเคสค้างอยู่ในคิว
//
// "ไม่มีข้อมูล" กับ "อ่านข้อมูลไม่ได้" จึงต้องหน้าตาไม่เหมือนกันเลย และเส้นทางกลับ
// ต้องอยู่ตรงนั้น ไม่ใช่ให้ผู้ใช้เดาว่าต้องปิดแอปเปิดใหม่

import { useState } from 'react'
import { WifiOff, ServerCrash, RotateCw, Loader2 } from 'lucide-react'

const ธีม = {
  teal:   { ปุ่ม: 'bg-teal-600 active:bg-teal-700',     วง: 'bg-teal-50 text-teal-600' },
  purple: { ปุ่ม: 'bg-purple-600 active:bg-purple-700', วง: 'bg-purple-50 text-purple-600' },
  orange: { ปุ่ม: 'bg-orange-500 active:bg-orange-600', วง: 'bg-orange-50 text-orange-600' },
}

function LoadFailed({ onRetry, สิ่งที่โหลด = 'ข้อมูล', สี = 'teal' }) {
  const [กำลังลอง, setกำลังลอง] = useState(false)
  const t = ธีม[สี] || ธีม.teal

  // navigator.onLine บอกได้แน่ชัดแค่ตอน "ไม่ได้ต่อเน็ตแน่ๆ" — ต่ออยู่แต่เซิร์ฟเวอร์ล่มก็ยังเป็น true
  // จึงแยกข้อความสองแบบ ไม่เดาแทนผู้ใช้ว่าปัญหาอยู่ฝั่งไหน
  const ออฟไลน์ = typeof navigator !== 'undefined' && navigator.onLine === false
  const Icon = ออฟไลน์ ? WifiOff : ServerCrash

  async function ลองใหม่() {
    if (กำลังลอง) return
    setกำลังลอง(true)
    try { await onRetry() } finally { setกำลังลอง(false) }
  }

  return (
    <div className="text-center py-12 px-6" role="alert">
      <div className={`w-14 h-14 rounded-full ${t.วง} flex items-center justify-center mx-auto mb-4`}>
        <Icon size={26} strokeWidth={1.75} />
      </div>

      <p className="font-semibold text-gray-800">
        {ออฟไลน์ ? 'ไม่ได้เชื่อมต่ออินเทอร์เน็ต' : `โหลด${สิ่งที่โหลด}ไม่สำเร็จ`}
      </p>
      <p className="text-sm text-gray-600 mt-1.5 max-w-xs mx-auto leading-relaxed">
        {ออฟไลน์
          ? `ตอนนี้ยังอ่าน${สิ่งที่โหลด}ไม่ได้ ตรวจสอบสัญญาณอินเทอร์เน็ตแล้วกดลองใหม่`
          : `เชื่อมต่อระบบไม่ได้ชั่วคราว ${สิ่งที่โหลด}ที่ค้างอยู่ยังอยู่ครบ กดลองใหม่ได้เลย`}
      </p>

      {/* ปุ่มสูง 44px เต็มตามขั้นต่ำของพื้นที่กดบนมือถือ — ใช้มือเดียวกลางแดดต้องกดติดตั้งแต่ครั้งแรก */}
      <button
        onClick={ลองใหม่}
        disabled={กำลังลอง}
        className={`mt-5 inline-flex items-center justify-center gap-2 ${t.ปุ่ม} text-white rounded-xl px-6 min-h-[44px] font-medium shadow-sm transition-colors disabled:opacity-70`}
      >
        {กำลังลอง
          ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังลองใหม่...</>
          : <><RotateCw size={16} className="shrink-0" /> ลองใหม่</>}
      </button>
    </div>
  )
}

export default LoadFailed
