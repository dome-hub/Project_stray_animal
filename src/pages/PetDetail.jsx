// PetDetail.jsx — หน้าแสดงรายละเอียดสัตว์แต่ละตัว
// ผู้ใช้ติดต่อขอรับเลี้ยงผ่านเบอร์ศูนย์พักพิง — เจ้าหน้าที่เป็นคนยืนยันการรับเลี้ยง

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

  // ---- ข้อมูลศูนย์พักพิงจาก DB ----
  const [ศูนย์,       setศูนย์]       = useState(null)
  const [โหลดศูนย์,   setโหลดศูนย์]   = useState(true)
  const [แสดงContact, setแสดงContact] = useState(false)

  useEffect(function () {
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
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'ประเภท',    value: สัตว์.emoji === '🐕' ? 'สุนัข' : 'แมว' },
            { label: 'เพศ',       value: สัตว์.เพศ       || 'ไม่ระบุ' },
            { label: 'อายุ',      value: สัตว์.อายุ      || 'ไม่ระบุ' },
            { label: 'สายพันธุ์', value: สัตว์.สายพันธุ์ || 'ไม่ระบุ' },
            { label: 'สุขภาพ',   value: สัตว์.สุขภาพ   || 'ไม่ระบุ' },
            { label: 'สถานะ',    value: สัตว์.สถานะ    || 'ไม่ระบุ' },
          ].map(function (item) {
            return (
              <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500 mb-1">{item.label}</p>
                <p className="font-semibold text-gray-800 text-sm">{item.value}</p>
              </div>
            )
          })}
        </div>
      </div>

      {/* วัคซีน */}
      {สัตว์.วัคซีน && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">💉 การฉีดวัคซีน</h3>
          <span className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
            สัตว์.วัคซีน === 'ฉีดแล้ว'   ? 'bg-green-100 text-green-700' :
            สัตว์.วัคซีน === 'ยังไม่ฉีด' ? 'bg-red-100 text-red-600'    :
            'bg-gray-100 text-gray-600'
          }`}>
            {สัตว์.วัคซีน === 'ฉีดแล้ว'   ? '✅ ฉีดวัคซีนแล้ว'       :
             สัตว์.วัคซีน === 'ยังไม่ฉีด' ? '❌ ยังไม่ได้ฉีดวัคซีน' :
             '❓ ไม่ทราบประวัติ'}
          </span>
        </div>
      )}

      {/* นิสัย */}
      {สัตว์.นิสัย && สัตว์.นิสัย.length > 0 && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">🐾 ลักษณะนิสัย</h3>
          <div className="flex flex-wrap gap-2">
            {สัตว์.นิสัย.map(function (น) {
              return (
                <span key={น} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm font-medium">
                  {น.trim()}
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* รายละเอียดเพิ่มเติม */}
      {สัตว์.ลักษณะ && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
          <h3 className="font-bold text-gray-800 mb-3">📝 รายละเอียดเพิ่มเติม</h3>
          <p className="text-sm text-gray-600 leading-relaxed">{สัตว์.ลักษณะ}</p>
        </div>
      )}

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

      {/* ปุ่มติดต่อขอรับเลี้ยง */}
      <div className="px-4 mt-6">
        <button
          onClick={() => setแสดงContact(true)}
          className="w-full bg-green-500 text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2"
        >
          📞 ติดต่อขอรับเลี้ยง{สัตว์.ชื่อ !== 'ยังไม่ตั้งชื่อ' ? ` ${สัตว์.ชื่อ}` : ''}
        </button>
        <p className="text-center text-xs text-gray-400 mt-2">
          ติดต่อศูนย์พักพิง — เจ้าหน้าที่จะเป็นผู้ยืนยันการรับเลี้ยง
        </p>
      </div>

      {/* ============================================================
          BOTTOM SHEET: ข้อมูลติดต่อ
          ============================================================ */}
      {แสดงContact && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end"
             onClick={() => setแสดงContact(false)}>
          <div className="bg-white w-full rounded-t-3xl"
               onClick={function (e) { e.stopPropagation() }}>

            {/* Handle */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-5 pt-2 pb-8 space-y-4">

              {/* หัว */}
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl overflow-hidden bg-green-100 flex items-center justify-center shrink-0">
                  {สัตว์.รูป
                    ? <img src={สัตว์.รูป} alt={สัตว์.ชื่อ} className="w-full h-full object-cover" />
                    : <span className="text-3xl">{สัตว์.emoji}</span>
                  }
                </div>
                <div>
                  <p className="font-bold text-gray-800">ขอรับเลี้ยง {สัตว์.ชื่อ}</p>
                  <p className="text-xs text-gray-500">{สัตว์.สายพันธุ์}</p>
                </div>
              </div>

              {/* คำแนะนำ */}
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <p className="text-sm font-semibold text-green-800 mb-1">📋 ขั้นตอนการขอรับเลี้ยง</p>
                <ol className="text-xs text-green-700 space-y-1 list-decimal list-inside leading-relaxed">
                  <li>โทรติดต่อศูนย์พักพิงด้านล่าง</li>
                  <li>แจ้งชื่อสัตว์ที่ต้องการรับเลี้ยง</li>
                  <li>เจ้าหน้าที่จะนัดหมายและดำเนินการต่อ</li>
                </ol>
              </div>

              {/* ข้อมูลศูนย์ */}
              {ศูนย์ ? (
                <div className="space-y-3">
                  {ศูนย์.shelter_name && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-xl">🏠</span>
                      <div>
                        <p className="text-xs text-gray-400">ศูนย์พักพิง</p>
                        <p className="text-sm font-semibold text-gray-800">{ศูนย์.shelter_name}</p>
                      </div>
                    </div>
                  )}
                  {ศูนย์.shelter_location && (
                    <div className="flex items-center gap-3 bg-gray-50 rounded-xl px-4 py-3">
                      <span className="text-xl">📍</span>
                      <div>
                        <p className="text-xs text-gray-400">ที่ตั้ง</p>
                        <p className="text-sm text-gray-700">{ศูนย์.shelter_location}</p>
                      </div>
                    </div>
                  )}
                  {ศูนย์.phone ? (
                    <a href={`tel:${ศูนย์.phone}`}
                      className="flex items-center gap-3 bg-green-500 rounded-2xl px-5 py-4 w-full">
                      <span className="text-2xl">📞</span>
                      <div className="flex-1">
                        <p className="text-xs text-green-100">กดเพื่อโทรติดต่อ</p>
                        <p className="text-xl font-bold text-white tracking-wide">{ศูนย์.phone}</p>
                      </div>
                      <span className="text-white font-semibold">โทรเลย →</span>
                    </a>
                  ) : (
                    <p className="text-sm text-gray-400 text-center py-2">ไม่มีข้อมูลเบอร์โทร</p>
                  )}
                  {ศูนย์.name && (
                    <p className="text-xs text-gray-400 text-center">ผู้รับผิดชอบ: {ศูนย์.name}</p>
                  )}
                </div>
              ) : (
                <p className="text-sm text-gray-400 text-center py-4">กำลังโหลดข้อมูลติดต่อ...</p>
              )}

              <button onClick={() => setแสดงContact(false)}
                className="w-full border-2 border-gray-200 text-gray-500 rounded-xl py-3 font-medium text-sm">
                ปิด
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default PetDetail
