// cameraZoom.js — ตัวช่วยคำนวณการซูมกล้องของหน้าแจ้งสัตว์จร
//
// ซูมมี 2 แบบ เลือกอัตโนมัติ:
//   1) ซูมจริงของกล้อง (track.applyConstraints({ advanced: [{ zoom }] })) — มือถือ Android ส่วนใหญ่ใช้ได้
//      ภาพที่ถ่ายได้ซูมมาจากเซนเซอร์เลย ความละเอียดไม่ตก
//   2) ซูมดิจิทัล (ขยายภาพวิดีโอด้วย CSS แล้วครอปตรงกลางตอนถ่าย) — ใช้เมื่อเครื่องไม่รองรับแบบแรก
//      เช่น iPhone/Safari และกล้องเว็บแคมบนคอม

export const ช่วงซูมดิจิทัล = { min: 1, max: 4, step: 0.1 }

export function จำกัดซูม(ค่า, min, max) {
  return Math.min(max, Math.max(min, ค่า))
}

// หยิก 2 นิ้ว: ระยะนิ้วห่างกันขึ้นกี่เท่า ซูมก็ขึ้นเท่านั้น (เทียบจากตอนเริ่มหยิก)
export function ซูมจากการหยิก(ซูมตอนเริ่ม, ระยะตอนเริ่ม, ระยะตอนนี้, min, max) {
  if (!ระยะตอนเริ่ม || ระยะตอนเริ่ม <= 0) return จำกัดซูม(ซูมตอนเริ่ม, min, max)
  return จำกัดซูม(ซูมตอนเริ่ม * (ระยะตอนนี้ / ระยะตอนเริ่ม), min, max)
}

// ระยะระหว่างจุดสัมผัส 2 จุด
export function ระยะห่าง(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

// พื้นที่ที่ต้องตัดจากเฟรมวิดีโอเต็ม เมื่อซูมดิจิทัล `ซูม` เท่า (ตัดตรงกลางภาพ)
export function พื้นที่ครอปซูม(กว้าง, สูง, ซูม) {
  const z = Math.max(1, ซูม)
  const sw = กว้าง / z
  const sh = สูง / z
  return { sx: (กว้าง - sw) / 2, sy: (สูง - sh) / 2, sw, sh }
}

// อ่านช่วงซูมจริงของกล้อง คืน null ถ้าเครื่อง/เบราว์เซอร์ไม่รองรับ
export function อ่านช่วงซูมฮาร์ดแวร์(track) {
  try {
    const caps = track && track.getCapabilities ? track.getCapabilities() : null
    const z = caps && caps.zoom
    if (z && typeof z.min === 'number' && typeof z.max === 'number' && z.max > z.min) {
      return { min: z.min, max: z.max, step: 0.1 }
    }
  } catch {
    // บางเบราว์เซอร์โยน error ตอนอ่าน capabilities → ถือว่าไม่รองรับ แล้วใช้ซูมดิจิทัลแทน
  }
  return null
}
