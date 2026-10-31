import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ข้อความError } from './errorMessage'

// ข้อความดิบถูกส่งลง console.error ไว้ดีบัก — ปิดไว้ไม่ให้รกผลทดสอบ และใช้ยืนยันว่ามีการ log จริง
let เสียงError
beforeEach(() => { เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {}) })
afterEach(() => { เสียงError.mockRestore() })

describe('ข้อความError — แปลง error จาก Supabase เป็นภาษาไทย', () => {
  it('เครือข่ายหลุด', () => {
    expect(ข้อความError(new Error('Failed to fetch'))).toContain('เชื่อมต่อระบบไม่ได้')
  })

  it('RLS / ไม่มีสิทธิ์ (รหัส 42501 หรือข้อความ row-level security)', () => {
    expect(ข้อความError({ message: 'new row violates row-level security policy', code: '42501' }))
      .toContain('ไม่มีสิทธิ์')
  })

  it('ข้อมูลซ้ำ / foreign key / ไม่กรอกช่องจำเป็น', () => {
    expect(ข้อความError({ message: 'duplicate key value violates unique constraint' })).toContain('มีอยู่ในระบบแล้ว')
    expect(ข้อความError({ message: 'violates foreign key constraint' })).toContain('เชื่อมโยง')
    expect(ข้อความError({ message: 'null value in column "name"' })).toContain('กรอกข้อมูลไม่ครบ')
  })

  it('เข้าสู่ระบบผิด / ยังไม่ยืนยันอีเมล', () => {
    expect(ข้อความError({ message: 'Invalid login credentials' })).toBe('อีเมลหรือรหัสผ่านไม่ถูกต้อง')
    expect(ข้อความError({ message: 'Email not confirmed' })).toContain('ยืนยันอีเมล')
  })

  it('ไฟล์ใหญ่เกิน / ชนิดไฟล์ไม่รองรับ', () => {
    expect(ข้อความError({ message: 'The object exceeded the maximum allowed size' })).toContain('ไฟล์ใหญ่เกิน')
    expect(ข้อความError({ message: 'mime type image/gif is not supported' })).toContain('ชนิดไฟล์ไม่รองรับ')
  })

  it('error ที่ไม่ตรงกฎไหนเลย ใช้ข้อความตั้งต้นพร้อมบริบทว่ากำลังทำอะไร', () => {
    expect(ข้อความError(new Error('something weird'), 'บันทึกข้อมูลสัตว์')).toBe('บันทึกข้อมูลสัตว์ไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  })

  it('ไม่ใส่บริบทใช้คำว่า ทำรายการ', () => {
    expect(ข้อความError(new Error('x'))).toBe('ทำรายการไม่สำเร็จ กรุณาลองใหม่อีกครั้ง')
  })

  it('รับ error เป็นสตริง หรือ undefined ได้ไม่ throw', () => {
    expect(ข้อความError('Failed to fetch')).toContain('เชื่อมต่อระบบไม่ได้')
    expect(() => ข้อความError(undefined)).not.toThrow()
  })

  it('ข้อความดิบภาษาอังกฤษไม่หลุดขึ้นหน้าจอ แต่ถูก log ไว้ดีบัก', () => {
    const ผล = ข้อความError({ message: 'secret_policy_name_xyz failed' }, 'บันทึก')
    expect(ผล).not.toContain('secret_policy_name_xyz')
    expect(เสียงError).toHaveBeenCalled()
  })
})
