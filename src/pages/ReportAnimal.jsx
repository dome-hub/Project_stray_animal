// ReportAnimal.jsx — หน้าแจ้งพบสัตว์จร
// อัปโหลดรูปจริงขึ้น Supabase Storage + บันทึก URL ลงตาราง reports

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ผลวิเคราะห์ AI ยังคงเป็น mock อยู่ (รอเชื่อม Vision API จริงในอนาคต)
const ผลวิเคราะห์AI = [
  { สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', ขนาด: 'กลาง', นิสัย: 'เป็นมิตร / ระวังคนแปลกหน้า', ความแม่นยำ: 87 },
  { สายพันธุ์: 'สุนัขพันธุ์บางแก้ว', ขนาด: 'เล็ก', นิสัย: 'ขี้เล่น / สงบเสงี่ยม', ความแม่นยำ: 72 },
  { สายพันธุ์: 'แมววิเชียรมาศผสม', ขนาด: 'เล็ก', นิสัย: 'เป็นมิตร / ชอบคน', ความแม่นยำ: 91 },
]

function ReportAnimal({ user }) {
  const navigate = useNavigate()
  const inputรูปภาพ = useRef(null)

  const [รูปภาพPreview, setรูปภาพPreview] = useState(null)   // URL สำหรับ preview ใน browser
  const [ไฟล์รูปภาพ, setไฟล์รูปภาพ] = useState(null)        // File object จริง สำหรับ upload
  const [ตำแหน่ง, setตำแหน่ง] = useState('')
  const [รายละเอียด, setรายละเอียด] = useState('')
  const [ผลAI, setผลAI] = useState(null)
  const [กำลังวิเคราะห์, setกำลังวิเคราะห์] = useState(false)
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)
  const [กำลังส่ง, setกำลังส่ง] = useState(false)
  const [ส่งสำเร็จ, setส่งสำเร็จ] = useState(false)
  const [รหัสรายงาน, setรหัสรายงาน] = useState(null)

  // เลือกรูป → เก็บ File จริง + สร้าง preview URL + จำลอง AI วิเคราะห์
  function เลือกรูปภาพ(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return

    setไฟล์รูปภาพ(ไฟล์)                              // เก็บ File object ไว้ upload
    setรูปภาพPreview(URL.createObjectURL(ไฟล์))       // สร้าง URL สำหรับแสดงผล
    setผลAI(null)
    setกำลังวิเคราะห์(true)

    // จำลอง AI วิเคราะห์ 2 วินาที
    setTimeout(function () {
      const สุ่มผล = ผลวิเคราะห์AI[Math.floor(Math.random() * ผลวิเคราะห์AI.length)]
      setผลAI(สุ่มผล)
      setกำลังวิเคราะห์(false)
    }, 2000)
  }

  // ดึง GPS จากมือถือ
  function ใช้GPSปัจจุบัน() {
    setกำลังหาตำแหน่ง(true)
    navigator.geolocation.getCurrentPosition(
      function (position) {
        const lat = position.coords.latitude
        const lng = position.coords.longitude
        setตำแหน่ง(`พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        setกำลังหาตำแหน่ง(false)
      },
      function () {
        setตำแหน่ง('กำแพงแสน นครปฐม')
        setกำลังหาตำแหน่ง(false)
      }
    )
  }

  // ส่งรายงาน → อัปโหลดรูปขึ้น Storage → บันทึกลง reports
  async function ส่งรายงาน() {
    if (!ตำแหน่ง) return
    setกำลังส่ง(true)

    let imageUrl = null

    // ---- อัปโหลดรูปขึ้น Supabase Storage ----
    if (ไฟล์รูปภาพ) {
      const ชื่อไฟล์ = `${Date.now()}_${ไฟล์รูปภาพ.name.replace(/\s/g, '_')}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(ชื่อไฟล์, ไฟล์รูปภาพ)

      if (uploadError) {
        console.log('อัปโหลดรูปไม่สำเร็จ:', uploadError.message)
        // ยังส่งรายงานได้แม้ไม่มีรูป
      } else {
        // ดึง Public URL ของรูปที่อัปโหลด
        const { data: urlData } = supabase.storage
          .from('report-images')
          .getPublicUrl(uploadData.path)
        imageUrl = urlData.publicUrl
      }
    }

    // ---- บันทึกลงตาราง reports ใน Supabase ----
    const { data, error } = await supabase
      .from('reports')
      .insert({
        animal_type:   ผลAI?.สายพันธุ์ || 'ไม่ระบุ',
        location_text: ตำแหน่ง,
        detail:        รายละเอียด,
        urgency:       'ปานกลาง',
        status:        'รอดำเนินการ',
        image_url:     imageUrl,          // URL รูปจริงจาก Storage
        reporter_id:   user?.id,          // บันทึกว่าใครเป็นคนแจ้ง
      })
      .select()
      .single()

    setกำลังส่ง(false)

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      // ส่ง notification ยืนยันให้ผู้แจ้งทันที
      if (user?.id) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title:   '📋 ส่งรายงานสำเร็จ',
          body:    `รายงาน #${String(data.id).padStart(6, '0')} ได้รับแล้ว เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง`,
          type:    'report_update',
          is_read: false,
        })
      }
      setรหัสรายงาน(data.id)
      setส่งสำเร็จ(true)
    }
  }

  // ---- หน้าสำเร็จ ----
  if (ส่งสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งรายงานสำเร็จ!</h2>
        <p className="text-gray-600 mb-6">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>
        <div className="bg-white rounded-2xl p-4 w-full max-w-xs mb-6 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">รหัสรายงาน</span>
            <span className="font-bold text-orange-500">#{String(รหัสรายงาน).padStart(6, '0')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">สถานะ</span>
            <span className="text-yellow-600 font-medium">รอดำเนินการ</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/track')}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium mb-3"
        >
          ติดตามสถานะรายงาน
        </button>
        <button
          onClick={() => navigate('/home')}
          className="text-gray-500 text-sm"
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

        {/* อัปโหลดรูปภาพ */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">ภาพถ่ายสัตว์</p>
          <div
            onClick={() => inputรูปภาพ.current.click()}
            className="border-2 border-dashed border-orange-300 rounded-2xl overflow-hidden cursor-pointer bg-white"
          >
            {รูปภาพPreview ? (
              <div className="relative">
                <img src={รูปภาพPreview} alt="สัตว์" className="w-full h-52 object-cover" />
                {กำลังวิเคราะห์ && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                    <p className="text-sm">AI กำลังวิเคราะห์...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400">
                <div className="text-5xl mb-2">📷</div>
                <p className="text-sm font-medium">คลิกเพื่อถ่ายภาพหรืออัปโหลด</p>
                <p className="text-xs mt-1">รองรับไฟล์ JPG, PNG</p>
              </div>
            )}
          </div>
          <input
            ref={inputรูปภาพ}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={เลือกรูปภาพ}
          />
        </div>

        {/* ผล AI */}
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
              <div className="flex justify-between">
                <span className="text-xs text-gray-500">ความแม่นยำ</span>
                <span className="text-xs font-bold text-orange-600">{ผลAI.ความแม่นยำ}%</span>
              </div>
            </div>
          </div>
        )}

        {/* ตำแหน่ง */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            📍 สถานที่พบ <span className="text-red-400">*</span>
          </p>
          <input
            type="text"
            value={ตำแหน่ง}
            onChange={(e) => setตำแหน่ง(e.target.value)}
            placeholder="เช่น หน้าวัดกำแพงแสน หรือ ถนนสาย 1"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400"
          />
          <button
            onClick={ใช้GPSปัจจุบัน}
            disabled={กำลังหาตำแหน่ง}
            className="mt-2 w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {กำลังหาตำแหน่ง ? '⏳ กำลังระบุตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบัน (GPS)'}
          </button>
        </div>

        {/* รายละเอียด */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            รายละเอียดเพิ่มเติม <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
          </p>
          <textarea
            value={รายละเอียด}
            onChange={(e) => setรายละเอียด(e.target.value)}
            placeholder="เช่น สัตว์ดูบาดเจ็บ หิวโหย เป็นมิตร ฯลฯ"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400 resize-none"
          />
        </div>

        {/* ปุ่มส่ง */}
        <button
          onClick={ส่งรายงาน}
          disabled={!ตำแหน่ง || กำลังส่ง || กำลังวิเคราะห์}
          className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {กำลังส่ง ? '⏳ กำลังอัปโหลดและบันทึก...' : 'ส่งรายงานให้เจ้าหน้าที่'}
        </button>

      </div>
    </div>
  )
}

export default ReportAnimal
