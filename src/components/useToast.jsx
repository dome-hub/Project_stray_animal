// useToast.jsx — toast กลางที่ใช้ได้ทุกหน้า แทน alert() ของเบราว์เซอร์
//
// เดิมทั้งแอปมี alert() 29 จุด ในบิลด์ Capacitor สิ่งนี้จะขึ้นเป็น system dialog
// ที่มีชื่อ origin ของแอปเป็นหัวเรื่อง — ซึ่งเป็นลายเซ็นทางสายตาของ "แอปพัง" พอดี
// และมันบล็อกทั้งจอจนกว่าจะกดปิด ซึ่งเกินความจำเป็นสำหรับการยืนยันว่าบันทึกแล้ว
//
// รูปแบบ toast อิงจากที่ VolunteerPage ทำไว้อยู่แล้ว (กล่องเทาเข้มลอยบนสุดกลางจอ)
// เพิ่มมาสองอย่าง: แยกสีตอนเป็น error ให้เห็นชัดว่าไม่ใช่ข้อความยืนยัน
// และ aria-live เพื่อให้ screen reader อ่านออกเสียงเมื่อข้อความเปลี่ยน
//
// ใช้เป็น hook ไม่ใช่ context เพราะแต่ละหน้าคุม toast ของตัวเองอยู่แล้ว
// ไม่ต้องแตะ App.jsx และไม่ทำให้ทั้งแอป re-render เวลามี toast เด้ง

import { useState, useRef, useCallback, useEffect } from 'react'
import { CircleAlert, CircleCheck } from 'lucide-react'

const เวลาแสดง = { success: 3500, error: 5000 }  // error ให้เวลาอ่านนานกว่า

export function useToast() {
  const [ข้อความ, setข้อความ] = useState(null)   // { text, kind }
  const ตัวจับเวลา = useRef(null)

  const ล้างเวลา = useCallback(function () {
    if (ตัวจับเวลา.current) clearTimeout(ตัวจับเวลา.current)
  }, [])

  // เก็บกวาด timer ตอน unmount กัน setState หลัง component ตายแล้ว
  useEffect(function () { return ล้างเวลา }, [ล้างเวลา])

  const แสดง = useCallback(function (text, kind = 'success') {
    ล้างเวลา()
    setข้อความ({ text, kind })
    ตัวจับเวลา.current = setTimeout(() => setข้อความ(null), เวลาแสดง[kind] || 3500)
  }, [ล้างเวลา])

  const toast      = useCallback((text) => แสดง(text, 'success'), [แสดง])
  const toastError = useCallback((text) => แสดง(text, 'error'), [แสดง])

  function ToastHost() {
    // aria-live ต้องอยู่ใน DOM ตลอด ไม่ใช่ mount ตอนมีข้อความ ไม่งั้น screen reader ไม่ประกาศ
    return (
      <div
        className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] px-4 w-full max-w-sm pointer-events-none"
        role="status"
        aria-live="polite"
      >
        {ข้อความ && (
          <div
            className={`flex items-start gap-2.5 text-sm px-4 py-3 rounded-2xl shadow-xl text-white ${
              ข้อความ.kind === 'error' ? 'bg-red-600' : 'bg-gray-800'
            }`}
          >
            {ข้อความ.kind === 'error'
              ? <CircleAlert size={17} className="shrink-0 mt-0.5" />
              : <CircleCheck size={17} className="shrink-0 mt-0.5" />}
            <span className="leading-relaxed">{ข้อความ.text}</span>
          </div>
        )}
      </div>
    )
  }

  return { toast, toastError, ToastHost }
}
