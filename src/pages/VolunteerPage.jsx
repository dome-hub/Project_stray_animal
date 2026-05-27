// VolunteerPage.jsx — เจ้าหน้าที่ / อาสาสมัคร
//
// reports  → Inbox: ดูรายงานทั้งหมด, กดการ์ด → Bottom sheet รายละเอียด + รับเรื่อง
// update   → Workflow: เลือกเคส → Bottom sheet อัปเดตสถานะ + auto-add animals
// animals  → จัดการสัตว์ในศูนย์ (รวมที่มาจากรายงาน)
// stats    → สถิติ

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ---- ค่าคงที่ ----
const ขั้นตอนตามสถานะ = {
  'รอดำเนินการ':    0,
  'รับเรื่องแล้ว':   1,
  'ลงพื้นที่แล้ว':   2,
  'อยู่ศูนย์พักพิง': 3,
  'มีผู้รับเลี้ยง':   4,
}
const ขั้นตอนทั้งหมด = ['แจ้งเข้า', 'รับเรื่อง', 'ลงพื้นที่', 'ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

const สีสถานะ = {
  'รอดำเนินการ':    'text-yellow-700 bg-yellow-50 border-yellow-200',
  'รับเรื่องแล้ว':   'text-blue-700 bg-blue-50 border-blue-200',
  'ลงพื้นที่แล้ว':   'text-indigo-700 bg-indigo-50 border-indigo-200',
  'อยู่ศูนย์พักพิง': 'text-purple-700 bg-purple-50 border-purple-200',
  'มีผู้รับเลี้ยง':   'text-green-700 bg-green-50 border-green-200',
}

const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง':  'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง':   'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา': 'text-orange-600 bg-orange-50',
  'มีผู้รับเลี้ยง':    'text-gray-500 bg-gray-100',
}

// ---- Helper: แปลงวันที่ ----
function แปลงวันที่เวลา(str) {
  if (!str) return ''
  const d = new Date(str)
  return (
    d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) +
    ' น.'
  )
}

// ---- Helper: Progress Bar ----
function ProgressBar({ status }) {
  const stepIdx = ขั้นตอนตามสถานะ[status] ?? 0
  return (
    <div className="flex items-center">
      {ขั้นตอนทั้งหมด.map(function (ขั้น, idx) {
        const done    = idx <= stepIdx
        const current = idx === stepIdx
        return (
          <div key={idx} className="flex items-center flex-1">
            <div className="flex flex-col items-center">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                done
                  ? current
                    ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                    : 'bg-green-500 text-white'
                  : 'bg-gray-200 text-gray-400'
              }`}>
                {done && !current ? '✓' : idx + 1}
              </div>
              <p className={`text-center mt-1 leading-tight ${
                done ? (current ? 'text-orange-600' : 'text-green-600') : 'text-gray-400'
              }`} style={{ fontSize: '8px', maxWidth: 44 }}>
                {ขั้น}
              </p>
            </div>
            {idx < ขั้นตอนทั้งหมด.length - 1 && (
              <div className={`flex-1 h-0.5 mb-4 ${idx < stepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
            )}
          </div>
        )
      })}
    </div>
  )
}

// ---- Helper: รูปสัตว์ ----
function AnimalThumb({ imageUrl, type, size = 'md' }) {
  const dim = size === 'lg' ? 'w-full h-52' : 'w-16 h-16 shrink-0'
  return (
    <div className={`${dim} rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center`}>
      {imageUrl
        ? <img src={imageUrl} alt="สัตว์" className="w-full h-full object-cover" />
        : <span className={size === 'lg' ? 'text-7xl' : 'text-3xl'}>
            {type?.includes('แมว') ? '🐈' : '🐕'}
          </span>
      }
    </div>
  )
}

// ===========================================================================
function VolunteerPage({ หน้า }) {
  const navigate = useNavigate()

  // ---- รายงาน (shared: reports + update) ----
  const [รายงานทั้งหมด, setรายงานทั้งหมด] = useState([])
  const [โหลดรายงาน,   setโหลดรายงาน]   = useState(true)

  // ---- Bottom sheet รายละเอียด (ใช้ทั้ง reports และ update) ----
  const [รายงานที่เปิด,  setรายงานที่เปิด]  = useState(null)   // report object
  const [ข้อมูลผู้แจ้ง,  setข้อมูลผู้แจ้ง]  = useState(null)   // { name, phone, email }
  const [โหลดผู้แจ้ง,   setโหลดผู้แจ้ง]   = useState(false)
  const [กำลังรับเรื่อง, setกำลังรับเรื่อง] = useState(false)

  // ---- อัปเดตสถานะ ----
  const [สถานะใหม่,   setSถานะใหม่]   = useState('')
  const [หมายเหตุ,    setหมายเหตุ]    = useState('')
  const [กำลังบันทึก, setกำลังบันทึก] = useState(false)
  const [แจ้งสำเร็จ,  setแจ้งสำเร็จ]  = useState('')   // ข้อความ toast

  // ---- Filter (reports) ----
  const [filterTab, setFilterTab] = useState('all')

  // ---- Animals ----
  const [สัตว์จากDB,        setSัตว์จากDB]        = useState([])
  const [โหลดสัตว์,         setโหลดสัตว์]         = useState(true)
  const [สัตว์ที่แก้ไข,      setSัตว์ที่แก้ไข]      = useState(null)
  const [ข้อมูลรายงานสัตว์,  setข้อมูลรายงานสัตว์]  = useState(null)   // { report + reporter }
  const [โหลดรายงานสัตว์,   setโหลดรายงานสัตว์]   = useState(false)
  const [แสดงฟอร์มเพิ่ม, setแสดงฟอร์มเพิ่ม] = useState(false)
  const [ชื่อสัตว์,       setชื่อสัตว์]       = useState('')
  const [เพศสัตว์,       setเพศสัตว์]       = useState('')
  const [สายพันธุ์,      setSายพันธุ์]      = useState('')
  const [อายุสัตว์,      setอายุสัตว์]      = useState('')
  const [สุขภาพสัตว์,    setSุขภาพสัตว์]    = useState('ปกติ')

  // ---- Stats ----
  const [สถิติ, setSถิติ] = useState({ รายงาน: 0, รอดำเนินการ: 0, สัตว์: 0, รับเลี้ยงแล้ว: 0 })

  // ================================================================
  // FETCH
  // ================================================================
  useEffect(function () {
    if (หน้า === 'reports' || หน้า === 'update') ดึงรายงาน()
    if (หน้า === 'animals') ดึงสัตว์()
    if (หน้า === 'stats')   ดึงสถิติ()
  }, [หน้า])

  async function ดึงรายงาน() {
    setโหลดรายงาน(true)
    const { data } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setรายงานทั้งหมด(data)
    setโหลดรายงาน(false)
  }

  async function ดึงสัตว์() {
    setโหลดสัตว์(true)
    const { data } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false })
    if (data) setSัตว์จากDB(data)
    setโหลดสัตว์(false)
  }

  async function ดึงสถิติ() {
    const [ร1, ร2, ร3, ร4] = await Promise.all([
      supabase.from('reports').select('id', { count: 'exact', head: true }),
      supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'รอดำเนินการ'),
      supabase.from('animals').select('id', { count: 'exact', head: true }),
      supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
    ])
    setSถิติ({ รายงาน: ร1.count || 0, รอดำเนินการ: ร2.count || 0, สัตว์: ร3.count || 0, รับเลี้ยงแล้ว: ร4.count || 0 })
  }

  // ================================================================
  // DETAIL SHEET: เปิด / ปิด
  // ================================================================
  async function เปิดรายละเอียด(report) {
    setรายงานที่เปิด(report)
    setSถานะใหม่('')
    setหมายเหตุ(report.volunteer_notes || '')
    setข้อมูลผู้แจ้ง(null)

    if (report.reporter_id) {
      setโหลดผู้แจ้ง(true)
      const { data } = await supabase
        .from('users')
        .select('name, phone, email, avatar_url')
        .eq('id', report.reporter_id)
        .single()
      setข้อมูลผู้แจ้ง(data || null)
      setโหลดผู้แจ้ง(false)
    }
  }

  function ปิดรายละเอียด() {
    setรายงานที่เปิด(null)
    setข้อมูลผู้แจ้ง(null)
    setSถานะใหม่('')
    setหมายเหตุ('')
  }

  function toast(msg) {
    setแจ้งสำเร็จ(msg)
    setTimeout(() => setแจ้งสำเร็จ(''), 3500)
  }

  // ================================================================
  // รับเรื่อง (จาก reports inbox)
  // ================================================================
  async function รับเรื่อง() {
    if (!รายงานที่เปิด || กำลังรับเรื่อง) return
    setกำลังรับเรื่อง(true)

    const report = รายงานที่เปิด
    const { error } = await supabase
      .from('reports')
      .update({ status: 'รับเรื่องแล้ว', updated_at: new Date().toISOString() })
      .eq('id', report.id)

    if (!error) {
      // ส่ง notification ให้ผู้แจ้ง
      if (report.reporter_id) {
        const { error: notiErr } = await supabase.from('notifications').insert({
          user_id: report.reporter_id,
          title:   'เจ้าหน้าที่รับเรื่องแล้ว 🦺',
          body:    `รายงาน #${String(report.id).padStart(6, '0')} ของคุณได้รับการดูแลแล้ว เจ้าหน้าที่จะลงพื้นที่เพื่อรับสัตว์โดยเร็ว`,
          type:    'report_update',
          is_read: false,
        })
        if (notiErr) console.error('❌ ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
        else console.log('✅ ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
      }
      // อัปเดต local state
      setรายงานทั้งหมด(function (prev) {
        return prev.map(function (r) {
          return r.id === report.id ? { ...r, status: 'รับเรื่องแล้ว' } : r
        })
      })
      setรายงานที่เปิด(function (prev) {
        return prev ? { ...prev, status: 'รับเรื่องแล้ว' } : prev
      })
      toast('✅ รับเรื่องสำเร็จ! แจ้งเตือนผู้แจ้งแล้ว')
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setกำลังรับเรื่อง(false)
  }

  // ================================================================
  // บันทึกการอัปเดตสถานะ (จาก update workflow)
  // ================================================================
  async function บันทึกการอัปเดต() {
    if (!รายงานที่เปิด || !สถานะใหม่ || กำลังบันทึก) return
    setกำลังบันทึก(true)

    const report = รายงานที่เปิด
    const { error } = await supabase
      .from('reports')
      .update({
        status:          สถานะใหม่,
        volunteer_notes: หมายเหตุ.trim() || null,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', report.id)

    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
      setกำลังบันทึก(false)
      return
    }

    // ถ้าสถานะถึง "อยู่ศูนย์พักพิง" → สร้างสัตว์ใน animals table อัตโนมัติ
    if (สถานะใหม่ === 'อยู่ศูนย์พักพิง') {
      const { data: existing } = await supabase
        .from('animals')
        .select('id')
        .eq('report_id', report.id)
        .maybeSingle()

      if (!existing) {
        const { error: animalErr } = await supabase.from('animals').insert({
          name:      'ยังไม่ตั้งชื่อ',
          breed:     report.animal_type || 'ไม่ระบุ',
          status:    'อยู่ศูนย์พักพิง',
          health:    'ยังไม่ตรวจ',
          photo_url: report.image_url || null,
          location:  report.location_text || 'กำแพงแสน นครปฐม',
          report_id: report.id,
        })
        if (animalErr) console.error('❌ เพิ่มสัตว์ไม่สำเร็จ:', animalErr.message)
        else console.log('✅ เพิ่มสัตว์ในระบบอัตโนมัติสำเร็จ (report_id:', report.id, ')')
      }
    }

    // ส่ง notification ให้ผู้แจ้ง — ทุกสถานะที่เปลี่ยน
    const msgMap = {
      'รับเรื่องแล้ว':   `เจ้าหน้าที่รับเรื่องรายงาน #${String(report.id).padStart(6, '0')} ของคุณแล้ว กำลังเตรียมลงพื้นที่`,
      'ลงพื้นที่แล้ว':   `เจ้าหน้าที่ลงพื้นที่แล้ว (รายงาน #${String(report.id).padStart(6, '0')}) กำลังดำเนินการรับสัตว์`,
      'อยู่ศูนย์พักพิง': `สัตว์ที่คุณแจ้ง (#${String(report.id).padStart(6, '0')}) มาถึงศูนย์พักพิงแล้ว กำลังรับการดูแล 🏠`,
      'มีผู้รับเลี้ยง':   `สัตว์ที่คุณแจ้ง (#${String(report.id).padStart(6, '0')}) ได้รับการรับเลี้ยงแล้ว ขอบคุณที่ช่วยเหลือ 🎉`,
    }
    if (report.reporter_id && msgMap[สถานะใหม่]) {
      const { error: notiErr } = await supabase.from('notifications').insert({
        user_id: report.reporter_id,
        title:   `อัปเดตรายงาน #${String(report.id).padStart(6, '0')}`,
        body:    msgMap[สถานะใหม่],
        type:    'report_update',
        is_read: false,
      })
      if (notiErr) console.error('❌ ส่ง notification ไม่สำเร็จ:', notiErr.message, notiErr.code)
      else console.log('✅ ส่ง notification ให้ผู้แจ้งสำเร็จ (reporter_id:', report.reporter_id, ')')
    }

    // อัปเดต local state
    setรายงานทั้งหมด(function (prev) {
      return prev.map(function (r) {
        return r.id === report.id
          ? { ...r, status: สถานะใหม่, volunteer_notes: หมายเหตุ.trim() }
          : r
      })
    })
    toast('💾 บันทึกสถานะสำเร็จ!')
    ปิดรายละเอียด()
    setกำลังบันทึก(false)
  }

  // ================================================================
  // Animals: เพิ่ม + แก้ไข
  // ================================================================
  async function บันทึกสัตว์ใหม่() {
    if (!ชื่อสัตว์ || !เพศสัตว์) return
    const { error } = await supabase.from('animals').insert({
      name:     ชื่อสัตว์,
      gender:   เพศสัตว์,
      breed:    สายพันธุ์,
      age:      อายุสัตว์,
      health:   สุขภาพสัตว์ || 'ปกติ',
      status:   'อยู่ศูนย์พักพิง',
      location: 'กำแพงแสน นครปฐม',
    })
    if (!error) {
      setชื่อสัตว์(''); setเพศสัตว์(''); setSายพันธุ์('')
      setอายุสัตว์(''); setSุขภาพสัตว์('ปกติ')
      setแสดงฟอร์มเพิ่ม(false)
      ดึงสัตว์()
      toast('✅ เพิ่มสัตว์สำเร็จ!')
    }
  }

  async function บันทึกแก้ไขสัตว์() {
    if (!สัตว์ที่แก้ไข) return
    const { error } = await supabase.from('animals').update({
      name:         สัตว์ที่แก้ไข.name,
      breed:        สัตว์ที่แก้ไข.breed,
      age:          สัตว์ที่แก้ไข.age,
      gender:       สัตว์ที่แก้ไข.gender,
      health:       สัตว์ที่แก้ไข.health,
      status:       สัตว์ที่แก้ไข.status,
      traits:       สัตว์ที่แก้ไข.traits       || null,
      vaccine_info: สัตว์ที่แก้ไข.vaccine_info || null,
    }).eq('id', สัตว์ที่แก้ไข.id)

    if (!error) {
      setSัตว์จากDB(function (prev) {
        return prev.map(function (s) { return s.id === สัตว์ที่แก้ไข.id ? สัตว์ที่แก้ไข : s })
      })
      setSัตว์ที่แก้ไข(null)
      setข้อมูลรายงานสัตว์(null)
      toast('✅ บันทึกข้อมูลสัตว์สำเร็จ!')
    } else {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    }
  }

  // เปิด bottom sheet แก้ไขสัตว์ + ดึงข้อมูลรายงาน/ผู้แจ้ง (ถ้ามาจากรายงาน)
  async function เปิดแก้ไขสัตว์(สัตว์) {
    setSัตว์ที่แก้ไข({ ...สัตว์ })
    setข้อมูลรายงานสัตว์(null)

    if (!สัตว์.report_id) return

    setโหลดรายงานสัตว์(true)
    const { data: report } = await supabase
      .from('reports')
      .select('id, animal_type, location_text, latitude, longitude, detail, reporter_id, created_at')
      .eq('id', สัตว์.report_id)
      .single()

    if (report) {
      let reporter = null
      if (report.reporter_id) {
        const { data } = await supabase
          .from('users')
          .select('name, phone, email, avatar_url')
          .eq('id', report.reporter_id)
          .single()
        reporter = data || null
      }
      setข้อมูลรายงานสัตว์({ ...report, reporter })
    }
    setโหลดรายงานสัตว์(false)
  }

  // ================================================================
  // กรองรายงาน
  // ================================================================
  const รายงานกรอง = รายงานทั้งหมด.filter(function (ร) {
    if (filterTab === 'pending') return ร.status === 'รอดำเนินการ'
    if (filterTab === 'active')  return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง'].includes(ร.status)
    if (filterTab === 'done')    return ร.status === 'มีผู้รับเลี้ยง'
    return true
  })

  const รายงานActive = รายงานทั้งหมด.filter(function (ร) {
    return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง'].includes(ร.status)
  })

  const titleMap = {
    reports: 'รายการแจ้งสัตว์จร',
    update:  'อัปเดตสถานะสัตว์',
    animals: 'จัดการข้อมูลสัตว์',
    stats:   'สถิติพื้นที่รับผิดชอบ',
  }

  // ================================================================
  // RENDER
  // ================================================================
  return (
    <div className="min-h-screen bg-orange-50 pb-8">

      {/* Toast */}
      {แจ้งสำเร็จ && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[100] bg-gray-800 text-white text-sm px-5 py-3 rounded-2xl shadow-xl">
          {แจ้งสำเร็จ}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-orange-600">🦺 เจ้าหน้าที่ / อาสาสมัคร</p>
        </div>
      </div>

      {/* ============================================================
          REPORTS — Inbox
          ============================================================ */}
      {หน้า === 'reports' && (
        <div className="pt-4">

          {/* Filter Tabs */}
          <div className="px-4 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[
                { key: 'all',     label: 'ทั้งหมด',       count: รายงานทั้งหมด.length },
                { key: 'pending', label: '🔴 ใหม่',        count: รายงานทั้งหมด.filter(function (r) { return r.status === 'รอดำเนินการ' }).length },
                { key: 'active',  label: '🔵 ดำเนินการ',  count: รายงานทั้งหมด.filter(function (r) { return ['รับเรื่องแล้ว','ลงพื้นที่แล้ว','อยู่ศูนย์พักพิง'].includes(r.status) }).length },
                { key: 'done',    label: '✅ เสร็จ',       count: รายงานทั้งหมด.filter(function (r) { return r.status === 'มีผู้รับเลี้ยง' }).length },
              ].map(function (tab) {
                return (
                  <button key={tab.key} onClick={() => setFilterTab(tab.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterTab === tab.key ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1 font-bold ${filterTab === tab.key ? 'text-orange-600' : 'text-gray-400'}`}>
                        ({tab.count})
                      </span>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Loading */}
          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดรายงาน && รายงานกรอง.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">ไม่มีรายงานในกลุ่มนี้</p>
            </div>
          )}

          {/* รายการการ์ด */}
          <div className="px-4 space-y-3">
            {รายงานกรอง.map(function (ร) {
              const isNew  = ร.status === 'รอดำเนินการ'
              const isDone = ร.status === 'มีผู้รับเลี้ยง'
              return (
                <button key={ร.id} onClick={() => เปิดรายละเอียด(ร)}
                  className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden transition-all active:scale-95 ${
                    isNew ? 'ring-2 ring-orange-300' : ''
                  }`}
                >
                  <div className={`h-1.5 w-full ${isNew ? 'bg-yellow-400' : isDone ? 'bg-green-400' : 'bg-blue-400'}`} />
                  <div className="p-4 flex items-center gap-3">
                    <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-0.5">
                        <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุประเภท'}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${สีสถานะ[ร.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                          {ร.status}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 truncate">📍 {ร.location_text || '-'}</p>
                      <p className="text-xs text-gray-400">{แปลงวันที่เวลา(ร.created_at)} · #{String(ร.id).padStart(6, '0')}</p>
                      {ร.detail && (
                        <p className="text-xs text-gray-400 italic mt-0.5 truncate">"{ร.detail}"</p>
                      )}
                    </div>
                    <span className="text-gray-300 text-xl shrink-0">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          UPDATE — Workflow
          ============================================================ */}
      {หน้า === 'update' && (
        <div className="px-4 pt-4 space-y-4">

          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            </div>
          )}

          {!โหลดรายงาน && (
            <>
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="text-xs text-orange-700 font-medium">⚙️ เลือกรายงานเพื่ออัปเดตสถานะ</p>
                <p className="text-xs text-orange-500 mt-0.5">{รายงานActive.length} รายการรอดำเนินการ</p>
              </div>

              {รายงานActive.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="font-medium text-gray-600">ไม่มีรายงานค้างอยู่</p>
                  <p className="text-xs text-gray-400 mt-1">ทุกรายงานได้รับการดูแลเรียบร้อย</p>
                </div>
              )}

              {รายงานActive.map(function (ร) {
                return (
                  <button key={ร.id} onClick={() => เปิดรายละเอียด(ร)}
                    className="w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden active:scale-95 transition-all"
                  >
                    <div className={`h-1.5 ${ร.status === 'รอดำเนินการ' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                    <div className="p-4 flex items-center gap-3">
                      <AnimalThumb imageUrl={ร.image_url} type={ร.animal_type} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-500 truncate">📍 {ร.location_text}</p>
                        <p className="text-xs text-gray-400">{แปลงวันที่เวลา(ร.created_at)}</p>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium border mt-1 inline-block ${สีสถานะ[ร.status] || ''}`}>
                          {ร.status}
                        </span>
                      </div>
                      <span className="text-gray-300 text-xl shrink-0">›</span>
                    </div>
                  </button>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* ============================================================
          ANIMALS — จัดการสัตว์ในศูนย์
          ============================================================ */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setแสดงฟอร์มเพิ่ม(!แสดงฟอร์มเพิ่ม)}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-medium">
            {แสดงฟอร์มเพิ่ม ? '✕ ปิดฟอร์ม' : '+ เพิ่มสัตว์ใหม่ (manual)'}
          </button>

          {แสดงฟอร์มเพิ่ม && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-800">เพิ่มสัตว์เข้าศูนย์พักพิง</p>
              {[
                { label: 'ชื่อสัตว์', val: ชื่อสัตว์, set: setชื่อสัตว์, placeholder: 'เช่น มะม่วง, ขาว', required: true },
                { label: 'สายพันธุ์', val: สายพันธุ์, set: setSายพันธุ์, placeholder: 'เช่น สุนัขพันธุ์ไทย', required: false },
                { label: 'สุขภาพ',   val: สุขภาพสัตว์, set: setSุขภาพสัตว์, placeholder: 'เช่น ปกติ, บาดเจ็บ', required: false },
              ].map(function (f) {
                return (
                  <div key={f.label}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">
                      {f.label} {f.required && <span className="text-red-400">*</span>}
                    </p>
                    <input value={f.val} onChange={(e) => f.set(e.target.value)} placeholder={f.placeholder}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
                  </div>
                )
              })}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map(function (เพศ) {
                    return (
                      <button key={เพศ} onClick={() => setเพศสัตว์(เพศ)}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 ${
                          เพศสัตว์ === เพศ ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-gray-700'
                        }`}>{เพศ}</button>
                    )
                  })}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ</p>
                <select value={อายุสัตว์} onChange={(e) => setอายุสัตว์(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white">
                  <option value="">-- เลือก --</option>
                  {['น้อยกว่า 1 ปี','1–2 ปี','2–5 ปี','5–10 ปี','มากกว่า 10 ปี','ไม่ทราบ'].map(function (a) {
                    return <option key={a}>{a}</option>
                  })}
                </select>
              </div>
              <button onClick={บันทึกสัตว์ใหม่} disabled={!ชื่อสัตว์ || !เพศสัตว์}
                className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                บันทึกข้อมูลสัตว์
              </button>
            </div>
          )}

          <div>
            <p className="text-sm font-semibold text-gray-700">สัตว์ในความดูแล ({สัตว์จากDB.length} ตัว)</p>
            <p className="text-xs text-gray-400 mt-0.5">รวมสัตว์ที่มาจากรายงาน (สถานะ อยู่ศูนย์พักพิง)</p>
          </div>

          {โหลดสัตว์ && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!โหลดสัตว์ && สัตว์จากDB.length === 0 && (
            <div className="text-center py-12 text-gray-400">
              <p className="text-4xl mb-2">🐾</p>
              <p className="text-sm">ยังไม่มีสัตว์ในระบบ</p>
            </div>
          )}

          <div className="space-y-3">
            {สัตว์จากDB.map(function (สัตว์) {
              return (
                <button key={สัตว์.id} onClick={() => เปิดแก้ไขสัตว์(สัตว์)}
                  className="w-full text-left bg-white rounded-2xl p-4 shadow-sm active:scale-95 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-green-50 overflow-hidden flex items-center justify-center shrink-0">
                      {สัตว์.photo_url
                        ? <img src={สัตว์.photo_url} alt={สัตว์.name} className="w-full h-full object-cover" />
                        : <span className="text-3xl">{สัตว์.breed?.includes('แมว') ? '🐈' : '🐕'}</span>
                      }
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-bold text-gray-800">{สัตว์.name}</p>
                        {สัตว์.report_id && (
                          <span className="text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full">📋 จากรายงาน</span>
                        )}
                      </div>
                      <p className="text-xs text-gray-500">{สัตว์.breed || 'ไม่ระบุ'} · {สัตว์.age || '-'} · {สัตว์.gender || '-'}</p>
                      <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.status] || 'text-gray-600 bg-gray-50'}`}>
                        {สัตว์.status}
                      </span>
                    </div>
                    <span className="text-gray-300 text-xl shrink-0">›</span>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* ============================================================
          STATS
          ============================================================ */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'รายงานทั้งหมด',  ค่า: สถิติ.รายงาน,       emoji: '📋', bg: 'bg-orange-50', text: 'text-orange-600' },
              { ชื่อ: 'รอดำเนินการ',    ค่า: สถิติ.รอดำเนินการ,  emoji: '⏳', bg: 'bg-yellow-50', text: 'text-yellow-600' },
              { ชื่อ: 'สัตว์ในดูแล',    ค่า: สถิติ.สัตว์,         emoji: '🐾', bg: 'bg-green-50',  text: 'text-green-600' },
              { ชื่อ: 'รับเลี้ยงแล้ว',   ค่า: สถิติ.รับเลี้ยงแล้ว, emoji: '❤️', bg: 'bg-red-50',   text: 'text-red-600' },
            ].map(function (stat) {
              return (
                <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.bg}`}>
                  <p className="text-3xl mb-1">{stat.emoji}</p>
                  <p className={`text-3xl font-bold ${stat.text}`}>{stat.ค่า}</p>
                  <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
                </div>
              )
            })}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-1">พื้นที่รับผิดชอบ</p>
            <p className="text-sm text-gray-600">📍 จังหวัดนครปฐม ตำบลกำแพงแสน</p>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM SHEET: รายละเอียดรายงาน (Reports Inbox)
          ============================================================ */}
      {รายงานที่เปิด && หน้า === 'reports' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')}</p>
              <button onClick={ปิดรายละเอียด} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูปสัตว์ */}
              <AnimalThumb imageUrl={รายงานที่เปิด.image_url} type={รายงานที่เปิด.animal_type} size="lg" />

              {/* ชื่อ + สถานะ + progress */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="font-bold text-gray-800 text-lg">{รายงานที่เปิด.animal_type || 'ไม่ระบุประเภท'}</p>
                    <p className="text-xs text-gray-400">{แปลงวันที่เวลา(รายงานที่เปิด.created_at)}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-medium border ${สีสถานะ[รายงานที่เปิด.status] || ''}`}>
                    {รายงานที่เปิด.status}
                  </span>
                </div>
                <ProgressBar status={รายงานที่เปิด.status} />
              </div>

              {/* ตำแหน่ง */}
              <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                <span className="text-xl mt-0.5">📍</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-400 mb-0.5">ตำแหน่งที่พบสัตว์</p>
                  <p className="text-sm font-semibold text-gray-800">{รายงานที่เปิด.location_text || '-'}</p>
                  {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                    >
                      🗺️ เปิดใน Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="flex items-start gap-3 bg-white rounded-xl p-3 border border-gray-100 shadow-sm">
                  <span className="text-xl mt-0.5">💬</span>
                  <div>
                    <p className="text-xs text-gray-400 mb-0.5">รายละเอียดจากผู้แจ้ง</p>
                    <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                  </div>
                </div>
              )}

              {/* ข้อมูลผู้แจ้ง */}
              <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100">
                <p className="text-xs font-bold text-blue-700 mb-3">👤 ข้อมูลผู้แจ้ง</p>
                {!รายงานที่เปิด.reporter_id && (
                  <p className="text-sm text-gray-400 italic">ไม่ระบุตัวตน (แจ้งโดยไม่ login)</p>
                )}
                {รายงานที่เปิด.reporter_id && โหลดผู้แจ้ง && (
                  <p className="text-sm text-gray-400">กำลังโหลดข้อมูล...</p>
                )}
                {รายงานที่เปิด.reporter_id && !โหลดผู้แจ้ง && ข้อมูลผู้แจ้ง && (
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                        {ข้อมูลผู้แจ้ง.avatar_url
                          ? <img src={ข้อมูลผู้แจ้ง.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                          : <span className="text-xl">👤</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800">{ข้อมูลผู้แจ้ง.name || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-500">{ข้อมูลผู้แจ้ง.email || '-'}</p>
                      </div>
                    </div>
                    {ข้อมูลผู้แจ้ง.phone ? (
                      <a href={`tel:${ข้อมูลผู้แจ้ง.phone}`}
                         className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-blue-200 w-full"
                      >
                        <span className="text-xl">📞</span>
                        <div>
                          <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                          <p className="text-base font-bold text-blue-600">{ข้อมูลผู้แจ้ง.phone}</p>
                        </div>
                        <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                      </a>
                    ) : (
                      <p className="text-xs text-gray-400 bg-white rounded-xl px-4 py-2 border border-dashed border-blue-200">
                        ⚠️ ผู้แจ้งยังไม่ได้ระบุเบอร์โทร
                      </p>
                    )}
                  </div>
                )}
                {รายงานที่เปิด.reporter_id && !โหลดผู้แจ้ง && !ข้อมูลผู้แจ้ง && (
                  <p className="text-sm text-gray-400 italic">ไม่พบข้อมูลในระบบ</p>
                )}
              </div>

              {/* หมายเหตุเจ้าหน้าที่ */}
              {รายงานที่เปิด.volunteer_notes && (
                <div className="bg-purple-50 rounded-xl p-3 border border-purple-100">
                  <p className="text-xs font-semibold text-purple-600 mb-1">📝 บันทึกเจ้าหน้าที่</p>
                  <p className="text-sm text-gray-700">{รายงานที่เปิด.volunteer_notes}</p>
                </div>
              )}

              {/* ปุ่มหลัก */}
              {รายงานที่เปิด.status === 'รอดำเนินการ' ? (
                <button onClick={รับเรื่อง} disabled={กำลังรับเรื่อง}
                  className="w-full bg-orange-500 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-60 active:scale-95 transition-all">
                  {กำลังรับเรื่อง ? '⏳ กำลังรับเรื่อง...' : '✅ รับเรื่อง (แจ้งเตือนผู้แจ้งอัตโนมัติ)'}
                </button>
              ) : (
                <div className="bg-gray-50 rounded-2xl p-4 text-center">
                  <p className="text-sm text-gray-500 mb-2">รับเรื่องแล้ว — ไปอัปเดตความคืบหน้า</p>
                  <button onClick={function () { ปิดรายละเอียด(); navigate('/volunteer/update') }}
                    className="text-orange-600 font-semibold text-sm underline">
                    → ไปหน้าอัปเดตสถานะ
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM SHEET: อัปเดตสถานะ (Update Workflow)
          ============================================================ */}
      {รายงานที่เปิด && หน้า === 'update' && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">อัปเดต #{String(รายงานที่เปิด.id).padStart(6, '0')}</p>
              <button onClick={ปิดรายละเอียด} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูป + ข้อมูล */}
              <div className="flex gap-3 items-start bg-gray-50 rounded-2xl p-3">
                <AnimalThumb imageUrl={รายงานที่เปิด.image_url} type={รายงานที่เปิด.animal_type} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-gray-800">{รายงานที่เปิด.animal_type || 'ไม่ระบุ'}</p>
                  <p className="text-xs text-gray-500 truncate">📍 {รายงานที่เปิด.location_text}</p>
                  <p className="text-xs text-gray-400">{แปลงวันที่เวลา(รายงานที่เปิด.created_at)}</p>
                  {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                    <a
                      href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                      target="_blank" rel="noreferrer"
                      className="inline-flex items-center gap-1 mt-1.5 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                    >
                      🗺️ Google Maps →
                    </a>
                  )}
                </div>
              </div>

              {/* Progress bar */}
              <div className="bg-gray-50 rounded-2xl p-3">
                <ProgressBar status={รายงานที่เปิด.status} />
              </div>

              {/* ข้อมูลผู้แจ้ง (compact) */}
              {รายงานที่เปิด.reporter_id && (
                <div className="bg-blue-50 rounded-xl p-3 border border-blue-100">
                  <p className="text-xs font-semibold text-blue-600 mb-2">👤 ผู้แจ้ง</p>
                  {โหลดผู้แจ้ง ? (
                    <p className="text-xs text-gray-400">กำลังโหลด...</p>
                  ) : ข้อมูลผู้แจ้ง ? (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                          {ข้อมูลผู้แจ้ง.avatar_url
                            ? <img src={ข้อมูลผู้แจ้ง.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                            : <span className="text-lg">👤</span>
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold">{ข้อมูลผู้แจ้ง.name || '-'}</p>
                          <p className="text-xs text-gray-500">{ข้อมูลผู้แจ้ง.email || '-'}</p>
                        </div>
                      </div>
                      {ข้อมูลผู้แจ้ง.phone && (
                        <a href={`tel:${ข้อมูลผู้แจ้ง.phone}`}
                           className="bg-blue-500 text-white text-xs px-3 py-2 rounded-xl font-semibold shrink-0">
                          📞 {ข้อมูลผู้แจ้ง.phone}
                        </a>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">ไม่พบข้อมูล</p>
                  )}
                </div>
              )}

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="bg-gray-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1 font-medium">รายละเอียดจากผู้แจ้ง</p>
                  <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                </div>
              )}

              {/* เลือกสถานะใหม่ */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  เปลี่ยนสถานะ
                  <span className="text-xs font-normal text-gray-400 ml-2">ปัจจุบัน: {รายงานที่เปิด.status}</span>
                </p>
                <div className="space-y-2">
                  {['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง'].map(function (ส) {
                    const isCurrent = รายงานที่เปิด.status === ส
                    const isSelected = สถานะใหม่ === ส
                    return (
                      <button key={ส} onClick={() => setSถานะใหม่(ส)} disabled={isCurrent}
                        className={`w-full py-3 px-4 rounded-xl text-sm font-medium border-2 text-left flex items-center justify-between transition-all ${
                          isCurrent
                            ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                            : isSelected
                            ? 'border-orange-500 bg-orange-500 text-white'
                            : 'border-gray-200 bg-white text-gray-700 hover:border-orange-200'
                        }`}
                      >
                        <span>{ส}</span>
                        {isCurrent && <span className="text-xs">← ปัจจุบัน</span>}
                        {isSelected && !isCurrent && <span>✓</span>}
                        {ส === 'อยู่ศูนย์พักพิง' && !isCurrent && !isSelected && (
                          <span className="text-xs text-orange-400">→ เพิ่มเข้าจัดการสัตว์อัตโนมัติ</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* หมายเหตุ */}
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  บันทึกหมายเหตุ
                  <span className="text-xs font-normal text-gray-400 ml-2">(เก็บใน database)</span>
                </p>
                <textarea value={หมายเหตุ} onChange={(e) => setหมายเหตุ(e.target.value)}
                  placeholder="เช่น ลงพื้นที่แล้ว สัตว์มีบาดแผล นำส่งสัตวแพทย์เรียบร้อย..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none" />
              </div>

              {/* ปุ่มบันทึก */}
              <button onClick={บันทึกการอัปเดต} disabled={!สถานะใหม่ || กำลังบันทึก}
                className="w-full bg-orange-500 text-white rounded-2xl py-4 font-bold text-base disabled:opacity-50 active:scale-95 transition-all">
                {กำลังบันทึก ? '⏳ กำลังบันทึก...' : '💾 บันทึกการอัปเดต'}
              </button>

              {สถานะใหม่ === 'อยู่ศูนย์พักพิง' && (
                <p className="text-xs text-center text-orange-500">
                  ⚡ เมื่อบันทึก ข้อมูลสัตว์จะถูกเพิ่มใน "จัดการข้อมูลสัตว์" โดยอัตโนมัติ
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================
          BOTTOM SHEET: แก้ไขสัตว์
          ============================================================ */}
      {สัตว์ที่แก้ไข && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end"
             onClick={() => { setSัตว์ที่แก้ไข(null); setข้อมูลรายงานสัตว์(null) }}>
          <div className="bg-white w-full rounded-t-3xl max-h-[93vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">แก้ไขข้อมูลสัตว์</p>
              <button onClick={() => { setSัตว์ที่แก้ไข(null); setข้อมูลรายงานสัตว์(null) }} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">
              {/* รูป */}
              <div className="w-full h-44 rounded-2xl overflow-hidden bg-green-50 flex items-center justify-center">
                {สัตว์ที่แก้ไข.photo_url
                  ? <img src={สัตว์ที่แก้ไข.photo_url} alt={สัตว์ที่แก้ไข.name} className="w-full h-full object-cover" />
                  : <span className="text-7xl">{สัตว์ที่แก้ไข.breed?.includes('แมว') ? '🐈' : '🐕'}</span>
                }
              </div>

              {สัตว์ที่แก้ไข.report_id && (
                <div className="bg-orange-50 rounded-xl px-4 py-2.5 text-xs text-orange-600 font-medium">
                  📋 มาจากรายงาน #{String(สัตว์ที่แก้ไข.report_id).padStart(6, '0')}
                </div>
              )}

              {/* ข้อมูลรายงาน + ผู้แจ้ง (เฉพาะสัตว์ที่มาจากรายงาน) */}
              {สัตว์ที่แก้ไข.report_id && (
                <div className="bg-blue-50 rounded-2xl p-4 border border-blue-100 space-y-3">
                  <p className="text-xs font-bold text-blue-700">👤 ข้อมูลผู้แจ้ง</p>

                  {โหลดรายงานสัตว์ && (
                    <p className="text-xs text-gray-400">กำลังโหลด...</p>
                  )}

                  {!โหลดรายงานสัตว์ && ข้อมูลรายงานสัตว์ && (
                    <>
                      {/* ตำแหน่งที่พบ */}
                      {ข้อมูลรายงานสัตว์.location_text && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <span className="text-base mt-0.5">📍</span>
                          <div className="flex-1">
                            <p className="text-xs text-gray-400">ตำแหน่งที่พบสัตว์</p>
                            <p className="text-sm font-semibold text-gray-800">{ข้อมูลรายงานสัตว์.location_text}</p>
                            {ข้อมูลรายงานสัตว์.latitude && ข้อมูลรายงานสัตว์.longitude && (
                              <a
                                href={`https://www.google.com/maps?q=${ข้อมูลรายงานสัตว์.latitude},${ข้อมูลรายงานสัตว์.longitude}`}
                                target="_blank" rel="noreferrer"
                                className="inline-flex items-center gap-1 mt-2 text-xs text-white bg-green-500 px-3 py-1.5 rounded-full font-medium"
                              >
                                🗺️ เปิดใน Google Maps →
                              </a>
                            )}
                          </div>
                        </div>
                      )}

                      {/* รายละเอียดจากผู้แจ้ง */}
                      {ข้อมูลรายงานสัตว์.detail && (
                        <div className="bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <p className="text-xs text-gray-400 mb-0.5">รายละเอียด</p>
                          <p className="text-sm text-gray-700">"{ข้อมูลรายงานสัตว์.detail}"</p>
                        </div>
                      )}

                      {/* ข้อมูลผู้แจ้ง */}
                      {ข้อมูลรายงานสัตว์.reporter ? (
                        <div className="space-y-2">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                              {ข้อมูลรายงานสัตว์.reporter.avatar_url
                                ? <img src={ข้อมูลรายงานสัตว์.reporter.avatar_url} alt="ผู้แจ้ง" className="w-full h-full object-cover" />
                                : <span className="text-xl">👤</span>
                              }
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">{ข้อมูลรายงานสัตว์.reporter.name || 'ไม่ระบุ'}</p>
                              <p className="text-xs text-gray-500">{ข้อมูลรายงานสัตว์.reporter.email || '-'}</p>
                            </div>
                          </div>
                          {ข้อมูลรายงานสัตว์.reporter.phone ? (
                            <a href={`tel:${ข้อมูลรายงานสัตว์.reporter.phone}`}
                               className="flex items-center gap-2 bg-white rounded-xl px-4 py-3 border border-blue-200 w-full">
                              <span className="text-xl">📞</span>
                              <div>
                                <p className="text-xs text-gray-400">เบอร์โทรติดต่อ</p>
                                <p className="text-base font-bold text-blue-600">{ข้อมูลรายงานสัตว์.reporter.phone}</p>
                              </div>
                              <span className="ml-auto text-blue-500 font-medium text-sm">กดโทร →</span>
                            </a>
                          ) : (
                            <p className="text-xs text-gray-400 bg-white rounded-xl px-3 py-2 border border-dashed border-blue-200">
                              ⚠️ ผู้แจ้งยังไม่ได้ระบุเบอร์โทร
                            </p>
                          )}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">ไม่พบข้อมูลผู้แจ้ง</p>
                      )}
                    </>
                  )}

                  {!โหลดรายงานสัตว์ && !ข้อมูลรายงานสัตว์ && (
                    <p className="text-xs text-gray-400 italic">ไม่พบข้อมูลรายงาน</p>
                  )}
                </div>
              )}

              {[
                { label: 'ชื่อสัตว์', key: 'name',   placeholder: 'ชื่อสัตว์' },
                { label: 'สายพันธุ์', key: 'breed',  placeholder: 'เช่น สุนัขพันธุ์ไทย' },
                { label: 'อายุ',      key: 'age',    placeholder: 'เช่น 2–3 ปี' },
                { label: 'สุขภาพ',   key: 'health', placeholder: 'เช่น ปกติ, บาดเจ็บ, รักษาอยู่' },
              ].map(function (f) {
                return (
                  <div key={f.key}>
                    <p className="text-xs font-semibold text-gray-600 mb-1">{f.label}</p>
                    <input value={สัตว์ที่แก้ไข[f.key] || ''} placeholder={f.placeholder}
                      onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, [f.key]: e.target.value } }) }}
                      className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
                  </div>
                )
              })}

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ</p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map(function (เพศ) {
                    return (
                      <button key={เพศ}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, gender: เพศ } }) }}
                        className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.gender === เพศ ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-gray-700'
                        }`}>{เพศ}</button>
                    )
                  })}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">สถานะ</p>
                <div className="grid grid-cols-2 gap-2">
                  {['อยู่ศูนย์พักพิง', 'รอการรับเลี้ยง', 'อยู่ระหว่างรักษา', 'มีผู้รับเลี้ยง'].map(function (ส) {
                    return (
                      <button key={ส}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, status: ส } }) }}
                        className={`py-2.5 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.status === ส ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 text-gray-700'
                        }`}>{ส}</button>
                    )
                  })}
                </div>
              </div>

              {/* ลักษณะนิสัย */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ลักษณะนิสัย</p>
                <input
                  value={สัตว์ที่แก้ไข.traits || ''}
                  placeholder="เช่น เป็นมิตร, ขี้เล่น, สงบเสงี่ยม (คั่นด้วยจุลภาค)"
                  onChange={function (e) { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, traits: e.target.value } }) }}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
                />
                <p className="text-xs text-gray-400 mt-1">คั่นนิสัยหลายข้อด้วย " , " เช่น เป็นมิตร, ขี้เล่น</p>
              </div>

              {/* ประวัติการฉีดวัคซีน */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">ประวัติการฉีดวัคซีน</p>
                <div className="flex gap-2">
                  {['ฉีดแล้ว', 'ยังไม่ฉีด', 'ไม่ทราบ'].map(function (ว) {
                    const สี = ว === 'ฉีดแล้ว' ? 'border-green-500 bg-green-500 text-white'
                              : ว === 'ยังไม่ฉีด' ? 'border-red-400 bg-red-400 text-white'
                              : 'border-gray-400 bg-gray-400 text-white'
                    return (
                      <button key={ว}
                        onClick={function () { setSัตว์ที่แก้ไข(function (prev) { return { ...prev, vaccine_info: ว } }) }}
                        className={`flex-1 py-2.5 rounded-xl text-xs font-medium border-2 ${
                          สัตว์ที่แก้ไข.vaccine_info === ว ? สี : 'border-gray-200 text-gray-600'
                        }`}>
                        {ว === 'ฉีดแล้ว' ? '✅ ฉีดแล้ว' : ว === 'ยังไม่ฉีด' ? '❌ ยังไม่ฉีด' : '❓ ไม่ทราบ'}
                      </button>
                    )
                  })}
                </div>
              </div>

              <button onClick={บันทึกแก้ไขสัตว์}
                className="w-full bg-green-500 text-white rounded-2xl py-4 font-bold text-base active:scale-95 transition-all">
                💾 บันทึกการแก้ไข
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default VolunteerPage
