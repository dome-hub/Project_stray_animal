// TrackReport.jsx — ติดตามสถานะรายงาน
// ดึงข้อมูลจาก Supabase จริง ไม่มี mock data

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// กำหนดว่าแต่ละสถานะแสดงผลอย่างไร
// key ตรงกับค่า status ในตาราง reports
const ข้อมูลสถานะ = {
  'รอดำเนินการ': {
    สี: 'text-yellow-600 bg-yellow-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: false },
      { ชื่อ: 'รับสัตว์', เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'รับเรื่องแล้ว': {
    สี: 'text-blue-600 bg-blue-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'ลงพื้นที่แล้ว': {
    สี: 'text-blue-600 bg-blue-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'อยู่ศูนย์พักพิง': {
    สี: 'text-purple-600 bg-purple-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  'มีผู้รับเลี้ยง': {
    สี: 'text-green-600 bg-green-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: true },
    ],
  },
}

// สถานะ default ถ้าไม่ตรงกับ key ไหน
const สถานะDefault = {
  สี: 'text-gray-600 bg-gray-50',
  ขั้นตอน: [
    { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
    { ชื่อ: 'รับเรื่อง', เสร็จ: false },
    { ชื่อ: 'รับสัตว์', เสร็จ: false },
    { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
  ],
}

function TrackReport({ user }) {
  const navigate = useNavigate()

  const [รายการรายงาน, setรายการรายงาน] = useState([])
  const [กำลังโหลด, setกำลังโหลด] = useState(true)

  // ดึงรายงานจาก Supabase ตอนโหลดหน้า
  useEffect(function () {
    async function ดึงรายงาน() {
      setกำลังโหลด(true)

      // ดึงรายงานทั้งหมด เรียงล่าสุดก่อน
      // เมื่อมี auth จริง → เพิ่ม .eq('reporter_id', user.id) เพื่อกรองเฉพาะของตัวเอง
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) {
        console.log('เกิดข้อผิดพลาด:', error.message)
      } else {
        setรายการรายงาน(data)
      }

      setกำลังโหลด(false)
    }

    ดึงรายงาน()
  }, [])

  // แปลงวันที่จาก Database ให้อ่านง่าย
  function แปลงวันที่(dateString) {
    const d = new Date(dateString)
    return d.toLocaleDateString('th-TH', {
      day: 'numeric', month: 'short', year: 'numeric'
    }) + ' • ' + d.toLocaleTimeString('th-TH', {
      hour: '2-digit', minute: '2-digit'
    }) + ' น.'
  }

  // ---- หน้า Loading ----
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

        {/* ถ้าไม่มีรายงาน */}
        {รายการรายงาน.length === 0 && (
          <div className="flex flex-col items-center justify-center pt-20 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600 font-semibold">ยังไม่มีรายงาน</p>
            <p className="text-gray-400 text-sm mt-1">กดแจ้งสัตว์จรเพื่อสร้างรายงานแรก</p>
            <button
              onClick={() => navigate('/report')}
              className="mt-4 bg-orange-500 text-white px-6 py-2.5 rounded-xl text-sm font-medium"
            >
              แจ้งสัตว์จร
            </button>
          </div>
        )}

        {/* รายการรายงานจาก Database */}
        {รายการรายงาน.map((รายงาน) => {
          // ดึง config ของสถานะนี้ ถ้าไม่มีใช้ default
          const สถานะข้อมูล = ข้อมูลสถานะ[รายงาน.status] || สถานะDefault

          // กำหนด emoji ตามประเภทสัตว์
          const emoji = รายงาน.animal_type?.includes('แมว') ? '🐈' : '🐕'

          return (
            <div key={รายงาน.id} className="bg-white rounded-2xl p-4 shadow-sm">

              {/* แถวบน */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* แสดงรูปจริงถ้ามี ไม่งั้นใช้ emoji */}
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl overflow-hidden flex items-center justify-center text-2xl shrink-0">
                    {รายงาน.image_url
                      ? <img src={รายงาน.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                      : emoji
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">
                      {รายงาน.animal_type || 'ไม่ระบุประเภท'}
                    </p>
                    <p className="text-xs text-gray-500">📍 {รายงาน.location_text}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {แปลงวันที่(รายงาน.created_at)}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สถานะข้อมูล.สี}`}>
                  {รายงาน.status}
                </span>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center">
                {สถานะข้อมูล.ขั้นตอน.map((ขั้น, ลำดับ) => (
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
                ))}
              </div>

              {/* รหัสรายงาน */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">รหัสรายงาน</span>
                <span className="text-xs font-bold text-indigo-600">
                  #{String(รายงาน.id).padStart(6, '0')}
                </span>
              </div>

            </div>
          )
        })}

      </div>
    </div>
  )
}

export default TrackReport
