// PetGuide.jsx — หน้า "บทความน่ารู้" ให้ความรู้เกี่ยวกับสัตว์แต่ละสายพันธุ์
// ข้อมูลอิงจาก 37 สายพันธุ์ที่ AI ของระบบวิเคราะห์ได้ (src/data/breeds.js)

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Search, Dog, Cat, PawPrint, X, ChevronRight,
  Activity, Scissors, Users, Ruler,
} from 'lucide-react'
import { สายพันธุ์ทั้งหมด } from '../data/breeds'

const สีตามระดับกิจกรรม = {
  'สูงมาก':  'text-red-500 bg-red-50',
  'สูง':     'text-orange-500 bg-orange-50',
  'ปานกลาง': 'text-yellow-600 bg-yellow-50',
  'ต่ำ':     'text-green-600 bg-green-50',
}

function PetGuide() {
  const navigate = useNavigate()
  const [ตัวกรอง, setตัวกรอง]   = useState('ทั้งหมด')   // ทั้งหมด / สุนัข / แมว
  const [คำค้นหา, setคำค้นหา]   = useState('')
  const [ที่เปิดอยู่, setที่เปิดอยู่] = useState(null)

  const รายการ = สายพันธุ์ทั้งหมด.filter((b) => {
    const ตรงประเภท = ตัวกรอง === 'ทั้งหมด' || b.ประเภท === ตัวกรอง
    const ตรงคำค้น  = b.ชื่อไทย.toLowerCase().includes(คำค้นหา.toLowerCase())
    return ตรงประเภท && ตรงคำค้น
  })

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">บทความน่ารู้</h1>
          <p className="text-gray-500 text-xs">เกร็ดความรู้และวิธีดูแลสัตว์แต่ละสายพันธุ์</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">

        {/* ค้นหา */}
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={คำค้นหา}
            onChange={(e) => setคำค้นหา(e.target.value)}
            placeholder="ค้นหาสายพันธุ์..."
            className="w-full border border-gray-200 rounded-xl pl-9 pr-4 py-2.5 text-sm bg-white focus:outline-none focus:border-indigo-400"
          />
        </div>

        {/* ตัวกรองประเภท */}
        <div className="flex gap-2">
          {[
            { label: 'ทั้งหมด', Icon: PawPrint },
            { label: 'สุนัข',   Icon: Dog },
            { label: 'แมว',     Icon: Cat },
          ].map(({ label, Icon }) => (
            <button
              key={label}
              onClick={() => setตัวกรอง(label)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-medium border-2 transition-all ${
                ตัวกรอง === label
                  ? 'border-indigo-500 bg-indigo-500 text-white'
                  : 'border-gray-200 bg-white text-gray-600'
              }`}
            >
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>

        <p className="text-xs text-gray-400">พบ {รายการ.length} สายพันธุ์</p>

        {/* กริดรายการสายพันธุ์ */}
        <div className="grid grid-cols-2 gap-3">
          {รายการ.map((b) => (
            <button
              key={b.id}
              onClick={() => setที่เปิดอยู่(b)}
              className="text-left bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md active:scale-[0.98] transition-all border border-gray-100"
            >
              <div className={`h-24 flex items-center justify-center ${b.ประเภท === 'สุนัข' ? 'bg-orange-50' : 'bg-purple-50'}`}>
                {b.รูป ? (
                  <img src={b.รูป} alt={b.ชื่อไทย} className="w-full h-full object-cover" />
                ) : b.ประเภท === 'สุนัข' ? (
                  <Dog size={36} strokeWidth={1.5} className="text-orange-400" />
                ) : (
                  <Cat size={36} strokeWidth={1.5} className="text-purple-400" />
                )}
              </div>
              <div className="p-3">
                <h3 className="font-bold text-gray-800 text-sm truncate">{b.ชื่อไทย}</h3>
                <p className="text-gray-400 text-xs mt-0.5">{b.ประเภท} • {b.ขนาด}</p>
              </div>
            </button>
          ))}
        </div>

        {รายการ.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <PawPrint size={40} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">ไม่พบสายพันธุ์ที่ค้นหา</p>
          </div>
        )}
      </div>

      {/* ============================================================
          BOTTOM SHEET: รายละเอียดสายพันธุ์
          ============================================================ */}
      {ที่เปิดอยู่ && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end" onClick={() => setที่เปิดอยู่(null)}>
          <div className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
               onClick={(e) => e.stopPropagation()}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            {/* รูป/ไอคอนหัว */}
            <div className={`relative h-40 flex items-center justify-center ${ที่เปิดอยู่.ประเภท === 'สุนัข' ? 'bg-gradient-to-br from-orange-400 to-orange-500' : 'bg-gradient-to-br from-purple-400 to-purple-500'}`}>
              <button onClick={() => setที่เปิดอยู่(null)} aria-label="ปิด"
                className="absolute top-3 right-3 w-8 h-8 bg-black/20 rounded-full flex items-center justify-center text-white">
                <X size={16} />
              </button>
              {ที่เปิดอยู่.รูป ? (
                <img src={ที่เปิดอยู่.รูป} alt={ที่เปิดอยู่.ชื่อไทย} className="w-full h-full object-cover" />
              ) : ที่เปิดอยู่.ประเภท === 'สุนัข' ? (
                <Dog size={72} strokeWidth={1.25} className="text-white/90" />
              ) : (
                <Cat size={72} strokeWidth={1.25} className="text-white/90" />
              )}
            </div>

            <div className="px-5 pt-4 pb-8 space-y-4">

              <div>
                <h2 className="text-xl font-bold text-gray-800">{ที่เปิดอยู่.ชื่อไทย}</h2>
                <div className="flex items-center gap-1.5 text-gray-400 text-sm mt-1">
                  <Ruler size={13} /> {ที่เปิดอยู่.ประเภท} • ขนาด{ที่เปิดอยู่.ขนาด}
                </div>
              </div>

              {/* นิสัย */}
              <div className="flex flex-wrap gap-1.5">
                {ที่เปิดอยู่.นิสัย.map((n) => (
                  <span key={n} className="text-xs font-medium bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full">{n}</span>
                ))}
              </div>

              {/* ระดับกิจกรรม */}
              <div className="bg-gray-50 rounded-2xl p-4 flex gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${สีตามระดับกิจกรรม[ที่เปิดอยู่.กิจกรรม.ระดับ]}`}>
                  <Activity size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">ระดับกิจกรรม: {ที่เปิดอยู่.กิจกรรม.ระดับ}</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ที่เปิดอยู่.กิจกรรม.คำอธิบาย}</p>
                </div>
              </div>

              {/* การดูแลขน */}
              <div className="bg-gray-50 rounded-2xl p-4 flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
                  <Scissors size={18} />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">การดูแลขน</p>
                  <p className="text-xs text-gray-500 mt-0.5">{ที่เปิดอยู่.ดูแลขน}</p>
                </div>
              </div>

              {/* เหมาะกับใคร */}
              <div className="bg-indigo-50 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Users size={16} className="text-indigo-500" />
                  <p className="text-sm font-bold text-indigo-700">เหมาะกับใคร</p>
                </div>
                <ul className="space-y-1.5">
                  {ที่เปิดอยู่.เหมาะกับ.map((s, i) => (
                    <li key={i} className="text-sm text-indigo-700 flex items-start gap-2">
                      <ChevronRight size={14} className="mt-0.5 shrink-0" /> {s}
                    </li>
                  ))}
                </ul>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PetGuide
