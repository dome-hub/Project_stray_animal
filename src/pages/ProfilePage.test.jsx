// @vitest-environment jsdom
// Integration test: หน้าโปรไฟล์ — แท็บตาม role, แก้เบอร์โทร (10 หลัก), ธีมสีตาม role
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ProfilePage from './ProfilePage'
import { db, รีเซ็ตฐานข้อมูลปลอม } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const แถวผู้ใช้ = (role) => ({
  id: 'u-test', name: 'ผู้ใช้ทดสอบ', role, avatar_url: null, phone: '0812345678',
  shelter_name: null, shelter_location: null, service_area: null,
})

function เปิดหน้า(role = 'user') {
  return render(
    <MemoryRouter initialEntries={['/profile']}>
      <ProfilePage user={{ id: 'u-test', email: 'test@test.com', role, name: 'ผู้ใช้ทดสอบ' }} />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: { users: [แถวผู้ใช้('user')], reports: [] },
  })
})

describe('แท็บในโปรไฟล์ตาม role', () => {
  it('ผู้ใช้ทั่วไป: ไม่มีแถบแท็บ (เอา "ประวัติแจ้ง" ที่ซ้ำกับหน้าติดตาม และ "รับเลี้ยง" ที่ว่างถาวรออกแล้ว)', async () => {
    เปิดหน้า('user')
    expect(await screen.findByText('ข้อมูลส่วนตัว')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ประวัติแจ้ง' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'รับเลี้ยง' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'ข้อมูล' })).not.toBeInTheDocument()   // แท็บเดียว ไม่ต้องมีแถบ
  })

  it('เจ้าหน้าที่: มีแท็บ ข้อมูล / สถิติ / คิวงาน', async () => {
    db.tables.users = [แถวผู้ใช้('volunteer')]
    เปิดหน้า('volunteer')
    for (const ชื่อ of ['ข้อมูล', 'สถิติ', 'คิวงาน']) {
      expect(await screen.findByRole('button', { name: ชื่อ })).toBeInTheDocument()
    }
  })

  it('แอดมิน: มีแท็บ ข้อมูล / ภาพรวม', async () => {
    db.tables.users = [แถวผู้ใช้('admin')]
    เปิดหน้า('admin')
    expect(await screen.findByRole('button', { name: 'ภาพรวม' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ข้อมูล' })).toBeInTheDocument()
  })

  it('ทุก role มีปุ่มลบบัญชี (สิทธิ์ลบข้อมูลตัวเอง)', async () => {
    เปิดหน้า('user')
    expect(await screen.findByRole('button', { name: /ลบบัญชีของฉัน/ })).toBeInTheDocument()
  })
})

describe('ธีมสีตาม role', () => {
  it.each([
    ['user',      'bg-blue-50'],
    ['volunteer', 'bg-teal-50'],
    ['admin',     'bg-purple-50'],
  ])('role %s ใช้พื้นหลัง %s', async (role, คลาส) => {
    db.tables.users = [แถวผู้ใช้(role)]
    const { container } = เปิดหน้า(role)
    await screen.findByText('ข้อมูลส่วนตัว')
    expect(container.firstChild).toHaveClass(คลาส)
  })

  it('ป้าย role ของเจ้าหน้าที่เป็นสีเทียล (ไม่ใช่สีส้มเหมือนเดิม)', async () => {
    db.tables.users = [แถวผู้ใช้('volunteer')]
    เปิดหน้า('volunteer')
    const ป้าย = (await screen.findAllByText('เจ้าหน้าที่ / อาสาสมัคร'))[0].closest('div')
    expect(ป้าย.className).toMatch(/teal/)
    expect(ป้าย.className).not.toMatch(/orange/)
  })
})

describe('แก้เบอร์โทรในโปรไฟล์ (10 หลักเท่านั้น)', () => {
  async function เริ่มแก้เบอร์() {
    เปิดหน้า('user')
    await screen.findByText('0812345678')
    // ปุ่ม "แก้ไข" มี 2 อัน: ชื่อ กับ เบอร์ติดต่อ — เบอร์เป็นอันที่ 2
    await userEvent.click(screen.getAllByRole('button', { name: 'แก้ไข' })[1])
    return screen.getByPlaceholderText('0XXXXXXXXX')
  }

  it('รับเฉพาะตัวเลข ตัดตัวอักษรอื่นทิ้ง และไม่เกิน 10 หลัก', async () => {
    const ช่อง = await เริ่มแก้เบอร์()
    await userEvent.clear(ช่อง)
    await userEvent.type(ช่อง, '08a1-2345 678999')
    expect(ช่อง).toHaveValue('0812345678')
  })

  it('เบอร์ 9 หลัก ปุ่มบันทึกถูกปิด ไม่เขียนฐานข้อมูล', async () => {
    const ช่อง = await เริ่มแก้เบอร์()
    await userEvent.clear(ช่อง)
    await userEvent.type(ช่อง, '081234567')
    expect(screen.getByRole('button', { name: 'บันทึก' })).toBeDisabled()
    expect(db.calls.some((c) => c.table === 'users' && c.op === 'update')).toBe(false)
  })

  it('เบอร์ 10 หลัก บันทึกลงตาราง users ของตัวเอง แล้วแสดงเบอร์ใหม่', async () => {
    const ช่อง = await เริ่มแก้เบอร์()
    await userEvent.clear(ช่อง)
    await userEvent.type(ช่อง, '0899999999')
    await userEvent.click(screen.getByRole('button', { name: 'บันทึก' }))

    await waitFor(() => {
      const เขียน = db.calls.find((c) => c.table === 'users' && c.op === 'update')
      expect(เขียน.payload).toEqual({ phone: '0899999999' })
      expect(เขียน.eqs).toEqual({ id: 'u-test' })
    })
    expect(await screen.findByText('0899999999')).toBeInTheDocument()
  })
})
