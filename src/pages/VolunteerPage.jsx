// VolunteerPage.jsx — หน้าสำหรับเจ้าหน้าที่ / อาสาสมัคร
// รายการแจ้งสัตว์จร = Inbox ดูภาพรวม + กด "รับเรื่อง" ได้เลย
// อัปเดตสถานะ = Workflow เลือกเคส เปลี่ยนสถานะ บันทึกหมายเหตุลง DB

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// Progress steps ตาม status
const ขั้นตอนตามสถานะ = {
  'รอดำเนินการ':   0,
  'รับเรื่องแล้ว':  1,
  'ลงพื้นที่แล้ว':  2,
  'อยู่ศูนย์พักพิง': 3,
  'มีผู้รับเลี้ยง':  4,
}
const ขั้นตอนทั้งหมด = ['แจ้งเข้า', 'รับเรื่อง', 'ลงพื้นที่', 'ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

const สีสถานะ = {
  'รอดำเนินการ':    'text-yellow-700 bg-yellow-50 border-yellow-200',
  'รับเรื่องแล้ว':   'text-blue-700 bg-blue-50 border-blue-200',
  'ลงพื้นที่แล้ว':   'text-indigo-700 bg-indigo-50 border-indigo-200',
  'อยู่ศูนย์พักพิง': 'text-purple-700 bg-purple-50 border-purple-200',
  'มีผู้รับเลี้ยง':   'text-green-700 bg-green-50 border-green-200',
}

// สถานะที่ยัง active อยู่ (ยังไม่เสร็จ)
const สถานะActive = ['รอดำเนินการ', 'รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง']

// สีของความเร่งด่วน
const สีเร่งด่วน = {
  'สูง':      'text-red-600 bg-red-50',
  'ปานกลาง': 'text-orange-600 bg-orange-50',
  'ต่ำ':      'text-green-600 bg-green-50',
}

// สีของสถานะสัตว์ (animals table)
const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง':  'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง':   'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา': 'text-orange-600 bg-orange-50',
  'มีผู้รับเลี้ยง':    'text-gray-500 bg-gray-100',
}

function VolunteerPage({ หน้า }) {
  const navigate = useNavigate()

  // ---- State รายงานรวม (ใช้ทั้ง reports และ update) ----
  const [รายงานทั้งหมด, setรายงานทั้งหมด] = useState([])
  const [โหลดรายงาน,   setโหลดรายงาน]   = useState(true)

  // ---- State หน้า reports (Inbox) ----
  const [filterTab, setFilterTab] = useState('all')  // all / pending / active / done
  const [กำลังรับเรื่อง, setกำลังรับเรื่อง] = useState(null)  // id ที่กำลัง quick-accept

  // ---- State หน้า update (Workflow) ----
  const [เคสที่เลือก,    setเคสที่เลือก]    = useState(null)   // report object ที่กำลัง update
  const [สถานะใหม่,     setSถานะใหม่]     = useState('')
  const [หมายเหตุ,      setหมายเหตุ]      = useState('')
  const [กำลังบันทึก,   setกำลังบันทึก]   = useState(false)
  const [บันทึกสำเร็จID, setBันทึกสำเร็จID] = useState(null)

  // ---- State หน้า animals ----
  const [สัตว์จากDB,   setSัตว์จากDB]   = useState([])
  const [โหลดสัตว์,    setโหลดสัตว์]    = useState(true)
  const [สัตว์ที่กดดู,  setSัตว์ที่กดดู]  = useState(null)
  const [แสดงฟอร์ม,   setแสดงฟอร์ม]   = useState(false)
  const [บันทึกสำเร็จ, setBันทึกสำเร็จ] = useState(false)
  const [ชื่อสัตว์ใหม่, setชื่อสัตว์ใหม่] = useState('')
  const [เพศสัตว์ใหม่, setเพศสัตว์ใหม่] = useState('')
  const [สายพันธุ์ใหม่, setSายพันธุ์ใหม่] = useState('')
  const [อายุสัตว์ใหม่, setอายุสัตว์ใหม่] = useState('')
  const inputรูปสัตว์ = useRef(null)

  // ---- State หน้า stats ----
  const [สถิติ, setSถิติ] = useState({ รายงาน: 0, รอดำเนินการ: 0, สัตว์: 0, รับเลี้ยงแล้ว: 0 })

  // ---- ดึงรายงาน ----
  useEffect(function () {
    if (หน้า !== 'reports' && หน้า !== 'update') return
    ดึงรายงาน()
  }, [หน้า])

  async function ดึงรายงาน() {
    setโหลดรายงาน(true)
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error && data) setรายงานทั้งหมด(data)
    setโหลดรายงาน(false)
  }

  // ---- ดึงสัตว์ ----
  useEffect(function () {
    if (หน้า !== 'animals') return
    ดึงสัตว์()
  }, [หน้า])

  async function ดึงสัตว์() {
    setโหลดสัตว์(true)
    const { data, error } = await supabase.from('animals').select('*').order('created_at', { ascending: false })
    if (!error && data) setSัตว์จากDB(data)
    setโหลดสัตว์(false)
  }

  // ---- ดึงสถิติ ----
  useEffect(function () {
    if (หน้า !== 'stats') return
    async function ดึงสถิติ() {
      const [ร1, ร2, ร3, ร4] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'รอดำเนินการ'),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
      ])
      setSถิติ({ รายงาน: ร1.count || 0, รอดำเนินการ: ร2.count || 0, สัตว์: ร3.count || 0, รับเลี้ยงแล้ว: ร4.count || 0 })
    }
    ดึงสถิติ()
  }, [หน้า])

  // ---- Quick รับเรื่อง (จากหน้า Inbox) ----
  async function รับเรื่องด่วน(reportId) {
    setกำลังรับเรื่อง(reportId)
    const { error } = await supabase
      .from('reports')
      .update({ status: 'รับเรื่องแล้ว', updated_at: new Date().toISOString() })
      .eq('id', reportId)
    if (!error) {
      setรายงานทั้งหมด(function (prev) {
        return prev.map(function (r) {
          return r.id === reportId ? { ...r, status: 'รับเรื่องแล้ว' } : r
        })
      })
    } else {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    }
    setกำลังรับเรื่อง(null)
  }

  // ---- บันทึกการอัปเดต (จากหน้า Workflow) ----
  async function บันทึกการอัปเดต() {
    if (!เคสที่เลือก || !สถานะใหม่) return
    setกำลังบันทึก(true)
    const { error } = await supabase
      .from('reports')
      .update({
        status:          สถานะใหม่,
        volunteer_notes: หมายเหตุ.trim() || null,
        updated_at:      new Date().toISOString(),
      })
      .eq('id', เคสที่เลือก.id)

    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setBันทึกสำเร็จID(เคสที่เลือก.id)
      // อัปเดต state ทันที ไม่ต้อง fetch ใหม่
      setรายงานทั้งหมด(function (prev) {
        return prev.map(function (r) {
          return r.id === เคสที่เลือก.id
            ? { ...r, status: สถานะใหม่, volunteer_notes: หมายเหตุ.trim() }
            : r
        })
      })
      setเคสที่เลือก(null)
      setSถานะใหม่('')
      setหมายเหตุ('')
      setTimeout(function () { setBันทึกสำเร็จID(null) }, 3000)
    }
    setกำลังบันทึก(false)
  }

  // ---- บันทึกสัตว์ใหม่ ----
  async function บันทึกสัตว์ใหม่() {
    if (!ชื่อสัตว์ใหม่ || !เพศสัตว์ใหม่) return
    const { error } = await supabase.from('animals').insert({
      name: ชื่อสัตว์ใหม่, gender: เพศสัตว์ใหม่,
      breed: สายพันธุ์ใหม่, age: อายุสัตว์ใหม่,
      status: 'อยู่ศูนย์พักพิง', health: 'ปกติ', location: 'กำแพงแสน นครปฐม',
    })
    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setBันทึกสำเร็จ(true)
      setชื่อสัตว์ใหม่(''); setเพศสัตว์ใหม่(''); setSายพันธุ์ใหม่(''); setอายุสัตว์ใหม่('')
      setแสดงฟอร์ม(false)
      ดึงสัตว์()
      setTimeout(function () { setBันทึกสำเร็จ(false) }, 3000)
    }
  }

  function แปลงวันที่(str) {
    if (!str) return ''
    return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  function แปลงวันที่เวลา(str) {
    if (!str) return ''
    const d = new Date(str)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short' }) + ' ' +
           d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' }) + ' น.'
  }

  // กรองรายงานตาม filterTab
  const รายงานกรอง = รายงานทั้งหมด.filter(function (ร) {
    if (filterTab === 'pending') return ร.status === 'รอดำเนินการ'
    if (filterTab === 'active')  return ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง'].includes(ร.status)
    if (filterTab === 'done')    return ร.status === 'มีผู้รับเลี้ยง'
    return true
  })

  // รายงานที่ยัง active (สำหรับหน้า update)
  const รายงานActive = รายงานทั้งหมด.filter(function (ร) {
    return สถานะActive.includes(ร.status)
  })

  // สถานะถัดไปที่เป็นไปได้ จาก status ปัจจุบัน
  function สถานะถัดไป(currentStatus) {
    const all = ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง']
    const idx = all.indexOf(currentStatus)
    return all.slice(idx + 1 >= 0 ? idx + 1 : 0)
  }

  const titleMap = {
    reports: 'รายการแจ้งสัตว์จร',
    update:  'อัปเดตสถานะสัตว์',
    animals: 'จัดการข้อมูลสัตว์',
    stats:   'สถิติพื้นที่รับผิดชอบ',
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">{titleMap[หน้า]}</h1>
          <p className="text-xs text-orange-600">🦺 เจ้าหน้าที่ / อาสาสมัคร</p>
        </div>
      </div>

      {/* =====================================================
          หน้า: รายการแจ้งสัตว์จร (INBOX)
          บทบาท: ดูภาพรวมทุกรายงาน เช็ค progress กด "รับเรื่อง" ได้เลย
          ===================================================== */}
      {หน้า === 'reports' && (
        <div className="pt-4">

          {/* Filter Tabs */}
          <div className="px-4 mb-4">
            <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
              {[
                { key: 'all',     label: 'ทั้งหมด',      count: รายงานทั้งหมด.length },
                { key: 'pending', label: '🔴 ใหม่',       count: รายงานทั้งหมด.filter(r => r.status === 'รอดำเนินการ').length },
                { key: 'active',  label: '🔵 ดำเนินการ', count: รายงานทั้งหมด.filter(r => ['รับเรื่องแล้ว','ลงพื้นที่แล้ว','อยู่ศูนย์พักพิง'].includes(r.status)).length },
                { key: 'done',    label: '✅ เสร็จ',      count: รายงานทั้งหมด.filter(r => r.status === 'มีผู้รับเลี้ยง').length },
              ].map(function (tab) {
                return (
                  <button
                    key={tab.key}
                    onClick={() => setFilterTab(tab.key)}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      filterTab === tab.key ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-500'
                    }`}
                  >
                    {tab.label}
                    {tab.count > 0 && (
                      <span className={`ml-1 text-xs font-bold ${filterTab === tab.key ? 'text-orange-600' : 'text-gray-400'}`}>
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
              <p className="text-sm text-gray-400">กำลังโหลดรายการ...</p>
            </div>
          )}

          {/* ไม่มีรายการ */}
          {!โหลดรายงาน && รายงานกรอง.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">ไม่มีรายงานในกลุ่มนี้</p>
            </div>
          )}

          {/* รายการรายงาน */}
          <div className="px-4 space-y-4">
            {รายงานกรอง.map(function (ร) {
              const stepIdx  = ขั้นตอนตามสถานะ[ร.status] ?? 0
              const isNew    = ร.status === 'รอดำเนินการ'
              const isDone   = ร.status === 'มีผู้รับเลี้ยง'

              return (
                <div key={ร.id} className={`bg-white rounded-2xl shadow-sm overflow-hidden ${isNew ? 'ring-2 ring-orange-300' : ''}`}>

                  {/* แถบสีตามสถานะ */}
                  <div className={`h-1 w-full ${isNew ? 'bg-yellow-400' : isDone ? 'bg-green-400' : 'bg-blue-400'}`} />

                  <div className="p-4">
                    {/* หัวการ์ด: รูป + ข้อมูล + badge */}
                    <div className="flex items-start gap-3 mb-3">
                      {/* รูปจริงจาก Storage */}
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center shrink-0 shadow-sm">
                        {ร.image_url
                          ? <img src={ร.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                          : <span className="text-3xl">{ร.animal_type?.includes('แมว') ? '🐈' : '🐕'}</span>
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุประเภท'}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border shrink-0 ${สีสถานะ[ร.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                            {ร.status}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5 truncate">📍 {ร.location_text}</p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {แปลงวันที่เวลา(ร.created_at)} • #{String(ร.id).padStart(6, '0')}
                        </p>
                        {ร.detail && (
                          <p className="text-xs text-gray-500 mt-1 italic">"{ร.detail}"</p>
                        )}
                      </div>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex items-center mb-3">
                      {ขั้นตอนทั้งหมด.map(function (ขั้น, idx) {
                        const done    = idx <= stepIdx
                        const current = idx === stepIdx
                        return (
                          <div key={idx} className="flex items-center flex-1">
                            <div className="flex flex-col items-center">
                              <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                                done
                                  ? current
                                    ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                                    : 'bg-green-500 text-white'
                                  : 'bg-gray-200 text-gray-400'
                              }`}>
                                {done && !current ? '✓' : idx + 1}
                              </div>
                              <p className={`text-center mt-0.5 leading-tight ${done ? current ? 'text-orange-600' : 'text-green-600' : 'text-gray-400'}`}
                                style={{ fontSize: '8px', maxWidth: 44 }}>
                                {ขั้น}
                              </p>
                            </div>
                            {idx < ขั้นตอนทั้งหมด.length - 1 && (
                              <div className={`flex-1 h-0.5 mb-3.5 ${idx < stepIdx ? 'bg-green-400' : 'bg-gray-200'}`} />
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {/* หมายเหตุเจ้าหน้าที่ (ถ้ามี) */}
                    {ร.volunteer_notes && (
                      <div className="bg-blue-50 rounded-xl px-3 py-2 mb-3">
                        <p className="text-xs text-blue-600">📝 บันทึกเจ้าหน้าที่: {ร.volunteer_notes}</p>
                      </div>
                    )}

                    {/* ปุ่ม */}
                    <div className="flex gap-2">
                      {isNew && (
                        <button
                          onClick={() => รับเรื่องด่วน(ร.id)}
                          disabled={กำลังรับเรื่อง === ร.id}
                          className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-xs font-semibold disabled:opacity-60"
                        >
                          {กำลังรับเรื่อง === ร.id ? '⏳ กำลังรับเรื่อง...' : '✅ รับเรื่อง'}
                        </button>
                      )}
                      <button
                        onClick={() => navigate('/volunteer/update')}
                        className={`${isNew ? 'flex-1' : 'flex-1'} border border-orange-300 text-orange-600 rounded-xl py-2 text-xs font-medium`}
                      >
                        อัปเดตสถานะ →
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* =====================================================
          หน้า: อัปเดตสถานะสัตว์ (WORKFLOW)
          บทบาท: เลือกเคส → ดูรายละเอียดเต็ม → เปลี่ยนสถานะ → บันทึกหมายเหตุ → Save DB
          ===================================================== */}
      {หน้า === 'update' && (
        <div className="px-4 pt-4 space-y-4">

          {/* แจ้งบันทึกสำเร็จ */}
          {บันทึกสำเร็จID && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-3 text-center">
              <p className="text-green-700 font-medium text-sm">✅ บันทึกการอัปเดตสำเร็จ!</p>
            </div>
          )}

          {โหลดรายงาน && (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดรายงาน && (
            <>
              {/* คำอธิบาย */}
              <div className="bg-orange-50 border border-orange-200 rounded-2xl p-3">
                <p className="text-xs text-orange-700 font-medium">📋 เลือกรายงานที่ต้องการดำเนินการ แล้วอัปเดตสถานะและบันทึกหมายเหตุ</p>
                <p className="text-xs text-orange-500 mt-0.5">แสดงเฉพาะรายงานที่ยังไม่เสร็จ ({รายงานActive.length} รายการ)</p>
              </div>

              {รายงานActive.length === 0 && (
                <div className="text-center py-16">
                  <p className="text-5xl mb-3">🎉</p>
                  <p className="font-medium text-gray-600">ไม่มีรายงานที่ค้างดำเนินการ</p>
                  <p className="text-xs text-gray-400 mt-1">ทุกรายงานได้รับการดูแลเรียบร้อย</p>
                </div>
              )}

              {/* รายการเคสที่รอดำเนินการ */}
              {รายงานActive.map(function (ร) {
                const isSelected = เคสที่เลือก?.id === ร.id
                return (
                  <div key={ร.id}>
                    {/* การ์ดเลือกเคส */}
                    <button
                      onClick={() => {
                        if (isSelected) {
                          setเคสที่เลือก(null); setSถานะใหม่(''); setหมายเหตุ('')
                        } else {
                          setเคสที่เลือก(ร); setSถานะใหม่(''); setหมายเหตุ(ร.volunteer_notes || '')
                        }
                      }}
                      className={`w-full text-left bg-white rounded-2xl shadow-sm overflow-hidden border-2 transition-all ${
                        isSelected ? 'border-orange-400' : 'border-transparent'
                      }`}
                    >
                      {/* แถบสีสถานะ */}
                      <div className={`h-1 ${ร.status === 'รอดำเนินการ' ? 'bg-yellow-400' : 'bg-blue-400'}`} />
                      <div className="p-4 flex items-center gap-3">
                        {/* รูปจริง */}
                        <div className="w-16 h-16 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center shrink-0">
                          {ร.image_url
                            ? <img src={ร.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                            : <span className="text-3xl">{ร.animal_type?.includes('แมว') ? '🐈' : '🐕'}</span>
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm">{ร.animal_type || 'ไม่ระบุ'}</p>
                          <p className="text-xs text-gray-500 truncate">📍 {ร.location_text}</p>
                          <p className="text-xs text-gray-400">{แปลงวันที่(ร.created_at)} • #{String(ร.id).padStart(6, '0')}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium border mt-1 inline-block ${สีสถานะ[ร.status] || 'text-gray-600 bg-gray-50 border-gray-200'}`}>
                            {ร.status}
                          </span>
                        </div>
                        <span className="text-gray-400 text-lg">{isSelected ? '▲' : '▼'}</span>
                      </div>
                    </button>

                    {/* Panel อัปเดต (เปิดเมื่อเลือก) */}
                    {isSelected && (
                      <div className="bg-white rounded-2xl shadow-sm p-4 mt-2 space-y-4 border-2 border-orange-200">

                        {/* รายละเอียดรายงาน */}
                        {ร.detail && (
                          <div className="bg-gray-50 rounded-xl p-3">
                            <p className="text-xs text-gray-500 font-medium mb-1">รายละเอียดจากผู้แจ้ง</p>
                            <p className="text-sm text-gray-700">"{ร.detail}"</p>
                          </div>
                        )}

                        {/* เลือกสถานะใหม่ */}
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            เปลี่ยนสถานะเป็น
                            <span className="text-xs font-normal text-gray-400 ml-2">(ปัจจุบัน: {ร.status})</span>
                          </p>
                          <div className="space-y-2">
                            {['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง'].map(function (ส) {
                              const isCurrent = ร.status === ส
                              return (
                                <button
                                  key={ส}
                                  onClick={() => setSถานะใหม่(ส)}
                                  disabled={isCurrent}
                                  className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium border-2 text-left transition-all flex items-center justify-between ${
                                    isCurrent
                                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                      : สถานะใหม่ === ส
                                        ? 'border-orange-500 bg-orange-500 text-white'
                                        : 'border-gray-200 bg-white text-gray-700 hover:border-orange-300'
                                  }`}
                                >
                                  <span>{ส}</span>
                                  {isCurrent && <span className="text-xs">← สถานะปัจจุบัน</span>}
                                  {สถานะใหม่ === ส && !isCurrent && <span className="text-sm">✓</span>}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* หมายเหตุเจ้าหน้าที่ — บันทึกลง DB */}
                        <div>
                          <p className="text-sm font-semibold text-gray-700 mb-2">
                            บันทึกหมายเหตุ
                            <span className="text-xs font-normal text-gray-400 ml-2">(เก็บใน database)</span>
                          </p>
                          <textarea
                            value={หมายเหตุ}
                            onChange={(e) => setหมายเหตุ(e.target.value)}
                            placeholder="เช่น ลงพื้นที่แล้ว สัตว์มีบาดแผล นำส่งสัตวแพทย์แล้ว..."
                            rows={3}
                            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400 resize-none"
                          />
                        </div>

                        {/* ปุ่มบันทึก */}
                        <button
                          onClick={บันทึกการอัปเดต}
                          disabled={!สถานะใหม่ || กำลังบันทึก}
                          className="w-full bg-orange-500 text-white rounded-xl py-3 font-semibold text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {กำลังบันทึก ? '⏳ กำลังบันทึก...' : '💾 บันทึกการอัปเดต'}
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </>
          )}
        </div>
      )}

      {/* =====================================================
          หน้า: จัดการข้อมูลสัตว์
          ===================================================== */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4">
          <button onClick={() => setแสดงฟอร์ม(!แสดงฟอร์ม)}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-medium">
            {แสดงฟอร์ม ? '✕ ปิดฟอร์ม' : '+ เพิ่มสัตว์ใหม่'}
          </button>

          {แสดงฟอร์ม && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-800">เพิ่มสัตว์ใหม่</p>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ชื่อสัตว์ <span className="text-red-400">*</span></p>
                <input value={ชื่อสัตว์ใหม่} onChange={(e) => setชื่อสัตว์ใหม่(e.target.value)}
                  placeholder="เช่น มะม่วง, ขาว, ส้ม"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map((เพศ) => (
                    <button key={เพศ} onClick={() => setเพศสัตว์ใหม่(เพศ)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                        เพศสัตว์ใหม่ === เพศ ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-700'
                      }`}>{เพศ}</button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">สายพันธุ์</p>
                <input value={สายพันธุ์ใหม่} onChange={(e) => setSายพันธุ์ใหม่(e.target.value)}
                  placeholder="เช่น สุนัขพันธุ์ไทย, แมวส้ม"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ (โดยประมาณ)</p>
                <select value={อายุสัตว์ใหม่} onChange={(e) => setอายุสัตว์ใหม่(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none">
                  <option value="">-- เลือกช่วงอายุ --</option>
                  <option>น้อยกว่า 1 ปี</option><option>1–2 ปี</option>
                  <option>2–5 ปี</option><option>5–10 ปี</option>
                  <option>มากกว่า 10 ปี</option><option>ไม่ทราบ</option>
                </select>
              </div>
              <button onClick={บันทึกสัตว์ใหม่} disabled={!ชื่อสัตว์ใหม่ || !เพศสัตว์ใหม่}
                className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50">
                บันทึกข้อมูลสัตว์
              </button>
            </div>
          )}

          {บันทึกสำเร็จ && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-medium">✅ บันทึกสัตว์ใหม่สำเร็จ!</p>
            </div>
          )}

          <p className="text-sm font-semibold text-gray-700">สัตว์ในความดูแล ({สัตว์จากDB.length} ตัว)</p>

          {โหลดสัตว์ && (
            <div className="text-center py-6">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {สัตว์จากDB.map((สัตว์) => (
            <div key={สัตว์.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {สัตว์.image_url
                      ? <img src={สัตว์.image_url} alt={สัตว์.name} className="w-full h-full object-cover rounded-2xl" />
                      : (สัตว์.breed?.includes('แมว') ? '🐈' : '🐕')
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{สัตว์.name}</p>
                    <p className="text-xs text-gray-500">{สัตว์.breed || 'ไม่ระบุ'} • {สัตว์.age || '-'} • {สัตว์.gender || '-'}</p>
                    <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.status] || 'text-gray-600 bg-gray-50'}`}>
                      {สัตว์.status}
                    </span>
                  </div>
                </div>
                <button onClick={() => setSัตว์ที่กดดู(สัตว์)}
                  className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium">
                  รายละเอียด
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal รายละเอียดสัตว์ */}
      {สัตว์ที่กดดู && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          onClick={() => setSัตว์ที่กดดู(null)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-center pt-3 pb-1"><div className="w-10 h-1 bg-gray-200 rounded-full" /></div>
            <div className="px-6 pb-8 space-y-4">
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-bold text-gray-800 text-lg">รายละเอียดสัตว์</h2>
                <button onClick={() => setSัตว์ที่กดดู(null)} className="text-gray-400 text-2xl">✕</button>
              </div>
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="w-full h-40 bg-white rounded-2xl flex items-center justify-center text-7xl mb-3 shadow-sm overflow-hidden">
                  {สัตว์ที่กดดู.image_url
                    ? <img src={สัตว์ที่กดดู.image_url} alt={สัตว์ที่กดดู.name} className="w-full h-full object-cover" />
                    : (สัตว์ที่กดดู.breed?.includes('แมว') ? '🐈' : '🐕')
                  }
                </div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-800">{สัตว์ที่กดดู.name}</p>
                    <p className="text-sm text-gray-500">{สัตว์ที่กดดู.breed || 'ไม่ระบุสายพันธุ์'}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${สีสถานะสัตว์[สัตว์ที่กดดู.status] || 'text-gray-600 bg-gray-50'}`}>
                    {สัตว์ที่กดดู.status}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { หัว: 'เพศ', ค่า: สัตว์ที่กดดู.gender || '-' },
                    { หัว: 'อายุ', ค่า: สัตว์ที่กดดู.age || '-' },
                    { หัว: 'สุขภาพ', ค่า: สัตว์ที่กดดู.health || '-' },
                    { หัว: 'สถานที่', ค่า: สัตว์ที่กดดู.location || '-' },
                  ].map((ข) => (
                    <div key={ข.หัว} className="bg-white rounded-xl px-3 py-2">
                      <p className="text-xs text-gray-400">{ข.หัว}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{ข.ค่า}</p>
                    </div>
                  ))}
                </div>
              </div>
              <button onClick={() => setSัตว์ที่กดดู(null)}
                className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-medium">ปิด</button>
            </div>
          </div>
        </div>
      )}

      {/* ======== หน้า: สถิติ ======== */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'รายงานทั้งหมด', ค่า: สถิติ.รายงาน,       emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
              { ชื่อ: 'รอดำเนินการ',   ค่า: สถิติ.รอดำเนินการ,  emoji: '⏳', สี: 'bg-yellow-50 text-yellow-600' },
              { ชื่อ: 'สัตว์ในดูแล',   ค่า: สถิติ.สัตว์,         emoji: '🐾', สี: 'bg-green-50 text-green-600' },
              { ชื่อ: 'รับเลี้ยงแล้ว',  ค่า: สถิติ.รับเลี้ยงแล้ว, emoji: '❤️', สี: 'bg-red-50 text-red-600' },
            ].map((stat) => (
              <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                <p className="text-3xl mb-1">{stat.emoji}</p>
                <p className={`text-3xl font-bold ${stat.สี.split(' ')[1]}`}>{stat.ค่า}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-2">พื้นที่รับผิดชอบ</p>
            <p className="text-sm text-gray-600">📍 จังหวัดนครปฐม ตำบลกำแพงแสน</p>
          </div>
        </div>
      )}

    </div>
  )
}

export default VolunteerPage
