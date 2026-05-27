// PetDetail.jsx — หน้าแสดงรายละเอียดสัตว์แต่ละตัว
// ผู้ใช้สามารถกดยื่นคำขอรับเลี้ยงได้

import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { supabase } from '../supabase'

function PetDetail() {
  const navigate = useNavigate()

  const { state } = useLocation()

  const สัตว์ = state?.สัตว์ || {
    id: 1,
    emoji: '🐕',
    ชื่อ: 'มะม่วง',
    สายพันธุ์: 'สุนัขพันธุ์ไทยผสม',
    อายุ: '2 ปี',
    เพศ: 'ตัวผู้',
    ขนาด: 'กลาง',
    นิสัย: ['เป็นมิตร', 'ขี้เล่น'],
    สถานที่: 'ลาดพร้าว กรุงเทพฯ',
    คะแนน: 95,
  }

  const [รับเลี้ยงสำเร็จ, setรับเลี้ยงสำเร็จ] = useState(false)
  const [กำลังส่ง,        setกำลังส่ง]        = useState(false)

  // ---- ข้อมูลศูนย์พักพิงจาก DB ----
  const [ศูนย์,    setศูนย์]    = useState(null)
  const [โหลดศูนย์, setโหลดศูนย์] = useState(true)

  useEffect(function () {
    // ดึงข้อมูลศูนย์จาก volunteer คนแรกที่มี shelter_name
    supabase
      .from('users')
      .select('name, phone, shelter_name, shelter_location, service_area')
      .eq('role', 'volunteer')
      .not('shelter_name', 'is', null)
      .limit(1)
      .then(function ({ data }) {
        if (data && data.length > 0) setศูนย์(data[0])
        setโหลดศูนย์(false)
      }, function () { setโหลดศูนย์(false) })
  }, [])

  function ยื่นคำขอรับเลี้ยง() {
    setกำลังส่ง(true)
    setTimeout(function () {
      setกำลังส่ง(false)
      setรับเลี้ยงสำเร็จ(true)
    }, 1500)
  }

  if (รับเลี้ยงสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="w-28 h-28 mx-auto mb-4 rounded-2xl overflow-hidden bg-green-100 flex items-center justify-center">
          {สัตว์.รูป
            ? <img src={สัตว์.รูป} alt={สัตว์.ชื่อ} className="w-full h-full object-cover" />
            : <span className="text-7xl">{สัตว์.emoji}</span>
          }
        </div>
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ยื่นคำขอสำเร็จ!</h2>
        <p className="text-gray-600 mb-1">
          คุณได้ยื่นคำขอรับเลี้ยง <strong>{สัตว์.ชื่อ}</strong> แล้ว
        </p>
        <p className="text-gray-500 text-sm mb-6">
          เจ้าหน้าที่จะติดต่อกลับภายใน 1-2 วันทำการ
        </p>
        <button onClick={() => navigate('/home')}
          className="bg-green-500 text-white px-8 py-3 rounded-xl font-medium">
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="text-gray-700 text-xl">←</button>
        <h1 className="font-bold text-gray-800">ข้อมูลสัตว์</h1>
      </div>

      {/* การ์ดรูปสัตว์และชื่อ */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-36 h-36 mx-auto mb-4 rounded-2xl overflow-hidden bg-green-100 flex items-center justify-center">
          {สัตว์.รูป
            ? <img src={สัตว์.รูป} alt={สัตว์.ชื่อ} className="w-full h-full object-cover" />
            : <span className="text-7xl">{สัตว์.emoji}</span>
          }
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{สัตว์.ชื่อ}</h2>
        <p className="text-gray-500 text-sm mt-1">{สัตว์.สายพันธุ์}</p>
        {สัตว์.คะแนน && (
          <div className="inline-block bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-2">
            🤖 AI แนะนำ {สัตว์.คะแนน}% เหมาะกับคุณ
          </div>
        )}
      </div>

      {/* ข้อมูลทั่วไป */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">ข้อมูลทั่วไป</h3>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">อายุ</p>
            <p className="font-semibold text-gray-800 text-sm">{สัตว์.อายุ}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">เพศ</p>
            <p className="font-semibold text-gray-800 text-sm">{สัตว์.เพศ}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">ขนาด</p>
            <p className="font-semibold text-gray-800 text-sm">{สัตว์.ขนาด}</p>
          </div>
          <div className="bg-gray-50 rounded-xl p-3 text-center">
            <p className="text-xs text-gray-500 mb-1">ประเภท</p>
            <p className="font-semibold text-gray-800 text-sm">
              {สัตว์.emoji === '🐕' ? 'สุนัข' : 'แมว'}
            </p>
          </div>
        </div>
      </div>

      {/* นิสัย */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">นิสัย</h3>
        <div className="flex flex-wrap gap-2">
          {สัตว์.นิสัย.map((น) => (
            <span key={น} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm">
              {น}
            </span>
          ))}
        </div>
      </div>

      {/* ข้อมูลศูนย์พักพิง */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">🏠 ศูนย์พักพิง</h3>

        {โหลดศูนย์ ? (
          <p className="text-sm text-gray-400">กำลังโหลด...</p>
        ) : ศูนย์ ? (
          <div className="space-y-2.5">
            {ศูนย์.shelter_name && (
              <div className="flex gap-2">
                <span className="text-base shrink-0">🏠</span>
                <p className="text-sm font-semibold text-gray-800">{ศูนย์.shelter_name}</p>
              </div>
            )}
            {ศูนย์.shelter_location && (
              <div className="flex gap-2">
                <span className="text-base shrink-0">📍</span>
                <p className="text-sm text-gray-600">{ศูนย์.shelter_location}</p>
              </div>
            )}
            {ศูนย์.service_area && (
              <div className="flex gap-2">
                <span className="text-base shrink-0">🗺️</span>
                <p className="text-sm text-gray-600">พื้นที่รับผิดชอบ: {ศูนย์.service_area}</p>
              </div>
            )}
            {ศูนย์.phone && (
              <a href={`tel:${ศูนย์.phone}`}
                className="flex gap-2 items-center bg-green-50 rounded-xl px-3 py-2.5 mt-1">
                <span className="text-base shrink-0">📞</span>
                <p className="text-sm font-semibold text-green-700">{ศูนย์.phone}</p>
                <span className="text-xs text-green-500 ml-auto">โทรเลย</span>
              </a>
            )}
            {ศูนย์.name && (
              <div className="flex gap-2">
                <span className="text-base shrink-0">👤</span>
                <p className="text-sm text-gray-500">ผู้รับผิดชอบ: {ศูนย์.name}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-sm text-gray-600">📍 {สัตว์.สถานที่}</p>
            <p className="text-sm text-gray-500">📞 ติดต่อเจ้าหน้าที่เพื่อรับข้อมูลเพิ่มเติม</p>
          </div>
        )}
      </div>

      {/* ปุ่มรับเลี้ยง */}
      <div className="px-4 mt-6">
        <button
          onClick={ยื่นคำขอรับเลี้ยง}
          disabled={กำลังส่ง}
          className="w-full bg-green-500 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {กำลังส่ง ? '⏳ กำลังยื่นคำขอ...' : `❤️ รับเลี้ยง${สัตว์.ชื่อ}`}
        </button>
      </div>

    </div>
  )
}

export default PetDetail
