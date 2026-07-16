// ContactPage.jsx — หน้าติดต่อหน่วยงาน (โรงพยาบาลสัตว์ / เทศบาลตำบลกำแพงแสน)

import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Stethoscope, Building2, Phone, Printer, Mail, Clock, MapPin, ExternalLink } from 'lucide-react'

const หน่วยงาน = [
  {
    ชื่อ: 'โรงพยาบาลสัตว์ มหาวิทยาลัยเกษตรศาสตร์ วิทยาเขตกำแพงแสน',
    Icon: Stethoscope,
    สี: 'text-orange-500',
    พื้นหลัง: 'bg-orange-50',
    ที่อยู่: 'ตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม 73140',
    แผนที่Url: 'https://maps.app.goo.gl/tfcHQB3eLsQoESW69',
    โทร: '0819449983',
    โทรแสดง: '081-944-9983',
    เวลาทำการ: [
      { วัน: 'จันทร์-พฤหัสบดี', เวลา: '8:30–16:00 น. และ 17:00–19:30 น.' },
      { วัน: 'ศุกร์',           เวลา: '8:30–11:30 น. และ 17:00–19:30 น.' },
      { วัน: 'เสาร์-อาทิตย์',   เวลา: '8:30–15:30 น. และ 17:00–19:30 น.' },
    ],
  },
  {
    ชื่อ: 'เทศบาลตำบลกำแพงแสน',
    Icon: Building2,
    สี: 'text-blue-500',
    พื้นหลัง: 'bg-blue-50',
    ที่อยู่: 'สำนักงานเทศบาลตำบลกำแพงแสน (ชั่วคราว) เลขที่ 377 หมู่ 1 ตำบลกำแพงแสน อำเภอกำแพงแสน จังหวัดนครปฐม 73140',
    แผนที่Url: 'https://maps.app.goo.gl/cDYE8NjkzMqkEhtL7',
    โทร: '034351083',
    โทรแสดง: '0-3435-1083',
    แฟกซ์: '0-3435-5058',
    อีเมล: ['saraban_05730201@dla.go.th', 'admin@kamphaengsaen.go.th'],
  },
]

function ContactPage() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="text-gray-700">
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ติดต่อหน่วยงาน</h1>
          <p className="text-gray-500 text-xs">เบอร์โทรและที่อยู่หน่วยงานที่เกี่ยวข้อง</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {หน่วยงาน.map((u) => (
          <div key={u.ชื่อ} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-start gap-3 mb-3">
              <div className={`w-11 h-11 rounded-xl ${u.พื้นหลัง} ${u.สี} flex items-center justify-center shrink-0`}>
                <u.Icon size={22} strokeWidth={1.75} />
              </div>
              <h3 className="font-bold text-gray-800 text-sm leading-snug pt-1.5">{u.ชื่อ}</h3>
            </div>

            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <MapPin size={15} className="shrink-0 mt-0.5 text-gray-400" />
                <span>{u.ที่อยู่}</span>
              </div>
              <div className="flex items-start gap-2">
                <Phone size={15} className="shrink-0 mt-0.5 text-gray-400" />
                <span>{u.โทรแสดง}</span>
              </div>
              {u.แฟกซ์ && (
                <div className="flex items-start gap-2">
                  <Printer size={15} className="shrink-0 mt-0.5 text-gray-400" />
                  <span>แฟกซ์ {u.แฟกซ์}</span>
                </div>
              )}
              {u.อีเมล && (
                <div className="flex items-start gap-2">
                  <Mail size={15} className="shrink-0 mt-0.5 text-gray-400" />
                  <span>{u.อีเมล.join(' / ')}</span>
                </div>
              )}
              {u.เวลาทำการ && (
                <div className="flex items-start gap-2">
                  <Clock size={15} className="shrink-0 mt-0.5 text-gray-400" />
                  <div className="space-y-0.5">
                    {u.เวลาทำการ.map((ช่วง) => (
                      <div key={ช่วง.วัน} className="flex">
                        <span className="w-32 shrink-0">{ช่วง.วัน}</span>
                        <span>{ช่วง.เวลา}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 mt-4">
              <a
                href={`tel:${u.โทร}`}
                className="flex-1 flex items-center justify-center gap-1.5 bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium"
              >
                <Phone size={15} /> โทร
              </a>
              <a
                href={u.แผนที่Url || `https://www.google.com/maps/search/${encodeURIComponent(u.ที่อยู่)}`}
                target="_blank" rel="noreferrer"
                className="flex-1 flex items-center justify-center gap-1.5 bg-white border border-gray-200 text-gray-700 rounded-xl py-2.5 text-sm font-medium"
              >
                <ExternalLink size={15} /> ดูแผนที่
              </a>
            </div>
          </div>
        ))}

        <p className="text-xs text-gray-400 text-center px-4 leading-relaxed">
          ข้อมูลอาจมีการเปลี่ยนแปลงได้ หากติดต่อไม่ได้กรุณาตรวจสอบข้อมูลล่าสุดกับหน่วยงานโดยตรง
        </p>
      </div>
    </div>
  )
}

export default ContactPage
