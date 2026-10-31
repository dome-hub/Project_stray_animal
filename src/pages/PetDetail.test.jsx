// @vitest-environment jsdom
// Integration test: หน้ารายละเอียดสัตว์ + ฐานข้อมูล (Supabase ปลอม) + router ทำงานร่วมกัน
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import PetDetail from './PetDetail'
import { db, รีเซ็ตฐานข้อมูลปลอม } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const ศูนย์ = [{
  name: 'เจ้าหน้าที่ทดสอบ', phone: '0853948659', shelter_name: 'ศูนย์พักพิงทดสอบ',
  shelter_location: 'ใกล้ๆบ่อ 1', service_area: 'กำแพงแสน', avatar_url: null,
}]

const สัตว์ = (id, ส่วนที่ต่าง) => ({
  id, name: 'ยังไม่ตั้งชื่อ', breed: 'หมาไทยพันธุ์ผสม', species: 'สุนัข', gender: 'ตัวผู้', age: '2–5 ปี',
  size: 'กลาง', health: 'แข็งแรง', status: 'อยู่ศูนย์พักพิง', publish_mode: 'adoption',
  photos: null, photo_url: null, ...ส่วนที่ต่าง,
})

function เปิดหน้า(id) {
  return render(
    <MemoryRouter initialEntries={[`/pet/${id}`]}>
      <Routes>
        <Route path="/pet/:id" element={<PetDetail />} />
        <Route path="/find-pet" element={<div>หน้าค้นหา</div>} />
        <Route path="/contact" element={<div>หน้าติดต่อ</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: {
      animals: [
        สัตว์(25),
        สัตว์(26, { name: 'ทองแดง', breed: 'ชิวาวา' }),
        สัตว์(27, { breed: 'ไม่ระบุ', species: 'แมว' }),
        สัตว์(34, { publish_mode: 'none' }),
        สัตว์(39, { publish_mode: 'none', status: 'เสียชีวิต' }),
        สัตว์(40, { status: 'มีผู้รับเลี้ยง' }),
      ],
    },
    rpc: { get_shelter_contact: ศูนย์ },
  })
})

describe('หน้ารายละเอียดสัตว์ — แสดงเฉพาะสัตว์ที่ประกาศหาบ้านอยู่', () => {
  it('สัตว์ที่ประกาศหาบ้าน แสดงข้อมูลและปุ่มติดต่อขอรับเลี้ยง', async () => {
    เปิดหน้า(25)
    expect(await screen.findByRole('heading', { name: 'หมาไทยพันธุ์ผสม' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ติดต่อขอรับเลี้ยง/ })).toBeInTheDocument()
  })

  it('สัตว์ที่ไม่ได้เปิดโหมดประกาศ (เปิดผ่าน URL ตรงๆ) ถูกบล็อก ไม่มีปุ่มติดต่อ', async () => {
    เปิดหน้า(34)
    expect(await screen.findByText('ไม่พบข้อมูลสัตว์ตัวนี้แล้ว')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ติดต่อขอรับเลี้ยง/ })).not.toBeInTheDocument()
  })

  it('สัตว์ที่ได้บ้านแล้วแต่ยังค้างโหมดประกาศ แสดงว่า "ได้บ้านใหม่แล้ว"', async () => {
    เปิดหน้า(40)
    expect(await screen.findByText('น้องได้บ้านใหม่แล้ว')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /ติดต่อขอรับเลี้ยง/ })).not.toBeInTheDocument()
  })

  it('สัตว์ที่เสียชีวิต ถูกบล็อกและไม่เปิดเผยสาเหตุให้คนนอกเห็น', async () => {
    เปิดหน้า(39)
    expect(await screen.findByText('ไม่พบข้อมูลสัตว์ตัวนี้แล้ว')).toBeInTheDocument()
    expect(screen.queryByText(/เสียชีวิต/)).not.toBeInTheDocument()
  })

  it('รหัสสัตว์ที่ไม่มีในระบบ ขึ้นไม่พบข้อมูล และมีปุ่มกลับไปดูตัวอื่น', async () => {
    เปิดหน้า(9999)
    expect(await screen.findByText('ไม่พบข้อมูลสัตว์ตัวนี้แล้ว')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ดูสัตว์ตัวอื่น' }))
    expect(await screen.findByText('หน้าค้นหา')).toBeInTheDocument()
  })

  it('ดึงข้อมูลสัตว์พลาด (ฐานข้อมูลล่ม) แสดงสถานะโหลดไม่สำเร็จ ไม่ใช่ "ไม่พบ"', async () => {
    db.errors['animals:select'] = 'connection refused'
    เปิดหน้า(25)
    expect(await screen.findByText(/โหลดข้อมูลสัตว์ไม่สำเร็จ|ไม่ได้เชื่อมต่ออินเทอร์เน็ต/)).toBeInTheDocument()
    expect(screen.queryByText('ไม่พบข้อมูลสัตว์ตัวนี้แล้ว')).not.toBeInTheDocument()
  })
})

describe('สัตว์ที่ยังไม่ตั้งชื่อ — ใช้สายพันธุ์/ประเภทแทน และมีรหัสสัตว์', () => {
  it('ไม่มีชื่อแต่รู้สายพันธุ์: หัวข้อเป็นสายพันธุ์ มีรหัสสัตว์', async () => {
    เปิดหน้า(25)
    expect(await screen.findByRole('heading', { name: 'หมาไทยพันธุ์ผสม' })).toBeInTheDocument()
    expect(screen.getByText('ยังไม่มีชื่อ')).toBeInTheDocument()
    expect(screen.getByText('รหัสสัตว์ #25')).toBeInTheDocument()
  })

  it('ไม่มีชื่อและไม่ทราบสายพันธุ์: หัวข้อเป็นประเภทสัตว์', async () => {
    เปิดหน้า(27)
    expect(await screen.findByRole('heading', { name: 'แมว' })).toBeInTheDocument()
    expect(screen.getByText('ไม่ทราบสายพันธุ์ • ยังไม่มีชื่อ')).toBeInTheDocument()
  })

  it('มีชื่อจริง: หัวข้อเป็นชื่อ และปุ่มติดต่อมีชื่อต่อท้าย', async () => {
    เปิดหน้า(26)
    expect(await screen.findByRole('heading', { name: 'ทองแดง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ติดต่อขอรับเลี้ยง ทองแดง' })).toBeInTheDocument()
  })
})

describe('ข้อมูลติดต่อศูนย์ (ผ่าน RPC get_shelter_contact)', () => {
  it('กดติดต่อขอรับเลี้ยง เห็นเบอร์โทร ที่ตั้ง และให้แจ้งรหัสสัตว์', async () => {
    เปิดหน้า(25)
    await userEvent.click(await screen.findByRole('button', { name: /ติดต่อขอรับเลี้ยง/ }))

    const ชีต = await screen.findByRole('dialog')
    expect(await within(ชีต).findByText('ศูนย์พักพิงทดสอบ')).toBeInTheDocument()
    expect(within(ชีต).getByText('ใกล้ๆบ่อ 1')).toBeInTheDocument()
    expect(within(ชีต).getByRole('link', { name: /0853948659/ })).toHaveAttribute('href', 'tel:0853948659')
    expect(within(ชีต).getByText(/แจ้งรหัสสัตว์ #25/)).toBeInTheDocument()
    expect(db.rpcCalls.some((c) => c.name === 'get_shelter_contact')).toBe(true)
  })

  it('ดึงข้อมูลศูนย์ไม่ได้ (RPC พลาด) แสดงทางเลือกไปหน้าติดต่อ ไม่ค้างที่กำลังโหลด', async () => {
    db.rpc = {}   // ไม่มีฟังก์ชันใน DB = error
    เปิดหน้า(25)
    await userEvent.click(await screen.findByRole('button', { name: /ติดต่อขอรับเลี้ยง/ }))

    const ชีต = await screen.findByRole('dialog')
    await waitFor(() => expect(within(ชีต).getByText('ยังไม่มีข้อมูลศูนย์พักพิงในระบบ')).toBeInTheDocument())
    await userEvent.click(within(ชีต).getByRole('button', { name: /ไปหน้าติดต่อเรา/ }))
    expect(await screen.findByText('หน้าติดต่อ')).toBeInTheDocument()
  })
})
