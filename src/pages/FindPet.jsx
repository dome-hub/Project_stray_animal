// FindPet.jsx — หน้าค้นหาสัตว์เลี้ยง
// แสดงเฉพาะสัตว์ที่เจ้าหน้าที่เลือกโหมดประกาศ "หาบ้านใหม่" (publish_mode = 'adoption')
// ไม่ผูกกับ status เพราะ status บอกแค่ว่าน้องอยู่ไหน (ศูนย์พักพิง/รักษา) ส่วนจะประกาศอะไรอยู่ที่ publish_mode
// แต่กันไว้อีกชั้น: สัตว์ที่ออกจากความดูแลไปแล้วต้องไม่หลุดมาโชว์ ถึงข้อมูลเก่าจะยังค้าง publish_mode ไว้
// ตัวกรองเป็นการกรองข้อมูลจริงจากฟิลด์ที่เจ้าหน้าที่กรอกไว้ ไม่ใช่คะแนนสุ่ม

// ---- แนวคิดหน้านี้: "ดูทั้งหมด" เป็นหลัก ตัวกรองเป็นตัวช่วยเสริม ----
// เดิมแยกเป็น 3 แท็บ (ค้นหาแบบละเอียด/ดูทั้งหมด/ผลลัพธ์) ต้องกดปุ่ม "ค้นหา" ถึงเห็นผล
// ตอนนี้รวมเหลือหน้าเดียว: เห็นสัตว์ทั้งหมดทันทีตั้งแต่เข้ามา ตัวกรองพับเก็บไว้ (กดเปิดเอง)
// และทุกตัวกรองใช้ผลจริงแบบ "กรองสด" — เลือกปุ๊บผลลัพธ์อัปเดตทันที ไม่ต้องกดค้นหา
//
// จุดสำคัญที่แก้: ก่อนหน้านี้ตัวกรองแต่ละช่อง (สายพันธุ์/อายุ/เพศ/ขนาด) นับจำนวนแยกจากกันอิสระ
// ทำให้เลือกสายพันธุ์ที่มีจริง + ขนาดที่มีจริง แต่ "ไม่มีตัวไหนที่ตรงทั้งสองอย่างพร้อมกัน" ก็เจอ 0 ตัวได้
// (เช่น สายพันธุ์นี้เจ้าหน้าที่บันทึกไว้แต่ตัวเล็ก-กลาง แต่ผู้ใช้ดันกดขนาดใหญ่)
// ตอนนี้ทุกตัวกรองคำนวณจำนวนโดยอิงตัวกรองอื่นที่เลือกอยู่แล้วเสมอ (faceted count) —
// ตัวเลือกไหนกดแล้วจะเจอ 0 ตัว จะโชว์ (0) และกดไม่ได้ตั้งแต่แรก กันทางตันไม่ให้เกิดขึ้นเลย

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, PawPrint, MapPin, ArrowLeft, SlidersHorizontal, ChevronDown, X } from 'lucide-react'
import { supabase } from '../supabase'   // นำเข้า supabase client
import AnimalIcon from '../components/AnimalIcon'

// สถานะที่แปลว่าสัตว์ออกจากความดูแลไปแล้ว — ต้องไม่โผล่ในหน้าหาบ้านไม่ว่ากรณีใด
// (ตรงกับ สถานะสัตว์ออกไปแล้ว ใน VolunteerPage ที่บังคับ publish_mode = 'none' ให้อยู่แล้ว)
const สถานะออกไปแล้ว = ['มีผู้รับเลี้ยง', 'ส่งคืนเจ้าของสำเร็จ']

// ช่วงอายุที่เจ้าหน้าที่เลือกได้ตอนกรอกข้อมูลสัตว์ (VolunteerPage) — ใช้ map เป็นกลุ่ม "เด็ก/โต" ตอนกรอง
const อายุกลุ่มเด็ก = ['น้อยกว่า 1 ปี', '1–2 ปี']
const อายุกลุ่มโต   = ['2–5 ปี', '5–10 ปี', 'มากกว่า 10 ปี']

// ---- เกณฑ์รองรับอนาคต: ถ้าข้อมูลสัตว์เยอะขึ้นจนสายพันธุ์มีเป็นสิบๆ แบบ ----
// เกินจำนวนนี้ค่อยพับเก็บเป็นปุ่ม "+N สายพันธุ์อื่นๆ" กันแถบชิปยาวจนกลืนแผงตัวกรอง
const จำนวนสายพันธุ์ที่แสดงก่อนพับ = 8
// เกินจำนวนนี้ (ตอนขยายดูทั้งหมดแล้ว) ค่อยโผล่ช่องค้นหา ให้พิมพ์กรองแทนไถหาเองในชิปเป็นสิบๆ อัน
const จำนวนสายพันธุ์ที่เริ่มมีช่องค้นหา = 12

// ตรวจว่าสัตว์ตัวหนึ่งตรงกับตัวกรองที่ระบุไหม — เว้นคีย์ไหนไว้ (ไม่ส่งมา) แปลว่าไม่กรองมิตินั้น
// ใช้ฟังก์ชันเดียวทั้งกรองผลลัพธ์จริง และนับจำนวนต่อตัวเลือกในแต่ละแถบ (แค่เว้นมิติของตัวเองออกตอนนับ)
function ตรงกับตัวกรอง(สัตว์, { breed = '', age = '', gender = '', size = '' } = {}) {
  if (breed && สัตว์.สายพันธุ์ !== breed) return false
  if (gender && สัตว์.เพศ !== gender) return false
  if (size && สัตว์.ขนาด !== size) return false
  if (age === 'เด็ก' && !อายุกลุ่มเด็ก.includes(สัตว์.อายุ)) return false
  if (age === 'โต'   && !อายุกลุ่มโต.includes(สัตว์.อายุ))   return false
  return true
}

function FindPet() {
  const navigate = useNavigate()

  // กำลัง Loading อยู่ไหม
  const [กำลังโหลด, setกำลังโหลด] = useState(true)

  // สัตว์ที่ประกาศหาบ้านใหม่ (publish_mode = 'adoption') ดึงมาจาก Database
  const [สัตว์ทั้งหมด, setSัตว์ทั้งหมด] = useState([])

  // แผงตัวกรองเปิดอยู่ไหม — พับเก็บโดยดีฟอลต์ เพราะดูสัตว์ทั้งหมดคือหลัก ตัวกรองเป็นแค่ตัวช่วยเสริม
  const [ตัวกรองเปิด, setตัวกรองเปิด] = useState(false)

  // เก็บค่าตัวกรองที่ผู้ใช้เลือก
  const [ประเภทสัตว์, setประเภทสัตว์] = useState('สุนัข')
  const [สายพันธุ์,   setสายพันธุ์]   = useState('')   // '' = ทุกสายพันธุ์
  const [แสดงสายพันธุ์ทั้งหมด, setแสดงสายพันธุ์ทั้งหมด] = useState(false) // false = พับเหลือแค่สายพันธุ์ยอดฮิต
  const [คำค้นสายพันธุ์, setคำค้นสายพันธุ์] = useState('') // ใช้กรองชิปสายพันธุ์ตอนขยายดูทั้งหมดแล้ว
  const [ช่วงอายุ,    setช่วงอายุ]    = useState('')   // '' | 'เด็ก' | 'โต'
  const [เพศ,         setเพศ]         = useState('')
  const [ขนาด,        setขนาด]        = useState('')

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

  // สัตว์เฉพาะประเภทที่เลือกอยู่ — ฐานตั้งต้นก่อนกรองมิติอื่น
  const สัตว์ตามประเภท = สัตว์ทั้งหมด.filter(function (ส) { return ส.ชนิด === ประเภทสัตว์ })

  // ผลลัพธ์จริงที่จะแสดง — ใช้ตัวกรองครบทุกมิติพร้อมกัน (กรองสด ไม่ต้องกดปุ่ม)
  const ผลลัพธ์ = สัตว์ตามประเภท.filter(function (ส) {
    return ตรงกับตัวกรอง(ส, { breed: สายพันธุ์, age: ช่วงอายุ, gender: เพศ, size: ขนาด })
  })

  // สายพันธุ์ที่มีจริง — นับโดยอิงตัวกรอง อายุ/เพศ/ขนาด ที่เลือกอยู่ (ไม่รวมตัวเอง) เพื่อไม่ให้โผล่สายพันธุ์ที่กดแล้วเจอ 0 ตัว
  const สายพันธุ์ที่มี = (function () {
    const นับ = {}
    สัตว์ตามประเภท.forEach(function (ส) {
      if (!ส.สายพันธุ์ || ส.สายพันธุ์ === 'ไม่ระบุ') return
      if (!ตรงกับตัวกรอง(ส, { age: ช่วงอายุ, gender: เพศ, size: ขนาด })) return
      นับ[ส.สายพันธุ์] = (นับ[ส.สายพันธุ์] || 0) + 1
    })
    return Object.keys(นับ)
      .sort(function (a, b) { return นับ[b] - นับ[a] })
      .map(function (b) { return { ชื่อ: b, count: นับ[b] } })
  })()

  // สายพันธุ์เยอะเกินจะโชว์ทีเดียวไหม — ถ้าเยอะเกิน ค่อยพับเหลือแค่ตัวยอดฮิต แล้วให้กด "อื่นๆ" เพื่อขยาย
  const ต้องพับสายพันธุ์ = สายพันธุ์ที่มี.length > จำนวนสายพันธุ์ที่แสดงก่อนพับ
  const ต้องมีช่องค้นหาสายพันธุ์ = สายพันธุ์ที่มี.length > จำนวนสายพันธุ์ที่เริ่มมีช่องค้นหา

  // รายการชิปสายพันธุ์ที่จะเรนเดอร์จริง: พับ = แค่ top N, ขยายแล้ว = ทั้งหมด (หรือกรองด้วยคำค้นถ้ามีช่องค้นหา)
  const สายพันธุ์ที่แสดง = (function () {
    if (!แสดงสายพันธุ์ทั้งหมด) return สายพันธุ์ที่มี.slice(0, จำนวนสายพันธุ์ที่แสดงก่อนพับ)
    const คำค้น = คำค้นสายพันธุ์.trim()
    if (!คำค้น) return สายพันธุ์ที่มี
    return สายพันธุ์ที่มี.filter(function (b) { return b.ชื่อ.includes(คำค้น) })
  })()

  // ตัวเลือกอายุ/เพศ/ขนาด — แต่ละอันนับจำนวนโดยอิงตัวกรองมิติอื่นที่เลือกอยู่ (ไม่รวมมิติของตัวเอง)
  // เพื่อให้ตัวเลือกไหนกดแล้วเจอ 0 ตัว รู้ตัวได้ก่อนกด ไม่ใช่มารู้ทีหลังว่า "หาไม่เจอ"
  const ตัวเลือกอายุ = ['เด็ก', 'โต'].map(function (กลุ่ม) {
    const count = สัตว์ตามประเภท.filter(function (ส) {
      return ตรงกับตัวกรอง(ส, { breed: สายพันธุ์, gender: เพศ, size: ขนาด })
        && (กลุ่ม === 'เด็ก' ? อายุกลุ่มเด็ก.includes(ส.อายุ) : อายุกลุ่มโต.includes(ส.อายุ))
    }).length
    return { label: กลุ่ม, count }
  })

  const ตัวเลือกเพศ = ['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map(function (g) {
    const count = สัตว์ตามประเภท.filter(function (ส) {
      return ตรงกับตัวกรอง(ส, { breed: สายพันธุ์, age: ช่วงอายุ, size: ขนาด }) && ส.เพศ === g
    }).length
    return { label: g, count }
  })

  const ตัวเลือกขนาด = ['เล็ก', 'กลาง', 'ใหญ่'].map(function (sz) {
    const count = สัตว์ตามประเภท.filter(function (ส) {
      return ตรงกับตัวกรอง(ส, { breed: สายพันธุ์, age: ช่วงอายุ, gender: เพศ }) && ส.ขนาด === sz
    }).length
    return { label: sz, count }
  })

  const จำนวนตัวกรองที่ใช้งาน = [สายพันธุ์, ช่วงอายุ, เพศ, ขนาด].filter(Boolean).length

  function ล้างตัวกรอง() {
    setสายพันธุ์('')
    setช่วงอายุ('')
    setเพศ('')
    setขนาด('')
    setแสดงสายพันธุ์ทั้งหมด(false)
    setคำค้นสายพันธุ์('')
  }

  // สลับประเภทสัตว์ — รีเซ็ตตัวกรองอื่นทั้งหมด เพราะสายพันธุ์ (และบางทีขนาด/อายุ) ของหมา-แมวไม่เหมือนกัน
  // กันไม่ให้ตัวกรองเดิมค้างมาแล้วบังเอิญกลายเป็นเงื่อนไขที่หาตัวไหนไม่เจอเลยสำหรับประเภทใหม่
  function เลือกประเภทสัตว์(ประเภท) {
    setประเภทสัตว์(ประเภท)
    ล้างตัวกรอง()
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
        <button onClick={() => navigate('/home')} aria-label="ย้อนกลับ"
          className="w-10 h-10 -ml-2 shrink-0 flex items-center justify-center rounded-full text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-gray-500 text-xs">ค้นหาเพื่อนที่เหมาะกับคุณ</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* เลือกประเภทสัตว์ — เห็นตลอด เพราะเป็นตัวแบ่งผลลัพธ์หลัก */}
        <div className="flex gap-3">
          {['สุนัข', 'แมว'].map((ประเภท) => (
            <button
              key={ประเภท}
              onClick={() => เลือกประเภทสัตว์(ประเภท)}
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

        {/* แถบสรุปผลลัพธ์ + ปุ่มเปิด/ปิดตัวกรอง — ตัวกรองเป็นแค่ตัวช่วยเสริม ไม่ใช่ขั้นตอนบังคับ */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500 font-medium">
            พบ {ผลลัพธ์.length} ตัว
          </p>
          <button
            onClick={() => setตัวกรองเปิด(!ตัวกรองเปิด)}
            className={`flex items-center gap-1.5 pl-3 pr-2.5 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
              ตัวกรองเปิด ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 bg-white text-gray-600'
            }`}
          >
            <SlidersHorizontal size={14} className="shrink-0" />
            ตัวกรอง
            {จำนวนตัวกรองที่ใช้งาน > 0 && (
              <span className="w-4 h-4 flex items-center justify-center rounded-full bg-green-500 text-white text-[10px] font-semibold">
                {จำนวนตัวกรองที่ใช้งาน}
              </span>
            )}
            <ChevronDown size={14} className={`shrink-0 transition-transform ${ตัวกรองเปิด ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {/* ---- แผงตัวกรอง — พับเก็บโดยดีฟอลต์ ---- */}
        {ตัวกรองเปิด && (
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-5">

            {/* เลือกสายพันธุ์ — โชว์เฉพาะสายพันธุ์ที่มีสัตว์จริงตรงกับตัวกรองอื่นที่เลือกอยู่ ไม่มีเลยไม่ต้องโชว์หัวข้อนี้
                ถ้ามีเยอะ (เผื่ออนาคตข้อมูลสัตว์เพิ่มขึ้น) จะพับเหลือแค่ top N ยอดฮิต + ปุ่มขยาย และถ้าเยอะมากจริงๆ จะมีช่องค้นหาให้พิมพ์กรองแทนไถหาเอง */}
            {สายพันธุ์ที่มี.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2">
                  สายพันธุ์ <span className="text-gray-400 font-normal">({สายพันธุ์ที่มี.length})</span>
                </p>

                {/* ช่องค้นหาสายพันธุ์ — โผล่เฉพาะตอนขยายดูทั้งหมดแล้ว และสายพันธุ์เยอะเกินกว่าจะไถหาเองสะดวก */}
                {แสดงสายพันธุ์ทั้งหมด && ต้องมีช่องค้นหาสายพันธุ์ && (
                  <div className="relative mb-2">
                    <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" aria-hidden="true" />
                    <input
                      type="text"
                      value={คำค้นสายพันธุ์}
                      onChange={(e) => setคำค้นสายพันธุ์(e.target.value)}
                      placeholder="พิมพ์ค้นหาสายพันธุ์..."
                      aria-label="ค้นหาสายพันธุ์"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border-2 border-gray-200 text-sm text-gray-700 placeholder:text-gray-500 focus:outline-none focus:border-green-400"
                    />
                  </div>
                )}

                <div className="flex gap-2 flex-wrap">
                  {สายพันธุ์ที่แสดง.map((b) => (
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

                  {สายพันธุ์ที่แสดง.length === 0 && (
                    <p className="text-xs text-gray-400 py-1.5">ไม่พบสายพันธุ์ที่ค้นหา</p>
                  )}
                </div>

                {/* ปุ่มพับ/ขยาย — โผล่เฉพาะตอนสายพันธุ์เยอะกว่าที่พับไว้พอดี (จำนวนสัตว์ในระบบเยอะขึ้นในอนาคต) */}
                {ต้องพับสายพันธุ์ && (
                  <button
                    onClick={() => { setแสดงสายพันธุ์ทั้งหมด(!แสดงสายพันธุ์ทั้งหมด); setคำค้นสายพันธุ์('') }}
                    className="mt-2 text-xs font-semibold text-green-600 active:text-green-700"
                  >
                    {แสดงสายพันธุ์ทั้งหมด
                      ? 'ย่อรายการ'
                      : `+${สายพันธุ์ที่มี.length - จำนวนสายพันธุ์ที่แสดงก่อนพับ} สายพันธุ์อื่นๆ`}
                  </button>
                )}
              </div>
            )}

            {/* เลือกอายุ — ตัวเลือกไหนรวมกับตัวกรองอื่นแล้วเจอ 0 ตัว จะจางลงและกดไม่ได้ */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">อายุ</p>
              <div className="flex gap-3 flex-wrap">
                {ตัวเลือกอายุ.map(({ label, count }) => {
                  const เลือกอยู่ = ช่วงอายุ === label
                  const กดไม่ได้ = count === 0 && !เลือกอยู่
                  return (
                    <button
                      key={label}
                      disabled={กดไม่ได้}
                      onClick={() => setช่วงอายุ(เลือกอยู่ ? '' : label)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1 ${
                        เลือกอยู่ ? 'border-green-500 bg-green-500 text-white'
                        : กดไม่ได้ ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {label} <span className={เลือกอยู่ ? 'text-white/80' : 'text-gray-400'}>({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* เลือกเพศ — ตัวเลือกไหนรวมกับตัวกรองอื่นแล้วเจอ 0 ตัว จะจางลงและกดไม่ได้ */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">เพศ</p>
              <div className="flex gap-3 flex-wrap">
                {ตัวเลือกเพศ.map(({ label, count }) => {
                  const เลือกอยู่ = เพศ === label
                  const กดไม่ได้ = count === 0 && !เลือกอยู่
                  return (
                    <button
                      key={label}
                      disabled={กดไม่ได้}
                      onClick={() => setเพศ(เลือกอยู่ ? '' : label)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1 ${
                        เลือกอยู่ ? 'border-green-500 bg-green-500 text-white'
                        : กดไม่ได้ ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {label} <span className={เลือกอยู่ ? 'text-white/80' : 'text-gray-400'}>({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* เลือกขนาดตัว — ตัวเลือกไหนรวมกับตัวกรองอื่นแล้วเจอ 0 ตัว จะจางลงและกดไม่ได้ */}
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">ขนาดตัว</p>
              <div className="flex gap-3 flex-wrap">
                {ตัวเลือกขนาด.map(({ label, count }) => {
                  const เลือกอยู่ = ขนาด === label
                  const กดไม่ได้ = count === 0 && !เลือกอยู่
                  return (
                    <button
                      key={label}
                      disabled={กดไม่ได้}
                      onClick={() => setขนาด(เลือกอยู่ ? '' : label)}
                      className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all flex items-center gap-1 ${
                        เลือกอยู่ ? 'border-green-500 bg-green-500 text-white'
                        : กดไม่ได้ ? 'border-gray-100 bg-gray-50 text-gray-300 cursor-not-allowed'
                        : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {label} <span className={เลือกอยู่ ? 'text-white/80' : 'text-gray-400'}>({count})</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {จำนวนตัวกรองที่ใช้งาน > 0 && (
              <button
                onClick={ล้างตัวกรอง}
                className="flex items-center gap-1 text-xs font-semibold text-gray-500 active:text-gray-700"
              >
                <X size={13} className="shrink-0" /> ล้างตัวกรองทั้งหมด
              </button>
            )}
          </div>
        )}

        {/* ---- รายการสัตว์ — กรองสดตามตัวกรองที่เลือกอยู่ (ไม่มีตัวกรองก็คือสัตว์ทั้งหมด) ---- */}
        <div className="space-y-4">
          {ผลลัพธ์.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <PawPrint size={40} strokeWidth={1.5} className="mx-auto mb-2 text-gray-300" />
              {สัตว์ตามประเภท.length === 0 ? (
                <>
                  <p>ยังไม่มี{ประเภทสัตว์}ที่พร้อมหาบ้านในตอนนี้</p>
                  <p className="text-xs mt-1">เจ้าหน้าที่ศูนย์พักพิงกำลังคัดกรองสัตว์อยู่</p>
                </>
              ) : (
                <>
                  <p>ไม่พบสัตว์ที่ตรงกับตัวกรอง</p>
                  <button onClick={ล้างตัวกรอง} className="text-xs mt-1 text-green-600 font-semibold">
                    ล้างตัวกรองทั้งหมด
                  </button>
                </>
              )}
            </div>
          )}

          {ผลลัพธ์.map((สัตว์) => (
            <การ์ดสัตว์
              key={สัตว์.id}
              สัตว์={สัตว์}
              onClick={() => navigate(`/pet/${สัตว์.id}`, { state: { สัตว์ } })}
            />
          ))}
        </div>

      </div>

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
