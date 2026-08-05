// googleSignIn.js — เข้าสู่ระบบด้วย Google ที่ทำงานได้ทั้งบนเว็บและในแอป Android
//
// ปัญหาเดิม: Login.jsx เรียก signInWithOAuth ด้วย redirectTo: window.location.origin
// ซึ่งบนเว็บได้ URL จริง แต่ใน WebView ของ Capacitor origin คือ https://localhost
// (capacitor.config.json ไม่ได้ตั้ง androidScheme) Google จึงพยายามส่งผู้ใช้กลับไปยัง
// https://localhost ที่ไม่มีอยู่จริงนอกแอป → ขึ้นหน้า "Not Found" ในเบราว์เซอร์
//
// วิธีแก้บนมือถือ:
//   1. ขอ URL ของ Google จาก Supabase แต่ไม่ให้ redirect เอง (skipBrowserRedirect)
//   2. เปิด URL นั้นด้วยเบราว์เซอร์ระบบผ่าน @capacitor/browser
//      (ต้องเป็นเบราว์เซอร์จริง ไม่ใช่ WebView — Google บล็อกการล็อกอินใน WebView
//       ด้วยนโยบาย "disallowed_useragent" อยู่แล้ว)
//   3. ให้ Google/Supabase ส่งกลับมาที่ custom scheme ของแอป (com.jaengjorn.app://…)
//      ระบบปฏิบัติการจะเปิดแอปเราขึ้นมาพร้อม URL นั้น
//   4. ฟัง appUrlOpen แล้วแลก code/token เป็น session (ดู ผูกตัวรับDeepLink)
//
// ต้องตั้งค่าเพิ่มนอกโค้ดด้วย ไม่งั้นยังใช้ไม่ได้:
//   - AndroidManifest.xml: intent-filter รับ scheme com.jaengjorn.app (ทำแล้วในคอมมิตนี้)
//   - Supabase Dashboard → Authentication → URL Configuration → Redirect URLs:
//     ต้องเพิ่ม com.jaengjorn.app://login-callback เข้าไป ไม่งั้น Supabase ปฏิเสธ redirect

import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { App as CapApp } from '@capacitor/app'
import { supabase } from '../supabase'

// ใช้ appId เป็น scheme ตามแนวทางของ Capacitor — ต้องตรงกับ AndroidManifest.xml เป๊ะ
export const SCHEME_CALLBACK = 'com.jaengjorn.app://login-callback'

export function เป็นแอปมือถือ() {
  return Capacitor.isNativePlatform()
}

// ---- ปลายทางของลิงก์ "ตั้งรหัสผ่านใหม่" ในอีเมล ----
// บนเว็บใช้ URL จริงได้ตรงๆ แต่ในแอป APK window.location.origin คือ https://localhost
// ซึ่งไม่มีอยู่จริงนอกแอป — ผู้ใช้ที่ลืมรหัสจะได้อีเมลที่กดแล้วขึ้น "Not Found" เปิดต่อไม่ได้เลย
// (ปัญหาเดียวกับ Google OAuth ที่แก้ไปแล้วด้านบน แต่เส้นทางลืมรหัสยังใช้ของเดิมอยู่)
//
// ใช้ host เดิม (login-callback) ซ้ำ เพราะ AndroidManifest มี intent-filter แค่ host นี้
// แล้วไปแยกทีหลังว่าเป็นลิงก์ประเภทไหนจาก type=recovery ที่ Supabase ใส่มาให้
export function ปลายทางตั้งรหัสใหม่() {
  return เป็นแอปมือถือ() ? SCHEME_CALLBACK : `${window.location.origin}/reset-password`
}

// ---- เริ่มขั้นตอนล็อกอิน ----
export async function เข้าสู่ระบบGoogle() {
  const บนมือถือ = เป็นแอปมือถือ()

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: บนมือถือ ? SCHEME_CALLBACK : window.location.origin,
      // บนมือถือเราต้องเปิด URL เองด้วยเบราว์เซอร์ระบบ ไม่ให้ supabase-js สั่ง redirect ใน WebView
      skipBrowserRedirect: บนมือถือ,
    },
  })

  if (error) throw error

  if (บนมือถือ) {
    if (!data?.url) throw new Error('ไม่ได้รับลิงก์เข้าสู่ระบบจากเซิร์ฟเวอร์')
    await Browser.open({ url: data.url })
  }
  // บนเว็บ: supabase-js พาไปหน้า Google เองแล้ว ไม่ต้องทำอะไรต่อ
}

// ---- รับ callback กลับเข้าแอป ----
// เรียกครั้งเดียวตอนแอปเริ่มทำงาน (ดู App.jsx) คืนฟังก์ชันสำหรับถอด listener
export function ผูกตัวรับDeepLink(onผลลัพธ์) {
  if (!เป็นแอปมือถือ()) return function () {}

  const รอ = CapApp.addListener('appUrlOpen', async function ({ url }) {
    if (!url || !url.startsWith('com.jaengjorn.app://')) return

    try {
      // supabase-js v2 ใช้ PKCE เป็นค่าเริ่มต้น → callback จะมี ?code=...
      // แต่บางการตั้งค่ายังเป็น implicit flow ที่ส่ง token มาใน #fragment รองรับทั้งสองแบบ
      const u = new URL(url)
      const code = u.searchParams.get('code')
      const hashParams = new URLSearchParams((u.hash || '').replace(/^#/, ''))
      const ข้อผิดพลาด = u.searchParams.get('error_description') || u.searchParams.get('error')
        || hashParams.get('error_description') || hashParams.get('error')

      // ลิงก์รีเซ็ตรหัสผ่านใช้ scheme เดียวกับล็อกอิน แยกกันตรง type=recovery
      // (Supabase ใส่มาให้ทั้งใน query และ hash แล้วแต่ flow ที่ใช้)
      const เป็นลิงก์ตั้งรหัสใหม่ =
        u.searchParams.get('type') === 'recovery' || hashParams.get('type') === 'recovery'

      if (ข้อผิดพลาด) throw new Error(ข้อผิดพลาด)

      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (error) throw error
      } else {
        const access_token  = hashParams.get('access_token')
        const refresh_token = hashParams.get('refresh_token')
        if (!access_token || !refresh_token) throw new Error('ลิงก์ที่ส่งกลับมาไม่มีข้อมูลเข้าสู่ระบบ')
        const { error } = await supabase.auth.setSession({ access_token, refresh_token })
        if (error) throw error
      }

      // มาจากลิงก์ลืมรหัสผ่าน → พาไปหน้าตั้งรหัสใหม่ ไม่ใช่ปล่อยเข้าหน้าแรกเฉยๆ
      // (ตอนนี้มี session แล้ว ResetPasswordPage จึงทำงานได้ทันที)
      if (onผลลัพธ์) onผลลัพธ์(null, เป็นลิงก์ตั้งรหัสใหม่ ? '/reset-password' : null)
    } catch (err) {
      if (onผลลัพธ์) onผลลัพธ์(err)
    } finally {
      // ปิดแท็บเบราว์เซอร์ที่ค้างอยู่ข้างหน้าแอปเสมอ ไม่ว่าจะสำเร็จหรือไม่
      // ไม่งั้นผู้ใช้จะเห็นหน้าเบราว์เซอร์ค้างทับแอปทั้งที่ล็อกอินเสร็จแล้ว
      try { await Browser.close() } catch { /* บางเครื่องปิดเองไปแล้ว */ }
    }
  })

  return function ถอด() {
    // addListener คืน Promise ของ handle ใน Capacitor 6+ จึงต้อง then ก่อน remove
    Promise.resolve(รอ).then((h) => h?.remove?.())
  }
}
