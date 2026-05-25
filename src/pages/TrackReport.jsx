import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Clock, CheckCircle, Truck, Home } from 'lucide-react'

const MOCK_REPORTS = [
  {
    id: 'RPT001234',
    date: '25 พ.ค. 2569',
    time: '14:32 น.',
    location: 'ซอยลาดพร้าว 101 กรุงเทพฯ',
    animal: 'สุนัขพันธุ์ไทยผสม',
    status: 'adopted',
    emoji: '🐕',
  },
  {
    id: 'RPT001189',
    date: '20 พ.ค. 2569',
    time: '09:15 น.',
    location: 'สวนลุมพินี กรุงเทพฯ',
    animal: 'แมวส้ม',
    status: 'shelter',
    emoji: '🐈',
  },
  {
    id: 'RPT001055',
    date: '15 พ.ค. 2569',
    time: '17:44 น.',
    location: 'ตลาดมีนบุรี กรุงเทพฯ',
    animal: 'สุนัขพันธุ์ผสม',
    status: 'processing',
    emoji: '🐕',
  },
  {
    id: 'RPT000998',
    date: '10 พ.ค. 2569',
    time: '11:20 น.',
    location: 'บางนา กรุงเทพฯ',
    animal: 'สุนัขพันธุ์ไทย',
    status: 'pending',
    emoji: '🐕',
  },
]

const STATUS_MAP = {
  pending: {
    label: 'รอดำเนินการ',
    color: 'text-yellow-600 bg-yellow-50',
    icon: <Clock size={14} />,
    steps: [
      { label: 'แจ้งรายงาน', done: true },
      { label: 'รับเรื่อง', done: false },
      { label: 'รับสัตว์', done: false },
      { label: 'มีผู้รับเลี้ยง', done: false },
    ],
  },
  processing: {
    label: 'กำลังดำเนินการ',
    color: 'text-blue-600 bg-blue-50',
    icon: <Truck size={14} />,
    steps: [
      { label: 'แจ้งรายงาน', done: true },
      { label: 'รับเรื่อง', done: true },
      { label: 'รับสัตว์', done: false },
      { label: 'มีผู้รับเลี้ยง', done: false },
    ],
  },
  shelter: {
    label: 'อยู่ในศูนย์พักพิง',
    color: 'text-purple-600 bg-purple-50',
    icon: <Home size={14} />,
    steps: [
      { label: 'แจ้งรายงาน', done: true },
      { label: 'รับเรื่อง', done: true },
      { label: 'รับสัตว์', done: true },
      { label: 'มีผู้รับเลี้ยง', done: false },
    ],
  },
  adopted: {
    label: 'มีผู้รับเลี้ยงแล้ว',
    color: 'text-green-600 bg-green-50',
    icon: <CheckCircle size={14} />,
    steps: [
      { label: 'แจ้งรายงาน', done: true },
      { label: 'รับเรื่อง', done: true },
      { label: 'รับสัตว์', done: true },
      { label: 'มีผู้รับเลี้ยง', done: true },
    ],
  },
}

export default function TrackReport() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-indigo-50 pb-8">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ติดตามรายงาน</h1>
          <p className="text-gray-500 text-xs">ตรวจสอบสถานะการช่วยเหลือสัตว์</p>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-4">
        {MOCK_REPORTS.map((report) => {
          const statusInfo = STATUS_MAP[report.status]
          return (
            <div key={report.id} className="bg-white rounded-2xl p-4 shadow-sm">
              {/* Top Row */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center text-2xl">
                    {report.emoji}
                  </div>
                  <div>
                    <p className="font-bold text-gray-800 text-sm">{report.animal}</p>
                    <p className="text-xs text-gray-500">{report.location}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{report.date} • {report.time}</p>
                  </div>
                </div>
                <span className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-full font-medium ${statusInfo.color}`}>
                  {statusInfo.icon}
                  {statusInfo.label}
                </span>
              </div>

              {/* Progress Steps */}
              <div className="flex items-center">
                {statusInfo.steps.map((step, i) => (
                  <div key={i} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                        step.done ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'
                      }`}>
                        {step.done ? '✓' : ''}
                      </div>
                      <p className={`text-xs mt-1 text-center leading-tight ${step.done ? 'text-green-600' : 'text-gray-400'}`} style={{ fontSize: '9px', maxWidth: 48 }}>
                        {step.label}
                      </p>
                    </div>
                    {i < statusInfo.steps.length - 1 && (
                      <div className={`flex-1 h-0.5 mb-4 ${step.done && statusInfo.steps[i + 1].done ? 'bg-green-400' : 'bg-gray-200'}`} />
                    )}
                  </div>
                ))}
              </div>

              {/* Report ID */}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between items-center">
                <span className="text-xs text-gray-400">รหัสรายงาน</span>
                <span className="text-xs font-bold text-indigo-600">#{report.id}</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
