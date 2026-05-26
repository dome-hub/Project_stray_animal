// NotificationPage.jsx — การแจ้งเตือนจาก Supabase (ทุก role เชื่อม DB จริง)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

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

// emoji ตามสถานะรายงาน
function emojiสถานะ(status) {
  if (status === 'รอดำเนินการ')    return '🚨'
  if (status === 'รับเรื่องแล้ว')   return '🦺'
  if (status === 'ลงพื้นที่แล้ว')   return '🚗'
  if (status === 'อยู่ศูนย์พักพิง') return '🏠'
  if (status === 'มีผู้รับเลี้ยง')   return '✅'
  return '📋'
}

const หัวข้อตามRole = {
  user:      'การแจ้งเตือน',
  volunteer: 'แจ้งเตือนเจ้าหน้าที่',
  admin:     'แจ้งเตือนผู้ดูแลระบบ',
}

function NotificationPage({ user }) {
  const navigate = useNavigate()
  const role = user?.role || 'user'

  const [รายการ, setรายการ]   = useState([])
  const [โหลด, setโหลด]       = useState(true)
  // volunteer/admin ใช้ local read-state (ไม่บันทึก DB)
  const [อ่านแล้วLocal, setอ่านแล้วLocal] = useState(new Set())

  useEffect(function () {
    if (!user?.id) return
    setโหลด(true)

    // ---- role: user → ดึงจาก notifications table ----
    if (role === 'user') {
      supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(30)
        .then(function ({ data }) {
          setรายการ((data || []).map(function (n) {
            return {
              id:       n.id,
              emoji:    n.type === 'report_update' ? '🦺' : '🔔',
              หัวข้อ:   n.title || '',
              ข้อความ:  n.body || n.title || '',
              เวลา:     แปลงเวลา(n.created_at),
              อ่านแล้ว: n.is_read,
              dbId:     n.id,
            }
          }))
          setโหลด(false)
        })
        .catch(function () { setโหลด(false) })
      return
    }

    // ---- role: volunteer → ดึงรายงานล่าสุดจาก reports table ----
    if (role === 'volunteer') {
      supabase
        .from('reports')
        .select('id, animal_type, location_text, status, created_at')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(function ({ data }) {
          setรายการ((data || []).map(function (r) {
            const isNew = r.status === 'รอดำเนินการ'
            return {
              id:       r.id,
              emoji:    emojiสถานะ(r.status),
              หัวข้อ:   isNew ? '🚨 มีรายงานใหม่รอดำเนินการ' : `อัปเดต: ${r.status}`,
              ข้อความ:  `${r.animal_type || 'สัตว์จร'} · 📍 ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
              เวลา:     แปลงเวลา(r.created_at),
              isNew,
            }
          }))
          setโหลด(false)
        })
        .catch(function () { setโหลด(false) })
      return
    }

    // ---- role: admin → ดึงรายงาน + ผู้ใช้ใหม่ ----
    if (role === 'admin') {
      Promise.all([
        supabase
          .from('reports')
          .select('id, animal_type, location_text, status, created_at')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('users')
          .select('id, name, created_at')
          .order('created_at', { ascending: false })
          .limit(10),
      ]).then(function ([ร1, ร2]) {
        const reportItems = (ร1.data || []).map(function (r) {
          return {
            id:      'r' + r.id,
            emoji:   emojiสถานะ(r.status),
            หัวข้อ:  r.status === 'รอดำเนินการ' ? '🚨 รายงานรอดำเนินการ' : `รายงาน: ${r.status}`,
            ข้อความ: `${r.animal_type || 'สัตว์จร'} · 📍 ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
            เวลา:    แปลงเวลา(r.created_at),
            isNew:   r.status === 'รอดำเนินการ',
          }
        })
        const userItems = (ร2.data || []).map(function (u) {
          return {
            id:      'u' + u.id,
            emoji:   '👤',
            หัวข้อ:  'ผู้ใช้ใหม่ลงทะเบียน',
            ข้อความ: u.name || 'ผู้ใช้ใหม่',
            เวลา:    แปลงเวลา(u.created_at),
            isNew:   false,
          }
        })
        // รวมแล้วเรียงตามเวลาล่าสุด
        const all = [...reportItems, ...userItems].sort(function (a, b) {
          return 0  // already sorted by fetch order
        })
        setรายการ(all)
        setโหลด(false)
      }).catch(function () { setโหลด(false) })
      return
    }

    setโหลด(false)
  }, [role, user?.id])

  // สำหรับ volunteer/admin ใช้ local state ติดตามการอ่าน
  function isอ่านแล้ว(item) {
    if (role === 'user') return item.อ่านแล้ว
    return !item.isNew || อ่านแล้วLocal.has(item.id)
  }

  const ยังไม่อ่าน = รายการ.filter(function (n) { return !isอ่านแล้ว(n) }).length

  async function กดอ่าน(item) {
    if (role === 'user') {
      setรายการ(function (prev) {
        return prev.map(function (n) { return n.id === item.id ? { ...n, อ่านแล้ว: true } : n })
      })
      if (item.dbId) {
        await supabase.from('notifications').update({ is_read: true }).eq('id', item.dbId)
      }
    } else {
      setอ่านแล้วLocal(function (prev) { return new Set([...prev, item.id]) })
    }
  }

  async function อ่านทั้งหมด() {
    if (role === 'user') {
      setรายการ(function (prev) { return prev.map(function (n) { return { ...n, อ่านแล้ว: true } }) })
      if (user?.id) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
      }
    } else {
      setอ่านแล้วLocal(new Set(รายการ.map(function (n) { return n.id })))
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
          {รายการ.map(function (n) {
            const read = isอ่านแล้ว(n)
            return (
              <button
                key={n.id}
                onClick={() => กดอ่าน(n)}
                className={`w-full text-left rounded-2xl p-4 shadow-sm transition-all active:scale-95 ${
                  read ? 'bg-white' : 'bg-yellow-50 border-2 border-yellow-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <span className="text-2xl shrink-0">{n.emoji}</span>
                  <div className="flex-1 min-w-0">
                    {n.หัวข้อ && (
                      <p className={`text-xs font-bold mb-0.5 ${read ? 'text-gray-400' : 'text-orange-600'}`}>
                        {n.หัวข้อ}
                      </p>
                    )}
                    <p className={`text-sm leading-snug ${read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                      {n.ข้อความ}
                    </p>
                    <p className="text-xs text-gray-400 mt-1">{n.เวลา}</p>
                  </div>
                  {!read && (
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
