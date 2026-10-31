import { describe, it, expect } from 'vitest'
import { ชื่อประเภทการแจ้ง } from './reportTypes'

describe('ชื่อประเภทการแจ้งสัตว์จร', () => {
  it('มีครบ 3 ระดับตามค่า urgency ในตาราง reports', () => {
    expect(Object.keys(ชื่อประเภทการแจ้ง).sort()).toEqual(['ด่วน', 'ด่วนมาก', 'ปานกลาง'].sort())
  })

  it('ชื่อสั้น (หน้าติดตาม) ต้องเรียกประเภทเดียวกับชื่อเต็ม (ตอนแจ้ง) — เป็นข้อความส่วนหนึ่งของชื่อเต็ม', () => {
    for (const { เต็ม, สั้น } of Object.values(ชื่อประเภทการแจ้ง)) {
      expect(เต็ม).toContain(สั้น)
    }
  })

  it('แต่ละประเภทชื่อไม่ซ้ำกัน', () => {
    const เต็ม = Object.values(ชื่อประเภทการแจ้ง).map((x) => x.เต็ม)
    const สั้น = Object.values(ชื่อประเภทการแจ้ง).map((x) => x.สั้น)
    expect(new Set(เต็ม).size).toBe(3)
    expect(new Set(สั้น).size).toBe(3)
  })

  it('คำว่า พลัดหลง อยู่ในประเภทเดียวคือ พบสัตว์พลัดหลง / จรจัด', () => {
    const ที่มีคำว่าพลัดหลง = Object.values(ชื่อประเภทการแจ้ง).filter((x) => x.เต็ม.includes('พลัดหลง'))
    expect(ที่มีคำว่าพลัดหลง).toHaveLength(1)
    expect(ที่มีคำว่าพลัดหลง[0].เต็ม).toBe('พบสัตว์พลัดหลง / จรจัด')
  })
})
