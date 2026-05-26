// VolunteerPage.jsx — หน้าสำหรับเจ้าหน้าที่ / อาสาสมัคร
// มี 4 หน้าย่อย: reports, update, animals, stats

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

// ข้อมูลรายงานที่รอดำเนินการ (จำลอง)
// แต่ละรายการมีข้อมูล ผู้แจ้ง ด้วย — ชื่อ เบอร์โทร และรายละเอียด
const รายงานทั้งหมด = [
  {
    id: 'RPT001300', สัตว์: 'สุนัขพันธุ์ไทย', สถานที่: 'ลาดพร้าว 101', วันที่: '26 พ.ค. 2569',
    ความเร่งด่วน: 'สูง', สถานะ: 'รอดำเนินการ', emoji: '🐕',
    ผู้แจ้ง: {
      ชื่อ: 'สมชาย ใจดี', emoji: '👨', เบอร์: '081-234-5678',
      อีเมล: 'somchai@gmail.com', หมายเหตุ: 'พบสุนัขบาดเจ็บหน้าร้านสะดวกซื้อ ขาหลังดูผิดปกติ ไม่ยอมลุก'
    }
  },
  {
    id: 'RPT001299', สัตว์: 'แมวส้ม', สถานที่: 'สวนลุมพินี', วันที่: '25 พ.ค. 2569',
    ความเร่งด่วน: 'ปานกลาง', สถานะ: 'รอดำเนินการ', emoji: '🐈',
    ผู้แจ้ง: {
      ชื่อ: 'มาลี รักสัตว์', emoji: '👩', เบอร์: '089-876-5432',
      อีเมล: 'malee@gmail.com', หมายเหตุ: 'แมวส้มผอมมาก อยู่ในสวนมาหลายวัน ดูเหมือนไม่มีเจ้าของ'
    }
  },
  {
    id: 'RPT001289', สัตว์: 'สุนัขพันธุ์ผสม', สถานที่: 'มีนบุรี', วันที่: '24 พ.ค. 2569',
    ความเร่งด่วน: 'ต่ำ', สถานะ: 'รับเรื่องแล้ว', emoji: '🐕',
    ผู้แจ้ง: {
      ชื่อ: 'วิชัย คงดี', emoji: '👨', เบอร์: '062-111-9999',
      อีเมล: 'wichai@gmail.com', หมายเหตุ: 'สุนัขพันธุ์ผสมพบบริเวณใต้สะพาน ดูสุขภาพดีแต่ไม่มีเจ้าของ'
    }
  },
]

// ข้อมูลสัตว์ในความดูแล (จำลอง)
// แต่ละตัวมีข้อมูลครบ: ตัวสัตว์, ผู้แจ้ง, และข้อมูลการจับ
const สัตว์ในดูแล = [
  {
    id: 1, emoji: '🐕', ชื่อ: 'มะม่วง', เพศ: 'ตัวผู้',
    สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', อายุ: '2 ปี',
    สถานะ: 'อยู่ศูนย์พักพิง', สุขภาพ: 'ปกติ',
    ลักษณะ: 'ขนสีน้ำตาล มีแผลเล็กน้อยที่ขาหน้าซ้าย ตาสองข้างปกติ',
    วัคซีน: 'ฉีดวัคซีนพิษสุนัขบ้าแล้ว 20 พ.ค. 2569',
    // ข้อมูลผู้แจ้ง
    ผู้แจ้ง: { ชื่อ: 'สมชาย ใจดี', emoji: '👨', เบอร์: '081-234-5678', อีเมล: 'somchai@gmail.com' },
    // ข้อมูลการจับ
    การจับ: {
      วันที่: '22 พ.ค. 2569', เวลา: '10:30 น.',
      สถานที่: 'ถนนลาดพร้าว 101 หน้าร้านสะดวกซื้อ',
      ผู้รับผิดชอบ: 'จ.ส.ต. ประยุทธ์ รักสัตว์', ตำแหน่ง: 'เจ้าหน้าที่อาสาสมัคร',
      หมายเลขรายงาน: 'RPT001300',
    },
  },
  {
    id: 2, emoji: '🐈', ชื่อ: 'ส้ม', เพศ: 'ตัวเมีย',
    สายพันธุ์: 'แมวส้ม', อายุ: '1 ปี',
    สถานะ: 'รอการรับเลี้ยง', สุขภาพ: 'ปกติ',
    ลักษณะ: 'ขนสีส้มทั้งตัว ผอมเล็กน้อย ไม่มีบาดแผล นิสัยเชื่อง',
    วัคซีน: 'ยังไม่ได้ฉีดวัคซีน (รอนัดหมาย)',
    ผู้แจ้ง: { ชื่อ: 'มาลี รักสัตว์', emoji: '👩', เบอร์: '089-876-5432', อีเมล: 'malee@gmail.com' },
    การจับ: {
      วันที่: '23 พ.ค. 2569', เวลา: '14:15 น.',
      สถานที่: 'สวนสาธารณะหมู่บ้านเกษตร ตำบลกำแพงแสน',
      ผู้รับผิดชอบ: 'นางสาว อัญชลี ดีงาม', ตำแหน่ง: 'อาสาสมัครพิทักษ์สัตว์',
      หมายเลขรายงาน: 'RPT001299',
    },
  },
  {
    id: 3, emoji: '🐕', ชื่อ: 'ขาว', เพศ: 'ตัวผู้',
    สายพันธุ์: 'สุนัขไทยหลังอาน', อายุ: '3 ปี',
    สถานะ: 'อยู่ศูนย์พักพิง', สุขภาพ: 'อยู่ระหว่างรักษา',
    ลักษณะ: 'ขนสีขาว มีบาดแผลที่หลัง อยู่ระหว่างรักษาจากสัตวแพทย์',
    วัคซีน: 'ฉีดวัคซีนครบ กำลังรักษาแผลติดเชื้อ',
    ผู้แจ้ง: { ชื่อ: 'วิชัย คงดี', emoji: '👨', เบอร์: '062-111-9999', อีเมล: 'wichai@gmail.com' },
    การจับ: {
      วันที่: '20 พ.ค. 2569', เวลา: '08:00 น.',
      สถานที่: 'ใต้สะพานคลองกำแพงแสน หมู่ 3',
      ผู้รับผิดชอบ: 'นาย ธนกร มั่นคง', ตำแหน่ง: 'เจ้าหน้าที่ อบต.',
      หมายเลขรายงาน: 'RPT001289',
    },
  },
]

// สีของความเร่งด่วน
const สีเร่งด่วน = {
  'สูง': 'text-red-600 bg-red-50',
  'ปานกลาง': 'text-orange-600 bg-orange-50',
  'ต่ำ': 'text-green-600 bg-green-50',
}

// สีของสถานะสัตว์
const สีสถานะสัตว์ = {
  'อยู่ศูนย์พักพิง': 'text-blue-600 bg-blue-50',
  'รอการรับเลี้ยง': 'text-green-600 bg-green-50',
  'อยู่ระหว่างรักษา': 'text-orange-600 bg-orange-50',
}

// ตัวเลือกสถานะสำหรับอัปเดต
const ตัวเลือกสถานะ = ['ลงพื้นที่แล้ว', 'รับตัวสัตว์แล้ว', 'อยู่ศูนย์พักพิง', 'มีผู้รับเลี้ยง']

function VolunteerPage({ หน้า }) {
  const navigate = useNavigate()

  // State สำหรับ Modal โปรไฟล์ผู้แจ้ง — เก็บว่าตอนนี้กดดูรายงานไหน
  const [รายงานที่ดูโปรไฟล์, setรายงานที่ดูโปรไฟล์] = useState(null)  // null = ปิด modal

  // State สำหรับ Modal รายละเอียดสัตว์ — เก็บสัตว์ที่กดแก้ไข
  const [สัตว์ที่กดแก้ไข, setSัตว์ที่กดแก้ไข] = useState(null)  // null = ปิด modal

  // State สำหรับหน้า update
  const [รายงานที่เลือก, setรายงานที่เลือก] = useState(null)
  const [สถานะใหม่, setSถานะใหม่] = useState('')
  const [หมายเหตุ, setหมายเหตุ] = useState('')
  const [อัปเดตสำเร็จ, setอัปเดตสำเร็จ] = useState(false)

  // State สำหรับหน้า animals — ฟอร์มเพิ่มสัตว์ใหม่
  const [แสดงฟอร์ม, setแสดงฟอร์ม] = useState(false)
  const [รูปสัตว์ใหม่, setRูปสัตว์ใหม่] = useState(null)       // เก็บ URL รูปที่เลือก
  const [ชื่อสัตว์ใหม่, setชื่อสัตว์ใหม่] = useState('')
  const [เพศสัตว์ใหม่, setเพศสัตว์ใหม่] = useState('')
  const [สายพันธุ์ใหม่, setSายพันธุ์ใหม่] = useState('')
  const [อายุสัตว์ใหม่, setอายุสัตว์ใหม่] = useState('')
  const inputรูปสัตว์ = useRef(null)                             // useRef เปิด input file

  // กำหนด Title ของแต่ละหน้า
  const titleMap = {
    reports: 'รายการแจ้งสัตว์จร',
    update: 'อัปเดตสถานะสัตว์',
    animals: 'จัดการข้อมูลสัตว์',
    stats: 'สถิติพื้นที่รับผิดชอบ',
  }

  function ส่งอัปเดต() {
    if (!รายงานที่เลือก || !สถานะใหม่) return
    setอัปเดตสำเร็จ(true)
    setTimeout(() => setอัปเดตสำเร็จ(false), 2000)
    setรายงานที่เลือก(null)
    setSถานะใหม่('')
    setหมายเหตุ('')
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

      {/* ---- หน้า: รายการแจ้งสัตว์จร ---- */}
      {หน้า === 'reports' && (
        <div className="px-4 pt-4 space-y-4">
          <p className="text-sm text-gray-500 font-medium">รอดำเนินการ {รายงานทั้งหมด.length} รายการ</p>

          {รายงานทั้งหมด.map((ร) => (
            <div key={ร.id} className="bg-white rounded-2xl p-4 shadow-sm">

              {/* ส่วนหัวการ์ด */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{ร.emoji}</span>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{ร.สัตว์}</p>
                    <p className="text-xs text-gray-500">📍 {ร.สถานที่}</p>
                    <p className="text-xs text-gray-400">{ร.วันที่} • #{ร.id}</p>
                  </div>
                </div>
                <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${สีเร่งด่วน[ร.ความเร่งด่วน]}`}>
                  {ร.ความเร่งด่วน}
                </span>
              </div>

              {/* ข้อมูลผู้แจ้งย่อ — กดดูเพิ่มเติมได้ */}
              <button
                onClick={() => setรายงานที่ดูโปรไฟล์(ร)}
                className="w-full text-left bg-orange-50 rounded-xl px-3 py-2 mb-3 hover:bg-orange-100 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{ร.ผู้แจ้ง.emoji}</span>
                    <div>
                      <p className="text-xs font-semibold text-gray-700">ผู้แจ้ง: {ร.ผู้แจ้ง.ชื่อ}</p>
                      <p className="text-xs text-gray-500">📞 {ร.ผู้แจ้ง.เบอร์}</p>
                    </div>
                  </div>
                  {/* ลูกศรชี้ขวา บอกว่ากดได้ */}
                  <span className="text-gray-400 text-sm">›</span>
                </div>
              </button>

              {/* ปุ่มอัปเดต / แผนที่ */}
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

      {/* ---- Modal โปรไฟล์ผู้แจ้ง ---- */}
      {/* แสดงเมื่อ รายงานที่ดูโปรไฟล์ ไม่ใช่ null */}
      {รายงานที่ดูโปรไฟล์ && (
        // พื้นหลังโปร่งแสง — กดข้างนอกเพื่อปิด
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          onClick={() => setรายงานที่ดูโปรไฟล์(null)}
        >
          {/* กล่อง modal — กดข้างใน ไม่ให้ปิด */}
          <div
            className="bg-white w-full rounded-t-3xl p-6 space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* หัว modal */}
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-800 text-lg">โปรไฟล์ผู้แจ้ง</h2>
              <button
                onClick={() => setรายงานที่ดูโปรไฟล์(null)}
                className="text-gray-400 text-2xl leading-none"
              >
                ✕
              </button>
            </div>

            {/* รูปโปรไฟล์ + ชื่อ */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center text-4xl">
                {รายงานที่ดูโปรไฟล์.ผู้แจ้ง.emoji}
              </div>
              <div>
                <p className="font-bold text-gray-800 text-xl">{รายงานที่ดูโปรไฟล์.ผู้แจ้ง.ชื่อ}</p>
                <p className="text-xs text-gray-400">ผู้แจ้งรายงาน #{รายงานที่ดูโปรไฟล์.id}</p>
              </div>
            </div>

            {/* ข้อมูลติดต่อ */}
            <div className="bg-gray-50 rounded-2xl p-4 space-y-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">ข้อมูลติดต่อ</p>

              {/* เบอร์โทร — กดโทรได้ */}
              <a
                href={`tel:${รายงานที่ดูโปรไฟล์.ผู้แจ้ง.เบอร์.replace(/-/g, '')}`}
                className="flex items-center gap-3 bg-green-50 rounded-xl px-4 py-3"
              >
                <span className="text-2xl">📞</span>
                <div>
                  <p className="text-xs text-gray-500">เบอร์โทรศัพท์</p>
                  <p className="font-bold text-green-700 text-lg">{รายงานที่ดูโปรไฟล์.ผู้แจ้ง.เบอร์}</p>
                </div>
                <span className="ml-auto text-green-500 text-sm font-medium">โทร</span>
              </a>

              {/* อีเมล */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-xl">✉️</span>
                <div>
                  <p className="text-xs text-gray-500">อีเมล</p>
                  <p className="text-sm text-gray-700">{รายงานที่ดูโปรไฟล์.ผู้แจ้ง.อีเมล}</p>
                </div>
              </div>
            </div>

            {/* รายละเอียดที่แจ้ง */}
            <div>
              <p className="text-xs font-semibold text-gray-500 mb-2">รายละเอียดที่แจ้ง</p>
              <div className="bg-orange-50 rounded-xl px-4 py-3">
                <p className="text-sm text-gray-700 leading-relaxed">"{รายงานที่ดูโปรไฟล์.ผู้แจ้ง.หมายเหตุ}"</p>
              </div>
            </div>

            {/* ปุ่มปิด */}
            <button
              onClick={() => setรายงานที่ดูโปรไฟล์(null)}
              className="w-full bg-gray-100 text-gray-600 rounded-xl py-3 font-medium"
            >
              ปิด
            </button>
          </div>
        </div>
      )}

      {/* ---- หน้า: อัปเดตสถานะ ---- */}
      {หน้า === 'update' && (
        <div className="px-4 pt-4 space-y-4">

          {/* แจ้งเตือนสำเร็จ */}
          {อัปเดตสำเร็จ && (
            <div className="bg-green-50 border border-green-200 rounded-2xl p-4 text-center">
              <p className="text-green-700 font-medium">✅ อัปเดตสถานะสำเร็จ!</p>
            </div>
          )}

          {/* เลือกรายงานที่จะอัปเดต */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">เลือกรายงานที่ต้องการอัปเดต</p>
            <div className="space-y-2">
              {รายงานทั้งหมด.map((ร) => (
                <button
                  key={ร.id}
                  onClick={() => setรายงานที่เลือก(ร.id)}
                  className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                    รายงานที่เลือก === ร.id
                      ? 'border-orange-400 bg-orange-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  <p className="text-sm font-medium text-gray-800">{ร.emoji} {ร.สัตว์} — {ร.สถานที่}</p>
                  <p className="text-xs text-gray-400">#{ร.id} • {ร.วันที่}</p>
                </button>
              ))}
            </div>
          </div>

          {/* เลือกสถานะใหม่ */}
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

          {/* หมายเหตุเพิ่มเติม */}
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

          <button
            onClick={ส่งอัปเดต}
            disabled={!รายงานที่เลือก || !สถานะใหม่}
            className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold disabled:opacity-50"
          >
            บันทึกการอัปเดต
          </button>
        </div>
      )}

      {/* ---- หน้า: จัดการข้อมูลสัตว์ ---- */}
      {หน้า === 'animals' && (
        <div className="px-4 pt-4 space-y-4">

          {/* ปุ่มเพิ่มสัตว์ใหม่ */}
          <button
            onClick={() => setแสดงฟอร์ม(!แสดงฟอร์ม)}
            className="w-full bg-green-500 text-white rounded-xl py-3 font-medium"
          >
            {แสดงฟอร์ม ? '✕ ปิดฟอร์ม' : '+ เพิ่มสัตว์ใหม่'}
          </button>

          {/* ฟอร์มเพิ่มสัตว์ใหม่ — มีทุกฟิลด์ */}
          {แสดงฟอร์ม && (
            <div className="bg-white rounded-2xl p-4 shadow-sm space-y-4">
              <p className="font-bold text-gray-800">เพิ่มสัตว์ใหม่</p>

              {/* อัปโหลดรูปภาพสัตว์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">รูปภาพสัตว์</p>
                <div
                  onClick={() => inputรูปสัตว์.current.click()}
                  className="border-2 border-dashed border-green-300 rounded-xl overflow-hidden cursor-pointer bg-gray-50 hover:bg-green-50 transition-colors"
                >
                  {รูปสัตว์ใหม่ ? (
                    // ถ้ามีรูปแล้ว → แสดงรูป
                    <img src={รูปสัตว์ใหม่} alt="สัตว์" className="w-full h-40 object-cover" />
                  ) : (
                    // ถ้ายังไม่มีรูป → แสดงข้อความ
                    <div className="h-32 flex flex-col items-center justify-center text-gray-400">
                      <div className="text-4xl mb-1">📷</div>
                      <p className="text-xs">คลิกเพื่ออัปโหลดรูปภาพ</p>
                      <p className="text-xs text-gray-300">JPG, PNG</p>
                    </div>
                  )}
                </div>
                {/* input file ซ่อนไว้ */}
                <input
                  ref={inputรูปสัตว์}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) setRูปสัตว์ใหม่(URL.createObjectURL(file))
                  }}
                />
              </div>

              {/* ชื่อสัตว์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">ชื่อสัตว์ <span className="text-red-400">*</span></p>
                <input
                  value={ชื่อสัตว์ใหม่}
                  onChange={(e) => setชื่อสัตว์ใหม่(e.target.value)}
                  placeholder="เช่น มะม่วง, ขาว, ส้ม"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
                />
              </div>

              {/* เพศ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-2">เพศ <span className="text-red-400">*</span></p>
                <div className="flex gap-2">
                  {['ตัวผู้', 'ตัวเมีย', 'ไม่ทราบ'].map((เพศ) => (
                    <button
                      key={เพศ}
                      onClick={() => setเพศสัตว์ใหม่(เพศ)}
                      className={`flex-1 py-2 rounded-xl text-xs font-medium border-2 transition-all ${
                        เพศสัตว์ใหม่ === เพศ
                          ? 'border-green-500 bg-green-500 text-white'
                          : 'border-gray-200 bg-white text-gray-700'
                      }`}
                    >
                      {เพศ}
                    </button>
                  ))}
                </div>
              </div>

              {/* สายพันธุ์ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">สายพันธุ์</p>
                <input
                  value={สายพันธุ์ใหม่}
                  onChange={(e) => setSายพันธุ์ใหม่(e.target.value)}
                  placeholder="เช่น สุนัขพันธุ์ไทย, แมวส้ม, ลาบราดอร์"
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-green-400"
                />
              </div>

              {/* อายุ */}
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">อายุ (โดยประมาณ)</p>
                <select
                  value={อายุสัตว์ใหม่}
                  onChange={(e) => setอายุสัตว์ใหม่(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm bg-white focus:outline-none"
                >
                  <option value="">-- เลือกช่วงอายุ --</option>
                  <option>น้อยกว่า 1 ปี</option>
                  <option>1–2 ปี</option>
                  <option>2–5 ปี</option>
                  <option>5–10 ปี</option>
                  <option>มากกว่า 10 ปี</option>
                  <option>ไม่ทราบ</option>
                </select>
              </div>

              {/* ปุ่มบันทึก */}
              <button
                disabled={!ชื่อสัตว์ใหม่ || !เพศสัตว์ใหม่}
                className="w-full bg-green-500 text-white rounded-xl py-2.5 text-sm font-medium disabled:opacity-50"
              >
                บันทึกข้อมูลสัตว์
              </button>
            </div>
          )}

          {/* รายการสัตว์ในดูแล */}
          <p className="text-sm font-semibold text-gray-700">สัตว์ในความดูแล ({สัตว์ในดูแล.length} ตัว)</p>
          {สัตว์ในดูแล.map((สัตว์) => (
            <div key={สัตว์.id} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* รูปสัตว์ */}
                  <div className="w-14 h-14 bg-green-50 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                    {สัตว์.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{สัตว์.ชื่อ}</p>
                    <p className="text-xs text-gray-500">{สัตว์.สายพันธุ์} • {สัตว์.อายุ} • {สัตว์.เพศ}</p>
                    <p className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block font-medium ${สีสถานะสัตว์[สัตว์.สถานะ]}`}>
                      {สัตว์.สถานะ}
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1.5">
                  {/* ปุ่มแก้ไข — กดแล้วเปิด modal */}
                  <button
                    onClick={() => setSัตว์ที่กดแก้ไข(สัตว์)}
                    className="text-xs bg-blue-500 text-white px-3 py-1.5 rounded-lg font-medium"
                  >
                    ดูรายละเอียด
                  </button>
                  <p className={`text-xs ${สัตว์.สุขภาพ === 'ปกติ' ? 'text-green-600' : 'text-orange-600'}`}>
                    {สัตว์.สุขภาพ === 'ปกติ' ? '💚' : '🟡'} {สัตว์.สุขภาพ}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ---- Modal รายละเอียดสัตว์ ---- */}
      {/* เปิดเมื่อกดปุ่ม "ดูรายละเอียด" ในรายการสัตว์ */}
      {สัตว์ที่กดแก้ไข && (
        // พื้นหลังโปร่งแสง — กดข้างนอกเพื่อปิด
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end justify-center"
          onClick={() => setSัตว์ที่กดแก้ไข(null)}
        >
          {/* กล่อง modal — scroll ได้ */}
          <div
            className="bg-white w-full rounded-t-3xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Handle bar บนสุด */}
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
            </div>

            <div className="px-6 pb-8 space-y-5">

              {/* หัว modal */}
              <div className="flex items-center justify-between pt-2">
                <h2 className="font-bold text-gray-800 text-lg">รายละเอียดสัตว์</h2>
                <button
                  onClick={() => setSัตว์ที่กดแก้ไข(null)}
                  className="text-gray-400 text-2xl leading-none w-8 h-8 flex items-center justify-center"
                >
                  ✕
                </button>
              </div>

              {/* ===== ส่วนที่ 1: ข้อมูลสัตว์ ===== */}
              <div className="bg-green-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-green-700 mb-3">🐾 ข้อมูลสัตว์</p>

                {/* รูปสัตว์ขนาดใหญ่ */}
                <div className="w-full h-36 bg-white rounded-2xl flex items-center justify-center text-7xl mb-4 shadow-sm">
                  {สัตว์ที่กดแก้ไข.emoji}
                </div>

                {/* ชื่อและสถานะ */}
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-xl font-bold text-gray-800">{สัตว์ที่กดแก้ไข.ชื่อ}</p>
                    <p className="text-sm text-gray-500">{สัตว์ที่กดแก้ไข.สายพันธุ์}</p>
                  </div>
                  <span className={`text-xs px-3 py-1.5 rounded-full font-semibold ${สีสถานะสัตว์[สัตว์ที่กดแก้ไข.สถานะ]}`}>
                    {สัตว์ที่กดแก้ไข.สถานะ}
                  </span>
                </div>

                {/* ตารางข้อมูลพื้นฐาน */}
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { หัว: 'เพศ', ค่า: สัตว์ที่กดแก้ไข.เพศ },
                    { หัว: 'อายุ', ค่า: สัตว์ที่กดแก้ไข.อายุ },
                    { หัว: 'สุขภาพ', ค่า: สัตว์ที่กดแก้ไข.สุขภาพ },
                    { หัว: 'วัคซีน', ค่า: '✅' },
                  ].map((ข้อมูล) => (
                    <div key={ข้อมูล.หัว} className="bg-white rounded-xl px-3 py-2">
                      <p className="text-xs text-gray-400">{ข้อมูล.หัว}</p>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5">{ข้อมูล.ค่า}</p>
                    </div>
                  ))}
                </div>

                {/* ลักษณะภายนอก */}
                <div className="bg-white rounded-xl px-3 py-2 mt-2">
                  <p className="text-xs text-gray-400">ลักษณะภายนอก</p>
                  <p className="text-sm text-gray-700 mt-0.5 leading-relaxed">{สัตว์ที่กดแก้ไข.ลักษณะ}</p>
                </div>

                {/* ข้อมูลวัคซีน */}
                <div className="bg-white rounded-xl px-3 py-2 mt-2">
                  <p className="text-xs text-gray-400">ประวัติวัคซีน / การรักษา</p>
                  <p className="text-sm text-gray-700 mt-0.5">{สัตว์ที่กดแก้ไข.วัคซีน}</p>
                </div>
              </div>

              {/* ===== ส่วนที่ 2: ผู้แจ้ง ===== */}
              <div className="bg-orange-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-orange-700 mb-3">👤 ผู้แจ้งสัตว์ตัวนี้</p>

                {/* ชื่อผู้แจ้ง */}
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center text-2xl shadow-sm">
                    {สัตว์ที่กดแก้ไข.ผู้แจ้ง.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800">{สัตว์ที่กดแก้ไข.ผู้แจ้ง.ชื่อ}</p>
                    <p className="text-xs text-gray-500">{สัตว์ที่กดแก้ไข.ผู้แจ้ง.อีเมล}</p>
                  </div>
                </div>

                {/* เบอร์โทร — กดโทรได้ */}
                <a
                  href={`tel:${สัตว์ที่กดแก้ไข.ผู้แจ้ง.เบอร์.replace(/-/g, '')}`}
                  className="flex items-center gap-3 bg-white rounded-xl px-4 py-3 shadow-sm"
                >
                  <span className="text-2xl">📞</span>
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">เบอร์ติดต่อ</p>
                    <p className="font-bold text-green-700">{สัตว์ที่กดแก้ไข.ผู้แจ้ง.เบอร์}</p>
                  </div>
                  <span className="text-green-500 text-sm font-semibold">โทร</span>
                </a>
              </div>

              {/* ===== ส่วนที่ 3: ข้อมูลการจับ ===== */}
              <div className="bg-blue-50 rounded-2xl p-4">
                <p className="text-xs font-bold text-blue-700 mb-3">🚐 ข้อมูลการจับ / นำเข้าศูนย์</p>

                <div className="space-y-2">
                  {/* วันที่และเวลา */}
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">📅</span>
                    <div>
                      <p className="text-xs text-gray-400">วันที่จับ</p>
                      <p className="font-semibold text-gray-800">
                        {สัตว์ที่กดแก้ไข.การจับ.วันที่} เวลา {สัตว์ที่กดแก้ไข.การจับ.เวลา}
                      </p>
                    </div>
                  </div>

                  {/* สถานที่จับ */}
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">📍</span>
                    <div>
                      <p className="text-xs text-gray-400">สถานที่จับ</p>
                      <p className="font-semibold text-gray-800">{สัตว์ที่กดแก้ไข.การจับ.สถานที่}</p>
                    </div>
                  </div>

                  {/* ผู้รับผิดชอบ */}
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">🦺</span>
                    <div>
                      <p className="text-xs text-gray-400">ผู้รับผิดชอบการจับ</p>
                      <p className="font-semibold text-gray-800">{สัตว์ที่กดแก้ไข.การจับ.ผู้รับผิดชอบ}</p>
                      <p className="text-xs text-gray-500">{สัตว์ที่กดแก้ไข.การจับ.ตำแหน่ง}</p>
                    </div>
                  </div>

                  {/* เลขรายงานอ้างอิง */}
                  <div className="bg-white rounded-xl px-4 py-3 flex items-center gap-3">
                    <span className="text-xl">📋</span>
                    <div>
                      <p className="text-xs text-gray-400">อ้างอิงรายงาน</p>
                      <p className="font-semibold text-gray-800">#{สัตว์ที่กดแก้ไข.การจับ.หมายเลขรายงาน}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* ปุ่มแก้ไขข้อมูล + ปุ่มปิด */}
              <div className="flex gap-3">
                <button
                  onClick={() => setSัตว์ที่กดแก้ไข(null)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-3 font-medium"
                >
                  ปิด
                </button>
                <button
                  className="flex-1 bg-green-500 text-white rounded-xl py-3 font-semibold"
                >
                  ✏️ แก้ไขข้อมูล
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ---- หน้า: สถิติ ---- */}
      {หน้า === 'stats' && (
        <div className="px-4 pt-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            {[
              { ชื่อ: 'รายงานทั้งหมด', ค่า: '24', emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
              { ชื่อ: 'รอดำเนินการ', ค่า: '3', emoji: '⏳', สี: 'bg-yellow-50 text-yellow-600' },
              { ชื่อ: 'สัตว์ในดูแล', ค่า: '12', emoji: '🐾', สี: 'bg-green-50 text-green-600' },
              { ชื่อ: 'รับเลี้ยงแล้ว', ค่า: '8', emoji: '❤️', สี: 'bg-red-50 text-red-600' },
            ].map((stat) => (
              <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                <p className="text-3xl mb-1">{stat.emoji}</p>
                <p className={`text-3xl font-bold ${stat.สี.split(' ')[1]}`}>{stat.ค่า}</p>
                <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="font-bold text-gray-800 mb-3">พื้นที่รับผิดชอบ</p>
            <p className="text-sm text-gray-600">📍 เขตลาดพร้าว, เขตบึงกุ่ม, เขตบางกะปิ</p>
          </div>
        </div>
      )}

    </div>
  )
}

export default VolunteerPage
