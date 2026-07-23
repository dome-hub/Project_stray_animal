// FindPet.jsx — หน้าค้นหาสัตว์เลี้ยง
// แสดงเฉพาะสัตว์ที่เจ้าหน้าที่เลือกโหมดประกาศ "หาบ้านใหม่" (publish_mode = 'adoption')
// ไม่ผูกกับ status เพราะ status บอกแค่ว่าน้องอยู่ไหน (ศูนย์พักพิง/รักษา) ส่วนจะประกาศอะไรอยู่ที่ publish_mode
// แต่กันไว้อีกชั้น: สัตว์ที่ออกจากความดูแลไปแล้วต้องไม่หลุดมาโชว์ ถึงข้อมูลเก่าจะยังค้าง publish_mode ไว้
// ตัวกรองเป็นการกรองข้อมูลจริงจากฟิลด์ที่เจ้าหน้าที่กรอกไว้ ไม่ใช่คะแนนสุ่ม

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PawPrint, MapPin, ArrowLeft } from 'lucide-react'
import { supabase } from '../supabase'   // นำเข้า supabase client
import AnimalIcon from '../components/AnimalIcon'

// สถานะที่แปลว่าสัตว์ออกจากความดูแลไปแล้ว — ต้องไม่โผล่ในหน้าหาบ้านไม่ว่ากรณีใด
// (ตรงกับ สถานะสัตว์ออกไปแล้ว ใน VolunteerPage ที่บังคับ publish_mode = 'none' ให้อยู่แล้ว)
const สถานะออกไปแล้ว = ['มีผู้รับเลี้ยง', 'ส่งคืนเจ้าของสำเร็จ']

// ช่วงอายุที่เจ้าหน้าที่เลือกได้ตอนกรอกข้อมูลสัตว์ (VolunteerPage) — ใช้ map เป็นกลุ่ม "เด็ก/โต" ตอนกรอง
const อายุกลุ่มเด็ก = ['น้อยกว่า 1 ปี', '1–2 ปี']
const อายุกลุ่มโต   = ['2–5 ปี', '5–10 ปี', 'มากกว่า 10 ปี']

function FindPet() {
  const navigate = useNavigate()

  // แท็บที่แสดงอยู่: 'form' = ตัวกรอง, 'result' = ผลค้นหา, 'all' = ดูทั้งหมด
  const [แท็บ, setแท็บ] = useState('form')

  // กำลัง Loading อยู่ไหม
  const [กำลังโหลด, setกำลังโหลด] = useState(true)

  // สัตว์ที่ประกาศหาบ้านใหม่ (publish_mode = 'adoption') ดึงมาจาก Database
  const [สัตว์ทั้งหมด, setSัตว์ทั้งหมด] = useState([])

  // เก็บค่าตัวกรองที่ผู้ใช้เลือก
  const [ประเภทสัตว์, setประเภทสัตว์] = useState('สุนัข')
  const [สายพันธุ์,   setสายพันธุ์]   = useState('')   // '' = ทุกสายพันธุ์
  const [ช่วงอายุ,    setช่วงอายุ]    = useState('')   // '' | 'เด็ก' | 'โต'
  const [เพศ,         setเพศ]         = useState('')
  const [ขนาด,        setขนาด]        = useState('')

  // เก็บผลการค้นหา
  const [ผลค้นหา, setผลค้นหา] = useState([])

  // ---- ดึงสัตว์ที่เผยแพร่แล้วจาก Supabase ตอนโหลดหน้า ----
  useEffect(function () {
    async function ดึงข้อมูลสัตว์() {
      setกำลังโหลด(true)

      // เฉพาะสัตว์ที่เจ้าหน้าที่เลือกโหมด "ประกาศหาบ้านใหม่" (publish_mode = 'adoption') เท่านั้น
      // ไม่ผูกกับ status อีกแล้ว เพราะ status บอกแค่ว่าน้องอยู่ไหน ส่วนจะประกาศอะไรอยู่ที่ publish_mode
      // (สัตว์ที่ประกาศ "ตามหาเจ้าของเดิม" จะไปโผล่หน้า สัตว์หาย/พลัดหลง แทน ไม่ปนกับหาบ้าน)
      const { data, error } = await supabase
        .from('animals')
        .select('*')
        .eq('publish_mode', 'adoption')
        .not('status', 'in', `(${สถานะออกไปแล้ว.map(function (s) { return `"${s}"` }).join(',')})`)
        .order('created_at', { ascending: false })

      if (error) {
        console.log('เกิดข้อผิดพลาดในการดึงข้อมูล:', error.message)
      } else {
        const แปลงแล้ว = data.map(function (สัตว์) {
          return {
            id: สัตว์.id,
            // ประเภท สุนัข/แมว — ใช้ species ที่เจ้าหน้าที่เลือกชัดเจนก่อน, ข้อมูลเก่าที่ยังไม่มี species ค่อย fallback เดาจาก breed
            ชนิด: สัตว์.species === 'แมว' ? 'แมว'
                : สัตว์.species === 'สุนัข' ? 'สุนัข'
                : (สัตว์.breed?.includes('แมว') ? 'แมว' : 'สุนัข'),
            รูป: (Array.isArray(สัตว์.photos) && สัตว์.photos[0]) || สัตว์.photo_url || null, // cover สำหรับการ์ด
            // คลังรูปทั้งหมดสำหรับ carousel หน้ารายละเอียด — รองรับข้อมูลเก่าที่มีแค่ photo_url
            รูปทั้งหมด: (Array.isArray(สัตว์.photos) && สัตว์.photos.length > 0)
              ? สัตว์.photos
              : (สัตว์.photo_url ? [สัตว์.photo_url] : []),
            ชื่อ: สัตว์.name,
            สายพันธุ์: สัตว์.breed || 'ไม่ระบุ',
            อายุ: สัตว์.age || 'ไม่ระบุ',
            เพศ: สัตว์.gender || 'ไม่ระบุ',
            ขนาด: สัตว์.size || 'ไม่ระบุ',
            สถานะ: สัตว์.status,
            สุขภาพ: สัตว์.health,
            ลักษณะ: สัตว์.description || '',
            วัคซีน: สัตว์.vaccine_info || '',
            ทำหมัน: สัตว์.neutered || '',
            นิสัย: สัตว์.traits ? สัตว์.traits.split(',').map(function (t) { return t.trim() }).filter(Boolean) : [],
            สถานที่: สัตว์.location || 'กำแพงแสน นครปฐม',
          }
        })
        setSัตว์ทั้งหมด(แปลงแล้ว)
      }

      setกำลังโหลด(false)
    }

    ดึงข้อมูลสัตว์()
  }, [])

  // ฟังก์ชันค้นหาสัตว์ — กรองจากข้อมูลจริงตามเงื่อนไขที่เลือก
  function ค้นหาสัตว์() {
    const กรอง = สัตว์ทั้งหมด.filter(function (สัตว์) {
      if (สัตว์.ชนิด !== ประเภทสัตว์) return false
      if (สายพันธุ์ && สัตว์.สายพันธุ์ !== สายพันธุ์) return false
      if (เพศ && สัตว์.เพศ !== เพศ) return false
      if (ขนาด && สัตว์.ขนาด !== ขนาด) return false
      if (ช่วงอายุ === 'เด็ก' && !อายุกลุ่มเด็ก.includes(สัตว์.อายุ)) return false
      if (ช่วงอายุ === 'โต'   && !อายุกลุ่มโต.includes(สัตว์.อายุ))   return false
      return true
    })

    setผลค้นหา(กรอง)
    setแท็บ('result')
  }

  // สายพันธุ์ที่มีจริงในกลุ่มประเภทสัตว์ที่เลือกอยู่ — โชว์แค่ตัวเลือกที่มีสัตว์จริงพร้อมจำนวน แทนดรอปดาวน์ 47 สายพันธุ์ที่ส่วนใหญ่จะไม่มีผลลัพธ์
  const สายพันธุ์ที่มี = (function () {
    const นับ = {}
    สัตว์ทั้งหมด.forEach(function (ส) {
      if (ส.ชนิด !== ประเภทสัตว์ || !ส.สายพันธุ์ || ส.สายพันธุ์ === 'ไม่ระบุ') return
      นับ[ส.สายพันธุ์] = (นับ[ส.สายพันธุ์] || 0) + 1
    })
    return Object.keys(นับ)
      .sort(function (a, b) { return นับ[b] - นับ[a] })
      .map(function (b) { return { ชื่อ: b, count: นับ[b] } })
  })()

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
        <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-gray-500 text-xs">ค้นหาเพื่อนที่เหมาะกับคุณ</p>
        </div>
      </div>

      {/* แท็บสลับระหว่าง "ตัวกรอง" และ "ดูทั้งหมด" */}
      <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1">
        <button
          onClick={() => setแท็บ('form')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            แท็บ === 'form' || แท็บ === 'result'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          <Search size={15} className="shrink-0" /> ค้นหาแบบละเอียด
        </button>
        <button
          onClick={() => setแท็บ('all')}
          className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-1.5 ${
            แท็บ === 'all'
              ? 'bg-white text-green-700 shadow-sm'
              : 'text-gray-500'
          }`}
        >
          <PawPrint size={15} className="shrink-0" /> ดูทั้งหมด ({สัตว์ทั้งหมด.length})
        </button>
      </div>

      {/* ---- แสดงผลการค้นหา ---- */}
      {แท็บ === 'result' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500 font-medium">
            พบ {ผลค้นหา.length} ตัว ที่ตรงกับเงื่อนไข
          </p>

          {ผลค้นหา.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Search size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
              <p>ไม่พบสัตว์ที่ตรงกับเงื่อนไข</p>
            </div>
          )}

          {ผลค้นหา.map((สัตว์) => (
            <การ์ดสัตว์
              key={สัตว์.id}
              สัตว์={สัตว์}
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
            สัตว์ที่พร้อมหาบ้าน {สัตว์ทั้งหมด.length} ตัว
          </p>

          {สัตว์ทั้งหมด.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <PawPrint size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
              <p>ยังไม่มีสัตว์ที่พร้อมหาบ้านในตอนนี้</p>
              <p className="text-xs mt-1">เจ้าหน้าที่ศูนย์พักพิงกำลังคัดกรองสัตว์อยู่</p>
            </div>
          )}

          {สัตว์ทั้งหมด.map((สัตว์) => (
            <การ์ดสัตว์
              key={สัตว์.id}
              สัตว์={สัตว์}
              onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
            />
          ))}
        </div>
      )}

      {/* ---- หน้าฟอร์มตัวกรอง ---- */}
      {แท็บ === 'form' && (
        <div className="px-4 pt-5 space-y-6">

          {/* เลือกประเภทสัตว์ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-1.5">
              <PawPrint size={15} className="text-gray-500 shrink-0" /> ประเภทสัตว์
            </p>
            <div className="flex gap-3">
              {['สุนัข', 'แมว'].map((ประเภท) => (
                <button
                  key={ประเภท}
                  onClick={() => { setประเภทสัตว์(ประเภท); setสายพันธุ์('') }}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1.5 ${
                    ประเภทสัตว์ === ประเภท
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  <AnimalIcon ชนิด={ประเภท} size={18} className="shrink-0" /> {ประเภท}
                </button>
              ))}
            </div>
          </div>

          {/* เลือกสายพันธุ์ — โชว์เฉพาะสายพันธุ์ที่มีสัตว์จริงของประเภทที่เลือกไว้ ไม่มีเลยไม่ต้องโชว์หัวข้อนี้ */}
          {สายพันธุ์ที่มี.length > 0 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">สายพันธุ์</p>
              <div className="flex gap-2 flex-wrap">
                {สายพันธุ์ที่มี.map((b) => (
                  <button
                    key={b.ชื่อ}
                    onClick={() => setสายพันธุ์(สายพันธุ์ === b.ชื่อ ? '' : b.ชื่อ)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1 ${
                      สายพันธุ์ === b.ชื่อ
                        ? 'border-green-500 bg-green-500 text-white'
                        : 'border-gray-200 bg-white text-gray-700'
                    }`}
                  >
                    {b.ชื่อ} <span className={สายพันธุ์ === b.ชื่อ ? 'text-white/80' : 'text-gray-400'}>({b.count})</span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* เลือกอายุ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">อายุ</p>
            <div className="flex gap-3 flex-wrap">
              {['เด็ก', 'โต'].map((ตัวเลือก) => (
                <button
                  key={ตัวเลือก}
                  onClick={() => setช่วงอายุ(ช่วงอายุ === ตัวเลือก ? '' : ตัวเลือก)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
                    ช่วงอายุ === ตัวเลือก
                      ? 'border-green-500 bg-green-500 text-white'
                      : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {ตัวเลือก}
                </button>
              ))}
            </div>
          </div>

          {/* เลือกเพศ */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">เพศ</p>
            <div className="flex gap-3 flex-wrap">
              {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map((ตัวเลือก) => (
                <button
                  key={ตัวเลือก}
                  onClick={() => setเพศ(เพศ === ตัวเลือก ? '' : ตัวเลือก)}
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

          {/* เลือกขนาดตัว */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">ขนาดตัว</p>
            <div className="flex gap-3 flex-wrap">
              {['เล็ก', 'กลาง', 'ใหญ่'].map((ตัวเลือก) => (
                <button
                  key={ตัวเลือก}
                  onClick={() => setขนาด(ขนาด === ตัวเลือก ? '' : ตัวเลือก)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
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

          {/* ปุ่มค้นหา */}
          <button
            onClick={ค้นหาสัตว์}
            className="w-full bg-green-500 text-white rounded-xl py-3.5 font-semibold text-base"
          >
            ค้นหาสัตว์เลี้ยง
          </button>

        </div>
      )}

    </div>
  )
}

// Component การ์ดสัตว์ — ใช้ซ้ำได้
function การ์ดสัตว์({ สัตว์, onClick }) {
  return (
    <button
      onClick={onClick}
      className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
    >
      <div className="flex items-start gap-4">
        {/* รูปสัตว์ */}
        <div className="w-16 h-16 bg-green-100 rounded-2xl overflow-hidden flex items-center justify-center shrink-0">
          {สัตว์.รูป
            ? <img src={สัตว์.รูป} alt={สัตว์.ชื่อ} className="w-full h-full object-cover" />
            : <AnimalIcon ชนิด={สัตว์.ชนิด} size={32} className="text-green-600" />
          }
        </div>

        <div className="flex-1">
          <h3 className="font-bold text-gray-800 mb-1">{สัตว์.ชื่อ}</h3>

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

          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <MapPin size={12} className="shrink-0" /> {สัตว์.สถานที่}
          </p>
        </div>
      </div>
    </button>
  )
}

export default FindPet
