// NotificationPage.jsx — การแจ้งเตือนจาก Supabase (ทุก role เชื่อม DB จริง)

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Siren, HardHat, Car, Home, CheckCircle2, ClipboardList, Bell, User, Shield,
  Clock, Trash2, ArrowLeft
} from 'lucide-react'
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

// ป้ายหัวข้อกลุ่มวันที่ (Section Header): วันนี้ / เมื่อวาน / วันที่จริง
function ป้ายวันที่(str) {
  if (!str) return ''
  const bkk  = toBKK(parseUTC(str))
  const now  = toBKK(new Date())
  const key  = (d) => `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`
  const yest = new Date(now.getTime() - 86400000)
  if (key(bkk) === key(now))  return 'วันนี้'
  if (key(bkk) === key(yest)) return 'เมื่อวาน'
  const ปี = bkk.getUTCFullYear() === now.getUTCFullYear() ? '' : ` ${bkk.getUTCFullYear() + 543}`
  return `${bkk.getUTCDate()} ${เดือนสั้น[bkk.getUTCMonth()]}${ปี}`
}

// เวลาบนการ์ด: ภายใน 24 ชม. = relative time (เพิ่งเกิดขึ้น / X นาที / X ชั่วโมงที่แล้ว)
// ข้ามวัน (เกิน 24 ชม.) = แสดงแค่เวลานาฬิกา เช่น 14:30 น.
function เวลาการ์ด(str) {
  if (!str) return ''
  const created = parseUTC(str)                 // UTC instant
  const diffMs  = Date.now() - created.getTime()
  const นาที    = Math.floor(diffMs / 60000)
  if (นาที < 1)  return 'เพิ่งเกิดขึ้น'
  if (นาที < 60) return `${นาที} นาทีที่แล้ว`
  const ชม = Math.floor(นาที / 60)
  if (ชม < 24)   return `${ชม} ชั่วโมงที่แล้ว`
  const bkk = toBKK(created)
  const hh  = String(bkk.getUTCHours()).padStart(2, '0')
  const mm  = String(bkk.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm} น.`
}

// จัดกลุ่มรายการที่เรียงใหม่→เก่าแล้ว เป็น section ตามวันที่
function จัดกลุ่มแจ้งเตือน(รายการ) {
  return รายการ.reduce(function (กลุ่ม, it) {
    const label = ป้ายวันที่(it.created)
    const ล่าสุด = กลุ่ม[กลุ่ม.length - 1]
    if (ล่าสุด && ล่าสุด.label === label) ล่าสุด.items.push(it)
    else กลุ่ม.push({ label, items: [it] })
    return กลุ่ม
  }, [])
}

// ไอคอนตามสถานะรายงาน — คืน component ของ lucide ไปเลย (ใช้เป็น fallback ตอนไม่มีรูปสัตว์)
function ไอคอนสถานะ(status) {
  if (status === 'รอดำเนินการ')    return Siren
  if (status === 'รับเรื่องแล้ว')   return HardHat
  if (status === 'ลงพื้นที่แล้ว')   return Car
  if (status === 'อยู่ศูนย์พักพิง') return Home
  if (status === 'มีผู้รับเลี้ยง')   return CheckCircle2
  return ClipboardList
}

const หัวข้อตามRole = {
  user:      'การแจ้งเตือน',
  volunteer: 'แจ้งเตือนเจ้าหน้าที่',
  admin:     'แจ้งเตือนผู้ดูแลระบบ',
}

// โทนสีตาม role — สอดคล้องกับทั้งแอป: user=ส้ม, volunteer=teal, admin=ม่วง
const ธีมตามRole = {
  user: {
    bg: 'bg-yellow-50', spinner: 'border-yellow-400',
    unreadCount: 'text-orange-500', badge: 'bg-blue-100 text-blue-700',
    unreadCard: 'bg-yellow-50 border-yellow-200', unreadTitle: 'text-orange-600', unreadDot: 'bg-orange-400',
    link: 'text-blue-500',
  },
  volunteer: {
    bg: 'bg-teal-50', spinner: 'border-teal-400',
    unreadCount: 'text-teal-600', badge: 'bg-teal-100 text-teal-700',
    unreadCard: 'bg-teal-50 border-teal-200', unreadTitle: 'text-teal-700', unreadDot: 'bg-teal-500',
    link: 'text-teal-600',
  },
  admin: {
    bg: 'bg-purple-50', spinner: 'border-purple-400',
    unreadCount: 'text-purple-600', badge: 'bg-purple-100 text-purple-700',
    unreadCard: 'bg-purple-50 border-purple-200', unreadTitle: 'text-purple-700', unreadDot: 'bg-purple-500',
    link: 'text-purple-600',
  },
}

function NotificationPage({ user }) {
  const navigate = useNavigate()
  const role = user?.role || 'user'
  const ธีม = ธีมตามRole[role] || ธีมตามRole.user

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
              Icon:     n.type === 'report_update' ? HardHat : Bell,
              หัวข้อ:   n.title || '',
              ข้อความ:  n.body || n.title || '',
              เวลา:     เวลาการ์ด(n.created_at),
              created:  n.created_at,
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
                Icon:     ไอคอนสถานะ(r.status),
                หัวข้อ:   isNew ? 'รายงานใหม่รอดำเนินการ' : `สถานะ: ${r.status}`,
                ข้อความ:  `${r.animal_type || 'สัตว์จร'} · ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
                เวลา:     เวลาการ์ด(r.created_at),
                created:  r.created_at,
                isNew,
                image_url: r.image_url || null,
                path:     '/volunteer/reports',
              }
            })
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
              Icon:    ไอคอนสถานะ(r.status),
              หัวข้อ:  r.status === 'รอดำเนินการ' ? 'รายงานรอดำเนินการ' : `รายงาน: ${r.status}`,
              ข้อความ: `${r.animal_type || 'สัตว์จร'} · ${r.location_text || 'ไม่ระบุ'} · #${String(r.id).padStart(6, '0')}`,
              เวลา:    เวลาการ์ด(r.created_at),
              created: r.created_at,
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
              Icon:    User,
              หัวข้อ:  'ผู้ใช้ใหม่ลงทะเบียน',
              ข้อความ: u.name || 'ผู้ใช้ใหม่',
              เวลา:    เวลาการ์ด(u.created_at),
              created: u.created_at,
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

  // เรียงใหม่→เก่าก่อนจัดกลุ่ม (ทุก role) เพื่อให้ section วันที่ต่อเนื่องถูกต้อง
  const กลุ่มวันที่ = จัดกลุ่มแจ้งเตือน(
    [...รายการ].sort(function (a, b) { return parseUTC(b.created).getTime() - parseUTC(a.created).getTime() })
  )

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
    <div className={`min-h-screen ${ธีม.bg} pb-8`} onClick={() => setเมนูเปิด(null)}>

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
          <div>
            <h1 className="font-bold text-gray-800">{หัวข้อตามRole[role]}</h1>
            {ยังไม่อ่าน > 0 && (
              <p className={`text-xs ${ธีม.unreadCount}`}>{ยังไม่อ่าน} รายการยังไม่ได้อ่าน</p>
            )}
          </div>
        </div>
        {ยังไม่อ่าน > 0 && (
          <button onClick={อ่านทั้งหมด} className={`text-xs font-medium ${ธีม.link}`}>
            อ่านทั้งหมด
          </button>
        )}
      </div>

      {/* Badge role */}
      <div className="px-4 pt-3">
        <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${ธีม.badge}`}>
          {role === 'admin'     ? <><Shield size={13} className="shrink-0" /> แสดงสำหรับ Admin</> :
           role === 'volunteer' ? <><HardHat size={13} className="shrink-0" /> แสดงสำหรับเจ้าหน้าที่</> :
           <><User size={13} className="shrink-0" /> แสดงสำหรับผู้ใช้ทั่วไป</>}
        </div>
      </div>

      {/* Loading */}
      {โหลด && (
        <div className="text-center py-16">
          <div className={`w-8 h-8 border-4 ${ธีม.spinner} border-t-transparent rounded-full animate-spin mx-auto mb-2`} />
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        </div>
      )}

      {/* ว่าง */}
      {!โหลด && รายการ.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <Bell size={48} strokeWidth={1.5} className="mx-auto mb-3 text-gray-300" />
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

      {/* รายการ — จัดกลุ่มตามวันที่ */}
      {!โหลด && (
        <div className="px-4 pt-3 space-y-5">
          {กลุ่มวันที่.map(function (กลุ่ม) {
          return (
          <div key={กลุ่ม.label}>
            <p className="text-xs font-semibold text-gray-400 mb-2 px-1">📅 {กลุ่ม.label}</p>
            <div className="space-y-3">
          {กลุ่ม.items.map(function (n) {
            const read    = isอ่านแล้ว(n)
            const isOpen  = เมนูเปิด === n.id
            return (
              <div
                key={n.id}
                className={`relative rounded-2xl shadow-sm ${
                  read ? 'bg-white' : `${ธีม.unreadCard} border-2`
                }`}
              >
                {/* พื้นที่กดทั้งการ์ด — อ่านแล้ว + พาไปหน้าเป้าหมายทันที */}
                <button
                  onClick={() => กดการ์ด(n)}
                  className="w-full text-left p-4 pr-10"
                >
                  <div className="flex items-start gap-3">
                    {/* รูปภาพสัตว์ของเคส (สี่เหลี่ยมขอบมน) — ไม่มีรูปค่อย fallback เป็นไอคอนตามสถานะ */}
                    <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 flex items-center justify-center shrink-0">
                      {n.image_url
                        ? <img src={n.image_url} alt="" className="w-full h-full object-cover" />
                        : <n.Icon size={22} className="text-gray-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      {n.หัวข้อ && (
                        <p className={`text-xs font-bold mb-0.5 ${read ? 'text-gray-400' : ธีม.unreadTitle}`}>
                          {n.หัวข้อ}
                        </p>
                      )}
                      <p className={`text-sm leading-snug ${read ? 'text-gray-500' : 'text-gray-800 font-medium'}`}>
                        {n.ข้อความ}
                      </p>
                      <p className="text-[11px] text-gray-400 mt-1 flex items-center gap-1">
                        <Clock size={11} className="shrink-0" /> {n.เวลา}
                      </p>
                    </div>
                    {!read && (
                      <div className={`w-2.5 h-2.5 ${ธีม.unreadDot} rounded-full mt-1 shrink-0`} />
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
                        <CheckCircle2 size={16} className="shrink-0" /> ทำเครื่องหมายว่าอ่านแล้ว
                      </button>
                    )}
                    <button
                      onClick={() => ลบแจ้งเตือน(n)}
                      className="flex items-center gap-2 px-4 py-3 text-sm text-red-500 font-medium hover:bg-red-50 w-full text-left"
                    >
                      <Trash2 size={16} className="shrink-0" /> ลบการแจ้งเตือน
                    </button>
                  </div>
                )}
              </div>
            )
          })}
            </div>
          </div>
          )
          })}
        </div>
      )}
    </div>
  )
}

export default NotificationPage
