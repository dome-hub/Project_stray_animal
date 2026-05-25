// ReportAnimal.jsx — หน้าแจ้งพบสัตว์จร
// ผู้ใช้อัปโหลดรูป ระบุตำแหน่ง แล้วส่งรายงาน

import { useState, useRef } from 'react' // useState เก็บข้อมูล, useRef ใช้กับ input file
import { useNavigate } from 'react-router-dom'

// ข้อมูลจำลองผลลัพธ์ AI (ในของจริงจะเชื่อม API)
const ผลวิเคราะห์AI = [
  { สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', ขนาด: 'กลาง', นิสัย: 'เป็นมิตร / ระวังคนแปลกหน้า', ความแม่นยำ: 87 },
  { สายพันธุ์: 'สุนัขพันธุ์บางแก้ว', ขนาด: 'เล็ก', นิสัย: 'ขี้เล่น / สงบเสงี่ยม', ความแม่นยำ: 72 },
  { สายพันธุ์: 'แมววิเชียรมาศผสม', ขนาด: 'เล็ก', นิสัย: 'เป็นมิตร / ชอบคน', ความแม่นยำ: 91 },
]

function ReportAnimal() {
  const navigate = useNavigate()

  // useRef ใช้เชื่อมกับ input type="file" เพื่อเปิดหน้าต่างเลือกรูป
  const inputรูปภาพ = useRef(null)

  // เก็บ URL รูปภาพที่ผู้ใช้เลือก
  const [รูปภาพ, setรูปภาพ] = useState(null)

  // เก็บข้อความตำแหน่งที่พบสัตว์
  const [ตำแหน่ง, setตำแหน่ง] = useState('')

  // เก็บรายละเอียดเพิ่มเติม
  const [รายละเอียด, setรายละเอียด] = useState('')

  // เก็บผลที่ AI วิเคราะห์ได้
  const [ผลAI, setผลAI] = useState(null)

  // true = AI กำลังวิเคราะห์รูปอยู่
  const [กำลังวิเคราะห์, setกำลังวิเคราะห์] = useState(false)

  // true = กำลังดึงตำแหน่ง GPS อยู่
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)

  // true = ส่งรายงานสำเร็จแล้ว
  const [ส่งสำเร็จ, setส่งสำเร็จ] = useState(false)

  // true = กำลังส่งรายงานอยู่
  const [กำลังส่ง, setกำลังส่ง] = useState(false)

  // ฟังก์ชันนี้ทำงานเมื่อผู้ใช้เลือกรูปภาพ
  function เลือกรูปภาพ(event) {
    const ไฟล์ = event.target.files[0] // ดึงไฟล์แรกที่เลือก
    if (!ไฟล์) return // ถ้าไม่มีไฟล์ → หยุด

    // สร้าง URL ชั่วคราวจากไฟล์ เพื่อแสดงรูปในหน้าเว็บ
    const urlรูป = URL.createObjectURL(ไฟล์)
    setรูปภาพ(urlรูป)
    setผลAI(null)
    setกำลังวิเคราะห์(true) // แสดงสถานะ "กำลังวิเคราะห์"

    // จำลองการรอ AI วิเคราะห์ 2 วินาที
    setTimeout(function () {
      // สุ่มเลือกผลลัพธ์จากอาร์เรย์
      const สุ่มผล = ผลวิเคราะห์AI[Math.floor(Math.random() * ผลวิเคราะห์AI.length)]
      setผลAI(สุ่มผล)
      setกำลังวิเคราะห์(false)
    }, 2000)
  }

  // ฟังก์ชันดึงตำแหน่ง GPS ของผู้ใช้
  function ใช้GPSปัจจุบัน() {
    setกำลังหาตำแหน่ง(true)

    // Browser Geolocation API — ขอตำแหน่งจากมือถือ/คอมพิวเตอร์
    navigator.geolocation.getCurrentPosition(
      function (position) {
        // สำเร็จ — ได้ค่า latitude, longitude
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setตำแหน่ง(`พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        setกำลังหาตำแหน่ง(false)
      },
      function () {
        // ล้มเหลว — ผู้ใช้ไม่อนุญาต หรือไม่รองรับ
        setตำแหน่ง('ซอยลาดพร้าว 101 กรุงเทพฯ') // ใช้ค่าตัวอย่างแทน
        setกำลังหาตำแหน่ง(false)
      }
    )
  }

  // ฟังก์ชันส่งรายงาน
  function ส่งรายงาน() {
    if (!รูปภาพ || !ตำแหน่ง) return // ถ้าไม่มีรูปหรือตำแหน่ง → หยุด
    setกำลังส่ง(true)

    // จำลองการส่งข้อมูลไป Server 2 วินาที
    setTimeout(function () {
      setกำลังส่ง(false)
      setส่งสำเร็จ(true) // เปลี่ยนไปแสดงหน้าสำเร็จ
    }, 2000)
  }

  // ถ้าส่งสำเร็จ → แสดงหน้ายืนยัน
  if (ส่งสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งรายงานสำเร็จ!</h2>
        <p className="text-gray-600 mb-6">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>

        {/* แสดงรหัสรายงาน */}
        <div className="bg-white rounded-2xl p-4 w-full max-w-xs mb-6">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">รหัสรายงาน</span>
            <span className="font-bold text-orange-500">#RPT{Date.now().toString().slice(-6)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">สถานะ</span>
            <span className="text-green-600 font-medium">รอดำเนินการ</span>
          </div>
        </div>

        <button
          onClick={() => navigate('/home')}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium"
        >
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">แจ้งพบสัตว์จร</h1>
          <p className="text-gray-500 text-xs">ถ่ายภาพและให้ AI วิเคราะห์ข้อมูล</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ส่วนอัปโหลดรูปภาพ */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">ภาพถ่ายสัตว์</p>

          {/* กล่องอัปโหลดรูป — กดแล้วเปิด input file */}
          <div
            onClick={() => inputรูปภาพ.current.click()}
            className="border-2 border-dashed border-orange-300 rounded-2xl overflow-hidden cursor-pointer bg-white"
          >
            {รูปภาพ ? (
              // ถ้ามีรูปแล้ว → แสดงรูป
              <div className="relative">
                <img src={รูปภาพ} alt="สัตว์" className="w-full h-52 object-cover" />
                {/* ถ้า AI กำลังวิเคราะห์ → แสดง loading overlay */}
                {กำลังวิเคราะห์ && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-sm">AI กำลังวิเคราะห์...</p>
                  </div>
                )}
              </div>
            ) : (
              // ถ้ายังไม่มีรูป → แสดงข้อความให้กด
              <div className="h-44 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-sm font-medium">คลิกเพื่อถ่ายภาพหรืออัปโหลด</p>
                <p className="text-xs mt-1">รองรับไฟล์ JPG, PNG</p>
              </div>
            )}
          </div>

          {/* input file ซ่อนอยู่ ถูกเปิดด้วย ref */}
          <input
            ref={inputรูปภาพ}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={เลือกรูปภาพ}
          />
        </div>

        {/* แสดงผล AI หลังวิเคราะห์เสร็จ */}
        {ผลAI && !กำลังวิเคราะห์ && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-orange-600 mb-3">🤖 ผลวิเคราะห์จาก AI</p>

            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">สายพันธุ์</span>
                <span className="text-xs font-semibold">{ผลAI.สายพันธุ์}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">ขนาด</span>
                <span className="text-xs font-semibold">{ผลAI.ขนาด}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">นิสัย</span>
                <span className="text-xs font-semibold">{ผลAI.นิสัย}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">ความแม่นยำ</span>
                <span className="text-xs font-bold text-orange-600">{ผลAI.ความแม่นยำ}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ส่วนระบุตำแหน่ง */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">📍 สถานที่พบ</p>

          {/* ช่องกรอกตำแหน่งด้วยตัวเอง */}
          <input
            type="text"
            value={ตำแหน่ง}
            onChange={(e) => setตำแหน่ง(e.target.value)}
            placeholder="เช่น ซอยลาดพร้าว 101 หรือ ใกล้สวนจตุจักร"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400"
          />

          {/* ปุ่มใช้ GPS ดึงตำแหน่งอัตโนมัติ */}
          <button
            onClick={ใช้GPSปัจจุบัน}
            disabled={กำลังหาตำแหน่ง}
            className="mt-2 w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {กำลังหาตำแหน่ง ? '⏳ กำลังระบุตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบัน'}
          </button>
        </div>

        {/* ส่วนรายละเอียดเพิ่มเติม */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            รายละเอียดเพิ่มเติม <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
          </p>
          <textarea
            value={รายละเอียด}
            onChange={(e) => setรายละเอียด(e.target.value)}
            placeholder="เช่น สัตว์ดูบาดเจ็บ หิวโหย เป็นมิตร กลัวคน ฯลฯ"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400 resize-none"
          />
        </div>

        {/* ปุ่มส่งรายงาน */}
        <button
          onClick={ส่งรายงาน}
          disabled={!รูปภาพ || !ตำแหน่ง || กำลังส่ง}
          className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {กำลังส่ง ? '⏳ กำลังส่ง...' : 'ส่งรายงานให้หน่วยงาน'}
        </button>

      </div>
    </div>
  )
}

export default ReportAnimal
