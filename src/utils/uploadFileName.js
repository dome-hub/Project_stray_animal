// uploadFileName.js — ตั้งชื่อไฟล์รูปก่อนอัปโหลดเข้า Supabase Storage
//
// ทำไมต้องมี: เดิมทุกจุดเอาชื่อไฟล์เดิมของผู้ใช้ไปต่อท้าย key (เช่น `${Date.now()}_${file.name}`)
// แต่ Storage ปฏิเสธ key ที่มีอักษรนอก ASCII — ทดสอบแล้ว `ทดสอบ_รูปแมว.png` ได้ "Invalid key"
// รูปจากแกลเลอรีมือถือหลายรุ่นตั้งชื่อเป็นภาษาไทยได้ ผู้ใช้จึงอัปโหลดไม่ได้ (หน้าแจ้งสัตว์จรจะถามว่า
// "ส่งโดยไม่มีรูปไหม" ทำให้รายงานไปถึงเจ้าหน้าที่โดยไม่มีรูป)
// ทางแก้: ไม่ใช้ชื่อเดิมเลย ใช้ เวลา + ตัวสุ่ม + นามสกุลจากชนิดไฟล์จริง
//
// prefix ต้องเป็น ASCII เท่านั้น (เช่น 'lost_', 'animal_', 'avatars/<id>_')

const นามสกุลตามชนิดไฟล์ = {
  'image/jpeg': 'jpg',
  'image/png':  'png',
  'image/webp': 'webp',
}

function ตัวสุ่ม() {
  // randomUUID ใช้ได้เฉพาะบริบทที่ปลอดภัย (https / localhost) ซึ่งแอปอยู่ในนั้นเสมอ — มี fallback เผื่อไว้
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID().replace(/-/g, '').slice(0, 10)
  return Math.random().toString(36).slice(2, 12)
}

export function ชื่อไฟล์อัปโหลด(file, prefix = '') {
  // นามสกุลดูจากชนิดไฟล์ (ผ่านการตรวจใน fileValidation แล้ว) ไม่ดูจากชื่อ เพราะชื่ออาจไม่มีนามสกุล/เป็นภาษาไทย
  const นามสกุล = นามสกุลตามชนิดไฟล์[file?.type] || 'jpg'
  return `${prefix}${Date.now()}_${ตัวสุ่ม()}.${นามสกุล}`
}
