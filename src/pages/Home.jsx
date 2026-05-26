// Home.jsx — หน้าเมนูหลัก แสดงเมนูแตกต่างกันตาม Role

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// เมนูของแต่ละ Role
const เมนูแต่ละRole = {

  // ผู้ใช้งานทั่วไป
  user: [
    { emoji: '📷', ชื่อ: 'แจ้งสัตว์จร', รายละเอียด: 'ถ่ายภาพและแจ้งให้หน่วยงานทราบ', ฟีเจอร์: ['AI วิเคราะห์สายพันธุ์', 'ปักหมุด GPS อัตโนมัติ', 'ส่งให้ อบต./เทศบาล'], path: '/report', สี: 'bg-orange-50' },
    { emoji: '🔍', ชื่อ: 'ค้นหาสัตว์เลี้ยง', รายละเอียด: 'ค้นหาเพื่อนที่เหมาะสมกับคุณ', ฟีเจอร์: ['AI แนะนำสัตว์ที่เหมาะสม', 'ดูสัตว์ทั้งหมดในระบบ', 'บันทึกสัตว์ที่สนใจ'], path: '/find-pet', สี: 'bg-green-50' },
    { emoji: '📋', ชื่อ: 'ติดตามรายงาน', รายละเอียด: 'ตรวจสอบสถานะที่คุณส่งไป', ฟีเจอร์: [], path: '/track', สี: 'bg-white' },
    { emoji: '❤️', ชื่อ: 'สัตว์ที่บันทึกไว้', รายละเอียด: 'รายการสัตว์ที่คุณกดถูกใจไว้', ฟีเจอร์: [], path: '/wishlist', สี: 'bg-red-50' },
  ],

  // เจ้าหน้าที่ / อาสาสมัคร
  volunteer: [
    { emoji: '📋', ชื่อ: 'รายการแจ้งสัตว์จร', รายละเอียด: 'ดูรายงานที่รอดำเนินการ', ฟีเจอร์: ['กรองตามพื้นที่', 'เรียงตามความเร่งด่วน', 'ดูพิกัดบนแผนที่'], path: '/volunteer/reports', สี: 'bg-orange-50' },
    { emoji: '🔄', ชื่อ: 'อัปเดตสถานะสัตว์', รายละเอียด: 'อัปเดตความคืบหน้าการช่วยเหลือ', ฟีเจอร์: ['ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง'], path: '/volunteer/update', สี: 'bg-blue-50' },
    { emoji: '🐾', ชื่อ: 'จัดการข้อมูลสัตว์', รายละเอียด: 'เพิ่ม แก้ไข ข้อมูลสัตว์ในระบบ', ฟีเจอร์: ['เพิ่มสัตว์ใหม่', 'แก้ไขข้อมูล', 'บันทึกประวัติรักษา'], path: '/volunteer/animals', สี: 'bg-green-50' },
    { emoji: '📊', ชื่อ: 'สถิติพื้นที่รับผิดชอบ', รายละเอียด: 'ดูข้อมูลสัตว์ในพื้นที่ของคุณ', ฟีเจอร์: [], path: '/volunteer/stats', สี: 'bg-purple-50' },
  ],

  // ผู้ดูแลระบบ
  admin: [
    { emoji: '📊', ชื่อ: 'ภาพรวมระบบ', รายละเอียด: 'สถิติและ Dashboard ของระบบ', ฟีเจอร์: ['จำนวนสัตว์', 'รายงานทั้งหมด', 'อัตราการรับเลี้ยง'], path: '/admin/dashboard', สี: 'bg-indigo-50' },
    { emoji: '👥', ชื่อ: 'จัดการผู้ใช้งาน', รายละเอียด: 'ดูและจัดการบัญชีทั้งหมด', ฟีเจอร์: ['กำหนด Role', 'ระงับบัญชี', 'ดูประวัติ'], path: '/admin/users', สี: 'bg-purple-50' },
    { emoji: '🗺️', ชื่อ: 'จัดการพื้นที่', รายละเอียด: 'กำหนดพื้นที่รับผิดชอบของเจ้าหน้าที่', ฟีเจอร์: [], path: '/admin/areas', สี: 'bg-green-50' },
    { emoji: '📁', ชื่อ: 'Export รายงาน', รายละเอียด: 'ดาวน์โหลดข้อมูลในรูปแบบไฟล์', ฟีเจอร์: [], path: '/admin/export', สี: 'bg-yellow-50' },
    { emoji: '⚙️', ชื่อ: 'ตั้งค่าระบบ', รายละเอียด: 'แก้ไขการตั้งค่าต่างๆ', ฟีเจอร์: [], path: '/admin/settings', สี: 'bg-gray-50' },
  ],
}

const ข้อมูลRole = {
  user:      { ชื่อ: 'ผู้ใช้งานทั่วไป', emoji: '👤', สี: 'text-blue-600' },
  volunteer: { ชื่อ: 'เจ้าหน้าที่ / อาสาสมัคร', emoji: '🦺', สี: 'text-orange-600' },
  admin:     { ชื่อ: 'ผู้ดูแลระบบ', emoji: '🛡️', สี: 'text-purple-600' },
}

function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const role = user.role || 'user'
  const เมนู = เมนูแต่ละRole[role]
  const roleInfo = ข้อมูลRole[role]

  // ดึง avatar_url ใหม่ทุกครั้งที่กลับมาหน้า Home
  // เพราะผู้ใช้อาจเพิ่งอัปโหลดรูปจาก ProfilePage
  const [avatarUrl, setAvatarUrl] = useState(null)

  useEffect(function () {
    if (!user?.id) return
    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(function ({ data }) {
        if (data?.avatar_url) setAvatarUrl(data.avatar_url)
      })
  }, [user?.id])

  return (
    <div className="min-h-screen bg-blue-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="text-3xl">🐕</div>
          <div>
            <p className="font-bold text-gray-800 text-sm">ระบบจัดการหมาจร</p>
            <p className={`text-xs font-medium ${roleInfo.สี}`}>
              {roleInfo.emoji} {roleInfo.ชื่อ}
            </p>
          </div>
        </div>

        {/* ด้านขวา: กระดิ่งแจ้งเตือน + ปุ่มโปรไฟล์วงกลม + ออกจากระบบ */}
        <div className="flex items-center gap-3">

          {/* กระดิ่งแจ้งเตือน — กดแล้วไปหน้า Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className="w-9 h-9 bg-yellow-100 rounded-full flex items-center justify-center text-lg hover:bg-yellow-200 transition-colors"
            title="การแจ้งเตือน"
          >
            🔔
          </button>

          {/* วงกลมโปรไฟล์ — กดแล้วไปหน้า Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center text-lg hover:bg-blue-200 transition-colors border-2 border-white shadow-sm"
            title="โปรไฟล์ของฉัน"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="โปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              '👤'
            )}
          </button>

          <button onClick={onLogout} className="text-gray-500 text-sm hover:text-red-500">
            ออก
          </button>
        </div>
      </div>

      {/* หัวข้อ */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">เลือกบริการที่ต้องการ</h2>
        <p className="text-gray-500 text-sm mt-1">
          {role === 'user'      && 'ช่วยเหลือสัตว์จรหรือค้นหาเพื่อนสี่ขาตัวใหม่'}
          {role === 'volunteer' && 'จัดการและช่วยเหลือสัตว์จรในพื้นที่รับผิดชอบ'}
          {role === 'admin'     && 'ดูแลและตรวจสอบระบบโดยรวม'}
        </p>
      </div>

      {/* การ์ดเมนู */}
      <div className="px-4 space-y-4">
        {เมนู.map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            className={`w-full text-left ${item.สี} rounded-2xl p-5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all`}
          >
            <div className="text-4xl mb-3">{item.emoji}</div>
            <h3 className="text-lg font-bold text-gray-800">{item.ชื่อ}</h3>
            <p className="text-gray-500 text-sm mt-1">{item.รายละเอียด}</p>
            {item.ฟีเจอร์.length > 0 && (
              <ul className="mt-3 space-y-1">
                {item.ฟีเจอร์.map((f, fi) => (
                  <li key={fi} className="text-sm text-gray-600">• {f}</li>
                ))}
              </ul>
            )}
          </button>
        ))}
      </div>

    </div>
  )
}

export default Home
