// ReportAnimal.jsx — หน้าแจ้งพบสัตว์จร
// อัปเดตล่าสุด: เชื่อมต่อ AI API จริง (FastAPI)

import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000'

function ReportAnimal({ user }) {
  const navigate = useNavigate()
  const inputรูปภาพ = useRef(null)

  const [รูปภาพPreview, setรูปภาพPreview] = useState(null)
  const [ไฟล์รูปภาพ, setไฟล์รูปภาพ] = useState(null)
  const [ตำแหน่ง, setตำแหน่ง] = useState('')
  const [รายละเอียด, setรายละเอียด] = useState('')
  const [ผลAI, setผลAI] = useState(null)
  const [กำลังวิเคราะห์, setกำลังวิเคราะห์] = useState(false)
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)
  const [กำลังส่ง, setกำลังส่ง] = useState(false)
  const [ส่งสำเร็จ, setส่งสำเร็จ] = useState(false)
  const [รหัสรายงาน, setรหัสรายงาน] = useState(null)

  // ✅ ฟังก์ชันเรียก AI จริงจาก FastAPI
  async function วิเคราะห์AIจริง(imageFile) {
    setกำลังวิเคราะห์(true)
    setผลAI(null)

    try {
      const formData = new FormData()
      formData.append('file', imageFile)

      const res = await fetch(`${AI_API_URL}/analyze`, {
        method: 'POST',
        body: formData,
      })

      if (!res.ok) throw new Error(`API Error: ${res.status}`)

      const data = await res.json()

      if (data.success) {
        setผลAI({
          สายพันธุ์: data.result.สายพันธุ์,
          ขนาด: data.result.ขนาด,
          นิสัย: data.result.นิสัย,
          ความแม่นยำ: data.result.ความมั่นใจ,
          top3: data.result.top3,
          จากAI: true,
        })
      }

    } catch (err) {
      console.error('AI Error:', err)
      setผลAI({
        สายพันธุ์: 'ไม่สามารถวิเคราะห์ได้',
        ขนาด: 'กรุณาระบุเอง',
        นิสัย: 'กรุณาระบุเอง',
        ความแม่นยำ: 0,
        จากAI: false,
      })
    } finally {
      setกำลังวิเคราะห์(false)
    }
  }

  // ✅ แก้ฟังก์ชัน เลือกรูปภาพ ให้เรียก API จริง
  function เลือกรูปภาพ(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return

    setไฟล์รูปภาพ(ไฟล์)
    setรูปภาพPreview(URL.createObjectURL(ไฟล์))
    setผลAI(null)

    // ✅ เรียก AI จริงแทน mock
    วิเคราะห์AIจริง(ไฟล์)
  }

  function ใช้GPSปัจจุบัน() {
    setกำลังหาตำแหน่ง(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setตำแหน่ง(`พิกัด: ${lat.toFixed(4)}, ${lng.toFixed(4)}`)
        setกำลังหาตำแหน่ง(false)
      },
      () => {
        setตำแหน่ง('กำแพงแสน นครปฐม')
        setกำลังหาตำแหน่ง(false)
      }
    )
  }

  async function ส่งรายงาน() {
    if (!ตำแหน่ง) return
    setกำลังส่ง(true)
    let imageUrl = null

    if (ไฟล์รูปภาพ) {
      const ชื่อไฟล์ = `${Date.now()}_${ไฟล์รูปภาพ.name.replace(/\s/g, '_')}`
      const { data: uploadData } = await supabase.storage
        .from('report-images')
        .upload(ชื่อไฟล์, ไฟล์รูปภาพ)

      if (uploadData) {
        const { data: urlData } = supabase.storage
          .from('report-images')
          .getPublicUrl(uploadData.path)
        imageUrl = urlData.publicUrl
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .insert({
        animal_type: ผลAI?.สายพันธุ์ || 'ไม่ระบุ',
        location_text: ตำแหน่ง,
        detail: รายละเอียด,
        status: 'รอดำเนินการ',
        image_url: imageUrl,
        reporter_id: user?.id,
      })
      .select()
      .single()

    setกำลังส่ง(false)
    if (error) {
      alert(error.message)
    } else {
      setรหัสรายงาน(data.id)
      setส่งสำเร็จ(true)
    }
  }

  if (ส่งสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center p-4">
        <div className="text-7xl">✅</div>
        <h2 className="text-xl font-bold mt-2">ส่งรายงานสำเร็จ!</h2>
        <button onClick={() => navigate('/home')} className="mt-4 bg-green-600 text-white px-6 py-2 rounded-full">
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-8">
      <div className="bg-white px-4 py-4 flex gap-3 shadow">
        <button onClick={() => navigate('/home')}>←</button>
        <h1 className="font-bold">แจ้งสัตว์จร</h1>
      </div>

      <div className="p-4 space-y-4">
        <div
          onClick={() => inputรูปภาพ.current.click()}
          className="border-2 border-dashed h-52 flex items-center justify-center bg-white rounded-xl cursor-pointer overflow-hidden"
        >
          {รูปภาพPreview ? (
            <img src={รูปภาพPreview} className="w-full h-full object-cover" />
          ) : (
            <p className="text-gray-400">📷 อัปโหลดรูป</p>
          )}
        </div>

        <input ref={inputรูปภาพ} type="file" className="hidden" onChange={เลือกรูปภาพ} />

        {กำลังวิเคราะห์ && (
          <p className="text-orange-600 animate-pulse font-medium">🤖 AI กำลังวิเคราะห์สายพันธุ์...</p>
        )}

        {ผลAI && !กำลังวิเคราะห์ && (
          <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-orange-600 mb-3">🤖 ผลวิเคราะห์จาก AI</p>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span>สายพันธุ์</span><span className="font-semibold">{ผลAI.สายพันธุ์}</span></div>
              <div className="flex justify-between"><span>ขนาด</span><span>{ผลAI.ขนาด}</span></div>
              <div className="flex justify-between"><span>นิสัย</span><span className="truncate ml-4 text-right">{ผลAI.นิสัย}</span></div>
              <div>
                <div className="flex justify-between text-xs mt-2"><span>ความแม่นยำ</span><span>{ผลAI.ความแม่นยำ}%</span></div>
                <div className="bg-gray-100 h-2 rounded-full mt-1"><div className="bg-orange-500 h-2 rounded-full" style={{ width: `${ผลAI.ความแม่นยำ}%` }} /></div>
              </div>
            </div>
          </div>
        )}

        <input
          value={ตำแหน่ง}
          onChange={(e) => setตำแหน่ง(e.target.value)}
          placeholder="สถานที่พบ"
          className="w-full p-3 rounded-xl border border-gray-200"
        />

        <button
          onClick={ใช้GPSปัจจุบัน}
          disabled={กำลังหาตำแหน่ง}
          className="w-full bg-orange-500 text-white p-3 rounded-xl font-medium"
        >
          {กำลังหาตำแหน่ง ? '⏳ กำลังระบุตำแหน่ง...' : '📍 ใช้ GPS ปัจจุบัน'}
        </button>

        <textarea
          value={รายละเอียด}
          onChange={(e) => setรายละเอียด(e.target.value)}
          placeholder="รายละเอียดเพิ่มเติม"
          className="w-full p-3 rounded-xl border border-gray-200 h-24"
        />

        <button
          onClick={ส่งรายงาน}
          disabled={กำลังส่ง || !ไฟล์รูปภาพ}
          className="w-full bg-orange-600 text-white p-4 rounded-xl font-bold disabled:opacity-50"
        >
          {กำลังส่ง ? 'กำลังส่ง...' : 'ส่งรายงาน'}
        </button>
      </div>
    </div>
  )
}

export default ReportAnimal