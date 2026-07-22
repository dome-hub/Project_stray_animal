// BottomNav.jsx — แถบนำทางล่างจอ (Bottom Navigation)
//
// เดิมทุกหน้าต้องกดย้อนกลับไปหน้าแรกก่อน ถึงจะไปหน้าอื่นได้ = กด 2 ครั้งเสมอ
// แถบนี้ทำให้สลับงานหลักได้ในคลิกเดียว ซึ่งสำคัญมากกับเจ้าหน้าที่ที่ทำงานภาคสนาม
//
// แสดงเฉพาะ role user / volunteer — admin ใช้เมนูจากหน้าแรกตามเดิม (งานเป็นครั้งคราว ไม่ได้สลับถี่)

import { useLocation, useNavigate } from 'react-router-dom'
import {
  Home, Camera, Search, ClipboardList, User,
  RefreshCw, PawPrint, Map,
} from 'lucide-react'
import { แสดงแถบนำทาง } from '../utils/navVisibility'

// แท็บของผู้ใช้ทั่วไป — เรียงตามความถี่ในการใช้งาน (แจ้งเหตุคือฟีเจอร์หลักของแอป)
const แท็บผู้ใช้ = [
  { path: '/home',     label: 'หน้าแรก',  Icon: Home },
  { path: '/report',   label: 'แจ้งเหตุ', Icon: Camera },
  { path: '/find-pet', label: 'ค้นหา',    Icon: Search },
  { path: '/track',    label: 'ติดตาม',   Icon: ClipboardList },
  { path: '/profile',  label: 'โปรไฟล์',  Icon: User },
]

// แท็บของเจ้าหน้าที่ — ตรงกับ 4 งานหลักในเมนูหน้าแรก + ปุ่มกลับหน้าแรก (ไว้ออกจากระบบ/ดูสถิติ)
const แท็บเจ้าหน้าที่ = [
  { path: '/home',              label: 'หน้าแรก',    Icon: Home },
  { path: '/volunteer/reports', label: 'รายการแจ้ง', Icon: ClipboardList },
  { path: '/volunteer/update',  label: 'อัปเดต',     Icon: RefreshCw },
  { path: '/volunteer/animals', label: 'สัตว์',      Icon: PawPrint },
  { path: '/volunteer/map',     label: 'แผนที่',     Icon: Map },
]

// โทนสีตาม role — ให้ตรงกับธีมที่ใช้อยู่แล้วทั้งแอป (ผู้ใช้ = ส้ม, เจ้าหน้าที่ = ทีล)
const สีตามRole = {
  user:      'text-orange-600',
  volunteer: 'text-teal-600',
}

function BottomNav({ user }) {
  const location = useLocation()
  const navigate = useNavigate()

  if (!แสดงแถบนำทาง(user, location.pathname)) return null

  const role = user.role || 'user'
  const แท็บ = role === 'volunteer' ? แท็บเจ้าหน้าที่ : แท็บผู้ใช้
  const สีActive = สีตามRole[role] || สีตามRole.user

  return (
    <nav
      aria-label="เมนูหลัก"
      className="fixed bottom-0 inset-x-0 z-40 bg-white border-t border-gray-100 shadow-[0_-1px_6px_rgba(0,0,0,0.04)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex">
        {แท็บ.map(function (t) {
          const active = location.pathname === t.path
          return (
            <button
              key={t.path}
              onClick={() => navigate(t.path)}
              aria-label={t.label}
              aria-current={active ? 'page' : undefined}
              className={`flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 min-h-[56px] transition-colors ${
                active ? สีActive : 'text-gray-400'
              }`}
            >
              <t.Icon size={21} strokeWidth={active ? 2.4 : 1.8} className="shrink-0" />
              <span className={`text-[10px] leading-none ${active ? 'font-bold' : 'font-medium'}`}>
                {t.label}
              </span>
            </button>
          )
        })}
      </div>
    </nav>
  )
}

export default BottomNav
