// @vitest-environment jsdom
// Integration test: หน้าสัตว์เลี้ยงหาย — อายุประกาศ (30 วัน), ปิดประกาศ "เจอแล้ว", ต่ออายุ, ฟอร์มโพสต์ใหม่
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import LostAndFoundPage from './LostAndFoundPage'
import { db, รีเซ็ตฐานข้อมูลปลอม, วันที่ผ่านมา } from '../test/fakeSupabase'
import { วันนี้ไทย } from '../utils/dateTime'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const เจ้าของ = { id: 'u-owner' }
const คนอื่น  = { id: 'u-other' }

const โพสต์ = (id, ส่วนที่ต่าง) => ({
  id, owner_id: 'u-someone', pet_name: `น้อง${id}`, species: 'สุนัข', breed: 'บีเกิล', traits: 'ปลอกคอแดง',
  lost_location: 'หน้าตลาด', lost_date: '2026-10-01', contact_phone: '0812345678', photo_url: null,
  status: 'กำลังตามหา', created_at: วันที่ผ่านมา(1), reward_amount: null, latitude: null, longitude: null,
  ...ส่วนที่ต่าง,
})

function เปิดหน้า(user) {
  return render(
    <MemoryRouter initialEntries={['/lost-found']}>
      <LostAndFoundPage user={user} />
    </MemoryRouter>,
  )
}

async function ไปแท็บสัตว์เลี้ยงหาย() {
  await userEvent.click(await screen.findByRole('button', { name: /^สัตว์เลี้ยงหาย/ }))
}

const การ์ด = (ชื่อ) => screen.getAllByRole('button').find((b) => b.textContent.includes(ชื่อ))

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: {
      animals: [], reports: [],
      lost_pets: [
        โพสต์(1),                                                                  // สดของคนอื่น
        โพสต์(2, { created_at: วันที่ผ่านมา(60) }),                                // หมดอายุของคนอื่น
        โพสต์(3, { owner_id: 'u-owner', created_at: วันที่ผ่านมา(60) }),           // หมดอายุของเจ้าของ
        โพสต์(4, { status: 'เจอแล้ว' }),                                           // ปิดแล้ว
        โพสต์(5, { owner_id: 'u-owner' }),                                         // สดของเจ้าของ
        โพสต์(6, { created_at: วันที่ผ่านมา(90), renewed_at: วันที่ผ่านมา(2) }),   // เก่าแต่ต่ออายุแล้ว
      ],
    },
  })
})

describe('อายุประกาศ 30 วัน — ใครเห็นอะไร', () => {
  it('คนอื่นเห็นเฉพาะประกาศที่ยังไม่หมดอายุ (ซ่อนที่หมดอายุและที่เจอแล้ว)', async () => {
    เปิดหน้า(คนอื่น)
    await ไปแท็บสัตว์เลี้ยงหาย()
    expect(await screen.findByText('น้อง1')).toBeInTheDocument()
    expect(screen.getByText('น้อง5')).toBeInTheDocument()
    expect(screen.getByText('น้อง6')).toBeInTheDocument()   // เก่าแต่ต่ออายุ → ยังแสดง
    expect(screen.queryByText('น้อง2')).not.toBeInTheDocument()
    expect(screen.queryByText('น้อง3')).not.toBeInTheDocument()
    expect(screen.queryByText('น้อง4')).not.toBeInTheDocument()
  })

  it('เจ้าของยังเห็นประกาศที่หมดอายุของตัวเอง พร้อมป้าย "หมดอายุ" (แต่ไม่เห็นของคนอื่น)', async () => {
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    const ของตัวเอง = within(await screen.findByText('น้อง3').then((e) => e.closest('button')))
    expect(ของตัวเอง.getByText('หมดอายุ')).toBeInTheDocument()
    expect(screen.queryByText('น้อง2')).not.toBeInTheDocument()
  })

  it('จำนวนบนแท็บนับเฉพาะที่เห็นจริง', async () => {
    เปิดหน้า(คนอื่น)
    expect(await screen.findByRole('button', { name: 'สัตว์เลี้ยงหาย(3)' })).toBeInTheDocument()
  })
})

describe('เจ้าของจัดการประกาศ: เจอน้องแล้ว / ต่ออายุ', () => {
  it('คนอื่นเปิดประกาศ เห็นปุ่มโทรหาเจ้าของ และไม่มีปุ่มจัดการ', async () => {
    เปิดหน้า(คนอื่น)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง1'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByRole('link', { name: /โทรติดต่อเจ้าของ/ })).toHaveAttribute('href', 'tel:0812345678')
    expect(within(ชีต).queryByRole('button', { name: /เจอน้องแล้ว/ })).not.toBeInTheDocument()
    expect(within(ชีต).queryByRole('button', { name: /ต่ออายุ/ })).not.toBeInTheDocument()
  })

  it('เจ้าของเปิดประกาศที่หมดอายุ เห็นคำอธิบายและปุ่มเจอน้องแล้ว/ต่ออายุ', async () => {
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง3'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText(/ประกาศนี้หมดอายุแล้ว/)).toBeInTheDocument()
    expect(within(ชีต).getByRole('button', { name: /เจอน้องแล้ว/ })).toBeInTheDocument()
    expect(within(ชีต).getByRole('button', { name: /ต่ออายุ/ })).toBeInTheDocument()
  })

  it('กดต่ออายุ: บันทึก renewed_at ของประกาศนั้น และแสดงว่าเหลืออีก 30 วัน', async () => {
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง3'))
    const ชีต = await screen.findByRole('dialog')
    await userEvent.click(within(ชีต).getByRole('button', { name: /ต่ออายุ/ }))

    await waitFor(() => {
      const เขียน = db.calls.find((c) => c.table === 'lost_pets' && c.op === 'update')
      expect(เขียน).toBeTruthy()
      expect(เขียน.eqs).toEqual({ id: 3 })
      expect(Date.parse(เขียน.payload.renewed_at)).toBeGreaterThan(Date.now() - 5000)
    })
    expect(await screen.findByText('ต่ออายุประกาศอีก 30 วันแล้ว')).toBeInTheDocument()
    expect(within(await screen.findByRole('dialog')).getByText(/แสดงต่อสาธารณะอีก 30 วัน/)).toBeInTheDocument()
  })

  it('ต่ออายุไม่สำเร็จ (เช่น ยังไม่ได้เพิ่มคอลัมน์) แสดง error ในหน้าต่าง ไม่เงียบ', async () => {
    db.errors['lost_pets:update'] = "Could not find the 'renewed_at' column"
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง3'))
    await userEvent.click(within(await screen.findByRole('dialog')).getByRole('button', { name: /ต่ออายุ/ }))
    expect(await screen.findByText(/ต่ออายุไม่สำเร็จ/)).toBeInTheDocument()
  })

  it('เจอน้องแล้ว: ต้องยืนยัน 2 ขั้น แล้วตั้งสถานะ เจอแล้ว และเอาออกจากรายการ (ไม่ลบแถว)', async () => {
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง5'))
    const ชีต = await screen.findByRole('dialog')

    await userEvent.click(within(ชีต).getByRole('button', { name: /เจอน้องแล้ว/ }))
    expect(within(ชีต).getByText(/เจอน้อง "น้อง5" แล้วใช่ไหม/)).toBeInTheDocument()
    expect(db.calls.some((c) => c.table === 'lost_pets' && c.op !== 'select')).toBe(false)   // ยังไม่เขียนอะไร

    await userEvent.click(within(ชีต).getByRole('button', { name: /ยืนยัน เจอแล้ว/ }))
    await waitFor(() => {
      const เขียน = db.calls.find((c) => c.table === 'lost_pets' && c.op === 'update')
      expect(เขียน.payload).toEqual({ status: 'เจอแล้ว' })
      expect(เขียน.eqs).toEqual({ id: 5 })
    })
    expect(await screen.findByText(/ปิดประกาศแล้ว/)).toBeInTheDocument()
    expect(screen.queryByText('น้อง5')).not.toBeInTheDocument()
    expect(db.calls.some((c) => c.op === 'delete')).toBe(false)
  })

  it('กด "ยังไม่ใช่" ยกเลิกการปิดประกาศ ไม่มีการเขียนข้อมูล', async () => {
    เปิดหน้า(เจ้าของ)
    await ไปแท็บสัตว์เลี้ยงหาย()
    await userEvent.click(การ์ด('น้อง5'))
    const ชีต = await screen.findByRole('dialog')
    await userEvent.click(within(ชีต).getByRole('button', { name: /เจอน้องแล้ว/ }))
    await userEvent.click(within(ชีต).getByRole('button', { name: 'ยังไม่ใช่' }))
    expect(within(ชีต).getByRole('button', { name: /เจอน้องแล้ว/ })).toBeInTheDocument()
    expect(db.calls.some((c) => c.table === 'lost_pets' && c.op !== 'select')).toBe(false)
  })
})

describe('ฟอร์มโพสต์ประกาศใหม่', () => {
  async function เปิดฟอร์ม() {
    เปิดหน้า(เจ้าของ)
    await userEvent.click(await screen.findByRole('button', { name: /แจ้งสัตว์เลี้ยงสูญหาย/ }))
    return await screen.findByRole('dialog')
  }

  it('ช่องเลือกวันที่หาย จำกัดไม่เกิน "วันนี้ตามเวลาไทย" (ไม่ใช่วันที่ UTC)', async () => {
    const ฟอร์ม = await เปิดฟอร์ม()
    expect(ฟอร์ม.querySelector('input[type="date"]')).toHaveAttribute('max', วันนี้ไทย())
  })

  it('เบอร์โทร 9 หลักถูกปฏิเสธ ไม่บันทึกลงฐานข้อมูล', async () => {
    const ฟอร์ม = await เปิดฟอร์ม()
    await userEvent.type(within(ฟอร์ม).getByPlaceholderText('เช่น มะม่วง, ขาว'), 'น้องใหม่')
    await userEvent.click(within(ฟอร์ม).getByRole('button', { name: 'สุนัข' }))
    await userEvent.type(within(ฟอร์ม).getByPlaceholderText('เช่น หน้าตลาดกำแพงแสน'), 'หน้าตลาด')
    const ช่องเบอร์ = within(ฟอร์ม).getByPlaceholderText('เช่น 0812345678')
    await userEvent.clear(ช่องเบอร์)
    await userEvent.type(ช่องเบอร์, '081234567')
    await userEvent.click(within(ฟอร์ม).getByRole('button', { name: /โพสต์ประกาศตามหา/ }))

    expect(await within(ฟอร์ม).findByText(/ต้องเป็นตัวเลข 10 หลัก/)).toBeInTheDocument()
    expect(db.calls.some((c) => c.table === 'lost_pets' && c.op === 'insert')).toBe(false)
  })

  it('กรอกครบและเบอร์ 10 หลัก บันทึกประกาศสถานะ กำลังตามหา ในชื่อของผู้ใช้', async () => {
    const ฟอร์ม = await เปิดฟอร์ม()
    await userEvent.type(within(ฟอร์ม).getByPlaceholderText('เช่น มะม่วง, ขาว'), 'น้องใหม่')
    await userEvent.click(within(ฟอร์ม).getByRole('button', { name: 'สุนัข' }))
    await userEvent.type(within(ฟอร์ม).getByPlaceholderText('เช่น หน้าตลาดกำแพงแสน'), 'หน้าตลาด')
    const ช่องเบอร์ = within(ฟอร์ม).getByPlaceholderText('เช่น 0812345678')
    await userEvent.clear(ช่องเบอร์)
    await userEvent.type(ช่องเบอร์, '0899999999')
    await userEvent.click(within(ฟอร์ม).getByRole('button', { name: /โพสต์ประกาศตามหา/ }))

    await waitFor(() => {
      const เขียน = db.calls.find((c) => c.table === 'lost_pets' && c.op === 'insert')
      expect(เขียน.payload).toMatchObject({
        owner_id: 'u-owner', pet_name: 'น้องใหม่', species: 'สุนัข', contact_phone: '0899999999', status: 'กำลังตามหา',
      })
    })
    expect(await screen.findByText('โพสต์ประกาศตามหาเรียบร้อยแล้ว')).toBeInTheDocument()
  })
})
