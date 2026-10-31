import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { อายุประกาศวัน, วันที่เหลือของประกาศ, ประกาศหมดอายุแล้ว } from './lostPetExpiry'

const วัน = 24 * 60 * 60 * 1000
const ตอนนี้ = new Date('2026-10-31T05:00:00Z')
const ย้อนหลัง = (มิลลิวินาที) => new Date(ตอนนี้.getTime() - มิลลิวินาที).toISOString()

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(ตอนนี้)
})
afterEach(() => { vi.useRealTimers() })

describe('อายุประกาศตามหาสัตว์เลี้ยง (30 วัน)', () => {
  it('อายุประกาศคือ 30 วัน', () => {
    expect(อายุประกาศวัน).toBe(30)
  })

  it('ประกาศที่เพิ่งลง ยังไม่หมดอายุ เหลือ 30 วัน', () => {
    const โพสต์ = { created_at: ตอนนี้.toISOString() }
    expect(ประกาศหมดอายุแล้ว(โพสต์)).toBe(false)
    expect(วันที่เหลือของประกาศ(โพสต์)).toBe(30)
  })

  it('ลงมา 29 วัน ยังไม่หมดอายุ เหลือ 1 วัน', () => {
    const โพสต์ = { created_at: ย้อนหลัง(29 * วัน) }
    expect(ประกาศหมดอายุแล้ว(โพสต์)).toBe(false)
    expect(วันที่เหลือของประกาศ(โพสต์)).toBe(1)
  })

  it('ลงมาครบ 30 วันพอดี หมดอายุ', () => {
    expect(ประกาศหมดอายุแล้ว({ created_at: ย้อนหลัง(30 * วัน) })).toBe(true)
  })

  it('เหลือไม่ถึงวันก็ยังนับเป็น 1 วัน (ปัดขึ้น) ยังไม่หมดอายุ', () => {
    const โพสต์ = { created_at: ย้อนหลัง(30 * วัน - 60 * 60 * 1000) }   // เหลือ 1 ชม.
    expect(วันที่เหลือของประกาศ(โพสต์)).toBe(1)
    expect(ประกาศหมดอายุแล้ว(โพสต์)).toBe(false)
  })

  it('ประกาศเก่าเกิน 30 วันแต่เจ้าของต่ออายุไว้ (renewed_at) นับจากวันต่ออายุ', () => {
    const โพสต์ = { created_at: ย้อนหลัง(90 * วัน), renewed_at: ย้อนหลัง(5 * วัน) }
    expect(ประกาศหมดอายุแล้ว(โพสต์)).toBe(false)
    expect(วันที่เหลือของประกาศ(โพสต์)).toBe(25)
  })

  it('ต่ออายุไว้แล้วแต่เกิน 30 วันจากวันต่ออายุ ก็หมดอายุอีก', () => {
    const โพสต์ = { created_at: ย้อนหลัง(90 * วัน), renewed_at: ย้อนหลัง(31 * วัน) }
    expect(ประกาศหมดอายุแล้ว(โพสต์)).toBe(true)
  })

  it('ยังไม่มีคอลัมน์ renewed_at (undefined/null) นับจาก created_at', () => {
    expect(ประกาศหมดอายุแล้ว({ created_at: ย้อนหลัง(40 * วัน), renewed_at: null })).toBe(true)
    expect(ประกาศหมดอายุแล้ว({ created_at: ย้อนหลัง(40 * วัน) })).toBe(true)
  })

  it('created_at ไม่มี timezone (UTC) อ่านถูก ไม่เพี้ยน 7 ชม.', () => {
    // 29 วัน 20 ชม. ที่แล้ว เมื่อนับเป็น UTC → เหลือไม่ถึง 1 วัน แต่ยังไม่หมดอายุ
    const naive = new Date(ตอนนี้.getTime() - (30 * วัน - 4 * 60 * 60 * 1000)).toISOString().replace('Z', '')
    expect(ประกาศหมดอายุแล้ว({ created_at: naive })).toBe(false)
  })

  it('อ่านวันที่ไม่ได้ ไม่ซ่อนประกาศทิ้ง (ปลอดภัยไว้ก่อน)', () => {
    expect(ประกาศหมดอายุแล้ว({ created_at: 'ไม่ใช่วันที่' })).toBe(false)
    expect(ประกาศหมดอายุแล้ว({})).toBe(false)
  })
})
