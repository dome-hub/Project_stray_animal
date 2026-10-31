// @vitest-environment jsdom
// Integration test: หน้าแจ้งสัตว์จร — กันกดส่งซ้ำ, ตรวจเบอร์โทร, ตรวจเคสซ้ำข้ามผู้ใช้ (RPC), ข้อมูลที่ส่งเข้า reports
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, fireEvent, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import ReportAnimal from './ReportAnimal'
import { db, รีเซ็ตฐานข้อมูลปลอม, วันที่ผ่านมา } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const ผู้ใช้ = { id: 'u-test', email: 't@test.com' }

const เคสใกล้เคียง = {
  id: 77, animal_type: 'หมาไทย', image_url: null, status: 'รอดำเนินการ',
  latitude: 14.0206, longitude: 99.9673, created_at: วันที่ผ่านมา(0), distance_m: 35,
}

function เปิดหน้า() {
  return render(
    <MemoryRouter initialEntries={['/report']}>
      <ReportAnimal user={ผู้ใช้} />
    </MemoryRouter>,
  )
}

const ปุ่มส่ง = () => screen.getByRole('button', { name: /ส่งรายงานให้เจ้าหน้าที่|กำลังตรวจสอบ|กำลังอัปโหลดและบันทึก/ })
const รายงานที่ถูกบันทึก = () => db.calls.filter((c) => c.table === 'reports' && c.op === 'insert')

// กรอกฟอร์มขั้นต่ำที่ส่งได้: ปักพิกัดด้วย GPS + เลือกประเภทการแจ้ง "สัตว์บาดเจ็บ"
async function กรอกฟอร์ม() {
  await userEvent.click(screen.getByRole('button', { name: 'ดึงตำแหน่งปัจจุบัน' }))
  await userEvent.click(screen.getByRole('button', { name: /สัตว์บาดเจ็บ/ }))
  await waitFor(() => expect(ปุ่มส่ง()).toBeEnabled())
}

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: { users: [{ id: 'u-test', phone: '0812345678' }], reports: [], notifications: [] },
    rpc: {
      find_nearby_open_report: [],   // ไม่มีเคสใกล้เคียง
      'แจ้งเตือนเคสใหม่': null,
    },
  })
  // GPS ปลอม + ค้นที่อยู่จากพิกัด (Nominatim) ปลอม
  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { getCurrentPosition: (ok) => ok({ coords: { latitude: 14.0206, longitude: 99.9673 } }) },
  })
  vi.stubGlobal('fetch', vi.fn(async () => ({ ok: true, json: async () => ({ address: { road: 'ถนนทดสอบ' } }) })))
})

afterEach(() => { vi.unstubAllGlobals() })

describe('ส่งรายงานปกติ', () => {
  it('กรอกครบแล้วส่ง: บันทึกรายงานด้วยข้อมูลที่ถูกต้อง และแจ้งเตือนผู้แจ้งกับเจ้าหน้าที่', async () => {
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(1)
    expect(รายงานที่ถูกบันทึก()[0].payload).toMatchObject({
      reporter_id: 'u-test', status: 'รอดำเนินการ', urgency: 'ด่วน',
      latitude: 14.0206, longitude: 99.9673, location_text: 'ถนนทดสอบ',
    })
    // แจ้งเตือนในแอปของผู้แจ้ง + เรียก RPC แจ้งเจ้าหน้าที่ด้วย id ของรายงานที่เพิ่งสร้าง
    expect(db.calls.some((c) => c.table === 'notifications' && c.op === 'insert' && c.payload.user_id === 'u-test')).toBe(true)
    const แจ้งเจ้าหน้าที่ = db.rpcCalls.find((c) => c.name === 'แจ้งเตือนเคสใหม่')
    expect(แจ้งเจ้าหน้าที่.args.id_รายงาน).toBe(db.tables.reports[0].id)
  })

  it('ยังไม่ได้ปักพิกัด/เลือกประเภท ปุ่มส่งถูกปิดไว้', async () => {
    เปิดหน้า()
    expect(ปุ่มส่ง()).toBeDisabled()
  })
})

describe('กันกดส่งรายงานซ้ำ (double submit)', () => {
  it('กดปุ่มส่ง 3 ครั้งติดกันตอนเครือข่ายช้า ได้รายงานเพียง 1 ใบ', async () => {
    db.delay['users:select'] = 150      // ช่วงตรวจเบอร์โทรช้า = ช่องว่างที่เคยทำให้กดซ้ำได้
    เปิดหน้า()
    await กรอกฟอร์ม()

    const ปุ่ม = ปุ่มส่ง()
    fireEvent.click(ปุ่ม)
    fireEvent.click(ปุ่ม)
    fireEvent.click(ปุ่ม)

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(1)
    expect(db.tables.reports).toHaveLength(1)
  })

  it('ระหว่างตรวจสอบ ปุ่มถูกปิดและแสดงสถานะกำลังตรวจสอบ', async () => {
    db.delay['users:select'] = 150
    เปิดหน้า()
    await กรอกฟอร์ม()
    fireEvent.click(ปุ่มส่ง())
    await waitFor(() => expect(screen.getByRole('button', { name: /กำลังตรวจสอบ/ })).toBeDisabled())
    await screen.findByText('แจ้งสำเร็จแล้ว!')
  })
})

describe('ตรวจเบอร์โทรก่อนส่ง (ต้องเป็น 10 หลัก)', () => {
  it('ไม่มีเบอร์ในโปรไฟล์: ขึ้นหน้าต่างกรอกเบอร์ และยังไม่บันทึกรายงาน', async () => {
    db.tables.users = [{ id: 'u-test', phone: null }]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())

    expect(await screen.findByText('กรอกเบอร์โทรศัพท์ก่อน')).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(0)
  })

  it('เบอร์เก่า 9 หลักที่ค้างในโปรไฟล์ ต้องถูกขอให้กรอกใหม่ (เกณฑ์เดียวกับหน้าโปรไฟล์)', async () => {
    db.tables.users = [{ id: 'u-test', phone: '034351083' }]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    expect(await screen.findByText('กรอกเบอร์โทรศัพท์ก่อน')).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(0)
  })

  it('กรอกเบอร์ไม่ครบ 10 หลัก ปุ่มบันทึกถูกปิด', async () => {
    db.tables.users = [{ id: 'u-test', phone: null }]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    const หน้าต่าง = (await screen.findByText('กรอกเบอร์โทรศัพท์ก่อน')).closest('[role="dialog"]')
    await userEvent.type(within(หน้าต่าง).getByPlaceholderText('เช่น 0812345678'), '081234567')
    expect(within(หน้าต่าง).getByRole('button', { name: /บันทึกเบอร์โทรศัพท์/ })).toBeDisabled()
  })

  it('กรอกเบอร์ 10 หลัก: บันทึกเบอร์ลงโปรไฟล์ แล้วส่งรายงานต่อจนสำเร็จ', async () => {
    db.tables.users = [{ id: 'u-test', phone: null }]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    const หน้าต่าง = (await screen.findByText('กรอกเบอร์โทรศัพท์ก่อน')).closest('[role="dialog"]')
    await userEvent.type(within(หน้าต่าง).getByPlaceholderText('เช่น 0812345678'), '0899999999')
    await userEvent.click(within(หน้าต่าง).getByRole('button', { name: /บันทึกเบอร์โทรศัพท์/ }))

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    const อัปเดตเบอร์ = db.calls.find((c) => c.table === 'users' && c.op === 'update')
    expect(อัปเดตเบอร์.payload).toEqual({ phone: '0899999999' })
    expect(รายงานที่ถูกบันทึก()).toHaveLength(1)
  })
})

describe('เตือนเคสซ้ำในรัศมี 100 ม. (RPC find_nearby_open_report)', () => {
  it('เรียก RPC ด้วยพิกัดที่ปักและรัศมี 100 ม.', async () => {
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    await screen.findByText('แจ้งสำเร็จแล้ว!')
    const เรียก = db.rpcCalls.find((c) => c.name === 'find_nearby_open_report')
    expect(เรียก.args).toEqual({ p_lat: 14.0206, p_lng: 99.9673, p_radius: 100 })
  })

  it('เจอเคสของผู้ใช้คนอื่นใกล้เคียง: ขึ้นหน้าต่างเตือน พร้อมระยะ และยังไม่สร้างรายงานใหม่', async () => {
    db.rpc.find_nearby_open_report = [เคสใกล้เคียง]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())

    expect(await screen.findByText('มีผู้แจ้งเหตุในบริเวณนี้แล้ว')).toBeInTheDocument()
    expect(screen.getByText(/35 เมตร/)).toBeInTheDocument()
    expect(screen.getByText(/#000077/)).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(0)
  })

  it('เลือก "ไม่ใช่ คนละตัว" แล้วสร้างรายงานใหม่ตามปกติ', async () => {
    db.rpc.find_nearby_open_report = [เคสใกล้เคียง]
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    await userEvent.click(await screen.findByRole('button', { name: /ไม่ใช่ นี่คือสัตว์คนละตัว/ }))

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    expect(รายงานที่ถูกบันทึก()).toHaveLength(1)
  })

  it('เลือก "ใช่ ตัวเดียวกัน" แนบข้อมูลเข้าเคสเดิมผ่าน RPC และไม่สร้างรายงานใหม่', async () => {
    db.rpc.find_nearby_open_report = [เคสใกล้เคียง]
    db.rpc['แนบข้อมูลเข้าเคสซ้ำ'] = null
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    await userEvent.click(await screen.findByRole('button', { name: /ใช่ ตัวเดียวกัน/ }))

    expect(await screen.findByText('แนบข้อมูลเรียบร้อย!')).toBeInTheDocument()
    expect(db.rpcCalls.find((c) => c.name === 'แนบข้อมูลเข้าเคสซ้ำ').args.id_เคส).toBe(77)
    expect(รายงานที่ถูกบันทึก()).toHaveLength(0)
  })

  it('RPC ยังไม่ถูกติดตั้งใน DB: ถอยไปใช้ query ตรง ไม่ล้ม และส่งรายงานได้ตามปกติ', async () => {
    delete db.rpc.find_nearby_open_report
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    expect(db.calls.some((c) => c.table === 'reports' && c.op === 'select')).toBe(true)   // query สำรอง
    expect(รายงานที่ถูกบันทึก()).toHaveLength(1)
    เสียงError.mockRestore()
  })

  it('query สำรอง (ตอนไม่มี RPC) ยังเจอเคสที่ยังไม่ปิดใกล้เคียง และไม่นับเคสที่ปิดแล้ว', async () => {
    delete db.rpc.find_nearby_open_report
    db.tables.reports = [
      { id: 10, animal_type: 'x', status: 'อยู่ศูนย์พักพิง', latitude: 14.0206, longitude: 99.9673, created_at: วันที่ผ่านมา(1) },   // ปิดแล้ว
      { id: 11, animal_type: 'y', status: 'รอดำเนินการ',     latitude: 14.0207, longitude: 99.9673, created_at: วันที่ผ่านมา(1) },   // เปิดอยู่ ~11 ม.
      { id: 12, animal_type: 'z', status: 'รอดำเนินการ',     latitude: 14.5,    longitude: 99.9673, created_at: วันที่ผ่านมา(1) },   // ไกล
    ]
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    await กรอกฟอร์ม()
    await userEvent.click(ปุ่มส่ง())
    expect(await screen.findByText(/#000011/)).toBeInTheDocument()
    เสียงError.mockRestore()
  })
})

describe('อัปโหลดไม่สำเร็จ', () => {
  it('เลือกรูปที่ชื่อภาษาไทย: อัปโหลดด้วยชื่อไฟล์ใหม่ที่เป็น ASCII และบันทึก URL รูปในรายงาน', async () => {
    เปิดหน้า()
    // รูปจากแกลเลอรีที่ตั้งชื่อเป็นภาษาไทย (PNG จริง — ผ่านการตรวจลายเซ็นไฟล์)
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
    const ไฟล์ = new File([png], 'ทดสอบ_รูปแมว.png', { type: 'image/png' })
    // AI วิเคราะห์สายพันธุ์ (เรียก fetch) — ตอบว่าวิเคราะห์ไม่ได้ก็พอ เทสต์นี้สนใจแค่การอัปโหลด
    vi.stubGlobal('fetch', vi.fn(async (url) => String(url).includes('nominatim')
      ? { ok: true, json: async () => ({ address: { road: 'ถนนทดสอบ' } }) }
      : { ok: false, status: 500, json: async () => ({}) }))

    const ช่องไฟล์ = document.querySelector('input[type="file"]:not([capture])') || document.querySelector('input[type="file"]')
    await userEvent.upload(ช่องไฟล์, ไฟล์)
    await waitFor(() => expect(screen.queryByText(/กำลังวิเคราะห์/)).not.toBeInTheDocument())

    await userEvent.click(screen.getByRole('button', { name: 'ดึงตำแหน่งปัจจุบัน' }))
    await userEvent.click(screen.getByRole('button', { name: /สัตว์บาดเจ็บ/ }))
    await waitFor(() => expect(ปุ่มส่ง()).toBeEnabled())
    await userEvent.click(ปุ่มส่ง())

    expect(await screen.findByText('แจ้งสำเร็จแล้ว!')).toBeInTheDocument()
    expect(db.uploads).toHaveLength(1)
    expect(db.uploads[0].key).toMatch(/^[\x21-\x7E]+\.png$/)
    expect(db.uploads[0].key).not.toContain('ทดสอบ')
    expect(รายงานที่ถูกบันทึก()[0].payload.image_url).toBe(`https://files.test/${db.uploads[0].key}`)
  })
})
