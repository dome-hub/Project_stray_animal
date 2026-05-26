// VolunteerPage.jsx — หน้าสำหรับเจ้าหน้าที่ / อาสาสมัคร
// เชื่อม Supabase จริง ไม่มี mock data

import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

// สีของความเร่งด่วน
const สีเร่งด่วน = {
  'สูง':      'text-red-600 bg-red-50',
  'ปานกลาง': 'text-orange-600 bg-orange-50',
  'ต่ำ':      'text-green-600 bg-green-50',
}

// สีของสถานะสัตว์
const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง':    'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง':     'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา':   'text-orange-600 bg-orange-50',
  'มีผู้รับเลี้ยง':      'text-gray-500 bg-gray-100',
}

// ตัวเลือกสถานะสำหรับอัปเดต (ตรงกับ status ในตาราง reports)
const ตัวเลือกสถานะ = ['รับเรื่องแล้ว', 'ลงพื้นที่แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

function VolunteerPage({ หน้า }) {
  const navigate = useNavigate()

  // ---- State หน้า reports ----
  const [รายงานจากDB, setรายงานจากDB] = useState([])
  const [โหลดรายงาน, setโหลดรายงาน] = useState(true)
  const [รายงานที่ดูโปรไฟล์, setรายงานที่ดูโปรไฟล์] = useState(null)

  // ---- State หน้า update ----
  const [รายงานที่เลือก, setรายงานที่เลือก] = useState(null)
  const [สถานะใหม่, setSถานะใหม่] = useState('')
  const [หมายเหตุ, setหมายเหตุ] = useState('')
  const [อัปเดตสำเร็จ, setอัปเดตสำเร็จ] = useState(false)
  const [กำลังอัปเดต, setกำลังอัปเดต] = useState(false)

  // ---- State หน้า animals ----
  const [สัตว์จากDB, setSัตว์จากDB] = useState([])
  const [โหลดสัตว์, setโหลดสัตว์] = useState(true)
  const [สัตว์ที่กดดู, setSัตว์ที่กดดู] = useState(null)   // modal รายละเอียด
  const [แสดงฟอร์ม, setแสดงฟอร์ม] = useState(false)
  const [บันทึกสำเร็จ, setBันทึกสำเร็จ] = useState(false)
  const [รูปสัตว์ใหม่, setRูปสัตว์ใหม่] = useState(null)
  const [ชื่อสัตว์ใหม่, setชื่อสัตว์ใหม่] = useState('')
  const [เพศสัตว์ใหม่, setเพศสัตว์ใหม่] = useState('')
  const [สายพันธุ์ใหม่, setSายพันธุ์ใหม่] = useState('')
  const [อายุสัตว์ใหม่, setอายุสัตว์ใหม่] = useState('')
  const inputรูปสัตว์ = useRef(null)

  // ---- State หน้า stats ----
  const [สถิติ, setSถิติ] = useState({ รายงาน: 0, รอดำเนินการ: 0, สัตว์: 0, รับเลี้ยงแล้ว: 0 })

  // ดึงรายงานจาก Supabase (ใช้ทั้งหน้า reports และ update)
  useEffect(function () {
    if (หน้า !== 'reports' && หน้า !== 'update') return
    async function ดึงรายงาน() {
      setโหลดรายงาน(true)
      const { data, error } = await supabase
        .from('reports')
        .select('*')
        .order('created_at', { ascending: false })
      if (!error) setรายงานจากDB(data)
      setโหลดรายงาน(false)
    }
    ดึงรายงาน()
  }, [หน้า])

  // ดึงสัตว์จาก Supabase
  useEffect(function () {
    if (หน้า !== 'animals') return
    ดึงสัตว์()
  }, [หน้า])

  async function ดึงสัตว์() {
    setโหลดสัตว์(true)
    const { data, error } = await supabase
      .from('animals')
      .select('*')
      .order('created_at', { ascending: false })
    if (!error) setSัตว์จากDB(data)
    setโหลดสัตว์(false)
  }

  // ดึงสถิติจาก Supabase
  useEffect(function () {
    if (หน้า !== 'stats') return
    async function ดึงสถิติ() {
      const [ร1, ร2, ร3, ร4] = await Promise.all([
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }).eq('status', 'รอดำเนินการ'),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
      ])
      setSถิติ({
        รายงาน:      ร1.count || 0,
        รอดำเนินการ: ร2.count || 0,
        สัตว์:        ร3.count || 0,
        รับเลี้ยงแล้ว: ร4.count || 0,
      })
    }
    ดึงสถิติ()
  }, [หน้า])

  // บันทึกสัตว์ใหม่ลง Supabase
  async function บันทึกสัตว์ใหม่() {
    if (!ชื่อสัตว์ใหม่ || !เพศสัตว์ใหม่) return
    const { error } = await supabase.from('animals').insert({
      name:     ชื่อสัตว์ใหม่,
      gender:   เพศสัตว์ใหม่,
      breed:    สายพันธุ์ใหม่,
      age:      อายุสัตว์ใหม่,
      status:   'อยู่ศูนย์พักพิง',
      health:   'ปกติ',
      location: 'กำแพงแสน นครปฐม',
    })
    if (error) {
      alert('บันทึกไม่สำเร็จ: ' + error.message)
    } else {
      setBันทึกสำเร็จ(true)
      setชื่อสัตว์ใหม่(''); setเพศสัตว์ใหม่(''); setSายพันธุ์ใหม่('')
      setอายุสัตว์ใหม่(''); setRูปสัตว์ใหม่(null); setแสดงฟอร์ม(false)
      ดึงสัตว์()
      setTimeout(() => setBันทึกสำเร็จ(false), 3000)
    }
  }

  // อัปเดตสถานะรายงานใน Supabase
  async function ส่งอัปเดต() {
    if (!รายงานที่เลือก || !สถานะใหม่) return
    setกำลังอัปเดต(true)
    const { error } = await supabase
      .from('reports')
      .update({ status: สถานะใหม่ })
      .eq('id', รายงานที่เลือก)
    setกำลังอัปเดต(false)
    if (error) {
      alert('อัปเดตไม่สำเร็จ: ' + error.message)
    } else {
      setอัปเดตสำเร็จ(true)
      setรายงานที่เลือก(null); setSถานะใหม่(''); setหมายเหตุ('')
      // ดึงรายงานใหม่
      const { data } = await supabase.from('reports').select('*').order('created_at', { ascending: false })
      setรายงานจากDB(data)
      setTimeout(() => setอัปเดตสำเร็จ(false), 2500)
    }
  }

  // แปลงวันที่ให้อ่านง่าย
  function แปลงวันที่(str) {
    if (!str) return ''
    const d = new Date(str)
    return d.toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Title ของแต่ละหน้า
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

      {/* ======== หน้า: รายการแจ้งสัตว์จร ======== */}
      {หน้า === 'reports' && (
        <div className="px-4 pt-4 space-y-4">

          {โหลดรายงาน && (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดรายงาน && รายงานจากDB.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium">ยังไม่มีรายงานในระบบ</p>
            </div>
          )}

          {!โหลดรายงาน && (
            <p className="text-sm text-gray-500 font-medium">
              ทั้งหมด {รายงานจากDB.length} รายการ
            </p>
          )}

          {รายงานจากDB.map((ร) => (
            <div key={ร.id} className="bg-white rounded-2xl p-4 shadow-sm">

              {/* หัวการ์ด */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  {/* แสดงรูปจริงถ้ามี ไม่งั้นใช้ emoji */}
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-indigo-50 flex items-center justify-center shrink-0">
                    {ร.image_url
                      ? <img src={ร.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                      : <span className="text-2xl">{ร.animal_type?.includes('แมว') ? '🐈' : '🐕'}</span>
                    }
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">
                      {ร.animal_type || 'ไม่ระบุประเภท'}
                    </p>
                    <p className="text-xs text-gray-500">📍 {ร.location_text}</p>
                    <p className="text-xs text-gray-400">
                      {แปลงวันที่(ร.created_at)} • #{String(ร.id).padStart(6, '0')}
                    </p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีเร่งด่วน[ร.urgency] || 'text-gray-600 bg-gray-50'}`}>
                  {ร.urgency || 'ปานกลาง'}
                </span>
              </div>

              {/* สถานะปัจจุบัน */}
              <div className="bg-gray-50 rounded-xl px-3 py-2 mb-3">
                <p className="text-xs text-gray-500">สถานะ: <span className="font-semibold text-gray-700">{ร.status}</span></p>
                {ร.detail && <p className="text-xs text-gray-500 mt-0.5">"{ร.detail}"</p>}
              </div>

              {/* ปุ่ม */}
              <div className="flex gap-2">
                <button
                  onClick={() => navigate('/volunteer/update')}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-xs font-medium"
                >
                  อัปเดตสถานะ
                </button>
                <button className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2 text-xs font-medium">
                  ดูแผนที่
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== หน้า: อัปเดตสถานะ ======== */}
      {หน้า === 'update' && (
        <div className="px-4 pt-4 space-y-4">

          {/* แจ้งเตือนสำเร็จ */}
          {อัปเดตสำเร็จ && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-medium">✅ อัปเดตสถานะสำเร็จ!</p>
            </div>
          )}

          {/* Loading */}
          {โหลดรายงาน && (
            <div className="text-center py-8">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลดรายงาน...</p>
            </div>
          )}

          {/* ไม่มีรายงาน */}
          {!โหลดรายงาน && รายงานจากDB.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">📋</p>
              <p className="text-sm">ยังไม่มีรายงานที่ต้องอัปเดต</p>
            </div>
          )}

          {/* เลือกรายงาน */}
          {!โหลดรายงาน && รายงานจากDB.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                เลือกรายงานที่ต้องการอัปเดต
              </p>
              <div className="space-y-2">
                {รายงานจากDB.map((ร) => (
                  <button
                    key={ร.id}
                    onClick={() => setรายงานที่เลือก(ร.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      รายงานที่เลือก === ร.id
                        ? 'border-orange-400 bg-orange-50'
                        : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      {/* รูปขนาดเล็กในรายการเลือก */}
                      <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 shrink-0 flex items-center justify-center">
                        {ร.image_url
                          ? <img src={ร.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                          : <span className="text-lg">{ร.animal_type?.includes('แมว') ? '🐈' : '🐕'}</span>
                        }
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-800">
                          {ร.animal_type || 'ไม่ระบุ'} — {ร.location_text}
                        </p>
                        <p className="text-xs text-gray-400">
                          #{String(ร.id).padStart(6, '0')} • {แปลงวันที่(ร.created_at)} • {ร.status}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* เลือกสถานะใหม่ */}
          {!โหลดรายงาน && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">สถานะใหม่</p>
              <div className="grid grid-cols-2 gap-2">
                {ตัวเลือกสถานะ.map((ส) => (
                  <button
                    key={ส}
                    onClick={() => setSถานะใหม่(ส)}
                    className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                      สถานะใหม่ === ส
                        ? 'border-orange-500 bg-orange-500 text-white'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {ส}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* หมายเหตุ */}
          {!โหลดรายงาน && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">หมายเหตุ (ไม่บังคับ)</p>
              <textarea
                value={หมายเหตุ}
                onChange={(e) => setหมายเหตุ(e.target.value)}
                placeholder="เช่น สัตว์มีบาดแผล ส่งโรงพยาบาลสัตว์แล้ว..."
                rows={3}
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none resize-none"
              />
            </div>
          )}

          <button
            onClick={ส่งอัปเดต}
            disabled={!รายงานที่เลือก || !สถานะใหม่ || กำลังอัปเดต}
            className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50"
          >
            {กำลังอัปเดต ? '⏳ กำลังบันทึก...' : 'บันทึกการอัปเดต'}
          </button>
        </div>
      )}

      {/* ======== หน้า: จัดการข้อมูลสัตว์ ======== */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4">

          {/* ปุ่มเพิ่มสัตว์ */}
          <button
            onClick={() => setแสดงฟอร์ม(!แสดงฟอร์ม)}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-medium"
          >
            {แสดงฟอร์ม ? '✕ ปิดฟอร์ม' : '+ เพิ่มสัตว์ใหม่'}
          </button>

          {/* ฟอร์มเพิ่มสัตว์ */}
          {แสดงฟอร์ม && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-800">เพิ่มสัตว์ใหม่</p>

              {/* รูปภาพ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">รูปภาพสัตว์</p>
                <div
                  onClick={() => inputรูปสัตว์.current.click()}
                  className="border-2 border-dashed border-green-300 rounded-xl overflow-hidden cursor-pointer bg-gray-50 hover:bg-green-50"
                >
                  {รูปสัตว์ใหม่ ? (
                    <img src={รูปสัตว์ใหม่} alt="สัตว์" className="w-full h-40 object-cover" />
                  ) : (
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                      <div className="text-4xl mb-1">📷</div>
                      <p className="text-xs">คลิกเพื่ออัปโหลดรูปภาพ</p>
                    </div>
                  )}
                </div>
                <input
                  ref={inputรูปสัตว์} type="file" accept="image/*" className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) setRูปสัตว์ใหม่(URL.createObjectURL(file))
                  }}
                />
              </div>

              {/* ชื่อ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ชื่อสัตว์ <span className="text-red-400">*</span></p>
                <input value={ชื่อสัตว์ใหม่} onChange={(e) => setชื่อสัตว์ใหม่(e.target.value)}
                  placeholder="เช่น มะม่วง, ขาว, ส้ม"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>

              {/* เพศ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map((เพศ) => (
                    <button key={เพศ} onClick={() => setเพศสัตว์ใหม่(เพศ)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                        เพศสัตว์ใหม่ === เพศ ? 'border-green-500 bg-green-500 text-white' : 'border-gray-200 bg-white text-gray-700'
                      }`}>
                      {เพศ}
                    </button>
                  ))}
                </div>
              </div>

              {/* สายพันธุ์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">สายพันธุ์</p>
                <input value={สายพันธุ์ใหม่} onChange={(e) => setSายพันธุ์ใหม่(e.target.value)}
                  placeholder="เช่น สุนัขพันธุ์ไทย, แมวส้ม"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400" />
              </div>

              {/* อายุ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ (โดยประมาณ)</p>
                <select value={อายุสัตว์ใหม่} onChange={(e) => setอายุสัตว์ใหม่(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none">
                  <option value="">-- เลือกช่วงอายุ --</option>
                  <option>น้อยกว่า 1 ปี</option>
                  <option>1–2 ปี</option>
                  <option>2–5 ปี</option>
                  <option>5–10 ปี</option>
                  <option>มากกว่า 10 ปี</option>
                  <option>ไม่ทราบ</option>
                </select>
              </div>

              {/* บันทึก */}
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

          {/* รายการสัตว์จาก Supabase */}
          <p className="text-sm font-semibold text-gray-700">
            สัตว์ในความดูแล ({สัตว์จากDB.length} ตัว)
          </p>

          {โหลดสัตว์ && (
            <div className="text-center py-6 text-gray-400">
              <div className="w-8 h-8 border-4 border-green-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm">กำลังโหลด...</p>
            </div>
          )}

          {!โหลดสัตว์ && สัตว์จากDB.length === 0 && (
            <div className="text-center py-8 text-gray-400">
              <p className="text-4xl mb-2">🐾</p>
              <p className="text-sm">ยังไม่มีสัตว์ในระบบ</p>
            </div>
          )}

          {สัตว์จากDB.map((สัตว์) => (
            <div key={สัตว์.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {สัตว์.breed?.includes('แมว') ? '🐈' : '🐕'}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{สัตว์.name}</p>
                    <p className="text-xs text-gray-500">
                      {สัตว์.breed || 'ไม่ระบุ'} • {สัตว์.age || '-'} • {สัตว์.gender || '-'}
                    </p>
                    <span className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.status] || 'text-gray-600 bg-gray-50'}`}>
                      {สัตว์.status}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  <button
                    onClick={() => setSัตว์ที่กดดู(สัตว์)}
                    className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    รายละเอียด
                  </button>
                  <p className={`text-xs ${สัตว์.health === 'ปกติ' ? 'text-green-600' : 'text-orange-600'}`}>
                    {สัตว์.health === 'ปกติ' ? '💚' : '🟡'} {สัตว์.health}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ======== Modal รายละเอียดสัตว์ (ใช้ข้อมูลจาก Supabase) ======== */}
      {สัตว์ที่กดดู && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          onClick={() => setSัตว์ที่กดดู(null)}
        >
          <div
            className="bg-white w-full rounded-t-3xl max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-4">
              {/* หัว */}
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-bold text-gray-800 text-lg">รายละเอียดสัตว์</h2>
                <button onClick={() => setSัตว์ที่กดดู(null)} className="text-gray-400 text-2xl w-8 h-8 flex items-center justify-center">✕</button>
              </div>

              {/* รูปและชื่อ */}
              <div className="bg-green-50 rounded-2xl p-4">
                <div className="w-full h-32 bg-white rounded-2xl flex items-center justify-center text-7xl mb-3 shadow-sm">
                  {สัตว์ที่กดดู.breed?.includes('แมว') ? '🐈' : '🐕'}
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

                {/* ตารางข้อมูล */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { หัว: 'เพศ',     ค่า: สัตว์ที่กดดู.gender       || '-' },
                    { หัว: 'อายุ',    ค่า: สัตว์ที่กดดู.age          || '-' },
                    { หัว: 'สุขภาพ',  ค่า: สัตว์ที่กดดู.health       || '-' },
                    { หัว: 'สถานที่', ค่า: สัตว์ที่กดดู.location     || '-' },
                  ].map((ข) => (
                    <div key={ข.หัว} className="bg-white rounded-xl px-3 py-2">
                      <p className="text-xs text-gray-400">{ข.หัว}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{ข.ค่า}</p>
                    </div>
                  ))}
                </div>

                {/* รายละเอียด */}
                {สัตว์ที่กดดู.description && (
                  <div className="bg-white rounded-xl px-3 py-2 mt-2">
                    <p className="text-xs text-gray-400">ลักษณะ / รายละเอียด</p>
                    <p className="text-sm text-gray-700 mt-0.5">{สัตว์ที่กดดู.description}</p>
                  </div>
                )}

                {/* วัคซีน */}
                <div className="bg-white rounded-xl px-3 py-2 mt-2">
                  <p className="text-xs text-gray-400">ประวัติวัคซีน</p>
                  <p className="text-sm text-gray-700 mt-0.5">{สัตว์ที่กดดู.vaccine_info || 'ยังไม่มีข้อมูล'}</p>
                </div>

                {/* วันที่เพิ่มเข้าระบบ */}
                <div className="bg-white rounded-xl px-3 py-2 mt-2">
                  <p className="text-xs text-gray-400">วันที่เพิ่มเข้าระบบ</p>
                  <p className="text-sm text-gray-700 mt-0.5">{แปลงวันที่(สัตว์ที่กดดู.created_at)}</p>
                </div>
              </div>

              {/* ปุ่ม */}
              <div className="flex gap-3">
                <button onClick={() => setSัตว์ที่กดดู(null)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium">
                  ปิด
                </button>
                <button className="flex-1 bg-green-500 text-white rounded-xl py-3 font-semibold">
                  ✏️ แก้ไขข้อมูล
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======== หน้า: สถิติ (ดึงจาก Supabase จริง) ======== */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'รายงานทั้งหมด', ค่า: สถิติ.รายงาน,      emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
              { ชื่อ: 'รอดำเนินการ',  ค่า: สถิติ.รอดำเนินการ, emoji: '⏳', สี: 'bg-yellow-50 text-yellow-600' },
              { ชื่อ: 'สัตว์ในดูแล',  ค่า: สถิติ.สัตว์,        emoji: '🐾', สี: 'bg-green-50 text-green-600'  },
              { ชื่อ: 'รับเลี้ยงแล้ว', ค่า: สถิติ.รับเลี้ยงแล้ว, emoji: '❤️', สี: 'bg-red-50 text-red-600'  },
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
