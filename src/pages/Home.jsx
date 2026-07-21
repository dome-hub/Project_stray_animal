// Home.jsx — หน้าเมนูหลัก แสดงเมนูแตกต่างกันตาม Role

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'
import {
  Camera, Search, ClipboardList, RefreshCw, PawPrint,
  BarChart3, Users, Map, FolderDown, Settings, User, HardHat, Shield, Bell, Dog, Check, BookOpen, Phone, Megaphone,
  LogOut,
} from 'lucide-react'
import UrgentLostPetsBanner from '../components/UrgentLostPetsBanner'

// โทนสีหลักของแต่ละ role — ผู้ใช้ทั่วไป = ส้ม (อบอุ่น/ขอความช่วยเหลือ), เจ้าหน้าที่ = ทีล (มืออาชีพ/น่าเชื่อถือ), แอดมิน = ม่วง
const โทนRole = {
  user:      { hero: 'from-orange-400 to-orange-600', กล่อง: 'bg-orange-50', สี: 'text-orange-500' },
  volunteer: { hero: 'from-teal-600 to-teal-800',      กล่อง: 'bg-teal-50',   สี: 'text-teal-600' },
  admin:     { hero: 'from-purple-500 to-purple-700',  กล่อง: 'bg-purple-50', สี: 'text-purple-500' },
}

// หัวข้อบนสุด — ปรับคำให้เหมาะกับผู้ใช้แต่ละ role
const หัวข้อRole = {
  user:      'เลือกบริการที่ต้องการ',
  volunteer: 'เมนูการทำงาน',
  admin:     'เลือกบริการที่ต้องการ',
}

// เมนูของแต่ละ Role — รายการแรกของแต่ละ role คือ Hero Action (ฟีเจอร์หลัก)
const เมนูแต่ละRole = {

  // ผู้ใช้งานทั่วไป
  user: [
    { Icon: Camera,        ชื่อ: 'แจ้งสัตว์จร',        รายละเอียด: 'ถ่ายภาพและแจ้งให้หน่วยงานทราบ', ฟีเจอร์: ['AI วิเคราะห์สายพันธุ์', 'ปักหมุด GPS อัตโนมัติ', 'ส่งให้ อบต./เทศบาล'], path: '/report',   ไอคอนพื้นหลัง: 'bg-orange-50', ไอคอนสี: 'text-orange-500' },
    { Icon: Search,        ชื่อ: 'ค้นหาสัตว์เลี้ยง',    รายละเอียด: 'ค้นหาเพื่อนที่เหมาะสมกับคุณ',   ฟีเจอร์: [], path: '/find-pet', ไอคอนพื้นหลัง: 'bg-green-50',  ไอคอนสี: 'text-green-500' },
    { Icon: ClipboardList, ชื่อ: 'ติดตามรายงาน',       รายละเอียด: 'ตรวจสอบสถานะที่คุณส่งไป',       ฟีเจอร์: [], path: '/track',    ไอคอนพื้นหลัง: 'bg-indigo-50', ไอคอนสี: 'text-indigo-500' },
    { Icon: Megaphone,     ชื่อ: 'สัตว์หาย / พลัดหลง',  รายละเอียด: 'ตามหาเจ้าของ และแจ้งสัตว์เลี้ยงสูญหาย', ฟีเจอร์: [], path: '/lost-found', ไอคอนพื้นหลัง: 'bg-rose-50', ไอคอนสี: 'text-rose-500' },
    { Icon: BookOpen,      ชื่อ: 'บทความน่ารู้',        รายละเอียด: 'เกร็ดความรู้และวิธีดูแลสัตว์',   ฟีเจอร์: [], path: '/pet-guide', ไอคอนพื้นหลัง: 'bg-purple-50', ไอคอนสี: 'text-purple-500' },
    { Icon: Phone,         ชื่อ: 'ติดต่อหน่วยงาน',      รายละเอียด: 'เบอร์โทรและที่อยู่หน่วยงานที่เกี่ยวข้อง', ฟีเจอร์: [], path: '/contact', ไอคอนพื้นหลัง: 'bg-emerald-50', ไอคอนสี: 'text-emerald-500' },
  ],

  // เจ้าหน้าที่ / อาสาสมัคร
  volunteer: [
    { Icon: ClipboardList, ชื่อ: 'รายการแจ้งสัตว์จร',    รายละเอียด: 'ดูรายงานที่รอดำเนินการ',        ฟีเจอร์: ['กรองตามพื้นที่', 'เรียงตามความเร่งด่วน', 'ดูพิกัดบนแผนที่'], path: '/volunteer/reports', ไอคอนพื้นหลัง: 'bg-teal-50',  ไอคอนสี: 'text-teal-600' },
    { Icon: RefreshCw,     ชื่อ: 'อัปเดตสถานะสัตว์',     รายละเอียด: 'อัปเดตความคืบหน้าการช่วยเหลือ', ฟีเจอร์: [], path: '/volunteer/update',  ไอคอนพื้นหลัง: 'bg-cyan-50',   ไอคอนสี: 'text-cyan-600' },
    { Icon: PawPrint,      ชื่อ: 'จัดการข้อมูลสัตว์',    รายละเอียด: 'เพิ่ม แก้ไข ข้อมูลสัตว์ในระบบ', ฟีเจอร์: [], path: '/volunteer/animals', ไอคอนพื้นหลัง: 'bg-blue-50',   ไอคอนสี: 'text-blue-600' },
    { Icon: BarChart3,     ชื่อ: 'ภาพรวมและออกรายงาน', รายละเอียด: 'ดูสถิติงานและดาวน์โหลดข้อมูล', ฟีเจอร์: [], path: '/volunteer/stats', ไอคอนพื้นหลัง: 'bg-slate-100', ไอคอนสี: 'text-slate-600' },
    { Icon: Map,           ชื่อ: 'แผนที่จุดเกิดเหตุ',     รายละเอียด: 'ดูพิกัดรายงานทั้งหมดบนแผนที่',   ฟีเจอร์: [], path: '/volunteer/map',    ไอคอนพื้นหลัง: 'bg-teal-50',  ไอคอนสี: 'text-teal-600' },
  ],

  // ผู้ดูแลระบบ
  admin: [
    { Icon: BarChart3,  ชื่อ: 'ภาพรวมระบบ',      รายละเอียด: 'สถิติและ Dashboard ของระบบ',          ฟีเจอร์: ['จำนวนสัตว์', 'รายงานทั้งหมด', 'อัตราการรับเลี้ยง'], path: '/admin/dashboard', ไอคอนพื้นหลัง: 'bg-indigo-50', ไอคอนสี: 'text-indigo-500' },
    { Icon: Users,      ชื่อ: 'จัดการผู้ใช้งาน',  รายละเอียด: 'ดูและจัดการบัญชีทั้งหมด',             ฟีเจอร์: [], path: '/admin/users',    ไอคอนพื้นหลัง: 'bg-purple-50', ไอคอนสี: 'text-purple-500' },
    { Icon: Map,        ชื่อ: 'จัดการพื้นที่',    รายละเอียด: 'กำหนดพื้นที่รับผิดชอบของเจ้าหน้าที่', ฟีเจอร์: [], path: '/admin/areas',    ไอคอนพื้นหลัง: 'bg-green-50',  ไอคอนสี: 'text-green-500' },
    { Icon: FolderDown, ชื่อ: 'Export รายงาน',   รายละเอียด: 'ดาวน์โหลดข้อมูลในรูปแบบไฟล์',         ฟีเจอร์: [], path: '/admin/export',   ไอคอนพื้นหลัง: 'bg-yellow-50', ไอคอนสี: 'text-yellow-600' },
    { Icon: Settings,   ชื่อ: 'ตั้งค่าระบบ',      รายละเอียด: 'แก้ไขการตั้งค่าต่างๆ',                ฟีเจอร์: [], path: '/admin/settings', ไอคอนพื้นหลัง: 'bg-gray-100',  ไอคอนสี: 'text-gray-500' },
  ],
}

const ข้อมูลRole = {
  user:      { ชื่อ: 'ผู้ใช้งานทั่วไป',        Icon: User,    สี: 'text-blue-600' },
  volunteer: { ชื่อ: 'เจ้าหน้าที่ / อาสาสมัคร', Icon: HardHat, สี: 'text-teal-600' },
  admin:     { ชื่อ: 'ผู้ดูแลระบบ',            Icon: Shield,  สี: 'text-purple-600' },
}

function Home({ user, onLogout }) {
  const navigate = useNavigate()
  const role = user.role || 'user'
  const เมนู = เมนูแต่ละRole[role]
  const [เมนูหลัก, ...เมนูรอง] = เมนู
  const roleInfo = ข้อมูลRole[role]
  const โทน = โทนRole[role]

  // ยืนยันก่อนออกจากระบบ กันกดพลาด
  const [แสดงยืนยันออก, setแสดงยืนยันออก] = useState(false)

  // ดึง avatar_url ใหม่ทุกครั้งที่กลับมาหน้า Home
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

  // ---- นับการแจ้งเตือนที่ยังไม่อ่าน (ทุก role) ----
  const [ยังไม่อ่าน, setยังไม่อ่าน] = useState(0)

  useEffect(function () {
    if (!user?.id) return

    const lsDelKey  = `noti_deleted_${user.id}`
    const lsReadKey = `noti_read_${user.id}`
    let deletedSet = new Set()
    let readSet    = new Set()
    try {
      const d = localStorage.getItem(lsDelKey)
      const r = localStorage.getItem(lsReadKey)
      if (d) deletedSet = new Set(JSON.parse(d))
      if (r) readSet    = new Set(JSON.parse(r))
    } catch {}

    if (role === 'user') {
      // นับจาก notifications table โดยตรง
      supabase
        .from('notifications')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false)
        .then(function ({ count }) { setยังไม่อ่าน(count || 0) })
      return
    }

    if (role === 'volunteer') {
      // unread = รอดำเนินการ ที่ยังไม่ถูกอ่านหรือลบ
      supabase
        .from('reports')
        .select('id')
        .eq('status', 'รอดำเนินการ')
        .then(function ({ data }) {
          const n = (data || []).filter(function (r) {
            return !deletedSet.has(r.id) && !readSet.has(r.id)
          }).length
          setยังไม่อ่าน(n)
        })
      return
    }

    if (role === 'admin') {
      // unread = รอดำเนินการ ที่ยังไม่ถูกอ่านหรือลบ (id prefix 'r')
      supabase
        .from('reports')
        .select('id')
        .eq('status', 'รอดำเนินการ')
        .then(function ({ data }) {
          const n = (data || []).filter(function (r) {
            return !deletedSet.has('r' + r.id) && !readSet.has('r' + r.id)
          }).length
          setยังไม่อ่าน(n)
        })
      return
    }
  }, [user?.id, role])

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-full ${โทน.กล่อง} flex items-center justify-center ${โทน.สี}`}>
            <Dog size={22} strokeWidth={2} />
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm">แจ้งจร</p>
            <p className={`text-xs font-medium flex items-center gap-1 ${roleInfo.สี}`}>
              <roleInfo.Icon size={12} strokeWidth={2.5} /> {roleInfo.ชื่อ}
            </p>
          </div>
        </div>

        {/* ด้านขวา: กระดิ่งแจ้งเตือน + ปุ่มโปรไฟล์วงกลม + ออกจากระบบ */}
        <div className="flex items-center gap-3">

          {/* กระดิ่งแจ้งเตือน — กดแล้วไปหน้า Notifications */}
          <button
            onClick={() => navigate('/notifications')}
            className={`relative w-9 h-9 ${โทน.กล่อง} rounded-full flex items-center justify-center ${โทน.สี} hover:opacity-80 transition-opacity`}
            title="การแจ้งเตือน"
          >
            <Bell size={18} strokeWidth={2} />
            {ยังไม่อ่าน > 0 && (
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                {/* วงแสงกระพริบ */}
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                {/* ตัวเลข */}
                <span className="relative inline-flex h-4 w-4 rounded-full bg-red-500 items-center justify-center">
                  <span className="text-[9px] text-white font-bold leading-none">
                    {ยังไม่อ่าน > 9 ? '9+' : ยังไม่อ่าน}
                  </span>
                </span>
              </span>
            )}
          </button>

          {/* วงกลมโปรไฟล์ — กดแล้วไปหน้า Profile */}
          <button
            onClick={() => navigate('/profile')}
            className="w-9 h-9 bg-gray-100 rounded-full overflow-hidden flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors border-2 border-white shadow-sm"
            title="โปรไฟล์ของฉัน"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="โปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              <User size={18} strokeWidth={2} />
            )}
          </button>

          <button onClick={() => setแสดงยืนยันออก(true)} className="text-gray-500 text-sm hover:text-red-500">
            ออก
          </button>
        </div>
      </div>

      {/* แถบแจ้งเตือนสัตว์หายด่วน — ซ่อนอัตโนมัติถ้าไม่มีประกาศ */}
      <UrgentLostPetsBanner />

      {/* หัวข้อ */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">{หัวข้อRole[role]}</h2>
        <p className="text-gray-500 text-sm mt-1">
          {role === 'user'      && 'ช่วยเหลือสัตว์จรหรือค้นหาเพื่อนสี่ขาตัวใหม่'}
          {role === 'volunteer' && 'จัดการและช่วยเหลือสัตว์จรในพื้นที่รับผิดชอบ'}
          {role === 'admin'     && 'ดูแลและตรวจสอบระบบโดยรวม'}
        </p>
      </div>

      <div className="px-4 space-y-4">

        {/* Hero Action — ฟีเจอร์หลักของ role นี้ เด่นสุด */}
        <button
          onClick={() => navigate(เมนูหลัก.path)}
          className={`relative w-full text-left bg-gradient-to-br ${โทน.hero} rounded-3xl p-6 shadow-md hover:shadow-lg active:scale-[0.98] transition-all text-white overflow-hidden`}
        >
          <เมนูหลัก.Icon
            size={140} strokeWidth={1}
            className="absolute -right-6 -bottom-8 text-white/10 pointer-events-none"
          />
          <div className="relative">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mb-4">
              <เมนูหลัก.Icon size={28} strokeWidth={1.75} />
            </div>
            <h3 className="text-xl font-bold">{เมนูหลัก.ชื่อ}</h3>
            <p className="text-white/80 text-sm mt-1">{เมนูหลัก.รายละเอียด}</p>
            {เมนูหลัก.ฟีเจอร์.length > 0 && (
              <ul className="mt-4 space-y-1.5">
                {เมนูหลัก.ฟีเจอร์.map((f, fi) => (
                  <li key={fi} className="text-sm text-white/90 flex items-center gap-2">
                    <Check size={14} strokeWidth={2.5} /> {f}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </button>

        {/* Secondary Actions — จัดเป็น Grid 2 คอลัมน์ */}
        <div className="grid grid-cols-2 gap-3">
          {เมนูรอง.map((item, i) => (
            <button
              key={i}
              onClick={() => navigate(item.path)}
              className="text-left bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-gray-100"
            >
              <div className={`w-10 h-10 rounded-xl ${item.ไอคอนพื้นหลัง} ${item.ไอคอนสี} flex items-center justify-center mb-2.5`}>
                <item.Icon size={20} strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm">{item.ชื่อ}</h3>
              <p className="text-gray-500 text-xs mt-0.5">{item.รายละเอียด}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Modal ยืนยันออกจากระบบ — กันกดพลาด */}
      {แสดงยืนยันออก && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm px-6"
          onClick={() => setแสดงยืนยันออก(false)}
        >
          <div
            className="bg-white w-full max-w-xs rounded-3xl shadow-xl p-6 text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-500 flex items-center justify-center mx-auto mb-4">
              <LogOut size={22} strokeWidth={1.75} />
            </div>
            <h3 className="font-bold text-gray-800 text-base">ออกจากระบบ</h3>
            <p className="text-gray-500 text-sm mt-1.5">คุณต้องการออกจากระบบใช่หรือไม่?</p>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => setแสดงยืนยันออก(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 active:scale-95 transition-all"
              >
                ออกจากระบบ
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Home
