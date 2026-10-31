import { describe, it, expect } from 'vitest'
import { ชื่อไฟล์อัปโหลด } from './uploadFileName'

const ไฟล์ = (ชื่อ, ชนิด) => new File([new Uint8Array([1, 2, 3])], ชื่อ, { type: ชนิด })
// Supabase Storage รับ key เฉพาะอักษร ASCII ที่พิมพ์ได้ (ทดสอบจริงแล้วว่าชื่อไทยได้ "Invalid key")
const เป็นASCII = (s) => /^[\x21-\x7E]+$/.test(s)

describe('ชื่อไฟล์อัปโหลด', () => {
  it('ชื่อไฟล์ภาษาไทยไม่หลุดเข้า key (บั๊ก Invalid key เดิม)', () => {
    const key = ชื่อไฟล์อัปโหลด(ไฟล์('ทดสอบ_รูปแมว.png', 'image/png'))
    expect(เป็นASCII(key)).toBe(true)
    expect(key).not.toContain('ทดสอบ')
  })

  it('ชื่อที่มีเว้นวรรค วงเล็บ ภาษาไทย ก็ได้ key ASCII', () => {
    const key = ชื่อไฟล์อัปโหลด(ไฟล์('รูป สัตว์ จร (1).jpg', 'image/jpeg'))
    expect(เป็นASCII(key)).toBe(true)
  })

  it('ชื่อไม่มีนามสกุลก็ได้ key ที่ถูกต้อง', () => {
    const key = ชื่อไฟล์อัปโหลด(ไฟล์('รูปแมว', 'image/webp'))
    expect(key).toMatch(/\.webp$/)
  })

  it('นามสกุลมาจากชนิดไฟล์จริง ไม่ใช่จากชื่อ', () => {
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a.png', 'image/jpeg'))).toMatch(/\.jpg$/)
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a', 'image/png'))).toMatch(/\.png$/)
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a', 'image/webp'))).toMatch(/\.webp$/)
  })

  it('ชนิดไฟล์แปลกใช้ jpg เป็นค่าตั้งต้น', () => {
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a', ''))).toMatch(/\.jpg$/)
  })

  it('ใส่ prefix นำหน้าได้ (lost_, animal_, avatars/id_)', () => {
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a.png', 'image/png'), 'lost_')).toMatch(/^lost_\d+_[a-z0-9]+\.png$/)
    expect(ชื่อไฟล์อัปโหลด(ไฟล์('a.png', 'image/png'), 'avatars/abc_')).toMatch(/^avatars\/abc_/)
  })

  it('อัปโหลดชื่อไฟล์เดียวกันหลายครั้งได้ key ไม่ซ้ำกัน', () => {
    const f = ไฟล์('รูปแมว.png', 'image/png')
    const คีย์ = new Set(Array.from({ length: 200 }, () => ชื่อไฟล์อัปโหลด(f)))
    expect(คีย์.size).toBe(200)
  })

  it('ไม่ throw เมื่อไม่มีไฟล์', () => {
    expect(() => ชื่อไฟล์อัปโหลด(undefined)).not.toThrow()
    expect(เป็นASCII(ชื่อไฟล์อัปโหลด(undefined))).toBe(true)
  })
})
