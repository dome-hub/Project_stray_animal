import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { ArrowLeft, MapPin, Heart, Phone, CheckCircle } from 'lucide-react'

export default function PetDetail() {
  const navigate = useNavigate()
  const { state } = useLocation()
  const pet = state?.pet || {
    id: 1, emoji: '🐕', name: 'มะม่วง', breed: 'สุนัขพันธุ์ไทยผสม', age: '2 ปี',
    gender: 'ตัวผู้', size: 'กลาง', personality: ['เป็นมิตร', 'ขี้เล่น'],
    location: 'ลาดพร้าว กรุงเทพฯ', score: 95,
  }

  const [adopted, setAdopted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleAdopt = () => {
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      setAdopted(true)
    }, 1500)
  }

  if (adopted) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">{pet.emoji}</div>
        <CheckCircle size={60} className="text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ยื่นคำขอสำเร็จ!</h2>
        <p className="text-gray-600 mb-1">คุณได้ยื่นคำขอรับเลี้ยง <strong>{pet.name}</strong> แล้ว</p>
        <p className="text-gray-500 text-sm mb-6">เจ้าหน้าที่จะติดต่อกลับภายใน 1-2 วันทำการ</p>
        <button
          onClick={() => navigate('/home')}
          className="bg-secondary text-white px-8 py-3 rounded-xl font-medium"
        >
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center justify-between sticky top-0 z-10">
        <button onClick={() => navigate(-1)} className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <h1 className="font-bold text-gray-800">ข้อมูลสัตว์</h1>
        <button className="p-1 hover:bg-gray-100 rounded-lg">
          <Heart size={22} className="text-gray-400" />
        </button>
      </div>

      {/* Pet Card */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-6 shadow-sm text-center">
        <div className="w-24 h-24 bg-green-100 rounded-3xl flex items-center justify-center text-5xl mx-auto mb-4">
          {pet.emoji}
        </div>
        <h2 className="text-2xl font-bold text-gray-800">{pet.name}</h2>
        <p className="text-gray-500 text-sm mt-1">{pet.breed}</p>
        {pet.score && (
          <div className="inline-flex items-center gap-1 bg-green-50 text-green-700 px-3 py-1 rounded-full text-sm font-medium mt-2">
            🤖 AI แนะนำ {pet.score}% เหมาะกับคุณ
          </div>
        )}
      </div>

      {/* Info */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-4">ข้อมูลทั่วไป</h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'อายุ', value: pet.age },
            { label: 'เพศ', value: pet.gender },
            { label: 'ขนาด', value: pet.size },
            { label: 'ประเภท', value: pet.emoji === '🐕' ? 'สุนัข' : 'แมว' },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500 mb-1">{item.label}</p>
              <p className="font-semibold text-gray-800 text-sm">{item.value}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Personality */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">นิสัย</h3>
        <div className="flex flex-wrap gap-2">
          {pet.personality.map((p) => (
            <span key={p} className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-sm">
              {p}
            </span>
          ))}
        </div>
      </div>

      {/* Location */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm">
        <h3 className="font-bold text-gray-800 mb-3">สถานที่</h3>
        <div className="flex items-center gap-2 text-gray-600">
          <MapPin size={16} className="text-primary" />
          <span className="text-sm">{pet.location}</span>
        </div>
        <div className="mt-3 flex items-center gap-2 text-gray-600">
          <Phone size={16} className="text-secondary" />
          <span className="text-sm">ศูนย์พักพิงสัตว์กรุงเทพ • 02-XXX-XXXX</span>
        </div>
      </div>

      {/* Adopt Button */}
      <div className="px-4 mt-6">
        <button
          onClick={handleAdopt}
          disabled={loading}
          className="w-full bg-secondary text-white rounded-xl py-4 font-bold text-base flex items-center justify-center gap-2 hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-60"
        >
          {loading ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Heart size={20} />
          )}
          {loading ? 'กำลังยื่นคำขอ...' : `รับเลี้ยง${pet.name}`}
        </button>
      </div>
    </div>
  )
}
