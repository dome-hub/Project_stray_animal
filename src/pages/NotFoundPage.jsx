// NotFoundPage.jsx — หน้าที่แสดงเมื่อ URL ไม่ตรงกับ route ไหนเลย
//
// เดิมแอปไม่มี catch-all route: พิมพ์ /admin (ซึ่งเป็นสิ่งที่คนพิมพ์เองโดยธรรมชาติ
// เมื่อเห็น /admin/users) ได้หน้าขาวสนิท ไม่มีตัวอักษรสักตัว ไม่มีทางกลับ
// ในบิลด์ Capacitor deep link หรือ state ที่เพี้ยนก็มาโผล่ตรงนี้ได้เหมือนกัน
//
// ปลายทางของปุ่มขึ้นกับว่าล็อกอินอยู่หรือยัง — ส่งคนที่ยังไม่ล็อกอินไปหน้าแรกสาธารณะ
// ส่งคนที่ล็อกอินแล้วกลับเข้าเมนูงานของตัวเอง แทนที่จะเด้งออกไปหน้า landing

import { useNavigate } from 'react-router-dom'
import { Compass, ArrowLeft, Home } from 'lucide-react'

function NotFoundPage({ user }) {
  const navigate = useNavigate()
  const ปลายทาง = user ? '/home' : '/'

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center mb-6">
        <Compass size={38} strokeWidth={1.5} className="text-gray-500" />
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-2">ไม่พบหน้าที่คุณเปิด</h1>
      <p className="text-sm text-gray-600 max-w-xs leading-relaxed">
        ลิงก์อาจพิมพ์ผิดหรือถูกย้ายไปแล้ว ข้อมูลของคุณยังอยู่ครบ กดปุ่มด้านล่างเพื่อกลับไปหน้าที่ใช้งานได้
      </p>

      <button
        onClick={() => navigate(ปลายทาง, { replace: true })}
        className="mt-6 inline-flex items-center justify-center gap-2 bg-blue-600 active:bg-blue-700 text-white px-6 min-h-[44px] rounded-xl font-medium shadow-sm transition-colors"
      >
        <Home size={16} className="shrink-0" /> {user ? 'กลับหน้าเมนูหลัก' : 'กลับหน้าแรก'}
      </button>

      <button
        onClick={() => navigate(-1)}
        className="mt-2 inline-flex items-center justify-center gap-1.5 text-sm text-gray-600 min-h-[44px] px-4"
      >
        <ArrowLeft size={14} className="shrink-0" /> ย้อนกลับหน้าก่อนหน้า
      </button>
    </div>
  )
}

export default NotFoundPage
