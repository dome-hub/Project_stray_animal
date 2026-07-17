// ProfilePage.jsx — หน้าโปรไฟล์ผู้ใช้
// แสดง tab ต่างกันตาม role + ดึงข้อมูลจริงจาก Supabase

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Trash2, ShieldAlert, X } from 'lucide-react'
import { supabase } from '../supabase'

// Role display config
const roleMap = {
  admin:     { ชื่อ: 'ผู้ดูแลระบบ',            emoji: '🛡️', สี: 'text-purple-700 bg-purple-50' },
  volunteer: { ชื่อ: 'เจ้าหน้าที่ / อาสาสมัคร', emoji: '🦺', สี: 'text-orange-700 bg-orange-50' },
  user:      { ชื่อ: 'ผู้ใช้งานทั่วไป',          emoji: '👤', สี: 'text-blue-700 bg-blue-50' },
}

// Tab config แยกตาม role
const tabsPerRole = {
  user:      [{ key: 'info', ชื่อ: 'ข้อมูล' }, { key: 'reports', ชื่อ: 'ประวัติแจ้ง' }, { key: 'adoptions', ชื่อ: 'รับเลี้ยง' }],
  volunteer: [{ key: 'info', ชื่อ: 'ข้อมูล' }, { key: 'stats', ชื่อ: 'สถิติ' }, { key: 'queue', ชื่อ: 'คิวงาน' }],
  admin:     [{ key: 'info', ชื่อ: 'ข้อมูล' }, { key: 'overview', ชื่อ: 'ภาพรวม' }],
}

const สีสถานะ = {
  'รอดำเนินการ':  'text-yellow-600 bg-yellow-50',
  'รับเรื่องแล้ว': 'text-blue-600 bg-blue-50',
  'ลงพื้นที่แล้ว': 'text-blue-600 bg-blue-50',
  'อยู่ศูนย์พักพิง': 'text-purple-600 bg-purple-50',
  'มีผู้รับเลี้ยง': 'text-green-600 bg-green-50',
}

function ProfilePage({ user }) {
  const navigate  = useNavigate()
  const inputรูป  = useRef(null)

  const currentRole = user?.role || 'user'
  const roleInfo    = roleMap[currentRole] || roleMap.user
  const tabs        = tabsPerRole[currentRole] || tabsPerRole.user

  const [แท็บ, setแท็บ] = useState('info')

  // ---- ข้อมูลสดจาก DB ----
  const [ข้อมูลDB,     setข้อมูลDB]     = useState(null)
  const [กำลังโหลดDB, setกำลังโหลดDB] = useState(true)

  // ---- รูปโปรไฟล์ ----
  const [รูปโปรไฟล์,     setรูปโปรไฟล์]     = useState(null)
  const [กำลังอัปโหลดรูป, setกำลังอัปโหลดรูป] = useState(false)

  // ---- แก้ไขชื่อ ----
  const [กำลังแก้ไขชื่อ,  setกำลังแก้ไขชื่อ]  = useState(false)
  const [ชื่อชั่วคราว,    setชื่อชั่วคราว]    = useState('')
  const [กำลังบันทึกชื่อ, setกำลังบันทึกชื่อ] = useState(false)

  // ---- แก้ไขเบอร์ ----
  const [เบอร์ติดต่อ,      setเบอร์ติดต่อ]      = useState('กดแก้ไขเพื่อเพิ่มเบอร์')
  const [กำลังแก้ไขเบอร์,  setกำลังแก้ไขเบอร์]  = useState(false)
  const [เบอร์ชั่วคราว,    setเบอร์ชั่วคราว]    = useState('')
  const [กำลังบันทึกเบอร์, setกำลังบันทึกเบอร์] = useState(false)
  const [errorเบอร์,        setErrorเบอร์]        = useState('')

  // ---- ข้อมูลศูนย์พักพิง (volunteer/admin เท่านั้น) ----
  const [shelterName,         setShelterName]         = useState('')
  const [shelterLocation,     setShelterLocation]     = useState('')
  const [serviceArea,         setServiceArea]         = useState('')
  const [กำลังแก้ไขShelter,  setกำลังแก้ไขShelter]  = useState(false)
  const [shelterTemp,         setShelterTemp]         = useState({ name: '', location: '', area: '' })
  const [กำลังบันทึกShelter, setกำลังบันทึกShelter] = useState(false)

  // ---- ลบบัญชี ----
  const [แสดงยืนยันลบบัญชี, setแสดงยืนยันลบบัญชี] = useState(false)
  const [กำลังลบบัญชี,      setกำลังลบบัญชี]      = useState(false)
  const [errorลบบัญชี,      setErrorลบบัญชี]      = useState('')

  // ---- ข้อมูลแต่ละ Tab ----
  const [ประวัติแจ้ง,    setประวัติแจ้ง]    = useState([])
  const [กำลังโหลดแจ้ง, setกำลังโหลดแจ้ง] = useState(false)

  const [สถิติVolunteer,    setSถิติVolunteer]    = useState(null)
  const [คิวงาน,           setคิวงาน]           = useState([])
  const [กำลังโหลดVolunteer, setกำลังโหลดVolunteer] = useState(false)

  const [ภาพรวมAdmin,    setภาพรวมAdmin]    = useState(null)
  const [กำลังโหลดAdmin, setกำลังโหลดAdmin] = useState(false)

  // โหลดข้อมูลพื้นฐานจาก DB (name, role, avatar, phone)
  useEffect(function () {
    if (!user?.id) return
    setกำลังโหลดDB(true)
    supabase
      .from('users')
      .select('name, role, avatar_url, phone, shelter_name, shelter_location, service_area')
      .eq('id', user.id)
      .single()
      .then(function ({ data }) {
        if (data) {
          setข้อมูลDB(data)
          if (data.avatar_url)       setรูปโปรไฟล์(data.avatar_url)
          if (data.phone)            setเบอร์ติดต่อ(data.phone)
          if (data.shelter_name)     setShelterName(data.shelter_name)
          if (data.shelter_location) setShelterLocation(data.shelter_location)
          if (data.service_area)     setServiceArea(data.service_area)
        }
        setกำลังโหลดDB(false)
      })
      .catch(function () { setกำลังโหลดDB(false) })
  }, [user?.id])

  // โหลดข้อมูลตาม Tab ที่เปิด
  useEffect(function () {
    if (แท็บ === 'reports' && user?.id) {
      // ประวัติแจ้งสัตว์จรของ user นี้
      setกำลังโหลดแจ้ง(true)
      supabase
        .from('reports')
        .select('id, animal_type, location_text, status, created_at, image_url')
        .eq('reporter_id', user.id)
        .order('created_at', { ascending: false })
        .then(function ({ data }) {
          setประวัติแจ้ง(data || [])
          setกำลังโหลดแจ้ง(false)
        })
        .catch(function () { setกำลังโหลดแจ้ง(false) })
    }

    if ((แท็บ === 'stats' || แท็บ === 'queue') && currentRole === 'volunteer') {
      setกำลังโหลดVolunteer(true)
      Promise.all([
        // นับตามสถานะ
        supabase.from('reports').select('status'),
        // คิวงานที่ยังรอ (รอดำเนินการ + รับเรื่องแล้ว)
        supabase
          .from('reports')
          .select('id, animal_type, location_text, status, created_at, image_url')
          .in('status', ['รอดำเนินการ', 'รับเรื่องแล้ว', 'ลงพื้นที่แล้ว'])
          .order('created_at', { ascending: false })
          .limit(20),
      ]).then(function ([ร1, ร2]) {
        // นับแต่ละสถานะ
        const นับ = {}
        ;(ร1.data || []).forEach(function (r) {
          นับ[r.status] = (นับ[r.status] || 0) + 1
        })
        setSถิติVolunteer({ รวม: (ร1.data || []).length, แยกสถานะ: นับ })
        setคิวงาน(ร2.data || [])
        setกำลังโหลดVolunteer(false)
      }).catch(function () { setกำลังโหลดVolunteer(false) })
    }

    if (แท็บ === 'overview' && currentRole === 'admin') {
      setกำลังโหลดAdmin(true)
      Promise.all([
        supabase.from('users').select('id', { count: 'exact', head: true }),
        supabase.from('reports').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }),
        supabase.from('animals').select('id', { count: 'exact', head: true }).eq('status', 'มีผู้รับเลี้ยง'),
      ]).then(function ([ร1, ร2, ร3, ร4]) {
        setภาพรวมAdmin({
          ผู้ใช้: ร1.count || 0,
          รายงาน: ร2.count || 0,
          สัตว์: ร3.count || 0,
          รับเลี้ยง: ร4.count || 0,
        })
        setกำลังโหลดAdmin(false)
      }).catch(function () { setกำลังโหลดAdmin(false) })
    }
  }, [แท็บ, user?.id])

  const displayName = ข้อมูลDB?.name || user?.name || 'ผู้ใช้งาน'

  // ---- บันทึกชื่อลง DB ----
  async function บันทึกชื่อ() {
    if (!ชื่อชั่วคราว.trim()) return
    setกำลังบันทึกชื่อ(true)
    try {
      const { error } = await supabase.from('users').update({ name: ชื่อชั่วคราว.trim() }).eq('id', user.id)
      if (error) throw new Error(error.message)
      setข้อมูลDB(function (p) { return { ...p, name: ชื่อชั่วคราว.trim() } })
      setกำลังแก้ไขชื่อ(false)
    } catch (err) {
      alert('บันทึกชื่อไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังบันทึกชื่อ(false)
    }
  }

  // ---- บันทึกข้อมูลศูนย์พักพิงลง DB ----
  async function บันทึกShelter() {
    setกำลังบันทึกShelter(true)
    try {
      const { error } = await supabase.from('users').update({
        shelter_name:     shelterTemp.name.trim() || null,
        shelter_location: shelterTemp.location.trim() || null,
        service_area:     shelterTemp.area.trim() || null,
      }).eq('id', user.id)
      if (error) throw new Error(error.message)
      setShelterName(shelterTemp.name.trim())
      setShelterLocation(shelterTemp.location.trim())
      setServiceArea(shelterTemp.area.trim())
      setกำลังแก้ไขShelter(false)
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังบันทึกShelter(false)
    }
  }

  // ---- บันทึกเบอร์ลง DB (บังคับ 10 หลัก) ----
  async function บันทึกเบอร์() {
    const tel = เบอร์ชั่วคราว.trim()
    if (!/^0[0-9]{9}$/.test(tel)) {
      setErrorเบอร์('ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0')
      return
    }
    setErrorเบอร์('')
    setกำลังบันทึกเบอร์(true)
    try {
      const { error } = await supabase.from('users').update({ phone: tel }).eq('id', user.id)
      if (error) throw new Error(error.message)
      setเบอร์ติดต่อ(tel)
      setกำลังแก้ไขเบอร์(false)
    } catch (err) {
      setErrorเบอร์('บันทึกไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setกำลังบันทึกเบอร์(false)
    }
  }

  // ---- อัปโหลดรูปโปรไฟล์ ----
  async function เลือกรูปโปรไฟล์(event) {
    const ไฟล์ = event.target.files[0]
    if (!ไฟล์) return
    setกำลังอัปโหลดรูป(true)
    try {
      const นามสกุล = ไฟล์.name.split('.').pop()
      const ชื่อไฟล์ = `avatars/${user?.id || 'user'}.${นามสกุล}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('report-images').upload(ชื่อไฟล์, ไฟล์, { upsert: true })
      if (uploadError) throw new Error(uploadError.message)
      const { data: urlData } = supabase.storage.from('report-images').getPublicUrl(uploadData.path)
      const publicUrl = urlData.publicUrl + '?t=' + Date.now()
      const { error: updateError } = await supabase.from('users').update({ avatar_url: publicUrl }).eq('id', user.id)
      if (updateError) throw new Error(updateError.message)
      setรูปโปรไฟล์(publicUrl)
    } catch (err) {
      alert('อัปโหลดรูปไม่สำเร็จ: ' + err.message)
    } finally {
      setกำลังอัปโหลดรูป(false)
      event.target.value = ''
    }
  }

  // ---- ลบบัญชี (Right to be Forgotten) ----
  // เรียก Edge Function "delete-account" ทำงานทั้งหมดฝั่งเซิร์ฟเวอร์ (service role):
  //   unlink รายงาน (reporter_id -> null) → ลบ notifications → ลบ row users → ลบ auth user
  // แล้วจึง sign out
  async function ลบบัญชี() {
    if (!user?.id) return
    setกำลังลบบัญชี(true)
    setErrorลบบัญชี('')
    try {
      const { data: fnData, error: fnError } = await supabase.functions.invoke('delete-account')
      if (fnError) {
        const รายละเอียด = fnError.context ? await fnError.context.text().catch(() => '') : ''
        throw new Error(fnError.message + (รายละเอียด ? ` — ${รายละเอียด}` : ''))
      }
      if (fnData?.error) throw new Error(fnData.error)

      await supabase.auth.signOut()
      navigate('/')
    } catch (err) {
      setErrorลบบัญชี('ลบบัญชีไม่สำเร็จ: ' + err.message)
      setกำลังลบบัญชี(false)
    }
  }

  // ---- แปลงวันที่ ----
  function แปลงวันที่(str) {
    if (!str) return '-'
    return new Date(str).toLocaleDateString('th-TH', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="min-h-screen bg-blue-50 pb-8">

      {/* Header */}
      <div className="bg-white shadow-sm px-4 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/home')} className="text-gray-700 text-xl">←</button>
        <h1 className="font-bold text-gray-800">โปรไฟล์ของฉัน</h1>
      </div>

      {/* Card ข้อมูลผู้ใช้ */}
      <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm text-center">

        {/* รูปโปรไฟล์ */}
        <div className="relative inline-block mb-3">
          <div
            onClick={() => inputรูป.current.click()}
            className="w-24 h-24 rounded-full overflow-hidden bg-blue-100 flex items-center justify-center cursor-pointer mx-auto border-4 border-white shadow-md"
          >
            {กำลังอัปโหลดรูป ? (
              <div className="w-7 h-7 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            ) : รูปโปรไฟล์ ? (
              <img src={รูปโปรไฟล์} alt="โปรไฟล์" className="w-full h-full object-cover" />
            ) : (
              <span className="text-5xl">👤</span>
            )}
          </div>
          <button
            onClick={() => inputรูป.current.click()}
            className="absolute bottom-0 right-0 w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white"
          >
            <span className="text-sm">📷</span>
          </button>
        </div>
        <input ref={inputรูป} type="file" accept="image/*" className="hidden" onChange={เลือกรูปโปรไฟล์} />

        <h2 className="text-xl font-bold text-gray-800">{displayName}</h2>
        <p className="text-gray-500 text-sm mt-1">{user?.email || ''}</p>
        <div className={`inline-block px-3 py-1 rounded-full text-xs font-medium mt-2 ${roleInfo.สี}`}>
          {roleInfo.emoji} {roleInfo.ชื่อ}
        </div>
      </div>

      {/* Tab สลับ — ต่างกันตาม role */}
      <div className="flex mx-4 mt-4 bg-gray-100 rounded-xl p-1">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setแท็บ(t.key)}
            className={`flex-1 py-2 rounded-lg text-xs font-medium transition-all ${
              แท็บ === t.key ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500'
            }`}
          >
            {t.ชื่อ}
          </button>
        ))}
      </div>

      {/* ======== Tab: ข้อมูลส่วนตัว (ทุก role) ======== */}
      {แท็บ === 'info' && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm space-y-4">
          <h3 className="font-bold text-gray-800">ข้อมูลส่วนตัว</h3>
          <div className="space-y-3">

            {/* ชื่อ */}
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-500">ชื่อ</span>
              <div className="flex items-center gap-2">
                {กำลังแก้ไขชื่อ ? (
                  <>
                    <input
                      value={ชื่อชั่วคราว}
                      onChange={(e) => setชื่อชั่วคราว(e.target.value)}
                      placeholder="ชื่อ-นามสกุล"
                      className="border border-blue-300 rounded-lg px-2 py-1 text-sm text-right w-40 focus:outline-none"
                      autoFocus
                    />
                    <button onClick={บันทึกชื่อ} disabled={กำลังบันทึกชื่อ}
                      className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg disabled:opacity-60">
                      {กำลังบันทึกชื่อ ? '...' : 'บันทึก'}
                    </button>
                    <button onClick={() => setกำลังแก้ไขชื่อ(false)} className="text-xs text-gray-400">ยกเลิก</button>
                  </>
                ) : (
                  <>
                    <span className="text-sm font-medium text-gray-800">{displayName}</span>
                    <button onClick={() => { setชื่อชั่วคราว(displayName); setกำลังแก้ไขชื่อ(true) }}
                      className="text-xs text-blue-500">แก้ไข</button>
                  </>
                )}
              </div>
            </div>

            {/* อีเมล */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">อีเมล</span>
              <span className="text-sm font-medium text-gray-800">{user?.email}</span>
            </div>

            {/* สิทธิ์ */}
            <div className="flex justify-between">
              <span className="text-sm text-gray-500">สิทธิ์</span>
              <span className={`text-sm font-medium ${roleInfo.สี.split(' ')[0]}`}>
                {roleInfo.emoji} {roleInfo.ชื่อ}
              </span>
            </div>

            {/* เบอร์ติดต่อ */}
            <div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">เบอร์ติดต่อ</span>
                <div className="flex items-center gap-2">
                  {กำลังแก้ไขเบอร์ ? (
                    <>
                      <input
                        type="tel"
                        inputMode="numeric"
                        value={เบอร์ชั่วคราว}
                        onChange={function (e) {
                          // รับเฉพาะตัวเลข ไม่เกิน 10 หลัก
                          const val = e.target.value.replace(/\D/g, '').slice(0, 10)
                          setเบอร์ชั่วคราว(val)
                          setErrorเบอร์('')
                        }}
                        placeholder="0XXXXXXXXX"
                        className={`border rounded-lg px-2 py-1 text-sm text-right w-32 focus:outline-none tracking-widest ${
                          errorเบอร์ ? 'border-red-400 bg-red-50' : 'border-blue-300'
                        }`}
                        maxLength={10}
                        autoFocus
                      />
                      <button
                        onClick={บันทึกเบอร์}
                        disabled={กำลังบันทึกเบอร์ || เบอร์ชั่วคราว.length < 10}
                        className="text-xs text-white bg-blue-500 px-2 py-1 rounded-lg disabled:opacity-40">
                        {กำลังบันทึกเบอร์ ? '...' : 'บันทึก'}
                      </button>
                      <button onClick={() => { setกำลังแก้ไขเบอร์(false); setErrorเบอร์('') }}
                        className="text-xs text-gray-400">ยกเลิก</button>
                    </>
                  ) : (
                    <>
                      <span className={`text-sm font-medium ${เบอร์ติดต่อ === 'กดแก้ไขเพื่อเพิ่มเบอร์' ? 'text-gray-400 italic' : 'text-gray-800'}`}>
                        {เบอร์ติดต่อ}
                      </span>
                      <button onClick={() => { setเบอร์ชั่วคราว(เบอร์ติดต่อ === 'กดแก้ไขเพื่อเพิ่มเบอร์' ? '' : เบอร์ติดต่อ); setกำลังแก้ไขเบอร์(true) }}
                        className="text-xs text-blue-500">แก้ไข</button>
                    </>
                  )}
                </div>
              </div>
              {/* error ใต้แถว */}
              {กำลังแก้ไขเบอร์ && errorเบอร์ && (
                <p className="text-red-500 text-xs mt-1 text-right">{errorเบอร์}</p>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ======== ข้อมูลศูนย์พักพิง (volunteer เท่านั้น) ======== */}
      {แท็บ === 'info' && currentRole === 'volunteer' && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800">🏠 ข้อมูลศูนย์พักพิง</h3>
            {!กำลังแก้ไขShelter && (
              <button
                onClick={() => {
                  setShelterTemp({ name: shelterName, location: shelterLocation, area: serviceArea })
                  setกำลังแก้ไขShelter(true)
                }}
                className="text-xs text-orange-500 font-medium"
              >
                แก้ไข
              </button>
            )}
          </div>

          {กำลังแก้ไขShelter ? (
            <div className="space-y-3">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ชื่อศูนย์พักพิง</label>
                <input
                  value={shelterTemp.name}
                  onChange={(e) => setShelterTemp(function (p) { return { ...p, name: e.target.value } })}
                  placeholder="เช่น ศูนย์พักพิงสัตว์กำแพงแสน"
                  className="w-full border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ที่ตั้ง / Location</label>
                <input
                  value={shelterTemp.location}
                  onChange={(e) => setShelterTemp(function (p) { return { ...p, location: e.target.value } })}
                  placeholder="เช่น ถนนสาย 1 กำแพงแสน นครปฐม"
                  className="w-full border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">พื้นที่รับผิดชอบ</label>
                <input
                  value={shelterTemp.area}
                  onChange={(e) => setShelterTemp(function (p) { return { ...p, area: e.target.value } })}
                  placeholder="เช่น อ.กำแพงแสน, อ.ดอนตูม, อ.บางเลน"
                  className="w-full border border-orange-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-orange-400"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={บันทึกShelter}
                  disabled={กำลังบันทึกShelter}
                  className="flex-1 bg-orange-500 text-white rounded-xl py-2 text-sm font-medium disabled:opacity-60"
                >
                  {กำลังบันทึกShelter ? '⏳ กำลังบันทึก...' : '💾 บันทึก'}
                </button>
                <button
                  onClick={() => setกำลังแก้ไขShelter(false)}
                  className="flex-1 bg-gray-100 text-gray-600 rounded-xl py-2 text-sm font-medium"
                >
                  ยกเลิก
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ชื่อศูนย์พักพิง</span>
                <span className={`text-sm font-medium ${shelterName ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                  {shelterName || 'ยังไม่ได้กรอก'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500">ที่ตั้ง</span>
                <span className={`text-sm font-medium text-right max-w-[60%] ${shelterLocation ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                  {shelterLocation || 'ยังไม่ได้กรอก'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-500 shrink-0">พื้นที่รับผิดชอบ</span>
                <span className={`text-sm font-medium text-right max-w-[60%] ${serviceArea ? 'text-gray-800' : 'text-gray-400 italic'}`}>
                  {serviceArea || 'ยังไม่ได้กรอก'}
                </span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======== Danger Zone: ลบบัญชี (ทุก role) ======== */}
      {แท็บ === 'info' && (
        <div className="bg-white mx-4 mt-4 rounded-2xl p-5 shadow-sm border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert size={16} className="text-red-500" />
            <h3 className="font-bold text-red-600 text-sm">ลบบัญชีผู้ใช้</h3>
          </div>
          <p className="text-xs text-gray-500 mb-3 leading-relaxed">
            ข้อมูลส่วนตัว (ชื่อ, เบอร์โทร, รูปโปรไฟล์) จะถูกลบถาวรและกู้คืนไม่ได้
            ส่วนรายงานที่เคยแจ้งไว้จะยังเก็บไว้ในระบบแต่จะไม่ผูกกับบัญชีนี้อีกต่อไป
          </p>
          <button
            onClick={() => setแสดงยืนยันลบบัญชี(true)}
            className="w-full flex items-center justify-center gap-2 border border-red-200 text-red-600 rounded-xl py-2.5 text-sm font-medium hover:bg-red-50 transition-colors"
          >
            <Trash2 size={15} /> ลบบัญชีของฉัน
          </button>
        </div>
      )}

      {/* ======== Modal: ยืนยันการลบบัญชี ======== */}
      {แสดงยืนยันลบบัญชี && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-end"
             onClick={() => { if (!กำลังลบบัญชี) setแสดงยืนยันลบบัญชี(false) }}>
          <div className="bg-white w-full rounded-t-3xl px-5 pt-4 pb-8"
               onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-1">
              <div className="w-7" />
              <div className="w-10 h-1 bg-gray-200 rounded-full" />
              <button
                onClick={() => setแสดงยืนยันลบบัญชี(false)}
                disabled={กำลังลบบัญชี}
                className="w-7 h-7 flex items-center justify-center text-gray-400"
              ><X size={18} /></button>
            </div>

            <div className="text-center mb-5 mt-3">
              <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-3">
                <ShieldAlert size={26} className="text-red-500" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">ยืนยันการลบบัญชี</h2>
              <p className="text-sm text-gray-500 mt-2 leading-relaxed px-2">
                การลบบัญชีไม่สามารถย้อนกลับได้ ชื่อ เบอร์โทร และรูปโปรไฟล์ของคุณจะถูกลบถาวร
                และคุณจะออกจากระบบทันที
              </p>
            </div>

            {errorลบบัญชี && (
              <p className="text-red-500 text-xs text-center mb-3">{errorลบบัญชี}</p>
            )}

            <div className="space-y-2">
              <button
                onClick={ลบบัญชี}
                disabled={กำลังลบบัญชี}
                className="w-full bg-red-600 text-white rounded-xl py-3.5 font-bold text-base disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {กำลังลบบัญชี
                  ? <><span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> กำลังลบบัญชี...</>
                  : <><Trash2 size={16} /> ยืนยันลบบัญชีถาวร</>}
              </button>
              <button
                onClick={() => setแสดงยืนยันลบบัญชี(false)}
                disabled={กำลังลบบัญชี}
                className="w-full text-gray-500 text-sm py-2"
              >
                ยกเลิก
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ======== Tab: ประวัติแจ้ง (user) ======== */}
      {แท็บ === 'reports' && (
        <div className="px-4 mt-4 space-y-3">
          {กำลังโหลดแจ้ง ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          ) : ประวัติแจ้ง.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">📋</p>
              <p className="font-medium text-gray-600">ยังไม่มีประวัติการแจ้ง</p>
              <p className="text-xs text-gray-400 mt-1">เมื่อคุณแจ้งสัตว์จร จะปรากฏที่นี่</p>
              <button onClick={() => navigate('/report')}
                className="mt-4 bg-orange-500 text-white px-6 py-2 rounded-xl text-sm font-medium">
                แจ้งสัตว์จรเลย
              </button>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">รายงานทั้งหมด {ประวัติแจ้ง.length} รายการ</p>
              {ประวัติแจ้ง.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                        {r.image_url
                          ? <img src={r.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                          : (r.animal_type?.includes('แมว') ? '🐈' : '🐕')
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{r.animal_type || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-500">📍 {r.location_text}</p>
                        <p className="text-xs text-gray-400">{แปลงวันที่(r.created_at)} • #{String(r.id).padStart(6, '0')}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${สีสถานะ[r.status] || 'text-gray-600 bg-gray-50'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ======== Tab: ประวัติรับเลี้ยง (user) ======== */}
      {แท็บ === 'adoptions' && (
        <div className="text-center py-16 px-4">
          <p className="text-5xl mb-3">🐾</p>
          <p className="font-medium text-gray-600">ยังไม่มีประวัติการรับเลี้ยง</p>
          <p className="text-xs text-gray-400 mt-1">เมื่อคุณยื่นขอรับเลี้ยงสัตว์ จะปรากฏที่นี่</p>
          <button onClick={() => navigate('/find-pet')}
            className="mt-4 bg-green-500 text-white px-6 py-2 rounded-xl text-sm font-medium">
            ค้นหาสัตว์เลี้ยง
          </button>
        </div>
      )}

      {/* ======== Tab: สถิติ (volunteer) ======== */}
      {แท็บ === 'stats' && (
        <div className="px-4 mt-4 space-y-4">
          {กำลังโหลดVolunteer ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          ) : สถิติVolunteer ? (
            <>
              {/* รวมทั้งหมด */}
              <div className="bg-white rounded-2xl p-4 shadow-sm text-center">
                <p className="text-4xl font-bold text-orange-600">{สถิติVolunteer.รวม}</p>
                <p className="text-sm text-gray-500 mt-1">รายงานทั้งหมดในระบบ</p>
              </div>

              {/* แยกตามสถานะ */}
              <div className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-gray-800 mb-3">แยกตามสถานะ</p>
                <div className="space-y-2">
                  {[
                    { สถานะ: 'รอดำเนินการ',   สี: 'bg-yellow-400' },
                    { สถานะ: 'รับเรื่องแล้ว',  สี: 'bg-blue-400' },
                    { สถานะ: 'ลงพื้นที่แล้ว',  สี: 'bg-indigo-400' },
                    { สถานะ: 'อยู่ศูนย์พักพิง', สี: 'bg-purple-400' },
                    { สถานะ: 'มีผู้รับเลี้ยง',  สี: 'bg-green-400' },
                  ].map(function (item) {
                    const จำนวน = สถิติVolunteer.แยกสถานะ[item.สถานะ] || 0
                    const เปอร์เซ็นต์ = สถิติVolunteer.รวม > 0
                      ? Math.round((จำนวน / สถิติVolunteer.รวม) * 100)
                      : 0
                    return (
                      <div key={item.สถานะ}>
                        <div className="flex justify-between text-xs mb-1">
                          <span className="text-gray-600">{item.สถานะ}</span>
                          <span className="font-semibold">{จำนวน} รายการ ({เปอร์เซ็นต์}%)</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div className={`h-2 rounded-full ${item.สี}`}
                            style={{ width: จำนวน > 0 ? `${เปอร์เซ็นต์}%` : '3px' }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </>
          ) : null}
        </div>
      )}

      {/* ======== Tab: คิวงาน (volunteer) ======== */}
      {แท็บ === 'queue' && (
        <div className="px-4 mt-4 space-y-3">
          {กำลังโหลดVolunteer ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-orange-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          ) : คิวงาน.length === 0 ? (
            <div className="text-center py-16">
              <p className="text-5xl mb-3">✅</p>
              <p className="font-medium text-gray-600">ไม่มีคิวงานที่รอดำเนินการ</p>
              <p className="text-xs text-gray-400 mt-1">รายงานที่ยังรอจะปรากฏที่นี่</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400">รายงานที่รอดำเนินการ {คิวงาน.length} รายการ</p>
              {คิวงาน.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl overflow-hidden bg-orange-50 flex items-center justify-center text-2xl shrink-0">
                        {r.image_url
                          ? <img src={r.image_url} alt="สัตว์" className="w-full h-full object-cover" />
                          : (r.animal_type?.includes('แมว') ? '🐈' : '🐕')
                        }
                      </div>
                      <div>
                        <p className="font-semibold text-gray-800 text-sm">{r.animal_type || 'ไม่ระบุ'}</p>
                        <p className="text-xs text-gray-500">📍 {r.location_text}</p>
                        <p className="text-xs text-gray-400">{แปลงวันที่(r.created_at)}</p>
                      </div>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium shrink-0 ${สีสถานะ[r.status] || 'text-gray-600 bg-gray-50'}`}>
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
              <button onClick={() => navigate('/volunteer/reports')}
                className="w-full bg-orange-50 text-orange-600 rounded-xl py-3 text-sm font-medium">
                ไปหน้าจัดการรายงาน →
              </button>
            </>
          )}
        </div>
      )}

      {/* ======== Tab: ภาพรวมระบบ (admin) ======== */}
      {แท็บ === 'overview' && (
        <div className="px-4 mt-4 space-y-4">
          {กำลังโหลดAdmin ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              <p className="text-sm text-gray-400">กำลังโหลด...</p>
            </div>
          ) : ภาพรวมAdmin ? (
            <>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { ชื่อ: 'ผู้ใช้งานทั้งหมด', ค่า: ภาพรวมAdmin.ผู้ใช้,    emoji: '👥', สี: 'bg-blue-50 text-blue-600' },
                  { ชื่อ: 'รายงานทั้งหมด',    ค่า: ภาพรวมAdmin.รายงาน,   emoji: '📋', สี: 'bg-orange-50 text-orange-600' },
                  { ชื่อ: 'สัตว์ในระบบ',       ค่า: ภาพรวมAdmin.สัตว์,    emoji: '🐾', สี: 'bg-green-50 text-green-600' },
                  { ชื่อ: 'รับเลี้ยงแล้ว',     ค่า: ภาพรวมAdmin.รับเลี้ยง, emoji: '❤️', สี: 'bg-red-50 text-red-600' },
                ].map((stat) => (
                  <div key={stat.ชื่อ} className={`rounded-2xl p-4 shadow-sm ${stat.สี.split(' ')[0]}`}>
                    <p className="text-3xl mb-1">{stat.emoji}</p>
                    <p className={`text-3xl font-bold ${stat.สี.split(' ')[1]}`}>{stat.ค่า}</p>
                    <p className="text-xs text-gray-500 mt-1">{stat.ชื่อ}</p>
                  </div>
                ))}
              </div>
              <button onClick={() => navigate('/admin/dashboard')}
                className="w-full bg-purple-50 text-purple-600 rounded-xl py-3 text-sm font-medium">
                ไปหน้า Dashboard เต็มรูปแบบ →
              </button>
            </>
          ) : null}
        </div>
      )}

    </div>
  )
}

export default ProfilePage
