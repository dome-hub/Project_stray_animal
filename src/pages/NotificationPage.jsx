// NotificationPage.jsx — การแจ้งเตือนจาก Supabase (user) / mock (volunteer, admin)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// mock สำหรับ volunteer/admin (ยังไม่เชื่อม DB)
const mockVolunteer = [
  { id: 1, emoji: '🚨', ข้อความ: 'มีรายงานใหม่ ความเร่งด่วนสูง บริเวณกำแพงแสน รอการดำเนินการ', เวลา: '30 นาทีที่แล้ว', อ่านแล้ว: false },
  { id: 2, emoji: '📋', ข้อความ: 'มีรายงานสัตว์จรใหม่ในพื้นที่ของคุณ 3 รายการ', เวลา: '2 ชั่วโมงที่แล้ว', อ่านแล้ว: false },
  { id: 3, emoji: '✅', ข้อความ: 'รายงาน #000002 ที่คุณดูแลมีผู้รับเลี้ยงแล้ว', เวลา: 'เมื่อวาน', อ่านแล้ว: true },
]
const mockAdmin = [
  { id: 1, emoji: '👤', ข้อความ: 'มีผู้ใช้ใหม่ลงทะเบียน 5 คนวันนี้', เวลา: '1 ชั่วโมงที่แล้ว', อ่านแล้ว: false },
  { id: 2, emoji: '⚠️', ข้อความ: 'มีรายงานที่รอดำเนินการเกิน 24 ชั่วโมง จำนวน 2 รายการ', เวลา: '3 ชั่วโมงที่แล้ว', อ่านแล้ว: false },
  { id: 3, emoji: '📊', ข้อความ: 'รายงานประจำสัปดาห์: อัตราการรับเลี้ยงเพิ่มขึ้น 12%', เวลา: 'เมื่อวาน', อ่านแล้ว: true },
]

function แปลงเวลา(str) {
  if (!str) return ''
  const diff = Date.now() - new Date(str).getTime()
  const min  = Math.floor(diff / 60000)
  const hr   = Math.floor(min / 60)
  const day  = Math.floor(hr / 24)
  if (min < 1)   return 'เมื่อกี้'
  if (min < 60)  return `${min} นาทีที่แล้ว`
  if (hr < 24)   return `${hr} ชั่วโมงที่แล้ว`
  if (day < 7)   return `${day} วันที่แล้ว`
  return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short' })
}

const หัวข้อตามRole = {
  user:      'การแจ้งเตือน',
  volunteer: 'แจ้งเตือนเจ้าหน้าที่',
  admin:     'แจ้งเตือนผู้ดูแลระบบ',
}

function NotificationPage({ user }) {
  const navigate = useNavigate()
  const role = user?.role || 'user'

  // user role → ดึงจาก DB จริง
  const [รายการ, setรายการ] = useState([])
  const [โหลด, setโหลด]     = useState(role === 'user')

  useEffect(function () {
    if (role === 'volunteer') { setรายการ(mockVolunteer); return }
    if (role === 'admin')     { setรายการ(mockAdmin);     return }

    // role === 'user' → ดึงจาก notifications table
    async function ดึงการแจ้งเตือน() {
      setโหลด(true)
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
      if (data) {
        setรายการ(data.map(function (n) {
          return {
            id:       n.id,
            emoji:    n.type === 'report_update' ? '🦺' : '🔔',
            ข้อความ:  n.body || n.title,
            เวลา:     แปลงเวลา(n.created_at),
            อ่านแล้ว: n.is_read,
            dbId:     n.id,
          }
        }))
      }
      setโหลด(false)
    }
    if (user?.id) ดึงการแจ้งเตือน()
  }, [role, user?.id])

  const ยังไม่อ่าน = รายการ.filter(function (n) { return !n.อ่านแล้ว }).length

  async function กดอ่าน(item) {
    setรายการ(function (prev) {
      return prev.map(function (n) { return n.id === item.id ? { ...n, อ่านแล้ว: true } : n })
    })
    // อัปเดต DB สำหรับ user role
    if (role === 'user' && item.dbId) {
      await supabase.from('notifications').update({ is_read: true }).eq('id', item.dbId)
    }
  }

  async function อ่านทั้งหมด() {
    setรายการ(function (prev) { return prev.map(function (n) { return { ...n, อ่านแล้ว: true } }) })
    if (role === 'user' && user?.id) {
      await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
    }
  }

  return (
    <div className="min-h-screen bg-yellow-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
          <div>
            <h1 className="font-bold text-gray-800">{หัวข้อตามRole[role]}</h1>
            {ยังไม่อ่าน > 0 && (
              <p className="text-xs text-orange-500">{ยังไม่อ่าน} รายการยังไม่ได้อ่าน</p>
            )}
          </div>
        </div>
        {ยังไม่อ่าน > 0 && (
          <button onClick={อ่านทั้งหมด} className="text-xs text-blue-500 font-medium">
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Badge role */}
      <div className="px-4 pt-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
          role === 'admin'     ? 'bg-purple-100 text-purple-700' :
          role === 'volunteer' ? 'bg-orange-100 text-orange-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          {role === 'admin'     ? '🛡️ แสดงสำหรับ Admin' :
           role === 'volunteer' ? '🦺 แสดงสำหรับเจ้าหน้าที่' :
           '👤 แสดงสำหรับผู้ใช้ทั่วไป'}
        </div>
      </div>

      {/* Loading */}
      {โหลด && (
        <div className="text-center py-16">
          <div className="w-8 h-8 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      )}

      {/* ว่าง */}
      {!โหลด && รายการ.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-5xl mb-3">🔔</p>
          <p className="font-medium">ยังไม่มีการแจ้งเตือน</p>
          <p className="text-xs mt-1">การแจ้งเตือนจะปรากฏเมื่อเจ้าหน้าที่รับเรื่อง</p>
        </div>
      )}

      {/* รายการ */}
      {!โหลด && (
        <div className="px-4 pt-3 space-y-3">
          {รายการ.map(function (แจ้งเตือน) {
            return (
              <button
                key={แจ้งเตือน.id}
                onClick={() => กดอ่าน(แจ้งเตือน)}
                className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all ${
                  แจ้งเตือน.อ่านแล้ว ? 'bg-white' : 'bg-yellow-50 border-2 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{แจ้งเตือน.emoji}</span>
                  <div className="flex-1">
                    <p className={`text-sm ${แจ้งเตือน.อ่านแล้ว ? 'text-gray-600' : 'text-gray-800 font-semibold'}`}>
                      {แจ้งเตือน.ข้อความ}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{แจ้งเตือน.เวลา}</p>
                  </div>
                  {!แจ้งเตือน.อ่านแล้ว && (
                    <div className="w-2.5 h-2.5 bg-orange-400 rounded-full mt-1 shrink-0" />
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationPage
