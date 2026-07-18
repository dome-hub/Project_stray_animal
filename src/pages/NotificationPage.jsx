// NotificationPage.jsx — การแจ้งเตือนจาก Supabase (ทุก role เชื่อม DB จริง)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// parse string เป็น UTC เสมอ — ถ้าไม่มี timezone suffix ให้ต่อ Z เข้าไป
function parseUTC(str) {
  if (!str) return new Date(NaN)
  // มี +xx:xx หรือ Z อยู่แล้ว → parse ตามปกติ
  if (/[Zz]$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  // ไม่มี → บังคับเป็น UTC โดยต่อ Z
  return new Date(str + 'Z')
}

// บวก UTC+7 → ได้เวลาไทย
function toBKK(d) {
  return new Date(d.getTime() + 7 * 60 * 60 * 1000)
}

const เดือนสั้น = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function แปลงเวลา(str) {
  if (!str) return ''

  const bkk  = toBKK(parseUTC(str))   // UTC → Bangkok UTC+7
  const now  = toBKK(new Date())       // ตอนนี้ใน Bangkok

  const hh   = String(bkk.getUTCHours()).padStart(2, '0')
  const mm   = String(bkk.getUTCMinutes()).padStart(2, '0')
  const time = `${hh}:${mm} น.`

  const key  = (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  const yest = new Date(now.getTime() - 86400000)

  if (key(bkk) === key(now))  return `วันนี้ ${time}`
  if (key(bkk) === key(yest)) return `เมื่อวาน ${time}`

  return `${bkk.getUTCDate()} ${เดือนสั้น[bkk.getUTCMonth()]} ${time}`
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
  const [เมนูเปิด, setเมนูเปิด] = useState(null)   // id ของ item ที่เปิด ⋮ อยู่

  // volunteer/admin — เก็บ read-state ใน localStorage เพื่อคงค่าข้าม navigate
  const lsKey = `noti_read_${user?.id || 'anon'}`
  const [อ่านแล้วLocal, setอ่านแล้วLocal] = useState(function () {
    try {
      const saved = localStorage.getItem(lsKey)
      return saved ? new Set(JSON.parse(saved)) : new Set()
    } catch { return new Set() }
  })

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
        .then(async function ({ data }) {
          const items = (data || []).map(function (n) {
            // หา ref id ของรายงานจากข้อความ (เช่น "#000025") เพื่อ deep-link + ดึงรูปสัตว์
            const m = String((n.title || '') + ' ' + (n.body || '')).match(/#(\d+)/)
            const refId = m ? parseInt(m[1], 10) : null
            return {
              id:       n.id,
              emoji:    n.type === 'report_update' ? '🦺' : '🔔',
              หัวข้อ:   n.title || '',
              ข้อความ:  n.body || n.title || '',
              เวลา:     แปลงเวลา(n.created_at),
              อ่านแล้ว: n.is_read,
              dbId:     n.id,
              refId:    refId,
              image_url: null,
              path:     refId ? `/track?open=${refId}` : '/track',
            }
          })
          // ดึงรูปสัตว์ของแต่ละเคสมาแสดงเป็นไอคอน
          const ids = [...new Set(items.map(function (i) { return i.refId }).filter(Boolean))]
          if (ids.length > 0) {
            const { data: reps } = await supabase.from('reports').select('id, image_url').in('id', ids)
            const รูปตามId = {}
            ;(reps || []).forEach(function (r) { รูปตามId[r.id] = r.image_url })
            items.forEach(function (i) { if (i.refId) i.image_url = รูปตามId[i.refId] || null })
          }
          setรายการ(items)
          setโหลด(false)
        })
        .catch(function () { setโหลด(false) })
      return
    }

    // ---- role: volunteer → ดึงรายงานล่าสุดจาก reports table ----
    if (role === 'volunteer') {
      supabase
        .from('reports')
        .select('id, animal_type, location_text, status, created_at, image_url')
        .order('created_at', { ascending: false })
        .limit(30)
        .then(function ({ data }) {
          // อ่าน ID ที่เคยลบจาก localStorage
          const delKey = `noti_deleted_${user?.id || 'anon'}`
          let deletedSet = new Set()
          try {
            const raw = localStorage.getItem(delKey)
            if (raw) deletedSet = new Set(JSON.parse(raw))
          } catch {}

          const items = (data || [])
            .filter(function (r) { return !deletedSet.has(r.id) })
            .map(function (r) {
              const isNew = r.status === 'รอดำเนินการ'
              return {
                id:       r.id,
                emoji:    emojiสถานะ(r.status),
                หัวข้อ:   isNew ? '🚨 รายงานใหม่รอดำเนินการ' : `สถานะ: ${r.status}`,
                ข้อความ:  `${r.animal_type || 'สัตว์จร'} · 📍 ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
                เวลา:     แปลงเวลา(r.created_at),
                isNew,
                image_url: r.image_url || null,
                path:     '/volunteer/reports',
              }
            })
          // รอดำเนินการขึ้นก่อนเสมอ
          items.sort(function (a, b) { return (b.isNew ? 1 : 0) - (a.isNew ? 1 : 0) })
          setรายการ(items)
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
          .select('id, animal_type, location_text, status, created_at, image_url')
          .order('created_at', { ascending: false })
          .limit(20),
        supabase
          .from('users')
          .select('id, name, created_at, avatar_url')
          .order('created_at', { ascending: false })
          .limit(10),
      ]).then(function ([ร1, ร2]) {
        // อ่าน ID ที่เคยลบจาก localStorage
        const delKey = `noti_deleted_${user?.id || 'anon'}`
        let deletedSet = new Set()
        try {
          const raw = localStorage.getItem(delKey)
          if (raw) deletedSet = new Set(JSON.parse(raw))
        } catch {}

        const reportItems = (ร1.data || [])
          .filter(function (r) { return !deletedSet.has('r' + r.id) })
          .map(function (r) {
            return {
              id:      'r' + r.id,
              emoji:   emojiสถานะ(r.status),
              หัวข้อ:  r.status === 'รอดำเนินการ' ? '🚨 รายงานรอดำเนินการ' : `รายงาน: ${r.status}`,
              ข้อความ: `${r.animal_type || 'สัตว์จร'} · 📍 ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
              เวลา:    แปลงเวลา(r.created_at),
              isNew:   r.status === 'รอดำเนินการ',
              image_url: r.image_url || null,
              path:    '/admin/dashboard',
            }
          })
        const userItems = (ร2.data || [])
          .filter(function (u) { return !deletedSet.has('u' + u.id) })
          .map(function (u) {
            return {
              id:      'u' + u.id,
              emoji:   '👤',
              หัวข้อ:  'ผู้ใช้ใหม่ลงทะเบียน',
              ข้อความ: u.name || 'ผู้ใช้ใหม่',
              เวลา:    แปลงเวลา(u.created_at),
              isNew:   false,
              image_url: u.avatar_url || null,
              path:    '/admin/users',
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
      setอ่านแล้วLocal(function (prev) {
        const next = new Set([...prev, item.id])
        try { localStorage.setItem(lsKey, JSON.stringify([...next])) } catch {}
        return next
      })
    }
  }

  // กดที่ตัวการ์ด — "2 Actions in 1 Click": mark read แบบ optimistic/background แล้วพาไปหน้าเป้าหมายทันที
  function กดการ์ด(item) {
    if (!isอ่านแล้ว(item)) กดอ่าน(item)   // ไม่ await — ให้ทำงานเบื้องหลัง ไม่หน่วงการเปลี่ยนหน้า
    if (item.path) navigate(item.path)
  }

  async function อ่านทั้งหมด() {
    if (role === 'user') {
      setรายการ(function (prev) { return prev.map(function (n) { return { ...n, อ่านแล้ว: true } }) })
      if (user?.id) {
        await supabase.from('notifications').update({ is_read: true }).eq('user_id', user.id)
      }
    } else {
      const allIds = รายการ.map(function (n) { return n.id })
      const next = new Set(allIds)
      try { localStorage.setItem(lsKey, JSON.stringify(allIds)) } catch {}
      setอ่านแล้วLocal(next)
    }
  }

  async function ลบแจ้งเตือน(item) {
    setเมนูเปิด(null)
    if (role === 'user') {
      // ลบจาก DB
      if (item.dbId) {
        await supabase.from('notifications').delete().eq('id', item.dbId)
      }
    } else {
      // volunteer/admin — บันทึก ID ที่ลบลง localStorage เพื่อกรองหลัง refresh
      const key = `noti_deleted_${user?.id || 'anon'}`
      try {
        const raw = localStorage.getItem(key)
        const set = raw ? new Set(JSON.parse(raw)) : new Set()
        set.add(item.id)
        localStorage.setItem(key, JSON.stringify([...set]))
      } catch {}
    }
    // ลบออกจาก local state (ทุก role)
    setรายการ(function (prev) { return prev.filter(function (n) { return n.id !== item.id }) })
  }

  return (
    <div className="min-h-screen bg-yellow-50 pb-8" onClick={() => setเมนูเปิด(null)}>

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
          <p className="text-xs mt-1">
            {role === 'user'
              ? 'การแจ้งเตือนจะปรากฏเมื่อส่งรายงาน หรือเจ้าหน้าที่ดำเนินการ'
              : role === 'volunteer'
              ? 'การแจ้งเตือนจะปรากฏเมื่อมีรายงานสัตว์จรเข้ามา'
              : 'การแจ้งเตือนจะปรากฏเมื่อมีกิจกรรมในระบบ'}
          </p>
        </div>
      )}

      {/* รายการ */}
      {!โหลด && (
        <div className="px-4 pt-3 space-y-3">
          {รายการ.map(function (n) {
            const read    = isอ่านแล้ว(n)
            const isOpen  = เมนูเปิด === n.id
            return (
              <div
                key={n.id}
                className={`relative rounded-2xl shadow-sm ${
                  read ? 'bg-white' : 'bg-yellow-50 border-2 border-yellow-200'
                }`}
              >
                {/* พื้นที่กดทั้งการ์ด — อ่านแล้ว + พาไปหน้าเป้าหมายทันที */}
                <button
                  onClick={() => กดการ์ด(n)}
                  className="w-full text-left p-4 pr-10"
                >
                  <div className="flex items-start gap-3">
                    {/* รูปภาพสัตว์ของเคส (สี่เหลี่ยมขอบมน) — ไม่มีรูปค่อย fallback เป็น emoji */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      {n.image_url
                        ? <img src={n.image_url} alt="" className="w-full h-full object-cover" />
                        : <span className="text-2xl">{n.emoji}</span>}
                    </div>
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

                {/* ปุ่ม ⋮ */}
                <button
                  onClick={function (e) {
                    e.stopPropagation()
                    setเมนูเปิด(isOpen ? null : n.id)
                  }}
                  className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                >
                  ⋮
                </button>

                {/* Dropdown เมื่อกด ⋮ */}
                {isOpen && (
                  <div
                    className="absolute top-10 right-3 bg-white border border-gray-200 rounded-xl shadow-lg z-20 overflow-hidden min-w-[13rem]"
                    onClick={function (e) { e.stopPropagation() }}
                  >
                    {!read && (
                      <button
                        onClick={() => { กดอ่าน(n); setเมนูเปิด(null) }}
                        className="flex items-center gap-2 px-4 py-3 text-sm text-gray-600 font-medium hover:bg-gray-50 w-full text-left border-b border-gray-100"
                      >
                        ✓ ทำเครื่องหมายว่าอ่านแล้ว
                      </button>
                    )}
                    <button
                      onClick={() => ลบแจ้งเตือน(n)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 w-full text-left"
                    >
                      🗑️ ลบการแจ้งเตือน
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationPage
