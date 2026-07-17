// SuspendedPage.jsx — หน้าจอเต็มจอสำหรับบัญชีที่ถูกระงับ (Global Block)
// แสดงแทนแอปทั้งหมด ไม่ให้เข้าถึงหน้าใดๆ เลยจนกว่าแอดมินจะยกเลิกการระงับ

import { ShieldOff, Mail } from 'lucide-react'

const CONTACT_EMAILS = ['domezadome159@gmail.com', 'plamzaz7410@gmail.com']

function SuspendedPage({ onBackToLogin }) {
  return (
    <div className="min-h-screen bg-red-50 flex flex-col items-center justify-center px-6 text-center">
      <div className="w-20 h-20 rounded-full bg-red-100 flex items-center justify-center mb-6">
        <ShieldOff size={40} className="text-red-500" />
      </div>

      <h1 className="text-xl font-bold text-gray-800 mb-2">
        ⚠️ บัญชีของคุณถูกระงับการใช้งาน
      </h1>
      <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
        คุณไม่สามารถเข้าใช้งานแอปนี้ได้ในขณะนี้
        หากคุณคิดว่านี่คือข้อผิดพลาด โปรดติดต่อเจ้าหน้าที่
      </p>

      <a
        href={`mailto:${CONTACT_EMAILS.join(',')}?subject=${encodeURIComponent('สอบถามเรื่องบัญชีถูกระงับ')}`}
        className="mt-6 flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-xl font-medium shadow-sm active:scale-95 transition-all"
      >
        <Mail size={16} /> ติดต่อเรา
      </a>

      <button onClick={onBackToLogin} className="mt-4 text-sm text-gray-400 underline">
        กลับหน้าเข้าสู่ระบบ
      </button>
    </div>
  )
}

export default SuspendedPage
