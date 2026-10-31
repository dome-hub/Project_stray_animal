import { describe, it, expect } from 'vitest'
import { แสดงแถบนำทาง, ความสูงแถบนำทาง } from './navVisibility'

describe('แสดงแถบนำทางล่าง', () => {
  const ผู้ใช้ = { role: 'user' }
  const เจ้าหน้าที่ = { role: 'volunteer' }
  const แอดมิน = { role: 'admin' }

  it('ยังไม่ล็อกอิน ไม่แสดง', () => {
    expect(แสดงแถบนำทาง(null, '/home')).toBe(false)
  })

  it('ผู้ใช้ทั่วไปและเจ้าหน้าที่ เห็นแถบในหน้าใช้งาน', () => {
    expect(แสดงแถบนำทาง(ผู้ใช้, '/home')).toBe(true)
    expect(แสดงแถบนำทาง(ผู้ใช้, '/track')).toBe(true)
    expect(แสดงแถบนำทาง(เจ้าหน้าที่, '/volunteer/reports')).toBe(true)
  })

  it('แอดมินไม่เห็นแถบ ไม่ว่าอยู่หน้าไหน', () => {
    expect(แสดงแถบนำทาง(แอดมิน, '/home')).toBe(false)
    expect(แสดงแถบนำทาง(แอดมิน, '/admin/dashboard')).toBe(false)
  })

  it('หน้าแรก (landing) และหน้า login ไม่แสดงแม้ล็อกอินอยู่', () => {
    expect(แสดงแถบนำทาง(ผู้ใช้, '/')).toBe(false)
    expect(แสดงแถบนำทาง(ผู้ใช้, '/login')).toBe(false)
  })

  it('เส้นทางที่ขึ้นต้นด้วย /admin ไม่แสดง', () => {
    expect(แสดงแถบนำทาง(เจ้าหน้าที่, '/admin/users')).toBe(false)
  })

  it('ความสูงแถบเป็นค่าบวก (ใช้เว้น padding ล่างไม่ให้เนื้อหาโดนทับ)', () => {
    expect(ความสูงแถบนำทาง).toBeGreaterThan(0)
  })
})
