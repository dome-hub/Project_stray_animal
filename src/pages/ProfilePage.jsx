// ProfilePage.jsx — หน้าโปรไฟล์ผู้ใช้
// ดึงข้อมูลสดจาก users table เสมอ (role / ชื่อ / รูป อาจเปลี่ยนโดย admin)

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// แสดงผล role เป็นข้อความ + สี
const roleMap = {
  admin:     { ชื่อ: 'ผู้ดูแลระบบ',            emoji: '🛡️', สี: 'text-purple-700 bg-purple-50' },
  volunteer: { ชื่อ: 'เจ้าหน้าที่ / อาสาสมัคร', emoji: '🦺', สี: 'text-orange-700 bg-orange-50' },
  user:      { ชื่อ: 'ผู้ใช้งานทั่วไป',          emoji: '👤', สี: 'text-blue-700 bg-blue-50' },
}

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
  const navigate = useNavigate()
  const inputรูป  = useRef(null)

  const [แท็บ, setแท็บ] = useState('info')

  // ---- ข้อมูลสดจาก DB ----
  // ดึงใหม่ทุกครั้งที่เข้าหน้า เผื่อ admin เปลี่ยน role หรือชื่อถูกแก้ไข
  const [ข้อมูลDB, setข้อมูลDB] = useState(null)
  const [กำลังโหลดDB, setกำลังโหลดDB] = useState(true)

  useEffect(function () {
    if (!user?.id) return
    setกำลังโหลดDB(true)
    supabase
      .from('users')
      .select('name, role, avatar_url, phone')   // ดึง phone ด้วย
      .eq('id', user.id)
      .single()
      .then(function ({ data }) {
        if (data) {
          setข้อมูลDB(data)
          if (data.avatar_url) setรูปโปรไฟล์(data.avatar_url)
          if (data.phone)      setเบอร์ติดต่อ(data.phone)   // โหลดเบอร์จาก DB
        }
        setกำลังโหลดDB(false)
      })
      .catch(function () {
        setกำลังโหลดDB(false)
      })
  }, [user?.id])

  // ---- รูปโปรไฟล์ ----
  const [รูปโปรไฟล์,     setรูปโปรไฟล์]     = useState(null)
  const [กำลังอัปโหลดรูป, setกำลังอัปโหลดรูป] = useState(false)

  // ---- แก้ไขชื่อ ----
  const [กำลังแก้ไขชื่อ,  setกำลังแก้ไขชื่อ]  = useState(false)
  const [ชื่อชั่วคราว,    setชื่อชั่วคราว]    = useState('')
  const [กำลังบันทึกชื่อ, setกำลังบันทึกชื่อ] = useState(false)

  // ---- แก้ไขเบอร์ — บันทึกลง DB จริง ----
  const [เบอร์ติดต่อ,      setเบอร์ติดต่อ]      = useState('กดแก้ไขเพื่อเพิ่มเบอร์')
  const [กำลังแก้ไขเบอร์,  setกำลังแก้ไขเบอร์]  = useState(false)
  const [เบอร์ชั่วคราว,    setเบอร์ชั่วคราว]    = useState('')
  const [กำลังบันทึกเบอร์, setกำลังบันทึกเบอร์] = useState(false)

  // คำนวณ role ที่จะแสดง → ใช้ข้อมูลจาก DB ก่อนเสมอ
  const currentRole = ข้อมูลDB?.role || user?.role || 'user'
  const roleInfo    = roleMap[currentRole] || roleMap.user

  // ชื่อที่แสดง → ใช้จาก DB ก่อน
  const displayName = ข้อมูลDB?.name || user?.name || 'ผู้ใช้งาน'

  // ---- บันทึกชื่อใหม่ลง DB ----
  async function บันทึกชื่อ() {
    if (!ชื่อชั่วคราว.trim()) return
    setกำลังบันทึกชื่อ(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ name: ชื่อชั่วคราว.trim() })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
      // อัปเดต state ท้องถิ่นทันที ไม่ต้อง fetch ใหม่
      setข้อมูลDB(function (prev) { return { ...prev, name: ชื่อชั่วคราว.trim() } })
      setกำลังแก้ไขชื่อ(false)
    } catch (err) {
      alert('บันทึกชื่อไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังบันทึกชื่อ(false)
    }
  }

  // ---- บันทึกเบอร์โทรลง DB ----
  async function บันทึกเบอร์() {
    setกำลังบันทึกเบอร์(true)
    try {
      const { error } = await supabase
        .from('users')
        .update({ phone: เบอร์ชั่วคราว.trim() })
        .eq('id', user.id)
      if (error) throw new Error(error.message)
      setเบอร์ติดต่อ(เบอร์ชั่วคราว.trim() || 'กดแก้ไขเพื่อเพิ่มเบอร์')
      setกำลังแก้ไขเบอร์(false)
    } catch (err) {
      alert('บันทึกเบอร์ไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังบันทึกเบอร์(false)
    }
  }

  // ---- อัปโหลดรูปโปรไฟล์ ----
  async function เลือกรูปโปรไฟล์(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return

    setกำลังอัปโหลดรูป(true)
    try {
      const นามสกุล = ไฟล์.name.split('.').pop()
      const ชื่อไฟล์ = `avatars/${user?.id || 'user'}.${นามสกุล}`

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images')
        .upload(ชื่อไฟล์, ไฟล์, { upsert: true })

      if (uploadError) throw new Error(uploadError.message)

      const { data: urlData } = supabase.storage
        .from('report-images')
        .getPublicUrl(uploadData.path)

      // เพิ่ม timestamp ต่อท้าย URL เพื่อบังคับ browser โหลดรูปใหม่ (ไม่ใช้ cache เก่า)
      const publicUrl = urlData.publicUrl + '?t=' + Date.now()

      const { error: updateError } = await supabase
        .from('users')
        .update({ avatar_url: publicUrl })
        .eq('id', user.id)

      if (updateError) throw new Error(updateError.message)

      setรูปโปรไฟล์(publicUrl)
      setข้อมูลDB(function (prev) { return { ...prev, avatar_url: publicUrl } })

    } catch (err) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังอัปโหลดรูป(false)
      event.target.value = ''
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
            onClick={() => inputรูป.current.click()}
            className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center cursor-pointer mx-auto border-4 border-white shadow-md"
          >
            {กำลังอัปโหลดรูป ? (
              <div className="w-7 h-7 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : รูปโปรไฟล์ ? (
              <img src={รูปโปรไฟล์} alt="โปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">👤</span>
            )}
          </div>

          {/* ปุ่มกล้องมุมขวาล่าง */}
          <button
            onClick={() => inputรูป.current.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white"
          >
            <span className="text-sm">📷</span>
          </button>
        </div>

        {/* input file ซ่อนไว้ */}
        <input
          ref={inputรูป}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={เลือกรูปโปรไฟล์}
        />

        <h2 className="text-xl font-bold text-gray-800">{displayName}</h2>
        <p className="text-gray-500 text-sm mt-1">{user?.email || ''}</p>

        {/* Badge role — อ่านจาก DB จริง ไม่ hardcode */}
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${roleInfo.สี}`}>
          {roleInfo.emoji} {roleInfo.ชื่อ}
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

            {/* ชื่อ — แก้ไขได้ บันทึกลง DB */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">ชื่อ</span>
              <div className="flex items-center gap-2">
                {กำลังแก้ไขชื่อ ? (
                  <>
                    <input
                      value={ชื่อชั่วคราว}
                      onChange={(e) => setชื่อชั่วคราว(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="border border-blue-300 rounded-lg px-2 py-1 text-sm text-right w-40 focus:outline-none"
                      autoFocus
                    />
                    <button
                      onClick={บันทึกชื่อ}
                      disabled={กำลังบันทึกชื่อ}
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg disabled:opacity-60"
                    >
                      {กำลังบันทึกชื่อ ? '...' : 'บันทึก'}
                    </button>
                    <button
                      onClick={() => setกำลังแก้ไขชื่อ(false)}
                      className="text-xs text-gray-400"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-800">{displayName}</span>
                    <button
                      onClick={() => {
                        setชื่อชั่วคราว(displayName)
                        setกำลังแก้ไขชื่อ(true)
                      }}
                      className="text-xs text-blue-500"
                    >
                      แก้ไข
                    </button>
                  </>
                )}
              </div>
            </div>

            {/* อีเมล */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">อีเมล</span>
              <span className="text-sm font-medium text-gray-800">{user?.email}</span>
            </div>

            {/* สิทธิ์การใช้งาน */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">สิทธิ์</span>
              <span className={`text-sm font-medium ${roleInfo.สี.split(' ')[0]}`}>
                {roleInfo.emoji} {roleInfo.ชื่อ}
              </span>
            </div>

            {/* เบอร์ติดต่อ — บันทึกลง users.phone ใน DB */}
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
                      autoFocus
                    />
                    <button
                      onClick={บันทึกเบอร์}
                      disabled={กำลังบันทึกเบอร์}
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg disabled:opacity-60"
                    >
                      {กำลังบันทึกเบอร์ ? '...' : 'บันทึก'}
                    </button>
                    <button
                      onClick={() => setกำลังแก้ไขเบอร์(false)}
                      className="text-xs text-gray-400"
                    >
                      ยกเลิก
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`text-sm font-medium ${เบอร์ติดต่อ === 'กดแก้ไขเพื่อเพิ่มเบอร์' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                      {เบอร์ติดต่อ}
                    </span>
                    <button
                      onClick={() => {
                        setเบอร์ชั่วคราว(เบอร์ติดต่อ === 'กดแก้ไขเพื่อเพิ่มเบอร์' ? '' : เบอร์ติดต่อ)
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

          </div>
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
