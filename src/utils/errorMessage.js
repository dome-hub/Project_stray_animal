// errorMessage.js — แปลง error จาก Supabase/PostgREST เป็นข้อความไทยที่ผู้ใช้อ่านรู้เรื่อง
//
// เดิมทุกหน้าเขียน alert('บันทึกไม่สำเร็จ: ' + error.message) ซึ่ง error.message
// คือสตริงอังกฤษจาก PostgREST มักมีชื่อ constraint หรือชื่อ RLS policy ปนมาด้วย
// เจ้าหน้าที่ อบต. อ่านไม่ออกและไม่มีทางรู้ว่าต้องทำอะไรต่อ
//
// สตริงดิบยังจำเป็นตอนดีบัก จึงไม่ทิ้ง — ส่งลง console.error ไว้ ไม่ใช่ขึ้นหน้าจอ

const แผนที่ข้อความ = [
  // เครือข่าย — เจอบ่อยสุดในการใช้งานภาคสนาม
  { ตรงกับ: /failed to fetch|networkerror|network request failed/i,
    ไทย: 'เชื่อมต่อระบบไม่ได้ ตรวจสอบสัญญาณอินเทอร์เน็ตแล้วลองใหม่' },
  { ตรงกับ: /timeout|timed out/i,
    ไทย: 'ระบบตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง' },

  // สิทธิ์ / RLS
  { ตรงกับ: /42501|permission denied|row-level security|violates row-level/i,
    ไทย: 'คุณไม่มีสิทธิ์ทำรายการนี้ หากคิดว่าผิดพลาดกรุณาติดต่อผู้ดูแลระบบ' },
  { ตรงกับ: /jwt|not authenticated|invalid api key/i,
    ไทย: 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่' },

  // ข้อมูลซ้ำ / ข้อจำกัดของตาราง
  { ตรงกับ: /23505|duplicate key|already exists/i,
    ไทย: 'ข้อมูลนี้มีอยู่ในระบบแล้ว' },
  { ตรงกับ: /23503|foreign key/i,
    ไทย: 'ลบหรือแก้ไขไม่ได้ เพราะมีข้อมูลอื่นเชื่อมโยงอยู่' },
  { ตรงกับ: /23502|null value in column/i,
    ไทย: 'กรอกข้อมูลไม่ครบ กรุณาตรวจสอบช่องที่จำเป็น' },

  // บัญชีผู้ใช้
  { ตรงกับ: /invalid login credentials|invalid_credentials/i,
    ไทย: 'อีเมลหรือรหัสผ่านไม่ถูกต้อง' },
  { ตรงกับ: /email not confirmed/i,
    ไทย: 'กรุณายืนยันอีเมลก่อนเข้าสู่ระบบ — ตรวจสอบกล่องจดหมายของคุณ' },
  { ตรงกับ: /already registered|user already/i,
    ไทย: 'อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ' },
  { ตรงกับ: /rate limit|too many requests|429/i,
    ไทย: 'ทำรายการถี่เกินไป กรุณารอสักครู่แล้วลองใหม่' },

  // ไฟล์ / Storage
  { ตรงกับ: /payload too large|exceeded the maximum|413/i,
    ไทย: 'ไฟล์ใหญ่เกินกำหนด กรุณาเลือกรูปที่เล็กลง' },
  { ตรงกับ: /mime type|invalid file type/i,
    ไทย: 'ชนิดไฟล์ไม่รองรับ กรุณาใช้รูปแบบ JPG, PNG หรือ WEBP' },
]

// บริบท = สิ่งที่ผู้ใช้กำลังทำ เช่น 'บันทึกข้อมูล' → ใช้เป็นข้อความตั้งต้นเมื่อจับ error ไม่ตรงกฎไหนเลย
export function ข้อความError(err, บริบท = 'ทำรายการ') {
  const ดิบ = typeof err === 'string' ? err : (err?.message || err?.error_description || '')
  if (ดิบ) console.error(`[${บริบท}]`, ดิบ, err?.code ? `(code ${err.code})` : '')

  const พบ = แผนที่ข้อความ.find((m) => m.ตรงกับ.test(ดิบ))
  if (พบ) return พบ.ไทย

  return `${บริบท}ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง`
}
