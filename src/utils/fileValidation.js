// fileValidation.js — ตรวจสอบไฟล์อัปโหลดแบบ Whitelist เท่านั้น
// ป้องกันการอัปโหลดไฟล์อันตราย (script, executable, ไฟล์ปลอมนามสกุล) เข้า Supabase Storage
// ตรวจ 3 ชั้น: นามสกุลไฟล์ → MIME type (จาก browser) → "magic bytes" (ลายเซ็นไฟล์จริงจากเนื้อไฟล์)
// ตั้งใจไม่รวม image/svg+xml ในรายการที่อนุญาต แม้จะเป็น "รูปภาพ" เพราะ SVG ฝัง <script> ได้ (stored XSS)
//
// หมายเหตุความปลอดภัย: การตรวจนี้ทำงานฝั่ง client เท่านั้น ช่วยกันผู้ใช้พลาด/กันการโจมตีเบื้องต้น
// แต่ผู้โจมตีที่ตั้งใจสามารถเรียก Supabase Storage API ตรงๆ ข้ามหน้าเว็บนี้ได้ (anon key เป็น public by design)
// การป้องกันที่แท้จริงต้องตั้งค่า allowed_mime_types + file_size_limit ที่ตัว Storage bucket ฝั่ง Supabase ด้วย

export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp']
const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10MB

function ตรวจนามสกุล(filename) {
  const ext = filename?.split('.').pop()?.toLowerCase()
  return !!ext && ALLOWED_IMAGE_EXTENSIONS.includes(ext)
}

// อ่าน byte แรกๆ ของไฟล์จริง เทียบกับลายเซ็นมาตรฐานของแต่ละชนิดไฟล์ — กันไฟล์ปลอมนามสกุล/ปลอม MIME
async function ตรวจลายเซ็นไฟล์(file) {
  const buf = new Uint8Array(await file.slice(0, 12).arrayBuffer())
  const ตรงกับ = (bytes) => bytes.every(function (b, i) { return buf[i] === b })

  if (ตรงกับ([0xFF, 0xD8, 0xFF])) return true // JPEG
  if (ตรงกับ([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])) return true // PNG
  // WEBP: 'RIFF' ที่ byte 0-3 แล้วตามด้วย 'WEBP' ที่ byte 8-11
  if (ตรงกับ([0x52, 0x49, 0x46, 0x46]) && buf[8] === 0x57 && buf[9] === 0x45 && buf[10] === 0x42 && buf[11] === 0x50) return true
  return false
}

// คืนค่า { ok: true } หรือ { ok: false, error: 'ข้อความสำหรับแสดงผู้ใช้' }
export async function ตรวจสอบไฟล์รูปภาพ(file) {
  if (!file) return { ok: false, error: 'ไม่พบไฟล์ที่เลือก' }
  if (file.size > MAX_IMAGE_BYTES) return { ok: false, error: 'ไฟล์ใหญ่เกินไป (สูงสุด 10MB)' }
  if (!ALLOWED_IMAGE_TYPES.includes(file.type)) return { ok: false, error: 'รองรับเฉพาะไฟล์รูปภาพ JPG, PNG หรือ WEBP เท่านั้น' }
  if (!ตรวจนามสกุล(file.name)) return { ok: false, error: 'นามสกุลไฟล์ไม่ถูกต้อง (รองรับเฉพาะ .jpg .jpeg .png .webp)' }
  const ลายเซ็นถูกต้อง = await ตรวจลายเซ็นไฟล์(file)
  if (!ลายเซ็นถูกต้อง) return { ok: false, error: 'ไฟล์นี้ไม่ใช่รูปภาพจริง หรือไฟล์เสียหาย' }
  return { ok: true }
}
