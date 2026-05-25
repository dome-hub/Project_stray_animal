// FindPet.jsx — หน้าค้นหาสัตว์เลี้ยง
// ผู้ใช้กรอกความต้องการ แล้ว AI แนะนำสัตว์ที่เหมาะสม

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// ข้อมูลสัตว์จำลอง (ในของจริงจะดึงจาก Database)
const รายการสัตว์ = [
  { id: 1, emoji: '🐕', ชื่อ: 'มะม่วง', สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', อายุ: '2 ปี', เพศ: 'ตัวผู้', ขนาด: 'กลาง', นิสัย: ['เป็นมิตร', 'ขี้เล่น'], สถานที่: 'ลาดพร้าว กรุงเทพฯ', คะแนน: 95 },
  { id: 2, emoji: '🐈', ชื่อ: 'ส้ม', สายพันธุ์: 'แมวส้ม', อายุ: '1 ปี', เพศ: 'ตัวเมีย', ขนาด: 'เล็ก', นิสัย: ['เป็นมิตร', 'สงบเสงี่ยม'], สถานที่: 'บางนา กรุงเทพฯ', คะแนน: 88 },
  { id: 3, emoji: '🐕', ชื่อ: 'ขาว', สายพันธุ์: 'สุนัขไทยหลังอาน', อายุ: '3 ปี', เพศ: 'ตัวผู้', ขนาด: 'กลาง', นิสัย: ['ขี้เล่น', 'เป็นมิตร'], สถานที่: 'มีนบุรี กรุงเทพฯ', คะแนน: 82 },
  { id: 4, emoji: '🐕', ชื่อ: 'ดำ', สายพันธุ์: 'สุนัขพันธุ์ผสม', อายุ: '4 ปี', เพศ: 'ไม่จำกัด', ขนาด: 'ใหญ่', นิสัย: ['สงบเสงี่ยม'], สถานที่: 'นนทบุรี', คะแนน: 75 },
  { id: 5, emoji: '🐈', ชื่อ: 'เทา', สายพันธุ์: 'แมวเทา', อายุ: '6 เดือน', เพศ: 'ตัวผู้', ขนาด: 'เล็ก', นิสัย: ['ขี้เล่น'], สถานที่: 'ปทุมธานี', คะแนน: 70 },
]

function FindPet() {
  const navigate = useNavigate()

  // หน้าจอปัจจุบัน: 'form' = หน้ากรอกข้อมูล, 'loading' = กำลังค้นหา, 'result' = แสดงผล
  const [หน้าจอ, setหน้าจอ] = useState('form')

  // เก็บค่าที่ผู้ใช้เลือก
  const [ประเภทสัตว์, setประเภทสัตว์] = useState('สุนัข')
  const [อายุ, setอายุ] = useState('')
  const [เพศ, setเพศ] = useState('')
  const [ขนาด, setขนาด] = useState('')
  const [นิสัยที่เลือก, setนิสัยที่เลือก] = useState([]) // เก็บนิสัยที่เลือกหลายอย่าง

  // เก็บผลการค้นหาสัตว์
  const [ผลการค้นหา, setผลการค้นหา] = useState([])

  // ฟังก์ชันเลือก/ยกเลิกนิสัย (checkbox หลายตัว)
  function เลือกนิสัย(นิสัย) {
    if (นิสัยที่เลือก.includes(นิสัย)) {
      // ถ้าเลือกแล้ว → เอาออก
      setนิสัยที่เลือก(นิสัยที่เลือก.filter((x) => x !== นิสัย))
    } else {
      // ถ้ายังไม่ได้เลือก → เพิ่มเข้าไป
      setนิสัยที่เลือก([...นิสัยที่เลือก, นิสัย])
    }
  }

  // ฟังก์ชันค้นหาสัตว์
  function ค้นหาสัตว์() {
    setหน้าจอ('loading') // แสดงหน้า loading

    // จำลองการรอ AI วิเคราะห์ 2 วินาที
    setTimeout(function () {
      // กรองสัตว์ตามประเภทที่เลือก
      const กรอง = รายการสัตว์.filter((สัตว์) => {
        if (ประเภทสัตว์ === 'สุนัข') return สัตว์.emoji === '🐕'
        if (ประเภทสัตว์ === 'แมว') return สัตว์.emoji === '🐈'
        return true
      })

      // เรียงจากคะแนนสูงสุด → ต่ำสุด
      const เรียงแล้ว = กรอง.sort((a, b) => b.คะแนน - a.คะแนน)

      setผลการค้นหา(เรียงแล้ว.length > 0 ? เรียงแล้ว : รายการสัตว์)
      setหน้าจอ('result') // เปลี่ยนไปแสดงหน้าผลลัพธ์
    }, 2000)
  }

  // แสดงหน้า Loading
  if (หน้าจอ === 'loading') {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center text-center px-6">
        <div className="w-16 h-16 border-4 border-green-500 border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI กำลังแนะนำสัตว์ที่เหมาะกับคุณ</h2>
        <p className="text-gray-500 text-sm">กรุณารอสักครู่...</p>
      </div>
    )
  }

  // แสดงหน้าผลลัพธ์
  if (หน้าจอ === 'result') {
    return (
      <div className="min-h-screen bg-green-50 pb-8">
        <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
          <button onClick={() => setหน้าจอ('form')} className="text-gray-700 text-xl">←</button>
          <div>
            <h1 className="font-bold text-gray-800">ผลการแนะนำ</h1>
            <p className="text-gray-500 text-xs">AI เลือกสัตว์ที่เหมาะกับคุณที่สุด</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {/* วนแสดงการ์ดสัตว์แต่ละตัว */}
          {ผลการค้นหา.map((สัตว์, ลำดับ) => (
            <button
              key={สัตว์.id}
              onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
              className="w-full bg-white rounded-2xl p-4 shadow-sm text-left"
            >
              <div className="flex items-start gap-4">
                {/* รูปสัตว์ */}
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl">
                  {สัตว์.emoji}
                </div>

                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800">{สัตว์.ชื่อ}</h3>
                    <div className="flex items-center gap-1">
                      {/* แสดง Badge "แนะนำ" สำหรับอันดับ 1 */}
                      {ลำดับ === 0 && (
                        <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">แนะนำ</span>
                      )}
                      <span className="text-xs font-bold text-green-600">{สัตว์.คะแนน}%</span>
                    </div>
                  </div>

                  <p className="text-gray-500 text-xs mb-2">
                    {สัตว์.สายพันธุ์} • {สัตว์.อายุ} • {สัตว์.เพศ}
                  </p>

                  {/* แสดง Tag นิสัย */}
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
          ))}
        </div>
      </div>
    )
  }

  // แสดงหน้าฟอร์ม (หน้าแรกของหน้านี้)
  return (
    <div className="min-h-screen bg-green-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-gray-500 text-xs">ตอบคำถามเพื่อหาเพื่อนที่เหมาะกับคุณ</p>
        </div>
      </div>

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
                    ? 'border-green-500 bg-green-500 text-white'   // ถ้าเลือกอยู่ → สีเขียว
                    : 'border-gray-200 bg-white text-gray-700'      // ถ้าไม่ได้เลือก → สีขาว
                }`}
              >
                {ประเภท === 'สุนัข' ? '🐕' : '🐈'} {ประเภท}
              </button>
            ))}
          </div>
        </div>

        {/* เลือกอายุ */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">อายุ <span className="text-red-400">*</span></p>
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
          <p className="text-sm font-semibold text-gray-700 mb-2">เพศ <span className="text-red-400">*</span></p>
          <div className="flex gap-3 flex-wrap">
            {['ตัวผู้', 'ตัวเมีย', 'ไม่จำกัด'].map((ตัวเลือก) => (
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

        {/* เลือกขนาด */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">ขนาด</p>
          <div className="grid grid-cols-2 gap-3">
            {['เล็ก', 'กลาง', 'ใหญ่', 'ไม่จำกัด'].map((ตัวเลือก) => (
              <button
                key={ตัวเลือก}
                onClick={() => setขนาด(ตัวเลือก)}
                className={`py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                  ขนาด === ตัวเลือก
                    ? 'border-green-500 bg-green-500 text-white'
                    : 'border-gray-200 bg-white text-gray-700'
                }`}
              >
                {ตัวเลือก}
              </button>
            ))}
          </div>
        </div>

        {/* เลือกนิสัย (เลือกได้หลายอย่าง) */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            นิสัยที่ต้องการ <span className="text-gray-400 font-normal text-xs">(เลือกได้หลายข้อ)</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {['เป็นมิตร', 'ชอบอิสระ', 'สงบเสงี่ยม', 'กระตือรือร้น', 'ขี้เล่น', 'ชอบออกกำลัง'].map((นิสัย) => (
              <label key={นิสัย} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={นิสัยที่เลือก.includes(นิสัย)} // ถ้าอยู่ในลิสต์ = checked
                  onChange={() => เลือกนิสัย(นิสัย)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-gray-700">{นิสัย}</span>
              </label>
            ))}
          </div>
        </div>

        {/* ปุ่มค้นหา — disabled ถ้ายังไม่ได้เลือกอายุและเพศ */}
        <button
          onClick={ค้นหาสัตว์}
          disabled={!อายุ || !เพศ}
          className="w-full bg-green-500 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ค้นหาสัตว์เลี้ยงที่เหมาะกับฉัน
        </button>

      </div>
    </div>
  )
}

export default FindPet
