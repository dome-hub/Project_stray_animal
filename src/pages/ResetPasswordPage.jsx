// ResetPasswordPage.jsx — หน้าตั้งรหัสผ่านใหม่ ปลายทางของลิงก์ในอีเมล "ลืมรหัสผ่าน"
//
// เดิมแอปไม่มีทางกู้รหัสผ่านเลย เจ้าหน้าที่ที่ลืมรหัสหลังใช้ไปหนึ่งเดือน
// จะเข้าเครื่องมือทำงานตัวเองไม่ได้อีก และแอดมินก็ไม่มีปุ่มรีเซ็ตให้ด้วย — ตันทั้งสองทาง
//
// Supabase อ่าน token จาก URL fragment แล้วสร้าง session ให้เองตอนโหลดหน้า
// (detectSessionInUrl เปิดอยู่โดยค่าเริ่มต้น) หน้านี้จึงแค่รับรหัสใหม่แล้วเรียก updateUser

import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { KeyRound, Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../supabase'
import { ข้อความError } from '../utils/errorMessage'
import { useToast } from '../components/useToast'

// ให้ตรงกับเกณฑ์ตอนสมัครใน Login.jsx
const ความยาวขั้นต่ำ = 8

function ResetPasswordPage() {
  const navigate = useNavigate()
  const { toastError, ToastHost } = useToast()

  const [รหัสใหม่,   setรหัสใหม่]   = useState('')
  const [ยืนยันรหัส, setยืนยันรหัส] = useState('')
  const [แสดงรหัส,  setแสดงรหัส]  = useState(false)
  const [กำลังบันทึก, setกำลังบันทึก] = useState(false)
  const [สำเร็จ,     setSำเร็จ]     = useState(false)
  const [ลิงก์ใช้ไม่ได้, setลิงก์ใช้ไม่ได้] = useState(false)

  // ลิงก์รีเซ็ตมีอายุจำกัดและใช้ได้ครั้งเดียว — ถ้าไม่มี session แปลว่าลิงก์หมดอายุหรือถูกใช้ไปแล้ว
  // ต้องบอกตรงๆ ตั้งแต่ตอนเปิดหน้า ไม่ใช่ปล่อยให้กรอกรหัสจนเสร็จแล้วค่อยพัง
  useEffect(function () {
    let ยกเลิกแล้ว = false
    supabase.auth.getSession().then(function ({ data }) {
      if (!ยกเลิกแล้ว && !data?.session) setลิงก์ใช้ไม่ได้(true)
    })
    return function () { ยกเลิกแล้ว = true }
  }, [])

  async function บันทึกรหัสใหม่(e) {
    e.preventDefault()
    if (กำลังบันทึก) return

    if (รหัสใหม่.length < ความยาวขั้นต่ำ) {
      toastError(`รหัสผ่านต้องมีอย่างน้อย ${ความยาวขั้นต่ำ} ตัวอักษร`)
      return
    }
    if (รหัสใหม่ !== ยืนยันรหัส) {
      toastError('รหัสผ่านทั้งสองช่องไม่ตรงกัน')
      return
    }

    setกำลังบันทึก(true)
    const { error } = await supabase.auth.updateUser({ password: รหัสใหม่ })
    setกำลังบันทึก(false)

    if (error) {
      toastError(ข้อความError(error, 'เปลี่ยนรหัสผ่าน'))
      return
    }
    setSำเร็จ(true)
  }

  if (สำเร็จ) {
    return (
      <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4">
        <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm text-center">
          <CheckCircle2 size={56} strokeWidth={1.5} className="text-green-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-gray-800 mb-2">เปลี่ยนรหัสผ่านแล้ว</h1>
          <p className="text-sm text-gray-600 leading-relaxed">
            คราวหน้าเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้เลย
          </p>
          <button
            onClick={() => navigate('/login', { replace: true })}
            className="mt-6 w-full bg-blue-600 active:bg-blue-700 text-white rounded-xl min-h-[44px] font-semibold transition-colors"
          >
            ไปหน้าเข้าสู่ระบบ
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center px-4 py-8">
      <ToastHost />
      <div className="bg-white rounded-3xl shadow-xl p-6 w-full max-w-sm">
        <div className="flex flex-col items-center mb-6 text-center">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <KeyRound size={26} strokeWidth={1.75} />
          </div>
          <h1 className="text-xl font-bold text-gray-800">ตั้งรหัสผ่านใหม่</h1>
          <p className="text-gray-600 text-sm mt-1">
            {ลิงก์ใช้ไม่ได้
              ? 'ลิงก์นี้หมดอายุหรือถูกใช้ไปแล้ว'
              : `ตั้งรหัสผ่านใหม่อย่างน้อย ${ความยาวขั้นต่ำ} ตัวอักษร`}
          </p>
        </div>

        {ลิงก์ใช้ไม่ได้ ? (
          <>
            <p className="text-sm text-gray-600 leading-relaxed text-center mb-5">
              ลิงก์รีเซ็ตรหัสผ่านใช้ได้ครั้งเดียวและมีอายุจำกัด กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
            <button
              onClick={() => navigate('/login', { replace: true })}
              className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-xl min-h-[44px] font-semibold transition-colors"
            >
              กลับไปขอลิงก์ใหม่
            </button>
          </>
        ) : (
          <form onSubmit={บันทึกรหัสใหม่} className="space-y-3">
            <div>
              <label htmlFor="รหัสใหม่" className="text-xs font-semibold text-gray-700 mb-1 block">
                รหัสผ่านใหม่
              </label>
              <div className="relative">
                <input
                  id="รหัสใหม่"
                  type={แสดงรหัส ? 'text' : 'password'}
                  value={รหัสใหม่}
                  onChange={(e) => setรหัสใหม่(e.target.value)}
                  autoComplete="new-password"
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400 pr-12"
                />
                <button
                  type="button"
                  onClick={() => setแสดงรหัส(!แสดงรหัส)}
                  aria-label={แสดงรหัส ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                  className="absolute right-1 top-1/2 -translate-y-1/2 text-gray-500 w-11 h-11 flex items-center justify-center"
                >
                  {แสดงรหัส ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <div>
              <label htmlFor="ยืนยันรหัส" className="text-xs font-semibold text-gray-700 mb-1 block">
                ยืนยันรหัสผ่านใหม่
              </label>
              <input
                id="ยืนยันรหัส"
                type={แสดงรหัส ? 'text' : 'password'}
                value={ยืนยันรหัส}
                onChange={(e) => setยืนยันรหัส(e.target.value)}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-blue-400"
              />
            </div>

            <button
              type="submit"
              disabled={กำลังบันทึก}
              className="w-full bg-blue-600 active:bg-blue-700 text-white rounded-xl min-h-[44px] font-semibold transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {กำลังบันทึก
                ? <><Loader2 size={16} className="animate-spin shrink-0" /> กำลังบันทึก...</>
                : 'บันทึกรหัสผ่านใหม่'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

export default ResetPasswordPage
