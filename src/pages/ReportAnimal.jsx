// ReportAnimal.jsx — หน้าแจ้งพบสัตว์จร
// อัปเดตล่าสุด: เชื่อมต่อ AI API จริง (FastAPI)

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Footprints, HeartPulse, ShieldAlert, Circle, CircleDot,
  MapPin, LocateFixed, Loader2, Map, X,
} from 'lucide-react'
import { MapContainer, TileLayer, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { supabase } from '../supabase'

// ศูนย์กลางตำบลกำแพงแสน — จุดเริ่มต้นแผนที่เมื่อขอ GPS ไม่สำเร็จ
const ศูนย์กลางแผนที่เริ่มต้น = [14.0206, 99.9673]

const AI_API_URL = import.meta.env.VITE_AI_API_URL || 'http://localhost:8000'

// ตัวเลือกประเภทการแจ้ง — ใช้กำหนดความเร่งด่วน (urgency) ของรายงาน
const เหตุผลตัวเลือก = [
  { label: 'พบสัตว์พลัดหลง / สัตว์จรจัด', Icon: Footprints,  urgency: 'ปานกลาง' },
  { label: 'สัตว์บาดเจ็บ',                 Icon: HeartPulse,  urgency: 'ด่วน' },
  { label: 'สัตว์ดุร้าย / เสี่ยงก่ออันตราย', Icon: ShieldAlert, urgency: 'ด่วนมาก' },
]

// จับพิกัดกึ่งกลางแผนที่ใหม่ทุกครั้งที่ผู้ใช้เลื่อนแผนที่เสร็จ (นิยามนอก component หลักกันแผนที่ remount ทุก render)
function จับการเลื่อนแผนที่({ onMoveEnd }) {
  useMapEvents({
    moveend: function (e) {
      const c = e.target.getCenter()
      onMoveEnd({ lat: c.lat, lng: c.lng })
    },
  })
  return null
}

// ---- Modal เลือกพิกัด — หมุดลอยตายตัวตรงกลางจอ ผู้ใช้เลื่อนแผนที่เอง (แบบแอปเรียกรถ) ----
function LocationPickerModal({ ตำแหน่งเริ่มต้น, กำลังยืนยัน, onConfirm, onClose }) {
  const [center, setCenter] = useState(ตำแหน่งเริ่มต้น)
  const [กำลังหาGPS, setกำลังหาGPS] = useState(!ตำแหน่งเริ่มต้น)

  // โหลดโมดัลแล้วยังไม่มีพิกัดเริ่มต้น → ขอ GPS ปัจจุบันมาเป็นจุดกึ่งกลางแผนที่ทันที
  useEffect(function () {
    if (ตำแหน่งเริ่มต้น) return
    navigator.geolocation.getCurrentPosition(
      function (pos) {
        setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
        setกำลังหาGPS(false)
      },
      function () {
        setCenter({ lat: ศูนย์กลางแผนที่เริ่มต้น[0], lng: ศูนย์กลางแผนที่เริ่มต้น[1] })
        setกำลังหาGPS(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  function กลับตำแหน่งฉัน() {
    navigator.geolocation.getCurrentPosition(function (pos) {
      setCenter({ lat: pos.coords.latitude, lng: pos.coords.longitude })
    })
  }

  return (
    <div className="fixed inset-0 z-50 bg-white flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
        <button onClick={onClose} className="w-8 h-8 flex items-center justify-center text-gray-500">
          <X size={20} />
        </button>
        <p className="font-semibold text-gray-800 text-sm">เลื่อนแผนที่เพื่อระบุตำแหน่ง</p>
        <div className="w-8" />
      </div>

      {/* แผนที่ + หมุดลอยตรงกลาง */}
      <div className="flex-1 relative bg-gray-100">
        {กำลังหาGPS ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <Loader2 size={24} className="animate-spin text-orange-500" />
            <p className="text-sm text-gray-400">กำลังค้นหาตำแหน่งปัจจุบัน...</p>
          </div>
        ) : (
          <>
            <MapContainer center={[center.lat, center.lng]} zoom={17} style={{ height: '100%', width: '100%' }}>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              <จับการเลื่อนแผนที่ onMoveEnd={setCenter} />
            </MapContainer>

            {/* หมุดตายตัวกึ่งกลางจอ — ไม่ขยับตามแผนที่ ผู้ใช้เลื่อนแผนที่เอาเอง */}
            {/* z-index สูงกว่า Leaflet pane (สูงสุด 700) และ control (1000) ไม่งั้นแผนที่จะทับหมุดจนมองไม่เห็น */}
            <div className="pointer-events-none absolute inset-0 z-[1100] flex items-center justify-center" style={{ marginTop: -20 }}>
              <MapPin size={40} className="text-orange-500 drop-shadow-lg" fill="#fed7aa" strokeWidth={2} />
            </div>

            <button
              onClick={กลับตำแหน่งฉัน}
              className="absolute bottom-4 right-4 z-[1100] w-11 h-11 bg-white rounded-full shadow-md flex items-center justify-center text-orange-500"
            >
              <LocateFixed size={20} />
            </button>
          </>
        )}
      </div>

      {/* ยืนยัน */}
      <div className="px-4 py-4 border-t border-gray-100 shrink-0 bg-white">
        {center && (
          <p className="text-center text-xs text-gray-400 mb-2">
            {center.lat.toFixed(5)}, {center.lng.toFixed(5)}
          </p>
        )}
        <button
          onClick={() => onConfirm(center.lat, center.lng)}
          disabled={!center || กำลังยืนยัน}
          className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold text-base disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {กำลังยืนยัน
            ? <><Loader2 size={16} className="animate-spin" /> กำลังยืนยัน...</>
            : 'ยืนยันตำแหน่งนี้'}
        </button>
      </div>
    </div>
  )
}

function ReportAnimal({ user }) {
  const navigate = useNavigate()
  const inputGallery = useRef(null)     // เลือกจากคลัง (file input ธรรมดา)
  const videoRef     = useRef(null)     // video element สำหรับ live camera
  const streamRef    = useRef(null)     // MediaStream ที่กำลังเปิดอยู่

  const [รูปภาพPreview, setรูปภาพPreview] = useState(null)
  const [ไฟล์รูปภาพ,   setไฟล์รูปภาพ]   = useState(null)
  const [ตำแหน่ง,      setตำแหน่ง]      = useState('')
  const [เหตุผลแจ้ง,   setเหตุผลแจ้ง]   = useState(null)
  const [รายละเอียด,   setรายละเอียด]   = useState('')
  const [ผลAI,         setผลAI]         = useState(null)
  const [กำลังวิเคราะห์, setกำลังวิเคราะห์] = useState(false)
  const [กำลังหาตำแหน่ง, setกำลังหาตำแหน่ง] = useState(false)
  const [latitude,        setLatitude]        = useState(null)
  const [longitude,       setLongitude]       = useState(null)
  const [กำลังส่ง,     setกำลังส่ง]     = useState(false)
  const [ส่งสำเร็จ,    setส่งสำเร็จ]    = useState(false)
  const [รหัสรายงาน,  setรหัสรายงาน]  = useState(null)

  // ---- Location picker modal state ----
  const [แสดงModalแผนที่, setแสดงModalแผนที่] = useState(false)
  const [กำลังยืนยันจุด, setกำลังยืนยันจุด] = useState(false)

  // ---- Camera state ----
  const [แสดงกล้อง,   setแสดงกล้อง]   = useState(false)
  const [กล้องพร้อม,  setกล้องพร้อม]  = useState(false)
  const [errorกล้อง,  setErrorกล้อง]  = useState('')

  // ---- Phone modal state ----
  const [แสดงModalโทรศัพท์,     setแสดงModalโทรศัพท์]     = useState(false)
  const [inputโทรศัพท์,          setInputโทรศัพท์]          = useState('')
  const [กำลังบันทึกโทรศัพท์,   setกำลังบันทึกโทรศัพท์]   = useState(false)
  const [errorโทรศัพท์,          setErrorโทรศัพท์]          = useState('')
  const [ต้องกรอกเบอร์,          setต้องกรอกเบอร์]          = useState(false)

  // cleanup stream เมื่อ component unmount
  useEffect(function () {
    return function () { ปิดกล้อง() }
  }, [])

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

  // ---- เลือกรูปจากแกลเลอรี่ ----
  function เลือกรูปภาพ(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return
    setไฟล์รูปภาพ(ไฟล์)
    setรูปภาพPreview(URL.createObjectURL(ไฟล์))
    setผลAI(null)
    วิเคราะห์AIจริง(ไฟล์)   // ✅ เรียก AI จริงแทน mock
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
      setผลAI(null)
      วิเคราะห์AIจริง(file)   // ✅ เรียก AI จริงแทน mock
      ปิดกล้อง()
    }, 'image/jpeg', 0.85)
  }

  // ---- Reverse Geocoding (Nominatim — ฟรี ไม่ต้อง API key) ----
  async function รีเวิร์สเจอโค้ด(lat, lng) {
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
      return parts.join(', ') || data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    } catch {
      // Nominatim ใช้ไม่ได้ → แสดงพิกัดดิบ
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`
    }
  }

  // ---- GPS ----
  async function ใช้GPSปัจจุบัน() {
    setกำลังหาตำแหน่ง(true)
    navigator.geolocation.getCurrentPosition(
      async function (pos) {
        const lat = pos.coords.latitude
        const lng = pos.coords.longitude
        setLatitude(lat)
        setLongitude(lng)
        setตำแหน่ง(await รีเวิร์สเจอโค้ด(lat, lng))
        setกำลังหาตำแหน่ง(false)
      },
      function () {
        setกำลังหาตำแหน่ง(false)
        alert('ไม่สามารถระบุตำแหน่งได้ กรุณากรอกด้วยตนเอง')
      },
      { enableHighAccuracy: true, timeout: 15000 }
    )
  }

  // ---- ยืนยันพิกัดที่เลือกจาก Modal แผนที่ ----
  async function ยืนยันจากแผนที่(lat, lng) {
    setกำลังยืนยันจุด(true)
    setLatitude(lat)
    setLongitude(lng)
    setตำแหน่ง(await รีเวิร์สเจอโค้ด(lat, lng))
    setกำลังยืนยันจุด(false)
    setแสดงModalแผนที่(false)
  }

  // ---- ส่งรายงานจริง (ถูกเรียกหลังผ่านเช็คเบอร์แล้ว) ----
  async function doSubmit() {
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
      urgency:       เหตุผลแจ้ง?.urgency || 'ปานกลาง',
      status:        'รอดำเนินการ',
      image_url:     imageUrl,
      reporter_id:   user?.id,
      latitude:      latitude,
      longitude:     longitude,
    }).select().single()

    setกำลังส่ง(false)
    if (error) {
      alert(error.message)
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

  // ---- ส่งรายงาน: เช็คเบอร์ก่อน → ถ้าไม่มีให้กรอก → ไม่งั้นส่งเลย ----
  async function ส่งรายงาน() {
    if (!ตำแหน่ง || !latitude || !longitude || !เหตุผลแจ้ง) return
    // ถ้ารู้แล้วว่าต้องกรอกเบอร์ → เปิด modal โดยไม่ query DB ซ้ำ
    if (ต้องกรอกเบอร์) { setแสดงModalโทรศัพท์(true); return }
    const { data: userData } = await supabase
      .from('users').select('phone').eq('id', user.id).single()
    if (!userData?.phone || userData.phone.trim() === '') {
      setต้องกรอกเบอร์(true)
      setแสดงModalโทรศัพท์(true)
      return
    }
    await doSubmit()
  }

  // ---- บันทึกเบอร์โทรศัพท์ → แล้วส่งรายงานต่อเลย ----
  async function บันทึกโทรศัพท์() {
    const tel = inputโทรศัพท์.trim()
    if (!tel) { setErrorโทรศัพท์('กรุณากรอกเบอร์โทรศัพท์'); return }
    if (!/^0[0-9]{8,9}$/.test(tel)) { setErrorโทรศัพท์('รูปแบบเบอร์ไม่ถูกต้อง (เช่น 0812345678)'); return }
    setกำลังบันทึกโทรศัพท์(true)
    setErrorโทรศัพท์('')
    const { error } = await supabase.from('users').update({ phone: tel }).eq('id', user.id)
    setกำลังบันทึกโทรศัพท์(false)
    if (error) {
      setErrorโทรศัพท์('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } else {
      setต้องกรอกเบอร์(false)
      setแสดงModalโทรศัพท์(false)
      await doSubmit()   // ← ส่งรายงานต่อเลยหลังบันทึกเบอร์
    }
  }

  // ---- หน้าสำเร็จ ----
  if (ส่งสำเร็จ) {
    return (
      <div className="min-h-screen bg-green-50 flex flex-col items-center justify-center px-6 text-center">
        <div className="text-7xl mb-4">✅</div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">แจ้งสำเร็จแล้ว!</h2>
        <p className="text-gray-600 mb-1 font-medium">เดี๋ยวจะมีเจ้าหน้าที่ติดต่อกลับในไม่ช้า</p>
        <p className="text-gray-400 text-sm mb-6">กรุณาเตรียมรับสาย / ข้อความจากเจ้าหน้าที่</p>
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
    <div className="min-h-screen bg-gray-50 pb-8">

      {/* Modal: เลือกพิกัดจากแผนที่ */}
      {แสดงModalแผนที่ && (
        <LocationPickerModal
          ตำแหน่งเริ่มต้น={latitude && longitude ? { lat: latitude, lng: longitude } : null}
          กำลังยืนยัน={กำลังยืนยันจุด}
          onConfirm={ยืนยันจากแผนที่}
          onClose={() => setแสดงModalแผนที่(false)}
        />
      )}

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

      {/* ============================================================
          MODAL: บังคับกรอกเบอร์โทรศัพท์ก่อนแจ้ง
          ============================================================ */}
      {แสดงModalโทรศัพท์ && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-end"
             onClick={() => setแสดงModalโทรศัพท์(false)}>
          <div className="bg-white w-full rounded-t-3xl px-5 pt-4 pb-10"
               onClick={function (e) { e.stopPropagation() }}>

            {/* handle + ปุ่มปิด */}
            <div className="flex items-center justify-between mb-1">
              <div className="w-7" />
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
              <button
                onClick={() => setแสดงModalโทรศัพท์(false)}
                className="w-7 h-7 flex items-center justify-center text-gray-400 text-lg"
              >✕</button>
            </div>

            {/* icon + หัวข้อ */}
            <div className="text-center mb-5">
              <div className="text-5xl mb-3">📱</div>
              <h2 className="text-lg font-bold text-gray-800">กรอกเบอร์โทรศัพท์ก่อน</h2>
              <p className="text-sm text-gray-500 mt-1">
                เจ้าหน้าที่จะติดต่อกลับผ่านเบอร์นี้เมื่อรับเรื่องแล้ว
              </p>
            </div>

            {/* input */}
            <div className="mb-3">
              <input
                type="tel"
                inputMode="numeric"
                placeholder="เช่น 0812345678"
                value={inputโทรศัพท์}
                onChange={function (e) {
                  setInputโทรศัพท์(e.target.value)
                  setErrorโทรศัพท์('')
                }}
                className={`w-full border-2 rounded-xl px-4 py-3 text-base text-center tracking-widest font-medium focus:outline-none ${
                  errorโทรศัพท์ ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-orange-400'
                }`}
                maxLength={10}
              />
              {errorโทรศัพท์ && (
                <p className="text-red-500 text-xs mt-1.5 text-center">{errorโทรศัพท์}</p>
              )}
            </div>

            {/* ปุ่มบันทึก — disable จนกว่าจะครบ 10 หลัก */}
            <button
              onClick={บันทึกโทรศัพท์}
              disabled={กำลังบันทึกโทรศัพท์ || inputโทรศัพท์.trim().length < 10}
              className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-bold text-base disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {กำลังบันทึกโทรศัพท์
                ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> บันทึก...</>
                : '✅ บันทึกเบอร์โทรศัพท์'}
            </button>

            <p className="text-center text-xs text-gray-400 mt-3">
              ข้อมูลนี้จะถูกเก็บไว้ในโปรไฟล์ของคุณ
            </p>
          </div>
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
              <div className="absolute bottom-0 inset-x-0 bg-black/50 flex items-center justify-center gap-3 px-5 py-3">
                <button onClick={เปิดกล้อง}
                  className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <span className="text-xl">📷</span> ถ่ายรูป
                </button>
                <span className="w-px h-4 bg-white/30" />
                <button onClick={() => inputGallery.current.click()}
                  className="flex items-center gap-1.5 text-white text-sm font-medium">
                  <span className="text-xl">🖼️</span> เลือกจากคลัง
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

        {กำลังวิเคราะห์ && (
          <p className="text-orange-600 animate-pulse font-medium">🤖 AI กำลังวิเคราะห์สายพันธุ์...</p>
        )}

        {ผลAI && !กำลังวิเคราะห์ && (
          <div className="bg-white border border-orange-200 rounded-2xl p-4 shadow-sm">
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

        {/* ประเภทการแจ้ง */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2">
            ประเภทการแจ้ง <span className="text-red-400">*</span>
          </p>
          <div className="space-y-2">
            {เหตุผลตัวเลือก.map((ตัวเลือก) => {
              const เลือกอยู่ = เหตุผลแจ้ง?.label === ตัวเลือก.label
              return (
                <button
                  key={ตัวเลือก.label}
                  onClick={() => setเหตุผลแจ้ง(ตัวเลือก)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border-2 transition-all ${
                    เลือกอยู่ ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 bg-white text-gray-700'
                  }`}
                >
                  {เลือกอยู่
                    ? <CircleDot size={18} className="shrink-0 text-orange-500" />
                    : <Circle size={18} className="shrink-0 text-gray-300" />}
                  <ตัวเลือก.Icon size={18} strokeWidth={2} className="shrink-0" />
                  <span className="text-left">{ตัวเลือก.label}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* ตำแหน่ง */}
        <div>
          <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
            <MapPin size={15} className="text-gray-500" /> สถานที่พบ <span className="text-red-400">*</span>
          </p>
          <div className="relative">
            <input type="text" value={ตำแหน่ง} onChange={(e) => setตำแหน่ง(e.target.value)}
              placeholder="เช่น หน้าวัดกำแพงแสน หรือ ถนนสาย 1"
              className="w-full border border-gray-200 rounded-xl pl-4 pr-11 py-3 text-sm bg-white focus:outline-none focus:border-orange-400" />
            <button
              onClick={ใช้GPSปัจจุบัน}
              disabled={กำลังหาตำแหน่ง}
              title="ดึงตำแหน่งปัจจุบัน"
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg bg-orange-50 text-orange-500 flex items-center justify-center disabled:opacity-60"
            >
              {กำลังหาตำแหน่ง
                ? <Loader2 size={16} className="animate-spin" />
                : <LocateFixed size={16} />}
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-1.5">แตะไอคอนเป้าเล็งเพื่อดึงตำแหน่งปัจจุบัน</p>

          {/* เปิดแผนที่แบบเลื่อนหมุดเอง (แบบแอปเรียกรถ) */}
          <button
            onClick={() => setแสดงModalแผนที่(true)}
            className="mt-2 w-full flex items-center justify-center gap-2 border-2 border-dashed border-orange-300 rounded-xl py-2.5 text-sm font-medium text-orange-600 bg-orange-50/50"
          >
            <Map size={16} /> เปิดแผนที่เพื่อระบุจุดเกิดเหตุ
          </button>

          {/* แสดง link Google Maps เมื่อมีพิกัด */}
          {latitude && longitude ? (
            <a
              href={`https://www.google.com/maps?q=${latitude},${longitude}`}
              target="_blank" rel="noreferrer"
              className="mt-2 flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-2.5 text-sm text-green-700 font-medium"
            >
              <Map size={16} />
              <span className="flex-1">ดูตำแหน่งใน Google Maps</span>
              <span className="text-xs text-green-500">→</span>
            </a>
          ) : (
            <p className="mt-2 text-xs text-red-500">
              ⚠️ กรุณากดเป้าเล็ง GPS หรือเปิดแผนที่เพื่อระบุตำแหน่งจริงก่อนส่งรายงาน — พิมพ์ข้อความอย่างเดียวยังส่งไม่ได้
            </p>
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
        <button onClick={ส่งรายงาน} disabled={!ตำแหน่ง || !latitude || !longitude || !เหตุผลแจ้ง || กำลังส่ง || กำลังวิเคราะห์ || ต้องกรอกเบอร์}
          className="w-full bg-orange-500 text-white rounded-xl py-3.5 font-semibold text-base flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
          {กำลังส่ง ? '⏳ กำลังอัปโหลดและบันทึก...' : 'ส่งรายงานให้เจ้าหน้าที่'}
        </button>

        {/* แสดงเมื่อปิด modal โดยไม่กรอกเบอร์ */}
        {ต้องกรอกเบอร์ && (
          <button
            onClick={() => setแสดงModalโทรศัพท์(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-50 border border-red-200 rounded-xl py-3 text-sm text-red-600 font-medium"
          >
            <span>📱</span>
            <span>กรุณากรอกเบอร์โทรศัพท์ก่อนส่ง</span>
            <span className="text-red-400">→ กรอกเบอร์</span>
          </button>
        )}

      </div>
    </div>
  )
}

export default ReportAnimal
