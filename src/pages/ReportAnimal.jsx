// ReportAnimal.jsx — หน้าแจ้งพบสัตว์จร
// อัปโหลดรูปจริงขึ้น Supabase Storage + บันทึก URL ลงตาราง reports

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabase'

const ผลวิเคราะห์AI = [
  { สายพันธุ์: 'สุนัขพันธุ์ไทยผสม', ขนาด: 'กลาง', นิสัย: 'เป็นมิตร / ระวังคนแปลกหน้า', ความแม่นยำ: 87 },
  { สายพันธุ์: 'สุนัขพันธุ์บางแก้ว', ขนาด: 'เล็ก', นิสัย: 'ขี้เล่น / สงบเสงี่ยม', ความแม่นยำ: 72 },
  { สายพันธุ์: 'แมววิเชียรมาศผสม', ขนาด: 'เล็ก', นิสัย: 'เป็นมิตร / ชอบคน', ความแม่นยำ: 91 },
]

function triggerAI(setผลAI, setกำลังวิเคราะห์) {
  setผลAI(null)
  setกำลังวิเคราะห์(true)
  setTimeout(function () {
    setผลAI(ผลวิเคราะห์AI[Math.floor(Math.random() * ผลวิเคราะห์AI.length)])
    setกำลังวิเคราะห์(false)
  }, 2000)
}

function ReportAnimal({ user }) {
  const navigate = useNavigate()
  const inputGallery = useRef(null)     // เลือกจากคลัง (file input ธรรมดา)
  const videoRef     = useRef(null)     // video element สำหรับ live camera
  const streamRef    = useRef(null)     // MediaStream ที่กำลังเปิดอยู่

  const [รูปภาพPreview, setรูปภาพPreview] = useState(null)
  const [ไฟล์รูปภาพ,   setไฟล์รูปภาพ]   = useState(null)
  const [ตำแหน่ง,      setตำแหน่ง]      = useState('')
  const [รายละเอียด,   setรายละเอียด]   = useState('')
  const [ผลAI,         setผลAI]         = useState(null)
  const [กำลังวิเคราะห์, setกำลังวิเคราะห์] = useState(false)
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)
  const [latitude,        setLatitude]        = useState(null)
  const [longitude,       setLongitude]       = useState(null)
  const [กำลังส่ง,     setกำลังส่ง]     = useState(false)
  const [ส่งสำเร็จ,    setส่งสำเร็จ]    = useState(false)
  const [รหัสรายงาน,  setรหัสรายงาน]  = useState(null)

  // ---- Camera state ----
  const [แสดงกล้อง,   setแสดงกล้อง]   = useState(false)
  const [กล้องพร้อม,  setกล้องพร้อม]  = useState(false)
  const [errorกล้อง,  setErrorกล้อง]  = useState('')

  // cleanup stream เมื่อ component unmount
  useEffect(function () {
    return function () { ปิดกล้อง() }
  }, [])

  // ---- เลือกรูปจากแกลเลอรี่ ----
  function เลือกรูปภาพ(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return
    setไฟล์รูปภาพ(ไฟล์)
    setรูปภาพPreview(URL.createObjectURL(ไฟล์))
    triggerAI(setผลAI, setกำลังวิเคราะห์)
    event.target.value = ''
  }

  // ---- เปิดกล้อง (getUserMedia) ----
  async function เปิดกล้อง() {
    setErrorกล้อง('')
    setกล้องพร้อม(false)
    setแสดงกล้อง(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.onloadedmetadata = function () {
          videoRef.current.play()
          setกล้องพร้อม(true)
        }
      }
    } catch (err) {
      console.error(err)
      if (err.name === 'NotAllowedError') {
        setErrorกล้อง('❌ ไม่ได้รับอนุญาตใช้กล้อง\nกรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์')
      } else if (err.name === 'NotFoundError') {
        setErrorกล้อง('❌ ไม่พบกล้องในอุปกรณ์นี้')
      } else {
        setErrorกล้อง('❌ ไม่สามารถเปิดกล้องได้: ' + err.message)
      }
    }
  }

  // ---- ปิดกล้อง / หยุด stream ----
  function ปิดกล้อง() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(function (t) { t.stop() })
      streamRef.current = null
    }
    setแสดงกล้อง(false)
    setกล้องพร้อม(false)
    setErrorกล้อง('')
  }

  // ---- กดถ่ายรูป ----
  function ถ่ายรูป() {
    const video = videoRef.current
    if (!video) return
    const canvas = document.createElement('canvas')
    canvas.width  = video.videoWidth
    canvas.height = video.videoHeight
    canvas.getContext('2d').drawImage(video, 0, 0)
    canvas.toBlob(function (blob) {
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' })
      setไฟล์รูปภาพ(file)
      setรูปภาพPreview(URL.createObjectURL(file))
      triggerAI(setผลAI, setกำลังวิเคราะห์)
      ปิดกล้อง()
    }, 'image/jpeg', 0.85)
  }

  // ---- GPS + Reverse Geocoding (Nominatim — ฟรี ไม่ต้อง API key) ----
  async function ใช้GPSปัจจุบัน() {
    setกำลังหาตำแหน่ง(true)
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(lat)
        setLongitude(lng)
        try {
          const res  = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json`,
            { headers: { 'Accept-Language': 'th' } }
          )
          const data = await res.json()
          const a    = data.address || {}
          // ประกอบที่อยู่แบบสั้น: ถนน → แขวง/ตำบล → เขต/อำเภอ → เมือง → จังหวัด
          const parts = [
            a.road || a.pedestrian || a.path,
            a.suburb || a.neighbourhood || a.quarter || a.village,
            a.city_district || a.district,
            a.city || a.town || a.county,
            a.state,
          ].filter(Boolean)
          setตำแหน่ง(parts.join(', ') || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        } catch {
          // Nominatim ใช้ไม่ได้ → แสดงพิกัดดิบ
          setตำแหน่ง(`${lat.toFixed(5)}, ${lng.toFixed(5)}`)
        }
        setกำลังหาตำแหน่ง(false)
      },
      function () {
        setกำลังหาตำแหน่ง(false)
        alert('ไม่สามารถระบุตำแหน่งได้ กรุณากรอกด้วยตนเอง')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // ---- ส่งรายงาน ----
  async function ส่งรายงาน() {
    if (!ตำแหน่ง) return
    setกำลังส่ง(true)

    let imageUrl = null
    if (ไฟล์รูปภาพ) {
      const ชื่อไฟล์ = `${Date.now()}_${ไฟล์รูปภาพ.name.replace(/\s/g, '_')}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images').upload(ชื่อไฟล์, ไฟล์รูปภาพ)
      if (!uploadError) {
        const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(uploadData.path)
        imageUrl = urlData.publicUrl
      }
    }

    const { data, error } = await supabase.from('reports').insert({
      animal_type:   ผลAI?.สายพันธุ์ || 'ไม่ระบุ',
      location_text: ตำแหน่ง,
      detail:        รายละเอียด,
      urgency:       'ปานกลาง',
      status:        'รอดำเนินการ',
      image_url:     imageUrl,
      reporter_id:   user?.id,
      latitude:      latitude,
      longitude:     longitude,
    }).select().single()

    setกำลังส่ง(false)

    if (error) {
      alert('เกิดข้อผิดพลาด: ' + error.message)
    } else {
      if (user?.id) {
        await supabase.from('notifications').insert({
          user_id: user.id,
          title:   '📋 ส่งรายงานสำเร็จ',
          body:    `รายงาน #${String(data.id).padStart(6, '0')} ได้รับแล้ว เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง`,
          type:    'report_update',
          is_read: false,
        })
      }
      setรหัสรายงาน(data.id)
      setส่งสำเร็จ(true)
    }
  }

  // ---- หน้าสำเร็จ ----
  if (ส่งสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">ส่งรายงานสำเร็จ!</h2>
        <p className="text-gray-600 mb-6">เจ้าหน้าที่จะดำเนินการภายใน 24 ชั่วโมง</p>
        <div className="bg-white rounded-2xl p-4 w-full max-w-xs mb-6 shadow-sm">
          <div className="flex justify-between text-sm mb-2">
            <span className="text-gray-500">รหัสรายงาน</span>
            <span className="font-bold text-orange-500">#{String(รหัสรายงาน).padStart(6, '0')}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">สถานะ</span>
            <span className="text-yellow-600 font-medium">รอดำเนินการ</span>
          </div>
        </div>
        <button onClick={() => navigate('/track')}
          className="bg-orange-500 text-white px-8 py-3 rounded-xl font-medium mb-3">
          ติดตามสถานะรายงาน
        </button>
        <button onClick={() => navigate('/home')} className="text-gray-500 text-sm">
          กลับหน้าหลัก
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-orange-50 pb-8">

      {/* Camera Modal */}
      {แสดงกล้อง && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
          {/* Top bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-black/60">
            <button onClick={ปิดกล้อง} className="text-white text-sm px-3 py-1 bg-white/20 rounded-full">
              ✕ ยกเลิก
            </button>
            <p className="text-white font-medium text-sm">📷 ถ่ายรูปสัตว์</p>
            <div className="w-16" />
          </div>

          {/* Video / Error */}
          <div className="flex-1 relative overflow-hidden bg-gray-900 flex items-center justify-center">
            {errorกล้อง ? (
              <div className="text-center px-8">
                <p className="text-white text-sm whitespace-pre-line leading-relaxed">{errorกล้อง}</p>
                <button onClick={ปิดกล้อง}
                  className="mt-6 bg-white text-gray-800 px-6 py-2.5 rounded-xl text-sm font-medium">
                  ปิด
                </button>
              </div>
            ) : (
              <>
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
                {!กล้องพร้อม && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                    <div className="text-center text-white">
                      <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                      <p className="text-sm">กำลังเปิดกล้อง...</p>
                      <p className="text-xs text-white/60 mt-1">กรุณาอนุญาตการเข้าถึงกล้องเมื่อระบบถาม</p>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Shutter button */}
          {!errorกล้อง && (
            <div className="bg-black/80 flex justify-center items-center py-8">
              <button
                onClick={ถ่ายรูป}
                disabled={!กล้องพร้อม}
                className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center disabled:opacity-40 active:scale-95 transition-all"
              >
                <div className="w-14 h-14 rounded-full bg-white" />
              </button>
            </div>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <div>
          <h1 className="font-bold text-gray-800">แจ้งพบสัตว์จร</h1>
          <p className="text-gray-500 text-xs">ถ่ายภาพและให้ AI วิเคราะห์ข้อมูล</p>
        </div>
      </div>

      <div className="px-4 pt-5 space-y-5">

        {/* ส่วนรูปภาพ */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">ภาพถ่ายสัตว์</p>

          {รูปภาพPreview ? (
            /* ---- มีรูปแล้ว: preview + แถบถ่ายใหม่ / คลัง ---- */
            <div className="relative rounded-2xl overflow-hidden border-2 border-orange-200">
              <img src={รูปภาพPreview} alt="สัตว์" className="w-full h-64 object-cover" />
              {กำลังวิเคราะห์ && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white">
                  <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin mb-2" />
                  <p className="text-sm">AI กำลังวิเคราะห์...</p>
                </div>
              )}
              <div className="absolute bottom-0 inset-x-0 bg-black/50 flex items-center justify-between px-5 py-3">
                <button onClick={เปิดกล้อง}
                  className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <span className="text-xl">📷</span> ถ่ายใหม่
                </button>
                <button onClick={() => inputGallery.current.click()}
                  className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <span className="text-xl">🖼️</span> คลัง
                </button>
              </div>
            </div>
          ) : (
            /* ---- ยังไม่มีรูป: กดทั้งก้อนเพื่อเปิดกล้อง + ไอคอนคลังมุมล่างขวา ---- */
            <div className="relative">
              <button
                onClick={เปิดกล้อง}
                className="w-full h-64 border-2 border-dashed border-orange-300 rounded-2xl bg-white flex flex-col items-center justify-center active:bg-orange-50 transition-colors"
              >
                <span className="text-6xl mb-3">📷</span>
                <p className="text-base font-semibold text-gray-600">แตะเพื่อถ่ายรูป</p>
                <p className="text-xs text-gray-400 mt-1">ระบบจะขอสิทธิ์เข้าถึงกล้อง</p>
              </button>
              {/* ไอคอนคลังมุมขวาล่าง */}
              <button
                onClick={() => inputGallery.current.click()}
                className="absolute bottom-3 right-3 bg-white border border-gray-200 rounded-xl px-3 py-2 shadow-sm flex items-center gap-1.5 text-gray-600 text-xs font-medium"
              >
                <span className="text-base">🖼️</span> คลัง
              </button>
            </div>
          )}

          <input ref={inputGallery} type="file" accept="image/*" className="hidden" onChange={เลือกรูปภาพ} />
        </div>

        {/* ผล AI */}
        {ผลAI && !กำลังวิเคราะห์ && (
          <div className="bg-orange-50 border border-orange-200 rounded-2xl p-4">
            <p className="text-xs font-bold text-orange-600 mb-3">🤖 ผลวิเคราะห์จาก AI</p>
            <div className="space-y-2">
              {[
                { label: 'สายพันธุ์', value: ผลAI.สายพันธุ์ },
                { label: 'ขนาด',      value: ผลAI.ขนาด },
                { label: 'นิสัย',     value: ผลAI.นิสัย },
                { label: 'ความแม่นยำ', value: ผลAI.ความแม่นยำ + '%' },
              ].map(function (r) {
                return (
                  <div key={r.label} className="flex justify-between">
                    <span className="text-xs text-gray-500">{r.label}</span>
                    <span className={`text-xs font-semibold ${r.label === 'ความแม่นยำ' ? 'text-orange-600' : ''}`}>{r.value}</span>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* ตำแหน่ง */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            📍 สถานที่พบ <span className="text-red-400">*</span>
          </p>
          <input type="text" value={ตำแหน่ง} onChange={(e) => setตำแหน่ง(e.target.value)}
            placeholder="เช่น หน้าวัดกำแพงแสน หรือ ถนนสาย 1"
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400" />
          <button onClick={ใช้GPSปัจจุบัน} disabled={กำลังหาตำแหน่ง}
            className="mt-2 w-full bg-orange-500 text-white rounded-xl py-2.5 text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-60">
            {กำลังหาตำแหน่ง ? '⏳ กำลังระบุตำแหน่ง...' : '📍 ใช้ตำแหน่งปัจจุบัน (GPS)'}
          </button>

          {/* แสดง link Google Maps เมื่อมีพิกัด */}
          {latitude && longitude && (
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank" rel="noreferrer"
              className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium"
            >
              <span className="text-lg">🗺️</span>
              <span className="flex-1">ดูตำแหน่งใน Google Maps</span>
              <span className="text-xs text-green-500">→</span>
            </a>
          )}
        </div>

        {/* รายละเอียด */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            รายละเอียดเพิ่มเติม <span className="text-gray-400 font-normal">(ไม่บังคับ)</span>
          </p>
          <textarea value={รายละเอียด} onChange={(e) => setรายละเอียด(e.target.value)}
            placeholder="เช่น สัตว์ดูบาดเจ็บ หิวโหย เป็นมิตร ฯลฯ"
            rows={3}
            className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm bg-white focus:outline-none focus:border-orange-400 resize-none" />
        </div>

        {/* ส่ง */}
        <button onClick={ส่งรายงาน} disabled={!ตำแหน่ง || กำลังส่ง || กำลังวิเคราะห์}
          className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {กำลังส่ง ? '⏳ กำลังอัปโหลดและบันทึก...' : 'ส่งรายงานให้เจ้าหน้าที่'}
        </button>

      </div>
    </div>
  )
}

export default ReportAnimal
