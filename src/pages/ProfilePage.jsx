// ProfilePage.jsx — หน้าโปรไฟล์ผู้ใช้
// รูปโปรไฟล์: อัปโหลดขึ้น Supabase Storage + เก็บ URL ไว้ใน localStorage
// (รอเชื่อม users table จริงเมื่อมี auth)

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// ข้อมูลจำลอง (รอเชื่อม Supabase จริงในอนาคต)
const ประวัติแจ้ง = [
  { id: 'RPT001234', วันที่: '25 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ไทยผสม', สถานะ: 'มีผู้รับเลี้ยง', emoji: '🐕' },
  { id: 'RPT001055', วันที่: '15 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ผสม',    สถานะ: 'กำลังดำเนินการ', emoji: '🐕' },
  { id: 'RPT000998', วันที่: '10 พ.ค. 2569', สัตว์: 'สุนัขพันธุ์ไทย',    สถานะ: 'รอดำเนินการ',   emoji: '🐕' },
]

const ประวัติรับเลี้ยง = [
  { id: 'ADT001', วันที่: '20 พ.ค. 2569', ชื่อสัตว์: 'มะม่วง', สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', สถานะ: 'อนุมัติแล้ว', emoji: '🐕' },
  { id: 'ADT002', วันที่: '18 พ.ค. 2569', ชื่อสัตว์: 'ส้ม',    สายพันธุ์: 'แมวส้ม',            สถานะ: 'รอพิจารณา',   emoji: '🐈' },
]

const สีสถานะ = {
  'มีผู้รับเลี้ยง':    'text-green-600 bg-green-50',
  'กำลังดำเนินการ': 'text-blue-600 bg-blue-50',
  'รอดำเนินการ':    'text-yellow-600 bg-yellow-50',
  'อนุมัติแล้ว':    'text-green-600 bg-green-50',
  'รอพิจารณา':     'text-orange-600 bg-orange-50',
}

function ProfilePage({ user }) {
  const navigate  = useNavigate()
  const inputรูป  = useRef(null)

  const [แท็บ, setแท็บ] = useState('info')

  // เบอร์ติดต่อ
  const [เบอร์ติดต่อ,       setเบอร์ติดต่อ]       = useState('081-234-5678')
  const [กำลังแก้ไขเบอร์,   setกำลังแก้ไขเบอร์]   = useState(false)
  const [เบอร์ชั่วคราว,     setเบอร์ชั่วคราว]     = useState('')

  // รูปโปรไฟล์
  const [รูปโปรไฟล์,     setรูปโปรไฟล์]     = useState(null)
  const [กำลังอัปโหลดรูป, setกำลังอัปโหลดรูป] = useState(false)

  // โหลด avatar_url จาก users table ตอนเปิดหน้า
  useEffect(function () {
    if (!user?.id) return
    supabase
      .from('users')
      .select('avatar_url')
      .eq('id', user.id)
      .single()
      .then(function ({ data }) {
        if (data?.avatar_url) setรูปโปรไฟล์(data.avatar_url)
      })
  }, [user?.id])

  function กดเลือกรูป() {
    inputรูป.current.click()
  }

  // เลือกรูป → อัปโหลดขึ้น Storage → บันทึก URL ลง users table
  async function เลือกรูปโปรไฟล์(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return

    setกำลังอัปโหลดรูป(true)

    try {
      // ชื่อไฟล์ใช้ user.id เพื่อให้แต่ละคนมีไฟล์เป็นของตัวเอง
      const นามสกุล = ไฟล์.name.split('.').pop()
      const ชื่อไฟล์ = `avatars/${user?.id || 'user'}.${นามสกุล}`

      // อัปโหลดขึ้น Supabase Storage (upsert=true ทับไฟล์เก่าได้เลย)
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(ชื่อไฟล์, ไฟล์, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      // ดึง Public URL
      const { data: urlData } = supabase.storage
        .from('report-images')
        .getPublicUrl(uploadData.path)

      const publicUrl = urlData.publicUrl

      // บันทึก URL ลง users table (เพื่อให้ข้ามเครื่องได้)
      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw new Error(updateError.message)

      setรูปโปรไฟล์(publicUrl)

    } catch (err) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + err.message)
    } finally {
      // ไม่ว่าจะสำเร็จหรือ error → ปิด loading เสมอ (ป้องกันค้าง)
      setกำลังอัปโหลดรูป(false)
      event.target.value = ''  // reset input ให้เลือกไฟล์เดิมซ้ำได้
    }
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <h1 className="font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
      </div>

      {/* Card ข้อมูลผู้ใช้ */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm text-center">

        {/* รูปโปรไฟล์ — กดได้เพื่อเปลี่ยนรูป */}
        <div className="relative inline-block mb-3">
          <div
            onClick={กดเลือกรูป}
            className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center cursor-pointer mx-auto border-4 border-white shadow-md"
          >
            {กำลังอัปโหลดรูป ? (
              // กำลังอัปโหลด → แสดง spinner
              <div className="w-7 h-7 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : รูปโปรไฟล์ ? (
              // มีรูปแล้ว → แสดงรูปจริง
              <img
                src={รูปโปรไฟล์}
                alt="โปรไฟล์"
                className="w-full h-full object-cover"
              />
            ) : (
              // ยังไม่มีรูป → แสดง emoji
              <span className="text-5xl">👤</span>
            )}
          </div>

          {/* ปุ่มกล้องเล็กๆ มุมขวาล่างของรูป */}
          <button
            onClick={กดเลือกรูป}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white"
          >
            <span className="text-sm">📷</span>
          </button>
        </div>

        {/* input file ซ่อนไว้ — trigger โดยกดที่รูปหรือปุ่มกล้อง */}
        <input
          ref={inputรูป}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={เลือกรูปโปรไฟล์}
        />

        <h2 className="text-xl font-bold text-gray-800">{user?.name || 'ผู้ใช้งาน'}</h2>
        <p className="text-gray-500 text-sm mt-1">{user?.email || 'user@gmail.com'}</p>
        <div className="inline-block bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-medium mt-2">
          👤 ผู้ใช้งานทั่วไป
        </div>

        {/* สถิติย่อ */}
        <div className="grid grid-cols-3 gap-3 mt-4">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">{ประวัติแจ้ง.length}</p>
            <p className="text-xs text-gray-500">รายงานที่ส่ง</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">{ประวัติรับเลี้ยง.length}</p>
            <p className="text-xs text-gray-500">คำขอรับเลี้ยง</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="text-xl font-bold text-gray-800">1</p>
            <p className="text-xs text-gray-500">อนุมัติแล้ว</p>
          </div>
        </div>
      </div>

      {/* แท็บสลับ */}
      <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1">
        {[
          { key: 'info',      ชื่อ: 'ข้อมูล' },
          { key: 'reports',   ชื่อ: 'ประวัติแจ้ง' },
          { key: 'adoptions', ชื่อ: 'ประวัติรับเลี้ยง' },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setแท็บ(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              แท็บ === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.ชื่อ}
          </button>
        ))}
      </div>

      {/* แท็บ: ข้อมูลส่วนตัว */}
      {แท็บ === 'info' && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
          <div className="space-y-3">

            {/* ชื่อ */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">ชื่อ</span>
              <span className="text-sm font-medium text-gray-800">{user?.name}</span>
            </div>

            {/* อีเมล */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">อีเมล</span>
              <span className="text-sm font-medium text-gray-800">{user?.email}</span>
            </div>

            {/* เบอร์ติดต่อ */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">เบอร์ติดต่อ</span>
              <div className="flex items-center gap-2">
                {กำลังแก้ไขเบอร์ ? (
                  <>
                    <input
                      value={เบอร์ชั่วคราว}
                      onChange={(e) => setเบอร์ชั่วคราว(e.target.value)}
                      placeholder="เช่น 081-234-5678"
                      className="border border-blue-300 rounded-lg px-2 py-1 text-sm text-right w-36 focus:outline-none"
                    />
                    <button
                      onClick={() => {
                        setเบอร์ติดต่อ(เบอร์ชั่วคราว)
                        setกำลังแก้ไขเบอร์(false)
                      }}
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg"
                    >
                      บันทึก
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-800">{เบอร์ติดต่อ}</span>
                    <button
                      onClick={() => {
                        setเบอร์ชั่วคราว(เบอร์ติดต่อ)
                        setกำลังแก้ไขเบอร์(true)
                      }}
                      className="text-xs text-blue-500"
                    >
                      แก้ไข
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* วันที่สมัคร */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">สมัครเมื่อ</span>
              <span className="text-sm font-medium text-gray-800">25 พ.ค. 2569</span>
            </div>

          </div>

          {/* ปุ่มเปลี่ยนรูปโปรไฟล์ (ทางเลือก นอกจากกดที่รูปโดยตรง) */}
          <button
            onClick={กดเลือกรูป}
            className="w-full mt-2 border border-blue-200 text-blue-600 rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2"
          >
            📷 เปลี่ยนรูปโปรไฟล์
          </button>

        </div>
      )}

      {/* แท็บ: ประวัติแจ้งสัตว์ */}
      {แท็บ === 'reports' && (
        <div className="px-4 mt-4 space-y-3">
          {ประวัติแจ้ง.map((r) => (
            <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{r.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{r.สัตว์}</p>
                    <p className="text-xs text-gray-400">{r.วันที่} • #{r.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีสถานะ[r.สถานะ]}`}>
                  {r.สถานะ}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* แท็บ: ประวัติรับเลี้ยง */}
      {แท็บ === 'adoptions' && (
        <div className="px-4 mt-4 space-y-3">
          {ประวัติรับเลี้ยง.map((a) => (
            <div key={a.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{a.emoji}</span>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{a.ชื่อสัตว์} — {a.สายพันธุ์}</p>
                    <p className="text-xs text-gray-400">{a.วันที่} • #{a.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีสถานะ[a.สถานะ]}`}>
                  {a.สถานะ}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  )
}

export default ProfilePage
