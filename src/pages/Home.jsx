// Home.jsx — หน้าเมนูหลัก
// แสดงตัวเลือก 3 อย่าง: แจ้งสัตว์จร, ค้นหาสัตว์เลี้ยง, ติดตามรายงาน

import { useNavigate } from 'react-router-dom' // useNavigate ใช้สำหรับเปลี่ยนหน้า

// รับ props มาจาก App.jsx
// user = ข้อมูลผู้ใช้ที่ Login อยู่
// onLogout = ฟังก์ชัน Logout
function Home({ user, onLogout }) {

  // navigate คือฟังก์ชันที่ใช้เปลี่ยนหน้า เช่น navigate('/report')
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-blue-50 pb-8">

      {/* Header — แถบด้านบน แสดงชื่อแอปและปุ่ม Logout */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🐕</div>
          <div>
            <p className="font-bold text-gray-800 text-sm">ระบบจัดการหมาจร</p>
            {/* แสดงชื่อผู้ใช้ที่ Login */}
            <p className="text-gray-500 text-xs">{user.name}</p>
          </div>
        </div>

        {/* ปุ่ม Logout — เมื่อกดจะเรียกฟังก์ชัน onLogout */}
        <button
          onClick={onLogout}
          className="text-gray-500 text-sm hover:text-red-500"
        >
          ออกจากระบบ
        </button>
      </div>

      {/* หัวข้อหน้า */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">เลือกบริการที่ต้องการ</h2>
        <p className="text-gray-500 text-sm mt-1">
          ช่วยเหลือสัตว์จรหรือค้นหาเพื่อนสี่ขาตัวใหม่
        </p>
      </div>

      {/* การ์ดเมนู */}
      <div className="px-4 space-y-4">

        {/* การ์ดที่ 1 — แจ้งสัตว์จร */}
        <button
          onClick={() => navigate('/report')} // กดแล้วไปหน้า /report
          className="w-full text-left bg-orange-50 rounded-2xl p-5 shadow-sm hover:shadow-md"
        >
          <div className="text-4xl mb-3">📷</div>
          <h3 className="text-lg font-bold text-gray-800">ถ่ายภาพสัตว์จร</h3>
          <p className="text-gray-500 text-sm mt-1">
            พบสัตว์จรบนท้องถนน? ถ่ายภาพและแจ้งให้หน่วยงานทราบ
          </p>
          {/* รายการฟีเจอร์ */}
          <ul className="mt-3 space-y-1">
            <li className="text-sm text-gray-600">• AI วิเคราะห์สายพันธุ์และขนาด</li>
            <li className="text-sm text-gray-600">• ปักหมุดตำแหน่ง GPS อัตโนมัติ</li>
            <li className="text-sm text-gray-600">• ส่งข้อมูลให้ อบต./เทศบาล</li>
          </ul>
        </button>

        {/* การ์ดที่ 2 — ค้นหาสัตว์เลี้ยง */}
        <button
          onClick={() => navigate('/find-pet')} // กดแล้วไปหน้า /find-pet
          className="w-full text-left bg-green-50 rounded-2xl p-5 shadow-sm hover:shadow-md"
        >
          <div className="text-4xl mb-3">🔍</div>
          <h3 className="text-lg font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h3>
          <p className="text-gray-500 text-sm mt-1">
            ต้องการรับเลี้ยงสัตว์? ค้นหาเพื่อนที่เหมาะสมกับคุณ
          </p>
          <ul className="mt-3 space-y-1">
            <li className="text-sm text-gray-600">• ระบุความต้องการและนิสัยของคุณ</li>
            <li className="text-sm text-gray-600">• AI แนะนำสัตว์ที่เหมาะสม</li>
            <li className="text-sm text-gray-600">• ดูข้อมูลติดต่อรับเลี้ยง</li>
          </ul>
        </button>

        {/* การ์ดที่ 3 — ติดตามรายงาน */}
        <button
          onClick={() => navigate('/track')} // กดแล้วไปหน้า /track
          className="w-full text-left bg-white rounded-2xl p-5 shadow-sm hover:shadow-md flex items-center justify-between"
        >
          <div>
            <div className="text-4xl mb-3">📋</div>
            <h3 className="text-lg font-bold text-gray-800">ติดตามรายงาน</h3>
            <p className="text-gray-500 text-sm mt-1">
              ตรวจสอบสถานะการรายงานสัตว์จรที่คุณได้ส่งไป
            </p>
          </div>
          <span className="text-gray-400 text-xl">→</span>
        </button>

      </div>
    </div>
  )
}

export default Home
