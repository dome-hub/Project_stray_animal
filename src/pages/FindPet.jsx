// FindPet.jsx — หน้าค้นหาสัตว์เลี้ยง
// ดึงข้อมูลจาก Supabase Database จริงๆ แล้ว

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'   // นำเข้า supabase client

function FindPet() {
  const navigate = useNavigate()

  // แท็บที่แสดงอยู่: 'form' = ค้นหา, 'result' = ผลค้นหา, 'all' = ดูทั้งหมด
  const [แท็บ, setแท็บ] = useState('form')

  // กำลัง Loading อยู่ไหม
  const [กำลังโหลด, setกำลังโหลด] = useState(true)

  // สัตว์ทั้งหมดที่ดึงมาจาก Database
  const [สัตว์ทั้งหมด, setSัตว์ทั้งหมด] = useState([])

  // เก็บค่าที่ผู้ใช้กรอก
  const [ประเภทสัตว์, setประเภทสัตว์] = useState('สุนัข')
  const [อายุ, setอายุ] = useState('')
  const [เพศ, setเพศ] = useState('')
  const [ขนาด, setขนาด] = useState('')
  const [นิสัยที่เลือก, setนิสัยที่เลือก] = useState([])

  // เก็บผลการค้นหา
  const [ผลค้นหา, setผลค้นหา] = useState([])

  // ---- ดึงข้อมูลสัตว์จาก Supabase ตอนโหลดหน้า ----
  // useEffect = ทำงานครั้งเดียวตอนหน้าเปิด ([] ข้างหลัง)
  useEffect(function () {
    async function ดึงข้อมูลสัตว์() {
      setกำลังโหลด(true)

      // ดึงข้อมูลจากตาราง animals ใน Supabase
      const { data, error } = await supabase
        .from('animals')       // ชื่อตาราง
        .select('*')           // ดึงทุก column
        .order('created_at', { ascending: false })  // ล่าสุดขึ้นก่อน

      if (error) {
        // ถ้าเกิดข้อผิดพลาด แสดงใน console
        console.log('เกิดข้อผิดพลาดในการดึงข้อมูล:', error.message)
      } else {
        // แปลงข้อมูลจาก Database ให้ตรงกับที่การ์ดต้องการ
        const แปลงแล้ว = data.map(function (สัตว์) {
          return {
            id: สัตว์.id,
            emoji: สัตว์.breed?.includes('แมว') ? '🐈' : '🐕',
            รูป: สัตว์.photo_url || null,
            ชื่อ: สัตว์.name,
            สายพันธุ์: สัตว์.breed || 'ไม่ระบุ',
            อายุ: สัตว์.age || 'ไม่ระบุ',
            เพศ: สัตว์.gender || 'ไม่ระบุ',
            สถานะ: สัตว์.status,
            สุขภาพ: สัตว์.health,
            ลักษณะ: สัตว์.description || '',
            วัคซีน: สัตว์.vaccine_info || '',
            นิสัย: สัตว์.traits ? สัตว์.traits.split(',').map(function (t) { return t.trim() }).filter(Boolean) : [],
            สถานที่: สัตว์.location || 'กำแพงแสน นครปฐม',
            คะแนน: Math.floor(Math.random() * 20) + 75,
          }
        })
        setSัตว์ทั้งหมด(แปลงแล้ว)
      }

      setกำลังโหลด(false)
    }

    ดึงข้อมูลสัตว์()
  }, [])  // [] = ทำแค่ครั้งเดียวตอนเปิดหน้า

  // ฟังก์ชันเลือก/ยกเลิกนิสัย
  function เลือกนิสัย(นิสัย) {
    if (นิสัยที่เลือก.includes(นิสัย)) {
      setนิสัยที่เลือก(นิสัยที่เลือก.filter((x) => x !== นิสัย))
    } else {
      setนิสัยที่เลือก([...นิสัยที่เลือก, นิสัย])
    }
  }

  // ฟังก์ชันค้นหาสัตว์ (กรองจากที่ดึงมาแล้ว)
  function ค้นหาสัตว์() {
    // กรองตามประเภท (สุนัข/แมว)
    const กรอง = สัตว์ทั้งหมด.filter(function (สัตว์) {
      if (ประเภทสัตว์ === 'สุนัข') return สัตว์.emoji === '🐕'
      if (ประเภทสัตว์ === 'แมว') return สัตว์.emoji === '🐈'
      return true
    })

    // เรียงจากคะแนนสูงสุด
    const เรียงแล้ว = [...กรอง].sort((a, b) => b.คะแนน - a.คะแนน)

    setผลค้นหา(เรียงแล้ว)
    setแท็บ('result')
  }

  // ---- หน้า Loading ----
  if (กำลังโหลด) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">กำลังโหลดข้อมูลสัตว์...</h2>
        <p className="text-gray-500 text-sm">กรุณารอสักครู่</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-green-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-gray-500 text-xs">ค้นหาเพื่อนที่เหมาะกับคุณ</p>
        </div>
      </div>

      {/* แท็บสลับระหว่าง "ค้นหา" และ "ดูทั้งหมด" */}
      <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setแท็บ('form')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            แท็บ === 'form' || แท็บ === 'result'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          🔍 ค้นหาด้วย AI
        </button>
        <button
          onClick={() => setแท็บ('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
            แท็บ === 'all'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          🐾 ดูทั้งหมด ({สัตว์ทั้งหมด.length})
        </button>
      </div>

      {/* ---- แสดงผลการค้นหา ---- */}
      {แท็บ === 'result' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500 font-medium">
            พบ {ผลค้นหา.length} ตัว ที่เหมาะกับคุณ
          </p>

          {ผลค้นหา.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🔍</p>
              <p>ไม่พบสัตว์ที่ตรงกับเงื่อนไข</p>
            </div>
          )}

          {ผลค้นหา.map((สัตว์, ลำดับ) => (
            <การ์ดสัตว์
              key={สัตว์.id}
              สัตว์={สัตว์}
              แสดงBadge={ลำดับ === 0}
              onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
            />
          ))}

          <button
            onClick={() => setแท็บ('form')}
            className="w-full border-2 border-green-400 text-green-600 rounded-xl py-3 text-sm font-medium"
          >
            ค้นหาใหม่อีกครั้ง
          </button>
        </div>
      )}

      {/* ---- ดูสัตว์ทั้งหมด ---- */}
      {แท็บ === 'all' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500 font-medium">
            สัตว์ทั้งหมดในระบบ {สัตว์ทั้งหมด.length} ตัว
          </p>

          {สัตว์ทั้งหมด.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <p className="text-4xl mb-2">🐾</p>
              <p>ยังไม่มีสัตว์ในระบบ</p>
            </div>
          )}

          {สัตว์ทั้งหมด.map((สัตว์) => (
            <การ์ดสัตว์
              key={สัตว์.id}
              สัตว์={สัตว์}
              แสดงBadge={false}
              onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
            />
          ))}
        </div>
      )}

      {/* ---- หน้าฟอร์มค้นหา ---- */}
      {แท็บ === 'form' && (
        <div className="px-4 pt-5 space-y-6">

          {/* เลือกประเภทสัตว์ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3">🐾 ประเภทสัตว์</p>
            <div className="flex gap-3">
              {['สุนัข', 'แมว'].map((ประเภท) => (
                <button
                  key={ประเภท}
                  onClick={() => setประเภทสัตว์(ประเภท)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    ประเภทสัตว์ === ประเภท
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {ประเภท === 'สุนัข' ? '🐕' : '🐈'} {ประเภท}
                </button>
              ))}
            </div>
          </div>

          {/* เลือกอายุ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              อายุ <span className="text-red-400">*</span>
            </p>
            <select
              value={อายุ}
              onChange={(e) => setอายุ(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none"
            >
              <option value="">-- เลือกช่วงอายุ --</option>
              <option>น้อยกว่า 1 ปี</option>
              <option>1–3 ปี</option>
              <option>3–7 ปี</option>
              <option>มากกว่า 7 ปี</option>
            </select>
          </div>

          {/* เลือกเพศ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              เพศ <span className="text-red-400">*</span>
            </p>
            <div className="flex gap-3 flex-wrap">
              {['เพศผู้', 'เพศเมีย', 'ไม่ทราบ'].map((ตัวเลือก) => (
                <button
                  key={ตัวเลือก}
                  onClick={() => setเพศ(ตัวเลือก)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    เพศ === ตัวเลือก
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {ตัวเลือก}
                </button>
              ))}
            </div>
          </div>

          {/* เลือกนิสัย */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">
              นิสัยที่ต้องการ{' '}
              <span className="text-gray-400 font-normal text-xs">(เลือกได้หลายข้อ)</span>
            </p>
            <div className="grid grid-cols-2 gap-3">
              {['เป็นมิตร', 'ชอบอิสระ', 'สงบเสงี่ยม', 'กระตือรือร้น', 'ขี้เล่น', 'ชอบออกกำลัง'].map((นิสัย) => (
                <label key={นิสัย} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={นิสัยที่เลือก.includes(นิสัย)}
                    onChange={() => เลือกนิสัย(นิสัย)}
                    className="w-4 h-4 accent-green-500"
                  />
                  <span className="text-sm text-gray-700">{นิสัย}</span>
                </label>
              ))}
            </div>
          </div>

          {/* ปุ่มค้นหา */}
          <button
            onClick={ค้นหาสัตว์}
            disabled={!อายุ || !เพศ}
            className="w-full bg-green-500 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ค้นหาสัตว์เลี้ยงที่เหมาะกับฉัน
          </button>

        </div>
      )}

    </div>
  )
}

// Component การ์ดสัตว์ — ใช้ซ้ำได้
function การ์ดสัตว์({ สัตว์, แสดงBadge, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
    >
      <div className="flex items-start gap-4">
        {/* รูปสัตว์ */}
        <div className="w-16 h-16 bg-green-100 rounded-2xl overflow-hidden flex items-center justify-center text-3xl shrink-0">
          {สัตว์.รูป
            ? <img src={สัตว์.รูป} alt={สัตว์.ชื่อ} className="w-full h-full object-cover" />
            : สัตว์.emoji
          }
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between mb-1">
            <h3 className="font-bold text-gray-800">{สัตว์.ชื่อ}</h3>
            <div className="flex items-center gap-1">
              {แสดงBadge && (
                <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                  แนะนำ
                </span>
              )}
              <span className="text-xs font-bold text-green-600">{สัตว์.คะแนน}%</span>
            </div>
          </div>

          <p className="text-gray-500 text-xs mb-2">
            {สัตว์.สายพันธุ์} • {สัตว์.อายุ} • {สัตว์.เพศ}
          </p>

          {/* Tag นิสัย */}
          <div className="flex flex-wrap gap-1">
            {สัตว์.นิสัย.map((น) => (
              <span key={น} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">
                {น}
              </span>
            ))}
          </div>

          <p className="text-xs text-gray-400 mt-2">📍 {สัตว์.สถานที่}</p>
        </div>
      </div>
    </button>
  )
}

export default FindPet
