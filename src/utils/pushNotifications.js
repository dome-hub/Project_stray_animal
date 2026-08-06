// pushNotifications.js — ลงทะเบียนรับแจ้งเตือนเด้งบนมือถือ (Android/FCM)
//
// ต่างจากตาราง notifications ที่มีอยู่เดิม: อันนั้นคือแจ้งเตือน "ในแอป"
// ผู้ใช้ต้องเปิดแอปแล้วเข้าหน้าแจ้งเตือนเองจึงจะเห็น
// ไฟล์นี้ทำให้ข้อความเด้งขึ้นหน้าจอมือถือแม้ปิดแอปอยู่
//
// ทำงานเฉพาะในแอปที่ build เป็น APK — บนเว็บจะข้ามทั้งหมด (ไม่ error)
//
// ต้องมีของนอกโค้ดครบก่อนถึงจะใช้ได้จริง:
//   1. โปรเจกต์ Firebase + ไฟล์ google-services.json วางที่ android/app/
//   2. รัน supabase/push_notifications.sql เพื่อสร้างตาราง device_tokens
//   3. Edge Function ที่ส่ง FCM (supabase/functions/send-push)

import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { supabase } from '../supabase'

// ---- สวิตช์เปิด/ปิดทั้งฟีเจอร์ ปิดไว้เป็นค่าเริ่มต้น ----
//
// ทำไมต้องมี: ตัว plugin ของ Capacitor เรียก FirebaseMessaging.getInstance() ตรงๆ
// โดยไม่มี try/catch (ดู PushNotificationsPlugin.java บรรทัด 103)
// ถ้าไม่มีไฟล์ android/app/google-services.json → ไม่มี FirebaseApp
// → โยน IllegalStateException ในฝั่ง Java ซึ่ง try/catch ฝั่ง JavaScript ดักไม่ได้
// → แอปดับทันทีที่ผู้ใช้กด "อนุญาต" การแจ้งเตือน แล้วดับซ้ำทุกครั้งที่เปิดใหม่
//   เพราะ session ยังอยู่ โค้ดจึงวิ่งมาถึงจุดเดิมตลอด = เข้าแอปไม่ได้อีกเลย
//
// อันตรายเป็นพิเศษเพราะ android/ ในรีโปยังไม่มี plugin นี้ แต่ package.json มี
// ใครก็ตามที่รัน `npx cap sync` (ซึ่งเป็นขั้นตอนปกติในคู่มือทุกเจ้า) จะได้แอปที่ดับทันที
// สวิตช์นี้จึงกันไว้ที่ชั้น JavaScript ให้ปลอดภัยไม่ว่า native จะมี plugin หรือไม่
//
// เปิดใช้เมื่อตั้ง Firebase ครบแล้วเท่านั้น: ใส่ VITE_ENABLE_PUSH=true ใน .env
// (ต้องมี google-services.json วางที่ android/app/ ก่อน แล้ว build ใหม่)
const เปิดใช้Push = import.meta.env.VITE_ENABLE_PUSH === 'true'

function ใช้ได้ไหม() {
  if (!เปิดใช้Push) return false
  return Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('PushNotifications')
}

// เก็บ token ลง DB — upsert เพราะ token เดิมอาจถูกส่งซ้ำทุกครั้งที่เปิดแอป
// และเครื่องเดิมอาจเปลี่ยนมือผู้ใช้ (ล็อกเอาต์แล้วคนอื่นล็อกอิน) จึงต้องอัปเดต user_id ตาม
async function บันทึกToken(token) {
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return   // ยังไม่ล็อกอิน — จะลงทะเบียนใหม่ตอนล็อกอินสำเร็จ

  const { error } = await supabase
    .from('device_tokens')
    .upsert(
      { token, user_id: user.id, platform: Capacitor.getPlatform(), updated_at: new Date().toISOString() },
      { onConflict: 'token' }
    )
  if (error) console.error('บันทึก device token ไม่สำเร็จ:', error.message)
}

// เรียกหลังผู้ใช้ล็อกอินสำเร็จ — ต้องมี session ก่อนถึงจะผูก token กับคนได้
// คืนฟังก์ชันสำหรับถอด listener
export async function ลงทะเบียนPush(onเปิดจากแจ้งเตือน) {
  if (!ใช้ได้ไหม()) return function () {}

  try {
    // Android 13+ ต้องขอสิทธิ์ POST_NOTIFICATIONS จากผู้ใช้ก่อน
    // รุ่นเก่ากว่านั้น checkPermissions จะคืน granted มาเลยโดยไม่ขึ้นป๊อปอัป
    let สิทธิ์ = await PushNotifications.checkPermissions()
    if (สิทธิ์.receive === 'prompt' || สิทธิ์.receive === 'prompt-with-rationale') {
      สิทธิ์ = await PushNotifications.requestPermissions()
    }
    if (สิทธิ์.receive !== 'granted') {
      // ผู้ใช้ปฏิเสธ — ไม่ใช่ error แอปยังใช้ได้ปกติ แค่ไม่มีข้อความเด้ง
      console.log('ผู้ใช้ไม่อนุญาตการแจ้งเตือน')
      return function () {}
    }

    const ตัวฟัง = []

    // ได้ token จาก FCM แล้ว — เกิดขึ้นหลัง register() สำเร็จ
    ตัวฟัง.push(await PushNotifications.addListener('registration', function (t) {
      บันทึกToken(t.value)
    }))

    ตัวฟัง.push(await PushNotifications.addListener('registrationError', function (err) {
      // เจอบ่อยสุดคือลืมใส่ google-services.json หรือใส่ผิดโปรเจกต์
      console.error('ลงทะเบียนรับแจ้งเตือนไม่สำเร็จ:', JSON.stringify(err))
    }))

    // ผู้ใช้แตะที่แจ้งเตือน — พาไปหน้าที่เกี่ยวข้อง
    ตัวฟัง.push(await PushNotifications.addListener('pushNotificationActionPerformed', function (action) {
      const path = action?.notification?.data?.path
      if (path && onเปิดจากแจ้งเตือน) onเปิดจากแจ้งเตือน(path)
    }))

    await PushNotifications.register()

    return function ถอด() {
      ตัวฟัง.forEach((h) => h?.remove?.())
    }
  } catch (err) {
    console.error('ตั้งค่าการแจ้งเตือนไม่สำเร็จ:', err?.message || err)
    return function () {}
  }
}

// เรียกตอนออกจากระบบ — ไม่งั้นเครื่องนี้จะยังได้แจ้งเตือนของคนเดิมหลังคนใหม่ล็อกอิน
export async function ยกเลิกPush() {
  if (!ใช้ได้ไหม()) return
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (user) await supabase.from('device_tokens').delete().eq('user_id', user.id)
    await PushNotifications.removeAllListeners()
  } catch (err) {
    console.error('ยกเลิกการแจ้งเตือนไม่สำเร็จ:', err?.message || err)
  }
}
