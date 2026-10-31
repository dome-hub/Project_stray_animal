// @vitest-environment jsdom
// Integration test: หน้าแรก — เมนูตาม role, ตัวเลขกระดิ่งแจ้งเตือน, แบนเนอร์สัตว์หายด่วน (อายุประกาศ), ออกจากระบบ
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import Home from './Home'
import { db, รีเซ็ตฐานข้อมูลปลอม, วันที่ผ่านมา } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const ประกาศหาย = (id, ส่วนที่ต่าง) => ({
  id, owner_id: 'u-someone', pet_name: `น้อง${id}`, species: 'สุนัข', breed: 'บีเกิล',
  lost_location: 'หน้าตลาด', lost_date: '2026-10-01', photo_url: null, reward_amount: null,
  status: 'กำลังตามหา', created_at: วันที่ผ่านมา(1), ...ส่วนที่ต่าง,
})

function เปิดหน้า(role = 'user', onLogout = vi.fn()) {
  render(
    <MemoryRouter initialEntries={['/home']}>
      <Routes>
        <Route path="/home" element={<Home user={{ id: 'u-test', role, name: 'ทดสอบ' }} onLogout={onLogout} />} />
        <Route path="/lost-found" element={<div>หน้าสัตว์เลี้ยงหาย</div>} />
        <Route path="/report" element={<div>หน้าแจ้งสัตว์จร</div>} />
        <Route path="/notifications" element={<div>หน้าแจ้งเตือน</div>} />
        <Route path="/profile" element={<div>หน้าโปรไฟล์</div>} />
      </Routes>
    </MemoryRouter>,
  )
  return { onLogout }
}

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: { users: [{ id: 'u-test', avatar_url: null }], notifications: [], reports: [], lost_pets: [] },
  })
})

describe('เมนูตาม role', () => {
  it('ผู้ใช้ทั่วไป: เมนูครบ และใช้ชื่อ "สัตว์เลี้ยงหาย" (ไม่ใช้ "พลัดหลง" ซ้ำกับประเภทรายงาน)', async () => {
    เปิดหน้า('user')
    for (const ชื่อ of ['แจ้งสัตว์จร', 'ค้นหาสัตว์เลี้ยง', 'ติดตามรายงาน', 'สัตว์เลี้ยงหาย', 'ติดต่อหน่วยงาน']) {
      expect(await screen.findByRole('heading', { name: ชื่อ })).toBeInTheDocument()
    }
    expect(screen.queryByText(/พลัดหลง/)).not.toBeInTheDocument()
  })

  it('เจ้าหน้าที่เห็นเมนูทำงานของเจ้าหน้าที่ ไม่เห็นเมนูของผู้ใช้ทั่วไป', async () => {
    เปิดหน้า('volunteer')
    expect(await screen.findByRole('heading', { name: 'รายการแจ้งสัตว์จร' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'จัดการข้อมูลสัตว์' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'แจ้งสัตว์จร' })).not.toBeInTheDocument()
  })

  it('แอดมินเห็นเมนูจัดการระบบ', async () => {
    เปิดหน้า('admin')
    expect(await screen.findByRole('heading', { name: 'จัดการผู้ใช้งาน' })).toBeInTheDocument()
  })

  it('กดเมนู "สัตว์เลี้ยงหาย" ไปหน้า /lost-found', async () => {
    เปิดหน้า('user')
    await userEvent.click(await screen.findByRole('heading', { name: 'สัตว์เลี้ยงหาย' }))
    expect(await screen.findByText('หน้าสัตว์เลี้ยงหาย')).toBeInTheDocument()
  })

  it('กดการ์ดหลัก (แจ้งสัตว์จร) ไปหน้าแจ้ง', async () => {
    เปิดหน้า('user')
    await userEvent.click(await screen.findByRole('heading', { name: 'แจ้งสัตว์จร' }))
    expect(await screen.findByText('หน้าแจ้งสัตว์จร')).toBeInTheDocument()
  })
})

describe('ตัวเลขบนกระดิ่งแจ้งเตือน', () => {
  it('ผู้ใช้ทั่วไป: นับเฉพาะแจ้งเตือนของตัวเองที่ยังไม่อ่าน', async () => {
    db.tables.notifications = [
      { id: 1, user_id: 'u-test', is_read: false }, { id: 2, user_id: 'u-test', is_read: false },
      { id: 3, user_id: 'u-test', is_read: true },  { id: 4, user_id: 'u-other', is_read: false },
    ]
    เปิดหน้า('user')
    const กระดิ่ง = await screen.findByRole('button', { name: 'การแจ้งเตือน' })
    expect(await within(กระดิ่ง).findByText('2')).toBeInTheDocument()
  })

  it('เกิน 9 รายการแสดงเป็น 9+', async () => {
    db.tables.notifications = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, user_id: 'u-test', is_read: false }))
    เปิดหน้า('user')
    expect(await within(await screen.findByRole('button', { name: 'การแจ้งเตือน' })).findByText('9+')).toBeInTheDocument()
  })

  it('ไม่มีแจ้งเตือนที่ยังไม่อ่าน ไม่แสดงตัวเลข', async () => {
    เปิดหน้า('user')
    const กระดิ่ง = await screen.findByRole('button', { name: 'การแจ้งเตือน' })
    expect(กระดิ่ง.textContent).toBe('')
  })

  it('เจ้าหน้าที่: นับเคส "รอดำเนินการ" ที่ยังไม่ถูกอ่าน', async () => {
    db.tables.reports = [
      { id: 1, status: 'รอดำเนินการ' }, { id: 2, status: 'รอดำเนินการ' }, { id: 3, status: 'รับเรื่องแล้ว' },
    ]
    เปิดหน้า('volunteer')
    expect(await within(await screen.findByRole('button', { name: 'การแจ้งเตือน' })).findByText('2')).toBeInTheDocument()
  })

  it('กดกระดิ่งไปหน้าแจ้งเตือน', async () => {
    เปิดหน้า('user')
    await userEvent.click(await screen.findByRole('button', { name: 'การแจ้งเตือน' }))
    expect(await screen.findByText('หน้าแจ้งเตือน')).toBeInTheDocument()
  })
})

describe('แบนเนอร์ประกาศสัตว์หายด่วน — ซ่อนประกาศที่หมดอายุ (30 วัน)', () => {
  it('แสดงเฉพาะประกาศที่ยังไม่หมดอายุ และกำลังตามหาอยู่', async () => {
    db.tables.lost_pets = [
      ประกาศหาย(1),
      ประกาศหาย(2, { created_at: วันที่ผ่านมา(60) }),                              // หมดอายุ
      ประกาศหาย(3, { status: 'เจอแล้ว' }),                                          // ปิดแล้ว
      ประกาศหาย(4, { created_at: วันที่ผ่านมา(90), renewed_at: วันที่ผ่านมา(1) }),  // ต่ออายุแล้ว
    ]
    เปิดหน้า('user')
    expect(await screen.findByText('ประกาศสัตว์หายใกล้คุณ')).toBeInTheDocument()
    expect(screen.getByText('น้อง1')).toBeInTheDocument()
    expect(screen.getByText('น้อง4')).toBeInTheDocument()
    expect(screen.queryByText('น้อง2')).not.toBeInTheDocument()
    expect(screen.queryByText('น้อง3')).not.toBeInTheDocument()
  })

  it('ถ้าทุกประกาศหมดอายุหมด ซ่อนแบนเนอร์ทั้งแถบ', async () => {
    db.tables.lost_pets = [ประกาศหาย(1, { created_at: วันที่ผ่านมา(45) })]
    เปิดหน้า('user')
    await screen.findByRole('heading', { name: 'แจ้งสัตว์จร' })
    expect(screen.queryByText('ประกาศสัตว์หายใกล้คุณ')).not.toBeInTheDocument()
  })
})

describe('ออกจากระบบ', () => {
  it('ต้องยืนยันก่อน: กด "ออก" ขึ้นหน้าต่างยืนยัน ยังไม่ออกจนกว่าจะกดยืนยัน', async () => {
    const { onLogout } = เปิดหน้า('user')
    await userEvent.click(await screen.findByRole('button', { name: 'ออก' }))
    const หน้าต่าง = await screen.findByRole('dialog')
    expect(within(หน้าต่าง).getByText('คุณต้องการออกจากระบบใช่หรือไม่?')).toBeInTheDocument()
    expect(onLogout).not.toHaveBeenCalled()

    await userEvent.click(within(หน้าต่าง).getByRole('button', { name: 'ออกจากระบบ' }))
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('กดยกเลิกในหน้าต่างยืนยัน ไม่ออกจากระบบ', async () => {
    const { onLogout } = เปิดหน้า('user')
    await userEvent.click(await screen.findByRole('button', { name: 'ออก' }))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: 'ยกเลิก' }))
    expect(onLogout).not.toHaveBeenCalled()
  })
})
