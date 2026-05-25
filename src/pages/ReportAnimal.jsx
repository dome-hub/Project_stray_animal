import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Camera, MapPin, Loader2, CheckCircle } from 'lucide-react'

const AI_RESULTS = [
  { breed: 'สุนัขพันธุ์ไทยผสม', size: 'กลาง', personality: 'เป็นมิตร / ระวังคนแปลกหน้า', confidence: 87 },
  { breed: 'สุนัขพันธุ์บางแก้ว', size: 'เล็ก', personality: 'ขี้เล่น / สงบเสงี่ยม', confidence: 72 },
  { breed: 'แมวส้ม / แมววิเชียรมาศผสม', size: 'เล็ก', personality: 'เป็นมิตร / ชอบคน', confidence: 91 },
]

export default function ReportAnimal() {
  const navigate = useNavigate()
  const fileRef = useRef(null)
  const [image, setImage] = useState(null)
  const [location, setLocation] = useState('')
  const [detail, setDetail] = useState('')
  const [aiResult, setAiResult] = useState(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [gpsLoading, setGpsLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const handleImageChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setImage(url)
    setAiResult(null)
    setAnalyzing(true)
    setTimeout(() => {
      const r = AI_RESULTS[Math.floor(Math.random() * AI_RESULTS.length)]
      setAiResult(r)
      setAnalyzing(false)
    }, 2000)
  }

  const handleGPS = () => {
    setGpsLoading(true)
    setTimeout(() => {
      setLocation('ซอยลาดพร้าว 101 แขวงคลองจั่น เขตบางกะปิ กรุงเทพฯ')
      setGpsLoading(false)
    }, 1500)
  }

  const handleSubmit = () => {
    if (!image || !location) return
    setSubmitting(true)
    setTimeout(() => {
      setSubmitting(false)
      setSubmitted(true)
    }, 2000)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-green-100 flex flex-col items-center justify-center px-6 text-center">
        <CheckCircle size={80} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งรายงานสำเร็จ!</h2>
        <p className="text-gray-600 mb-2">หน่วยงานได้รับข้อมูลแล้ว</p>
        <p className="text-gray-500 text-sm mb-6">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>
        <div className="bg-white rounded-2xl p-4 w-full max-w-xs mb-6 text-left space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">รหัสรายงาน</span>
            <span className="font-bold text-primary">#RPT{Date.now().toString().slice(-6)}</span>
          </div>
          {aiResult && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-500">สายพันธุ์ (AI)</span>
              <span className="font-medium">{aiResult.breed}</span>
            </div>
          )}
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">สถานะ</span>
            <span className="text-green-600 font-medium">รอดำเนินการ</span>
          </div>
        </div>
        <button
          onClick={() => navigate('/home')}
          className="bg-primary text-white px-8 py-3 rounded-xl font-medium"
        >
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-orange-50 to-amber-50 pb-8">
      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">แจ้งพบสัตว์จร</h1>
          <p className="text-gray-500 text-xs">ถ่ายภาพและให้ AI วิเคราะห์ข้อมูล</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">
        {/* Image Upload */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">ภาพถ่ายสัตว์</label>
          <div
            onClick={() => fileRef.current?.click()}
            className="border-2 border-dashed border-orange-300 rounded-2xl overflow-hidden cursor-pointer hover:border-primary transition-colors bg-white"
          >
            {image ? (
              <div className="relative">
                <img src={image} alt="สัตว์" className="w-full h-52 object-cover" />
                {analyzing && (
                  <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                    <Loader2 size={32} className="animate-spin mb-2" />
                    <p className="text-sm">AI กำลังวิเคราะห์...</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-44 flex flex-col items-center justify-center text-gray-400">
                <Camera size={44} className="mb-2 text-gray-300" />
                <p className="text-sm font-medium">คลิกเพื่อถ่ายภาพหรืออัปโหลด</p>
                <p className="text-xs mt-1">รองรับไฟล์ JPG, PNG</p>
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
        </div>

        {/* AI Result */}
        {aiResult && !analyzing && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-orange-600 mb-2">🤖 ผลวิเคราะห์จาก AI</p>
            <div className="space-y-2">
              <Row label="สายพันธุ์" value={aiResult.breed} />
              <Row label="ขนาด" value={aiResult.size} />
              <Row label="นิสัยเบื้องต้น" value={aiResult.personality} />
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ความแม่นยำ</span>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-orange-400 rounded-full"
                      style={{ width: `${aiResult.confidence}%` }}
                    />
                  </div>
                  <span className="text-xs font-bold text-orange-600">{aiResult.confidence}%</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Location */}
        <div>
          <label className="text-sm font-semibold text-gray-700 flex items-center gap-1 mb-2">
            <MapPin size={14} className="text-primary" /> สถานที่พบ
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="เช่น ซอยลาดพร้าว 101 หรือ ใกล้สวนจตุจักร"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary"
          />
          <button
            onClick={handleGPS}
            disabled={gpsLoading}
            className="mt-2 w-full bg-primary text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-60"
          >
            {gpsLoading ? <Loader2 size={16} className="animate-spin" /> : <MapPin size={16} />}
            {gpsLoading ? 'กำลังระบุตำแหน่ง...' : 'ใช้ตำแหน่งปัจจุบัน'}
          </button>
        </div>

        {/* Detail */}
        <div>
          <label className="text-sm font-semibold text-gray-700 block mb-2">
            รายละเอียดเพิ่มเติม <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
          </label>
          <textarea
            value={detail}
            onChange={(e) => setDetail(e.target.value)}
            placeholder="เช่น สัตว์ดูบาดเจ็บ หิวโหย เป็นมิตร กลัวคน ฯลฯ"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-primary resize-none"
          />
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={!image || !location || submitting}
          className="w-full bg-primary text-white rounded-xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 hover:bg-orange-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? <Loader2 size={20} className="animate-spin" /> : null}
          {submitting ? 'กำลังส่ง...' : 'ส่งรายงานให้หน่วยงาน'}
        </button>
      </div>
    </div>
  )
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-semibold text-gray-800">{value}</span>
    </div>
  )
}
