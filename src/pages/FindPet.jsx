import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Loader2 } from 'lucide-react'

const PETS = [
  { id: 1, emoji: '🐕', name: 'มะม่วง', breed: 'สุนัขพันธุ์ไทยผสม', age: '2 ปี', gender: 'ตัวผู้', size: 'กลาง', personality: ['เป็นมิตร', 'ขี้เล่น'], location: 'ลาดพร้าว กรุงเทพฯ', score: 95 },
  { id: 2, emoji: '🐈', name: 'ส้ม', breed: 'แมวส้ม', age: '1 ปี', gender: 'ตัวเมีย', size: 'เล็ก', personality: ['เป็นมิตร', 'สงบเสงี่ยม'], location: 'บางนา กรุงเทพฯ', score: 88 },
  { id: 3, emoji: '🐕', name: 'ขาว', breed: 'สุนัขไทยหลังอาน', age: '3 ปี', gender: 'ตัวผู้', size: 'กลาง', personality: ['ชอบออกกำลัง', 'เป็นมิตร'], location: 'มีนบุรี กรุงเทพฯ', score: 82 },
  { id: 4, emoji: '🐕', name: 'ดำ', breed: 'สุนัขพันธุ์ผสม', age: '4 ปี', gender: 'ไม่จำกัด', size: 'ใหญ่', personality: ['สงบเสงี่ยม', 'กระตือรือร้น'], location: 'นนทบุรี', score: 75 },
  { id: 5, emoji: '🐈', name: 'เทา', breed: 'แมวเทา', age: '6 เดือน', gender: 'ตัวผู้', size: 'เล็ก', personality: ['ขี้เล่น', 'ชอบอิสระ'], location: 'ปทุมธานี', score: 70 },
]

const PERSONALITIES = ['เป็นมิตร', 'ชอบอิสระ', 'สงบเสงี่ยม', 'กระตือรือร้น', 'ขี้เล่น', 'ชอบออกกำลัง']

export default function FindPet() {
  const navigate = useNavigate()
  const [step, setStep] = useState('form') // 'form' | 'loading' | 'result'
  const [animalType, setAnimalType] = useState('สุนัข')
  const [age, setAge] = useState('')
  const [gender, setGender] = useState('')
  const [size, setSize] = useState('')
  const [selectedPersonalities, setSelectedPersonalities] = useState([])
  const [results, setResults] = useState([])

  const togglePersonality = (p) => {
    setSelectedPersonalities((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]
    )
  }

  const handleSearch = () => {
    setStep('loading')
    setTimeout(() => {
      const filtered = PETS
        .filter((p) => animalType === 'สุนัข' ? p.emoji === '🐕' : p.emoji === '🐈')
        .sort((a, b) => b.score - a.score)
      setResults(filtered.length ? filtered : PETS.slice(0, 3))
      setStep('result')
    }, 2000)
  }

  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-100 flex flex-col items-center justify-center text-center px-6">
        <Loader2 size={60} className="text-green-500 animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">AI กำลังแนะนำสัตว์ที่เหมาะกับคุณ</h2>
        <p className="text-gray-500 text-sm">วิเคราะห์ความเข้ากันระหว่างคุณและสัตว์...</p>
      </div>
    )
  }

  if (step === 'result') {
    return (
      <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 pb-8">
        <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
          <button onClick={() => setStep('form')} className="p-1 hover:bg-gray-100 rounded-lg">
            <ArrowLeft size={22} className="text-gray-700" />
          </button>
          <div>
            <h1 className="font-bold text-gray-800">ผลการแนะนำ</h1>
            <p className="text-gray-500 text-xs">AI เลือกสัตว์ที่เหมาะกับคุณที่สุด</p>
          </div>
        </div>

        <div className="px-4 pt-4 space-y-4">
          {results.map((pet, i) => (
            <button
              key={pet.id}
              onClick={() => navigate(`/pet/${pet.id}`, { state: { pet } })}
              className="w-full bg-white rounded-2xl p-4 shadow-sm hover:shadow-md active:scale-[0.98] transition-all text-left"
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center text-3xl shrink-0">
                  {pet.emoji}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-bold text-gray-800 text-base">{pet.name}</h3>
                    <div className="flex items-center gap-1">
                      {i === 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">แนะนำ</span>}
                      <span className="text-xs font-bold text-green-600">{pet.score}%</span>
                    </div>
                  </div>
                  <p className="text-gray-500 text-xs mb-2">{pet.breed} • {pet.age} • {pet.gender}</p>
                  <div className="flex flex-wrap gap-1">
                    {pet.personality.map((p) => (
                      <span key={p} className="text-xs bg-green-50 text-green-700 px-2 py-0.5 rounded-full">{p}</span>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-2">📍 {pet.location}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-emerald-50 pb-8">
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3 sticky top-0 z-10">
        <button onClick={() => navigate('/home')} className="p-1 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={22} className="text-gray-700" />
        </button>
        <div>
          <h1 className="font-bold text-gray-800">ค้นหาสัตว์เลี้ยง</h1>
          <p className="text-gray-500 text-xs">ตอบคำถามเพื่อหาเพื่อนที่สำหรับคุณ</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-6">
        {/* Animal Type */}
        <Section title="🐾 ลักษณะสัตว์ที่ต้องการ">
          <Label>ประเภทสัตว์</Label>
          <div className="flex gap-3">
            {['สุนัข', 'แมว'].map((t) => (
              <ToggleBtn key={t} active={animalType === t} onClick={() => setAnimalType(t)}>
                {t === 'สุนัข' ? '🐕' : '🐈'} {t}
              </ToggleBtn>
            ))}
          </div>
        </Section>

        {/* Age */}
        <div>
          <Label required>อายุ</Label>
          <select
            value={age}
            onChange={(e) => setAge(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-secondary"
          >
            <option value="">-- เลือกช่วงอายุ --</option>
            <option>น้อยกว่า 1 ปี</option>
            <option>1–3 ปี</option>
            <option>3–7 ปี</option>
            <option>มากกว่า 7 ปี</option>
          </select>
        </div>

        {/* Gender */}
        <div>
          <Label required>เพศ</Label>
          <div className="flex gap-3 flex-wrap">
            {['ตัวผู้', 'ตัวเมีย', 'ไม่จำกัด'].map((g) => (
              <ToggleBtn key={g} active={gender === g} onClick={() => setGender(g)}>
                {g}
              </ToggleBtn>
            ))}
          </div>
        </div>

        {/* Size */}
        <div>
          <Label>ขนาด</Label>
          <div className="grid grid-cols-2 gap-3">
            {['เล็ก', 'กลาง', 'ใหญ่', 'ไม่จำกัด'].map((s) => (
              <ToggleBtn key={s} active={size === s} onClick={() => setSize(s)}>
                {s}
              </ToggleBtn>
            ))}
          </div>
        </div>

        {/* Personality */}
        <div>
          <Label>นิสัยที่ต้องการ <span className="text-gray-400 font-normal text-xs">(เลือกได้หลายข้อ)</span></Label>
          <div className="grid grid-cols-2 gap-3">
            {PERSONALITIES.map((p) => (
              <label key={p} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedPersonalities.includes(p)}
                  onChange={() => togglePersonality(p)}
                  className="w-4 h-4 accent-green-500"
                />
                <span className="text-sm text-gray-700">{p}</span>
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSearch}
          disabled={!age || !gender}
          className="w-full bg-secondary text-white rounded-xl py-3.5 font-semibold text-base hover:bg-green-600 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          ค้นหาสัตว์เลี้ยงที่เหมาะกับฉัน
        </button>
      </div>
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div>
      <p className="text-sm font-bold text-gray-700 border-b border-gray-100 pb-2 mb-3">{title}</p>
      <div className="space-y-3">{children}</div>
    </div>
  )
}

function Label({ children, required }) {
  return (
    <p className="text-sm font-semibold text-gray-700 mb-2">
      {children} {required && <span className="text-red-400">*</span>}
    </p>
  )
}

function ToggleBtn({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-5 py-2.5 rounded-xl text-sm font-medium border-2 transition-all ${
        active
          ? 'border-secondary bg-secondary text-white'
          : 'border-gray-200 bg-white text-gray-700 hover:border-secondary'
      }`}
    >
      {children}
    </button>
  )
}
