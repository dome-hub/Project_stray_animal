// TrackReport.jsx — ติดตามสถานะรายงาน
// ผู้ใช้ทั่วไปดูสถานะรายงานของตัวเอง + กดดูข้อมูลเจ้าหน้าที่/ศูนย์พักพิง

import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { supabase } from '../supabase'

const ข้อมูลสถานะ = {
  'รอดำเนินการ': {
    สี: 'text-yellow-600 bg-yellow-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง',   เสร็จ: false },
      { ชื่อ: 'รับสัตว์',   เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'รับเรื่องแล้ว': {
    สี: 'text-blue-600 bg-blue-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง',   เสร็จ: true },
      { ชื่อ: 'รับสัตว์',   เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'ลงพื้นที่แล้ว': {
    สี: 'text-indigo-600 bg-indigo-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง',   เสร็จ: true },
      { ชื่อ: 'รับสัตว์',   เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'อยู่ศูนย์พักพิง': {
    สี: 'text-purple-600 bg-purple-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง',   เสร็จ: true },
      { ชื่อ: 'รับสัตว์',   เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'มีผู้รับเลี้ยง': {
    สี: 'text-green-600 bg-green-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง',   เสร็จ: true },
      { ชื่อ: 'รับสัตว์',   เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: true },
    ],
  },
}

const สถานะDefault = {
  สี: 'text-gray-600 bg-gray-50',
  ขั้นตอน: [
    { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
    { ชื่อ: 'รับเรื่อง',   เสร็จ: false },
    { ชื่อ: 'รับสัตว์',   เสร็จ: false },
    { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
  ],
}

// สถานะที่เจ้าหน้าที่รับเรื่องแล้ว
const สถานะที่รับเรื่อง = ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

// parse เป็น UTC เสมอ แล้วบวก +7 → เวลาไทย
function parseUTCtr(str) {
  if (!str) return new Date(NaN)
  if (/[Zz]$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  return new Date(str + 'Z')
}

const เดือนTR = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.']

function แปลงวันที่(dateString) {
  const bkk  = new Date(parseUTCtr(dateString).getTime() + 7 * 60 * 60 * 1000)
  const day  = bkk.getUTCDate()
  const mon  = เดือนTR[bkk.getUTCMonth()]
  const year = bkk.getUTCFullYear() + 543
  const hh   = String(bkk.getUTCHours()).padStart(2, '0')
  const mm   = String(bkk.getUTCMinutes()).padStart(2, '0')
  return (
    `${day} ${mon} ${year} • ${hh}:${mm} น.`
  )
}

function TrackReport({ user }) {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [รายการรายงาน, setรายการรายงาน] = useState([])
  const [กำลังโหลด,    setกำลังโหลด]    = useState(true)

  // Bottom sheet
  const [รายงานที่เปิด,   setรายงานที่เปิด]   = useState(null)
  const [ข้อมูลศูนย์,     setข้อมูลศูนย์]     = useState(null)   // volunteer + shelter info
  const [โหลดศูนย์,      setโหลดศูนย์]      = useState(false)

  // ดึงรายงาน
  useEffect(function () {
    async function ดึงรายงาน() {
      if (!user?.id) { setกำลังโหลด(false); return }
      setกำลังโหลด(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
      if (!error) setรายการรายงาน(data)
      setกำลังโหลด(false)
    }
    ดึงรายงาน()
  }, [])

  // ดึงข้อมูลศูนย์/เจ้าหน้าที่ครั้งเดียวตอนโหลด
  useEffect(function () {
    supabase
      .from('users')
      .select('name, phone, shelter_name, shelter_location, service_area, avatar_url')
      .eq('role', 'volunteer')
      .not('shelter_name', 'is', null)
      .limit(1)
      .then(function ({ data }) {
        if (data && data.length > 0) setข้อมูลศูนย์(data[0])
      })
  }, [])

  // Deep-link: มากับ ?open=<id> (จากการกดการ์ดแจ้งเตือน) → เปิดรายละเอียดรายงานนั้นอัตโนมัติ
  useEffect(function () {
    const openId = searchParams.get('open')
    if (!openId || รายการรายงาน.length === 0) return
    const found = รายการรายงาน.find(function (r) { return String(r.id) === String(openId) })
    if (found) setรายงานที่เปิด(found)
  }, [รายการรายงาน, searchParams])

  function เปิดรายละเอียด(รายงาน) {
    setรายงานที่เปิด(รายงาน)
  }

  function ปิดรายละเอียด() {
    setรายงานที่เปิด(null)
  }

  // ---- Loading ----
  if (กำลังโหลด) {
    return (
      <div className="min-h-screen bg-purple-50 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-3" />
        <p className="text-gray-500 text-sm">กำลังโหลดรายงาน...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-purple-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ติดตามรายงาน</h1>
          <p className="text-gray-500 text-xs">ตรวจสอบสถานะการช่วยเหลือสัตว์</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {!กำลังโหลด && รายการรายงาน.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600 font-semibold">คุณยังไม่มีรายงาน</p>
            <p className="text-gray-400 text-sm mt-1">รายการแจ้งสัตว์จรของคุณจะแสดงที่นี่</p>
            <button onClick={() => navigate('/report')}
              className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium">
              แจ้งสัตว์จร
            </button>
          </div>
        )}

        {รายการรายงาน.map(function (รายงาน) {
          const สถานะข้อมูล = ข้อมูลสถานะ[รายงาน.status] || สถานะDefault
          const emoji = รายงาน.animal_type?.includes('แมว') ? '🐈' : '🐕'
          const รับเรื่องแล้ว = สถานะที่รับเรื่อง.includes(รายงาน.status)

          return (
            <div key={รายงาน.id}
              className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer active:scale-95 transition-all"
              onClick={() => เปิดรายละเอียด(รายงาน)}
            >
              {/* แถวบน */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center text-2xl shrink-0">
                    {รายงาน.image_url
                      ? <img src={รายงาน.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                      : emoji
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{รายงาน.animal_type || 'ไม่ระบุประเภท'}</p>
                    <p className="text-xs text-gray-500">📍 {รายงาน.location_text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{แปลงวันที่(รายงาน.created_at)}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สถานะข้อมูล.สี}`}>
                    {รายงาน.status}
                  </span>
                  {รับเรื่องแล้ว && (
                    <span className="text-[10px] text-purple-500 font-medium">กดดูข้อมูลเจ้าหน้าที่ ›</span>
                  )}
                </div>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center">
                {สถานะข้อมูล.ขั้นตอน.map(function (ขั้น, ลำดับ) {
                  return (
                    <div key={ลำดับ} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                          ขั้น.เสร็จ ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                        }`}>
                          {ขั้น.เสร็จ ? '✓' : ''}
                        </div>
                        <p className={`text-center mt-1 leading-tight ${ขั้น.เสร็จ ? 'text-green-600' : 'text-gray-400'}`}
                          style={{ fontSize: '9px', maxWidth: 48 }}>
                          {ขั้น.ชื่อ}
                        </p>
                      </div>
                      {ลำดับ < สถานะข้อมูล.ขั้นตอน.length - 1 && (
                        <div className={`flex-1 h-0.5 mb-4 ${
                          ขั้น.เสร็จ && สถานะข้อมูล.ขั้นตอน[ลำดับ + 1].เสร็จ
                            ? 'bg-green-400' : 'bg-gray-200'
                        }`} />
                      )}
                    </div>
                  )
                })}
              </div>

              {/* รหัส */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">รหัสรายงาน</span>
                <span className="text-xs font-bold text-indigo-600">#{String(รายงาน.id).padStart(6, '0')}</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* ============================================================
          BOTTOM SHEET: รายละเอียด + ข้อมูลเจ้าหน้าที่
          ============================================================ */}
      {รายงานที่เปิด && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={ปิดรายละเอียด}>
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
               onClick={function (e) { e.stopPropagation() }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* Title */}
            <div className="flex items-center justify-between px-5 py-3">
              <p className="font-bold text-gray-800">
                รายงาน #{String(รายงานที่เปิด.id).padStart(6, '0')}
              </p>
              <button onClick={ปิดรายละเอียด} className="text-gray-400 text-2xl leading-none">✕</button>
            </div>

            <div className="px-5 pb-8 space-y-4">

              {/* รูปสัตว์ */}
              <div className="w-full h-36 rounded-2xl overflow-hidden bg-indigo-50 flex items-center justify-center">
                {รายงานที่เปิด.image_url
                  ? <img src={รายงานที่เปิด.image_url} alt="สัตว์" className="w-full h-full object-contain" />
                  : <span className="text-6xl">{รายงานที่เปิด.animal_type?.includes('แมว') ? '🐈' : '🐕'}</span>
                }
              </div>

              {/* ชื่อ + สถานะ */}
              <div className="flex items-center justify-between">
                <p className="font-bold text-gray-800 text-lg">{รายงานที่เปิด.animal_type || 'ไม่ระบุ'}</p>
                <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${(ข้อมูลสถานะ[รายงานที่เปิด.status] || สถานะDefault).สี}`}>
                  {รายงานที่เปิด.status}
                </span>
              </div>

              {/* Progress */}
              <div className="bg-gray-50 rounded-2xl p-4">
                <div className="flex items-center">
                  {(ข้อมูลสถานะ[รายงานที่เปิด.status] || สถานะDefault).ขั้นตอน.map(function (ขั้น, ลำดับ) {
                    const ขั้นตอน = (ข้อมูลสถานะ[รายงานที่เปิด.status] || สถานะDefault).ขั้นตอน
                    return (
                      <div key={ลำดับ} className="flex items-center flex-1">
                        <div className="flex flex-col items-center">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            ขั้น.เสร็จ ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                          }`}>
                            {ขั้น.เสร็จ ? '✓' : ลำดับ + 1}
                          </div>
                          <p className={`text-center mt-1 leading-tight ${ขั้น.เสร็จ ? 'text-green-600' : 'text-gray-400'}`}
                            style={{ fontSize: '9px', maxWidth: 52 }}>
                            {ขั้น.ชื่อ}
                          </p>
                        </div>
                        {ลำดับ < ขั้นตอน.length - 1 && (
                          <div className={`flex-1 h-0.5 mb-4 ${
                            ขั้น.เสร็จ && ขั้นตอน[ลำดับ + 1].เสร็จ ? 'bg-green-400' : 'bg-gray-200'
                          }`} />
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* ตำแหน่งที่พบสัตว์ */}
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                <p className="text-xs text-gray-400 mb-1">📍 ตำแหน่งที่พบสัตว์</p>
                <p className="text-sm font-semibold text-gray-800">{รายงานที่เปิด.location_text || '-'}</p>
                {รายงานที่เปิด.latitude && รายงานที่เปิด.longitude && (
                  <a
                    href={`https://www.google.com/maps?q=${รายงานที่เปิด.latitude},${รายงานที่เปิด.longitude}`}
                    target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 bg-green-500 text-white text-xs font-semibold px-4 py-2 rounded-full"
                  >
                    🗺️ เปิดใน Google Maps →
                  </a>
                )}
              </div>

              {/* รายละเอียดจากผู้แจ้ง */}
              {รายงานที่เปิด.detail && (
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs text-gray-400 mb-1">💬 รายละเอียดที่แจ้ง</p>
                  <p className="text-sm text-gray-700">"{รายงานที่เปิด.detail}"</p>
                </div>
              )}

              {/* บันทึกเจ้าหน้าที่ */}
              {รายงานที่เปิด.volunteer_notes && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-4">
                  <p className="text-xs text-purple-500 font-semibold mb-1">📝 บันทึกจากเจ้าหน้าที่</p>
                  <p className="text-sm text-gray-700">{รายงานที่เปิด.volunteer_notes}</p>
                </div>
              )}

              {/* ข้อมูลเจ้าหน้าที่/ศูนย์พักพิง (แสดงเฉพาะเมื่อรับเรื่องแล้ว) */}
              {สถานะที่รับเรื่อง.includes(รายงานที่เปิด.status) ? (
                <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 space-y-3">
                  <p className="text-xs font-bold text-blue-700">🦺 ข้อมูลเจ้าหน้าที่ผู้รับผิดชอบ</p>

                  {ข้อมูลศูนย์ ? (
                    <>
                      {/* ชื่อเจ้าหน้าที่ */}
                      {ข้อมูลศูนย์.name && (
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-blue-100 rounded-full overflow-hidden flex items-center justify-center shrink-0">
                            {ข้อมูลศูนย์.avatar_url
                              ? <img src={ข้อมูลศูนย์.avatar_url} alt="เจ้าหน้าที่" className="w-full h-full object-cover" />
                              : <span className="text-xl">👤</span>
                            }
                          </div>
                          <div>
                            <p className="text-sm font-bold text-gray-800">{ข้อมูลศูนย์.name}</p>
                            <p className="text-xs text-blue-600">เจ้าหน้าที่อาสาสมัคร</p>
                          </div>
                        </div>
                      )}

                      {/* ชื่อศูนย์พักพิง */}
                      {ข้อมูลศูนย์.shelter_name && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <span className="text-base mt-0.5 shrink-0">🏠</span>
                          <div>
                            <p className="text-xs text-gray-400">ศูนย์พักพิง</p>
                            <p className="text-sm font-semibold text-gray-800">{ข้อมูลศูนย์.shelter_name}</p>
                          </div>
                        </div>
                      )}

                      {/* ที่ตั้งศูนย์ */}
                      {ข้อมูลศูนย์.shelter_location && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <span className="text-base mt-0.5 shrink-0">📍</span>
                          <div>
                            <p className="text-xs text-gray-400">ที่ตั้งศูนย์</p>
                            <p className="text-sm text-gray-700">{ข้อมูลศูนย์.shelter_location}</p>
                          </div>
                        </div>
                      )}

                      {/* พื้นที่รับผิดชอบ */}
                      {ข้อมูลศูนย์.service_area && (
                        <div className="flex items-start gap-2 bg-white rounded-xl px-3 py-2.5 border border-blue-100">
                          <span className="text-base mt-0.5 shrink-0">🗺️</span>
                          <div>
                            <p className="text-xs text-gray-400">พื้นที่รับผิดชอบ</p>
                            <p className="text-sm text-gray-700">{ข้อมูลศูนย์.service_area}</p>
                          </div>
                        </div>
                      )}

                      {/* เบอร์โทร */}
                      {ข้อมูลศูนย์.phone && (
                        <a href={`tel:${ข้อมูลศูนย์.phone}`}
                          className="flex items-center gap-3 bg-blue-500 rounded-xl px-4 py-3 w-full">
                          <span className="text-xl">📞</span>
                          <div className="flex-1">
                            <p className="text-xs text-blue-100">โทรติดต่อเจ้าหน้าที่</p>
                            <p className="text-base font-bold text-white">{ข้อมูลศูนย์.phone}</p>
                          </div>
                          <span className="text-white font-semibold text-sm">โทรเลย →</span>
                        </a>
                      )}
                    </>
                  ) : (
                    <p className="text-sm text-gray-500 italic">กำลังโหลดข้อมูลเจ้าหน้าที่...</p>
                  )}
                </div>
              ) : (
                /* ยังรอดำเนินการ */
                <div className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4 text-center">
                  <p className="text-2xl mb-2">⏳</p>
                  <p className="text-sm font-semibold text-yellow-700">รอเจ้าหน้าที่รับเรื่อง</p>
                  <p className="text-xs text-yellow-600 mt-1">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default TrackReport
