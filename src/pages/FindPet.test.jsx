// @vitest-environment jsdom
// Integration test: หน้าค้นหาสัตว์ + ฐานข้อมูล (Supabase ปลอม) + router
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route, useParams } from 'react-router-dom'
import FindPet from './FindPet'
import { db, รีเซ็ตฐานข้อมูลปลอม, วันที่ผ่านมา } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const สัตว์ = (id, ส่วนที่ต่าง) => ({
  id, name: 'ยังไม่ตั้งชื่อ', breed: 'หมาไทยพันธุ์ผสม', species: 'สุนัข', gender: 'ตัวผู้', age: '2–5 ปี',
  size: 'กลาง', status: 'อยู่ศูนย์พักพิง', publish_mode: 'adoption', photos: null, photo_url: null,
  traits: 'ขี้อ้อน', created_at: วันที่ผ่านมา(id), ...ส่วนที่ต่าง,
})

// ชื่อต้องขึ้นต้นด้วยอักษรอังกฤษตัวใหญ่ ไม่งั้น ESLint ไม่ถือว่าเป็น React component แล้วฟ้อง rules-of-hooks
function PetPageStub() {
  const { id } = useParams()
  return <div>หน้ารายละเอียดสัตว์ {id}</div>
}

function เปิดหน้า() {
  return render(
    <MemoryRouter initialEntries={['/find-pet']}>
      <Routes>
        <Route path="/find-pet" element={<FindPet />} />
        <Route path="/pet/:id" element={<PetPageStub />} />
        <Route path="/home" element={<div>หน้าแรก</div>} />
      </Routes>
    </MemoryRouter>,
  )
}

// การ์ดสัตว์ทุกใบเป็นปุ่มที่มีข้อความ "รหัส #..." อยู่ข้างใน
const การ์ดทั้งหมด = () => screen.queryAllByRole('button').filter((b) => /รหัส #\d+/.test(b.textContent))

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: {
      animals: [
        สัตว์(1, { breed: 'ไซบีเรียน ฮัสกี้', age: 'น้อยกว่า 1 ปี', gender: 'ตัวเมีย' }),
        สัตว์(2, { name: 'ทองแดง', breed: 'ชิวาวา' }),
        สัตว์(3, { breed: 'ไม่ระบุ' }),                         // สุนัข ไม่ทราบสายพันธุ์
        สัตว์(4, { species: 'แมว', breed: 'วิเชียรมาศ', name: 'เหมียว' }),
        สัตว์(5, { publish_mode: 'none' }),                      // ไม่ได้ประกาศ → ต้องไม่โผล่
        สัตว์(6, { status: 'มีผู้รับเลี้ยง' }),                  // ออกจากศูนย์แล้ว แต่ค้างโหมดประกาศ → ต้องไม่โผล่
        สัตว์(7, { publish_mode: 'lost_and_found' }),            // ประกาศตามหาเจ้าของ ไม่ใช่หาบ้าน → ต้องไม่โผล่
        สัตว์(8, { status: 'เสียชีวิต' }),
      ],
    },
  })
})

describe('หน้าค้นหาสัตว์ — แสดงเฉพาะสัตว์ที่ประกาศหาบ้านและยังอยู่ในศูนย์', () => {
  it('ค่าเริ่มต้นเป็นสุนัข: เห็น 3 ตัว (ตัดสัตว์ที่ไม่ได้ประกาศ/ออกจากศูนย์/ประกาศตามหาเจ้าของ)', async () => {
    เปิดหน้า()
    expect(await screen.findByText('พบ 3 ตัว')).toBeInTheDocument()
    expect(การ์ดทั้งหมด()).toHaveLength(3)
  })

  it('สลับไปแท็บแมว เห็นเฉพาะแมว', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    await userEvent.click(screen.getByRole('button', { name: 'แมว' }))
    expect(await screen.findByText('พบ 1 ตัว')).toBeInTheDocument()
    expect(screen.getByText('เหมียว')).toBeInTheDocument()
  })

  it('ไม่มีสัตว์ประเภทที่เลือก ขึ้นข้อความว่างของประเภทนั้น', async () => {
    db.tables.animals = db.tables.animals.filter((a) => a.species !== 'แมว')
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    await userEvent.click(screen.getByRole('button', { name: 'แมว' }))
    expect(await screen.findByText(/ยังไม่มีแมวที่พร้อมหาบ้าน/)).toBeInTheDocument()
  })

  it('อ่านข้อมูลไม่ได้ แสดงสถานะโหลดไม่สำเร็จ ไม่ใช่ "ยังไม่มีสัตว์หาบ้าน"', async () => {
    db.errors['animals:select'] = 'timeout'
    เปิดหน้า()
    expect(await screen.findByText(/โหลดรายชื่อสัตว์ไม่สำเร็จ|ไม่ได้เชื่อมต่ออินเทอร์เน็ต/)).toBeInTheDocument()
    expect(screen.queryByText(/ยังไม่มี.*ที่พร้อมหาบ้าน/)).not.toBeInTheDocument()
  })
})

describe('การ์ดสัตว์ — ชื่อที่แสดงและรหัสสัตว์', () => {
  it('ยังไม่ตั้งชื่อแต่รู้สายพันธุ์: หัวข้อเป็นสายพันธุ์ + ป้ายยังไม่มีชื่อ + รหัส', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    const การ์ด = การ์ดทั้งหมด().find((c) => c.textContent.includes('รหัส #1'))
    expect(within(การ์ด).getByRole('heading', { name: /ไซบีเรียน ฮัสกี้/ })).toBeInTheDocument()
    expect(within(การ์ด).getByText('ยังไม่มีชื่อ')).toBeInTheDocument()
    // บรรทัดรองไม่ซ้ำสายพันธุ์ที่ยกขึ้นไปเป็นหัวข้อแล้ว
    expect(within(การ์ด).getByText('น้อยกว่า 1 ปี • ตัวเมีย')).toBeInTheDocument()
  })

  it('ยังไม่ตั้งชื่อและไม่ทราบสายพันธุ์: หัวข้อเป็นประเภท + ป้ายไม่ทราบสายพันธุ์', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    const การ์ด = การ์ดทั้งหมด().find((c) => c.textContent.includes('รหัส #3'))
    expect(within(การ์ด).getByRole('heading', { name: /สุนัข/ })).toBeInTheDocument()
    expect(within(การ์ด).getByText('ไม่ทราบสายพันธุ์')).toBeInTheDocument()
  })

  it('มีชื่อจริง: หัวข้อเป็นชื่อ ไม่มีป้ายยังไม่มีชื่อ', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    const การ์ด = การ์ดทั้งหมด().find((c) => c.textContent.includes('รหัส #2'))
    expect(within(การ์ด).getByRole('heading', { name: /ทองแดง/ })).toBeInTheDocument()
    expect(within(การ์ด).queryByText('ยังไม่มีชื่อ')).not.toBeInTheDocument()
  })

  it('การ์ดไม่ซ้ำหัวข้อกันเมื่อหลายตัวยังไม่ตั้งชื่อ (บั๊กเดิม: ทุกใบขึ้น "ยังไม่ตั้งชื่อ")', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    const หัวข้อ = การ์ดทั้งหมด().map((c) => within(c).getByRole('heading').textContent)
    expect(หัวข้อ.some((h) => h.includes('ยังไม่ตั้งชื่อ'))).toBe(false)
  })

  it('กดการ์ดแล้วไปหน้ารายละเอียดของสัตว์ตัวนั้น', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    await userEvent.click(การ์ดทั้งหมด().find((c) => c.textContent.includes('รหัส #2')))
    expect(await screen.findByText('หน้ารายละเอียดสัตว์ 2')).toBeInTheDocument()
  })
})

describe('ตัวกรอง', () => {
  it('กรองด้วยเพศ แล้วจำนวนผลลัพธ์ลดลงตามจริง', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    await userEvent.click(screen.getByRole('button', { name: /ตัวกรอง/ }))
    await userEvent.click(await screen.findByRole('button', { name: /^ตัวเมีย \(/ }))
    expect(await screen.findByText('พบ 1 ตัว')).toBeInTheDocument()
  })

  it('ตัวเลือกที่กดแล้วไม่เจอสัตว์ (0 ตัว) ถูกปิดไว้กดไม่ได้', async () => {
    เปิดหน้า()
    await screen.findByText('พบ 3 ตัว')
    await userEvent.click(screen.getByRole('button', { name: /ตัวกรอง/ }))
    // ในข้อมูลทดสอบไม่มีสุนัขขนาดใหญ่เลย
    expect(await screen.findByRole('button', { name: /^ใหญ่ \(0\)/ })).toBeDisabled()
  })
})
