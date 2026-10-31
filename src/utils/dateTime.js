// dateTime.js — อ่านและแสดงเวลาเป็นเวลาไทย (Asia/Bangkok, +7) ไม่ว่าเครื่องผู้ใช้จะตั้ง timezone ไว้เป็นอะไร
//
// ทำไมต้องมี: created_at ของ reports / animals / notifications ถูกส่งกลับมา "ไม่มี timezone ต่อท้าย"
// เช่น "2026-10-31T07:30:44.29037" ซึ่งเป็นเวลา UTC ถ้าส่งเข้า new Date() ตรงๆ เบราว์เซอร์จะอ่านเป็น
// เวลาท้องถิ่นของเครื่อง ได้ 07:30 แทนที่จะเป็น 14:30 (ช้าไป 7 ชม.) และตัวคำนวณ "ค้างมากี่ชั่วโมง"
// ก็เพี้ยนตามไปด้วย ส่วน updated_at ที่แอปเขียนเองมี "+00:00" ต่อท้ายอยู่แล้วจึงไม่เพี้ยน
// ไฟล์นี้รองรับทั้งสองแบบ และกำหนด timeZone ตอนแสดงผลเสมอ

const เขตเวลา = 'Asia/Bangkok'

// แปลงข้อความเวลาจากฐานข้อมูลเป็น Date ที่ตรงกับช่วงเวลาจริง
export function แปลงเป็นDate(str) {
  if (!str) return new Date(NaN)
  // วันที่ล้วน (เช่น lost_date) → เที่ยงคืน UTC = 07:00 เวลาไทย ยังเป็นวันเดิมเสมอ
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return new Date(str)
  // มี timezone กำกับอยู่แล้ว → ใช้ตามนั้น
  if (/[Zz]$/.test(str) || /[+-]\d{2}:\d{2}$/.test(str)) return new Date(str)
  // ไม่มี timezone = เวลา UTC จากฐานข้อมูล
  return new Date(str + 'Z')
}

// "31 ต.ค. 2569"
export function วันที่สั้นไทย(str) {
  if (!str) return ''
  return แปลงเป็นDate(str).toLocaleDateString('th-TH', {
    timeZone: เขตเวลา, day: 'numeric', month: 'short', year: 'numeric',
  })
}

// "31 ต.ค. 14:30 น."
export function วันเวลาสั้นไทย(str) {
  if (!str) return ''
  const d = แปลงเป็นDate(str)
  return (
    d.toLocaleDateString('th-TH', { timeZone: เขตเวลา, day: 'numeric', month: 'short' }) +
    ' ' +
    d.toLocaleTimeString('th-TH', { timeZone: เขตเวลา, hour: '2-digit', minute: '2-digit' }) +
    ' น.'
  )
}

// "31 ต.ค. 2569 เวลา 14:30 น."
export function วันเวลาเต็มไทย(str) {
  if (!str) return null
  const d = แปลงเป็นDate(str)
  const วัน  = d.toLocaleDateString('th-TH', { timeZone: เขตเวลา, day: 'numeric', month: 'short', year: 'numeric' })
  const เวลา = d.toLocaleTimeString('th-TH', { timeZone: เขตเวลา, hour: '2-digit', minute: '2-digit' })
  return `${วัน} เวลา ${เวลา} น.`
}

// ผ่านมากี่ชั่วโมงแล้ว (นับจากเวลาจริง)
export function ชั่วโมงที่ผ่านมา(str) {
  if (!str) return 0
  return Math.floor((Date.now() - แปลงเป็นDate(str).getTime()) / 3600000)
}

// ป้ายหัวกลุ่มวันที่ — "วันนี้ (31 ต.ค.)" / "เมื่อวาน (30 ต.ค.)" / "29 ต.ค." ตามปฏิทินวันของไทย
export function ป้ายวันที่กลุ่มไทย(str) {
  const d = แปลงเป็นDate(str)
  const วันของไทย = (x) => x.toLocaleDateString('en-CA', { timeZone: เขตเวลา })   // YYYY-MM-DD
  const ตัวเลข = d.toLocaleDateString('th-TH', { timeZone: เขตเวลา, day: 'numeric', month: 'short' })
  if (วันของไทย(d) === วันของไทย(new Date()))                        return `วันนี้ (${ตัวเลข})`
  if (วันของไทย(d) === วันของไทย(new Date(Date.now() - 86400000)))  return `เมื่อวาน (${ตัวเลข})`
  return ตัวเลข
}
