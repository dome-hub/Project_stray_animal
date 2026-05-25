// TrackReport.jsx — หน้าติดตามสถานะรายงานสัตว์จร
// แสดงรายการรายงานที่ผู้ใช้เคยส่งไป พร้อมสถานะปัจจุบัน

import { useNavigate } from 'react-router-dom'

// ข้อมูลรายงานจำลอง (ในของจริงจะดึงจาก Database ตาม user id)
const รายการรายงาน = [
  {
    id: 'RPT001234',
    วันที่: '25 พ.ค. 2569',
    เวลา: '14:32 น.',
    สถานที่: 'ซอยลาดพร้าว 101 กรุงเทพฯ',
    ประเภทสัตว์: 'สุนัขพันธุ์ไทยผสม',
    สถานะ: 'adopted',   // มีผู้รับเลี้ยงแล้ว
    emoji: '🐕',
  },
  {
    id: 'RPT001189',
    วันที่: '20 พ.ค. 2569',
    เวลา: '09:15 น.',
    สถานที่: 'สวนลุมพินี กรุงเทพฯ',
    ประเภทสัตว์: 'แมวส้ม',
    สถานะ: 'shelter',   // อยู่ในศูนย์พักพิง
    emoji: '🐈',
  },
  {
    id: 'RPT001055',
    วันที่: '15 พ.ค. 2569',
    เวลา: '17:44 น.',
    สถานที่: 'ตลาดมีนบุรี กรุงเทพฯ',
    ประเภทสัตว์: 'สุนัขพันธุ์ผสม',
    สถานะ: 'processing', // กำลังดำเนินการ
    emoji: '🐕',
  },
  {
    id: 'RPT000998',
    วันที่: '10 พ.ค. 2569',
    เวลา: '11:20 น.',
    สถานที่: 'บางนา กรุงเทพฯ',
    ประเภทสัตว์: 'สุนัขพันธุ์ไทย',
    สถานะ: 'pending',   // รอดำเนินการ
    emoji: '🐕',
  },
]

// กำหนดว่าแต่ละสถานะแสดงผลอย่างไร
const ข้อมูลสถานะ = {
  pending: {
    ชื่อ: 'รอดำเนินการ',
    สี: 'text-yellow-600 bg-yellow-50',
    // ขั้นตอน: true = เสร็จแล้ว, false = ยังไม่เสร็จ
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: false },
      { ชื่อ: 'รับสัตว์', เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  processing: {
    ชื่อ: 'กำลังดำเนินการ',
    สี: 'text-blue-600 bg-blue-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: false },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  shelter: {
    ชื่อ: 'อยู่ในศูนย์พักพิง',
    สี: 'text-purple-600 bg-purple-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: false },
    ],
  },
  adopted: {
    ชื่อ: 'มีผู้รับเลี้ยงแล้ว',
    สี: 'text-green-600 bg-green-50',
    ขั้นตอน: [
      { ชื่อ: 'แจ้งรายงาน', เสร็จ: true },
      { ชื่อ: 'รับเรื่อง', เสร็จ: true },
      { ชื่อ: 'รับสัตว์', เสร็จ: true },
      { ชื่อ: 'มีผู้รับเลี้ยง', เสร็จ: true },
    ],
  },
}

function TrackReport() {
  const navigate = useNavigate()

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

      {/* รายการรายงาน */}
      <div className="px-4 pt-4 space-y-4">

        {/* วนแสดงรายงานแต่ละรายการ */}
        {รายการรายงาน.map((รายงาน) => {

          // ดึงข้อมูลสถานะของรายงานนี้
          const สถานะข้อมูล = ข้อมูลสถานะ[รายงาน.สถานะ]

          return (
            <div key={รายงาน.id} className="bg-white rounded-2xl p-4 shadow-sm">

              {/* แถวบน — รูปสัตว์, ข้อมูล, badge สถานะ */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  {/* รูปสัตว์ */}
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl">
                    {รายงาน.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{รายงาน.ประเภทสัตว์}</p>
                    <p className="text-xs text-gray-500">{รายงาน.สถานที่}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{รายงาน.วันที่} • {รายงาน.เวลา}</p>
                  </div>
                </div>

                {/* Badge แสดงสถานะ */}
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สถานะข้อมูล.สี}`}>
                  {สถานะข้อมูล.ชื่อ}
                </span>
              </div>

              {/* Progress Bar — แสดงขั้นตอน 4 ขั้น */}
              <div className="flex items-center">
                {สถานะข้อมูล.ขั้นตอน.map((ขั้น, ลำดับ) => (
                  <div key={ลำดับ} className="flex items-center flex-1">

                    {/* วงกลมขั้นตอน */}
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${
                        ขั้น.เสร็จ
                          ? 'bg-green-500 text-white'  // เสร็จแล้ว → สีเขียว
                          : 'bg-gray-200 text-gray-400' // ยังไม่เสร็จ → สีเทา
                      }`}>
                        {ขั้น.เสร็จ ? '✓' : ''}
                      </div>
                      {/* ชื่อขั้นตอน */}
                      <p className={`text-center mt-1 leading-tight ${ขั้น.เสร็จ ? 'text-green-600' : 'text-gray-400'}`}
                        style={{ fontSize: '9px', maxWidth: 48 }}>
                        {ขั้น.ชื่อ}
                      </p>
                    </div>

                    {/* เส้นเชื่อมระหว่างขั้นตอน (ไม่แสดงหลังขั้นสุดท้าย) */}
                    {ลำดับ < สถานะข้อมูล.ขั้นตอน.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${
                        ขั้น.เสร็จ && สถานะข้อมูล.ขั้นตอน[ลำดับ + 1].เสร็จ
                          ? 'bg-green-400'  // ทั้งสองขั้นเสร็จ → เส้นเขียว
                          : 'bg-gray-200'   // ยังไม่เสร็จ → เส้นเทา
                      }`} />
                    )}

                  </div>
                ))}
              </div>

              {/* รหัสรายงาน */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">รหัสรายงาน</span>
                <span className="text-xs font-bold text-indigo-600">#{รายงาน.id}</span>
              </div>

            </div>
          )
        })}

      </div>
    </div>
  )
}

export default TrackReport
