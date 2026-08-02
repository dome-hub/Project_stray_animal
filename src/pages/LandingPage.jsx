// LandingPage.jsx — หน้าแรกสาธารณะ (ไม่ต้อง login)
//
// Google ตรวจ OAuth branding แล้วฟ้องว่าหน้าแรกเดิม (ฟอร์ม Login ตรงๆ) "อยู่หลังหน้า login"
// และไม่อธิบายวัตถุประสงค์ของแอป — จึงแยกหน้านี้ออกมาเป็นหน้าอธิบายแอปล้วนๆ
// ส่วนฟอร์ม login/สมัครสมาชิกจริงย้ายไปอยู่ที่ /login (ดู App.jsx)

import { Link } from 'react-router-dom'
import { Megaphone, Search, MapPin, Users, ArrowRight } from 'lucide-react'

const จุดเด่น = [
  { Icon: Megaphone, ชื่อ: 'แจ้งเหตุสัตว์จร', รายละเอียด: 'ถ่ายรูปและแจ้งตำแหน่งสัตว์จรที่ต้องการความช่วยเหลือได้ทันที' },
  { Icon: Search,    ชื่อ: 'ตามหาสัตว์เลี้ยง', รายละเอียด: 'โพสต์ประกาศสัตว์เลี้ยงสูญหาย หรือช่วยตามหาให้เจ้าของ' },
  { Icon: MapPin,    ชื่อ: 'ติดตามสถานะ',   รายละเอียด: 'ดูความคืบหน้าการช่วยเหลือ ตั้งแต่แจ้งเหตุจนจบเคส' },
  { Icon: Users,     ชื่อ: 'ทีมงานในพื้นที่', รายละเอียด: 'เจ้าหน้าที่และอาสาสมัครในตำบลกำแพงแสนดูแลทุกเคส' },
]

function LandingPage() {
  return (
    <div className="min-h-screen bg-blue-50">
      <div className="max-w-lg mx-auto px-4 py-10">

        {/* โลโก้ + ชื่อแอป
            ชื่อ "JaengJon" แยกเป็นหัวข้อหลักเดี่ยวๆ (ไม่ฝังในวงเล็บ) และมีคำอธิบายวัตถุประสงค์ทั้งอังกฤษ+ไทย
            เพราะ Google OAuth branding verification เช็คว่าชื่อแอปตรงกับหน้าแรกไหม และหน้าแรกอธิบายวัตถุประสงค์ชัดหรือไม่ */}
        <div className="flex flex-col items-center text-center mb-8">
          <img src="/logo.png" alt="JaengJon" className="w-20 h-20 rounded-2xl mb-4" />
          {/* ชื่อเดี่ยวๆ "JaengJon" ให้ตรงกับช่อง App name ของ OAuth consent screen เป๊ะ
              เดิมมีบรรทัด "แจ้งจร" คั่นตรงนี้ แล้ว Google ตรวจไม่ผ่านเพราะถือว่าหน้าเว็บใช้ชื่ออื่น
              ชื่อไทยย้ายไปอยู่ในย่อหน้าคำอธิบายภาษาไทยด้านล่างแทน */}
          <h1 className="text-3xl font-bold text-gray-800">JaengJon</h1>
          <p className="text-gray-500 text-sm mt-3 max-w-sm leading-relaxed">
            JaengJon is a stray animal reporting and management platform for Kamphaeng Saen,
            Nakhon Pathom, Thailand. It helps residents report stray animals in need of help
            and connects them with local officials and volunteers.
          </p>
          <p className="text-gray-500 text-sm mt-2 max-w-sm leading-relaxed">
            แจ้งจร คือระบบแจ้งเหตุและจัดการสัตว์จรจัด สำหรับตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม
            ช่วยให้ประชาชนแจ้งพบสัตว์จรที่ต้องการความช่วยเหลือ และประสานงานกับเจ้าหน้าที่ในพื้นที่ได้ง่ายขึ้น
          </p>
        </div>

        {/* ปุ่มเข้าสู่ระบบ */}
        <Link
          to="/login"
          className="w-full flex items-center justify-center gap-2 bg-blue-500 hover:bg-blue-600 text-white rounded-2xl py-4 font-semibold shadow-sm transition-colors mb-8"
        >
          เข้าสู่ระบบ / สมัครสมาชิก <ArrowRight size={18} />
        </Link>

        {/* จุดเด่นของแอป */}
        <div className="grid grid-cols-2 gap-3">
          {จุดเด่น.map((จ) => (
            <div key={จ.ชื่อ} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-500 flex items-center justify-center mb-2">
                <จ.Icon size={18} strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm mb-1">{จ.ชื่อ}</h3>
              <p className="text-gray-500 text-xs leading-relaxed">{จ.รายละเอียด}</p>
            </div>
          ))}
        </div>

        {/* ลิงก์นโยบายความเป็นส่วนตัว */}
        <p className="text-xs text-gray-400 text-center mt-8">
          <Link to="/privacy" className="text-blue-500 hover:text-blue-600 underline">
            นโยบายความเป็นส่วนตัว
          </Link>
        </p>

      </div>
    </div>
  )
}

export default LandingPage
