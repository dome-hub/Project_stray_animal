import { useNavigate } from 'react-router-dom'
import { Camera, Search, ClipboardList, LogOut } from 'lucide-react'

const menuItems = [
  {
    icon: <Camera size={36} className="text-orange-500" />,
    bg: 'bg-orange-50',
    iconBg: 'bg-orange-100',
    title: 'ถ่ายภาพสัตว์จร',
    desc: 'พบสัตว์จรบนท้องถนน? ถ่ายภาพและแจ้งให้หน่วยงานทราบ',
    features: ['AI วิเคราะห์สายพันธุ์และขนาด', 'ปักหมุดตำแหน่ง GPS อัตโนมัติ', 'ส่งข้อมูลให้ อบต./เทศบาล'],
    path: '/report',
    arrow: false,
  },
  {
    icon: <Search size={36} className="text-green-500" />,
    bg: 'bg-green-50',
    iconBg: 'bg-green-100',
    title: 'ค้นหาสัตว์เลี้ยง',
    desc: 'ต้องการรับเลี้ยงสัตว์? ค้นหาเพื่อนที่เหมาะสมกับคุณ',
    features: ['ระบุความต้องการและนิสัยของคุณ', 'AI แนะนำสัตว์ที่เหมาะสม', 'ดูข้อมูลติดต่อรับเลี้ยง'],
    path: '/find-pet',
    arrow: false,
  },
  {
    icon: <ClipboardList size={28} className="text-purple-500" />,
    bg: 'bg-white',
    iconBg: 'bg-purple-100',
    title: 'ติดตามรายงาน',
    desc: 'ตรวจสอบสถานะการรายงานสัตว์จรที่คุณได้ส่งไป',
    path: '/track',
    arrow: true,
  },
]

export default function Home({ user, onLogout }) {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-blue-100 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center text-xl">
            🐕
          </div>
          <div>
            <p className="font-bold text-gray-800 text-sm leading-tight">ระบบจัดการหมาจร</p>
            <p className="text-gray-500 text-xs">{user.name}</p>
          </div>
        </div>
        <button
          onClick={onLogout}
          className="flex items-center gap-1 text-gray-500 text-sm hover:text-red-500 transition-colors"
        >
          <LogOut size={16} />
          <span>ออกจากระบบ</span>
        </button>
      </div>

      {/* Hero */}
      <div className="px-4 pt-6 pb-4">
        <h2 className="text-2xl font-bold text-gray-800">เลือกบริการที่ต้องการ</h2>
        <p className="text-gray-500 text-sm mt-1">ช่วยเหลือสัตว์จรหรือค้นหาเพื่อนสี่ขาตัวใหม่</p>
      </div>

      {/* Menu Cards */}
      <div className="px-4 space-y-4">
        {menuItems.map((item, i) => (
          <button
            key={i}
            onClick={() => navigate(item.path)}
            className={`w-full text-left ${item.bg} rounded-2xl p-5 shadow-sm hover:shadow-md active:scale-[0.98] transition-all duration-200`}
          >
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-3 flex-1">
                <div className={`w-14 h-14 ${item.iconBg} rounded-2xl flex items-center justify-center`}>
                  {item.icon}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-800">{item.title}</h3>
                  <p className="text-gray-500 text-sm mt-1">{item.desc}</p>
                </div>
                {item.features && (
                  <ul className="space-y-1">
                    {item.features.map((f, fi) => (
                      <li key={fi} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-primary mt-0.5">•</span>
                        {f}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              {item.arrow && (
                <span className="text-gray-400 text-xl ml-2">→</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}
