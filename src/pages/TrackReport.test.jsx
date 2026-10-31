// @vitest-environment jsdom
// Integration test: หน้าติดตามรายงานของผู้แจ้ง — แท็บ, แถบความคืบหน้า, ข้อมูลเจ้าหน้าที่ (RPC), ลิงก์จากแจ้งเตือน
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import TrackReport from './TrackReport'
import { db, รีเซ็ตฐานข้อมูลปลอม, วันที่ผ่านมา } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const ผู้ใช้ = { id: 'u-test' }

const รายงาน = (id, ส่วนที่ต่าง) => ({
  id, reporter_id: 'u-test', animal_type: 'หมาไทย', urgency: 'ปานกลาง', status: 'รอดำเนินการ',
  location_text: 'หน้าตลาด', detail: 'เจ็บขา', image_url: null, latitude: 14.02, longitude: 99.96,
  created_at: วันที่ผ่านมา(0), ...ส่วนที่ต่าง,
})

const ศูนย์ = [{
  name: 'เจ้าหน้าที่ทดสอบ', phone: '0853948659', shelter_name: 'ศูนย์พักพิงทดสอบ',
  shelter_location: 'ใกล้ๆบ่อ 1', service_area: 'กำแพงแสน', avatar_url: null,
}]

function เปิดหน้า(เส้นทาง = '/track') {
  return render(
    <MemoryRouter initialEntries={[เส้นทาง]}>
      <TrackReport user={ผู้ใช้} />
    </MemoryRouter>,
  )
}

// การ์ดรายงานคือ div ที่กดได้ มีรหัส #00000N อยู่ข้างใน
const การ์ด = (id) => screen.getByText(`#${String(id).padStart(6, '0')}`).closest('div.cursor-pointer')

beforeEach(() => {
  รีเซ็ตฐานข้อมูลปลอม({
    tables: {
      reports: [
        รายงาน(84, { status: 'ปฏิเสธ (ไม่เกี่ยวข้อง)' }),
        รายงาน(85, { urgency: 'ด่วน' }),
        รายงาน(86, { urgency: 'ด่วนมาก', status: 'รับเรื่องแล้ว' }),
        รายงาน(87, { status: 'อยู่ศูนย์พักพิง' }),
        รายงาน(88, { status: 'ยกเลิกโดยผู้แจ้ง' }),
        { ...รายงาน(89), reporter_id: 'u-other' },   // ของคนอื่น ต้องไม่เห็น
      ],
    },
    rpc: { get_shelter_contact: ศูนย์ },
  })
})

describe('รายการรายงานและแท็บ', () => {
  it('แยกกำลังดำเนินการ (ยังไม่ปิด) กับประวัติ (ปิดแล้ว) และนับเฉพาะของตัวเอง', async () => {
    เปิดหน้า()
    expect(await screen.findByRole('button', { name: /กำลังดำเนินการ.*2/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /ประวัติการแจ้ง.*3/ })).toBeInTheDocument()
    expect(screen.queryByText('#000089')).not.toBeInTheDocument()
  })

  it('แท็บกำลังดำเนินการเห็นเฉพาะเคสที่ยังไม่ปิด', async () => {
    เปิดหน้า()
    await screen.findByText('#000085')
    expect(screen.getByText('#000086')).toBeInTheDocument()
    expect(screen.queryByText('#000084')).not.toBeInTheDocument()
    expect(screen.queryByText('#000087')).not.toBeInTheDocument()
  })

  it('แท็บประวัติเห็นเคสที่ปิดแล้ว (ปฏิเสธ / อยู่ศูนย์พักพิง / ยกเลิก)', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByRole('button', { name: /ประวัติการแจ้ง/ }))
    for (const id of [84, 87, 88]) expect(screen.getByText(`#0000${id}`)).toBeInTheDocument()
  })

  it('ไม่มีรายงานเลย: ขึ้นข้อความว่าง และมีปุ่มไปแจ้งสัตว์จร', async () => {
    db.tables.reports = []
    เปิดหน้า()
    expect(await screen.findByText('คุณยังไม่มีรายงาน')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'แจ้งสัตว์จร' })).toBeInTheDocument()
  })

  it('อ่านรายงานไม่ได้ (ฐานข้อมูลล่ม): แจ้งว่าโหลดไม่สำเร็จ ไม่บอกว่า "ยังไม่มีรายงาน"', async () => {
    db.errors['reports:select'] = 'timeout'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    expect(await screen.findByText(/โหลดรายงานของคุณไม่สำเร็จ|ไม่ได้เชื่อมต่ออินเทอร์เน็ต/)).toBeInTheDocument()
    expect(screen.queryByText('คุณยังไม่มีรายงาน')).not.toBeInTheDocument()
    เสียงError.mockRestore()
  })
})

describe('ชื่อประเภทการแจ้ง (ตรงกับหน้าแจ้งสัตว์จร)', () => {
  it('ป้ายประเภทใช้ชื่อสั้นจากไฟล์กลาง', async () => {
    เปิดหน้า()
    await screen.findByText('#000085')
    expect(within(การ์ด(86)).getByText('ดุร้าย / เสี่ยงอันตราย')).toBeInTheDocument()
    expect(within(การ์ด(85)).getByText('บาดเจ็บ')).toBeInTheDocument()
  })
})

describe('แถบความคืบหน้า (stepper)', () => {
  it('เคสปกติที่ยังไม่รับเรื่อง มี 4 ขั้น ตามประเภทการแจ้ง', async () => {
    เปิดหน้า()
    await screen.findByText('#000085')
    const ในการ์ด = within(การ์ด(85))
    for (const ป้าย of ['แจ้งรายงาน', 'รับเรื่อง', 'ลงพื้นที่', 'รักษาตัว']) {
      expect(ในการ์ด.getByText(ป้าย)).toBeInTheDocument()
    }
  })

  it('เคสที่เจ้าหน้าที่ปฏิเสธ มีแค่ 2 จุด: แจ้งรายงาน → ปฏิเสธ (ไม่มีรับเรื่อง/ลงพื้นที่ที่ไม่เคยเกิด)', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByRole('button', { name: /ประวัติการแจ้ง/ }))
    const ในการ์ด = within(การ์ด(84))
    expect(ในการ์ด.getByText('แจ้งรายงาน')).toBeInTheDocument()
    expect(ในการ์ด.getAllByText('ปฏิเสธ (ไม่เกี่ยวข้อง)').length).toBeGreaterThanOrEqual(1)
    expect(ในการ์ด.queryByText('รับเรื่อง')).not.toBeInTheDocument()
    expect(ในการ์ด.queryByText('ลงพื้นที่ค้นหา')).not.toBeInTheDocument()
  })

  it('เคสที่ปิดแล้วด้วยสถานะอื่น (อยู่ศูนย์พักพิง) ยังมีครบ 4 ขั้นและขั้นสุดท้ายเป็นสถานะจริง', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByRole('button', { name: /ประวัติการแจ้ง/ }))
    const ในการ์ด = within(การ์ด(87))
    expect(ในการ์ด.getByText('รับเรื่อง')).toBeInTheDocument()
    expect(ในการ์ด.getAllByText('อยู่ศูนย์พักพิง').length).toBeGreaterThanOrEqual(1)
  })
})

describe('รายละเอียดรายงาน + ข้อมูลเจ้าหน้าที่ (RPC get_shelter_contact)', () => {
  it('เปิดเคสที่เจ้าหน้าที่รับเรื่องแล้ว: เห็นชื่อศูนย์ ที่ตั้ง และเบอร์โทร', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByText('#000086'))
    const ชีต = await screen.findByRole('dialog')
    expect(await within(ชีต).findByText('ศูนย์พักพิงทดสอบ')).toBeInTheDocument()
    expect(within(ชีต).getByText('ใกล้ๆบ่อ 1')).toBeInTheDocument()
    expect(within(ชีต).getByRole('link', { name: /0853948659/ })).toHaveAttribute('href', 'tel:0853948659')
    expect(db.rpcCalls.some((c) => c.name === 'get_shelter_contact')).toBe(true)
  })

  it('ดึงข้อมูลเจ้าหน้าที่ไม่ได้: แสดงข้อความว่าไม่พบ ไม่ค้างที่ "กำลังโหลด" (บั๊กเดิมที่ RLS ซ่อนแถว)', async () => {
    db.rpc = {}
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    await userEvent.click(await screen.findByText('#000086'))
    const ชีต = await screen.findByRole('dialog')
    expect(await within(ชีต).findByText(/ยังไม่พบข้อมูลติดต่อเจ้าหน้าที่/)).toBeInTheDocument()
    expect(within(ชีต).queryByText(/กำลังโหลดข้อมูลเจ้าหน้าที่/)).not.toBeInTheDocument()
    เสียงError.mockRestore()
  })

  it('เคสที่ยังไม่มีใครรับเรื่อง: แจ้งว่ารอเจ้าหน้าที่ ไม่โชว์ข้อมูลเจ้าหน้าที่', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByText('#000085'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText('รอเจ้าหน้าที่รับเรื่อง')).toBeInTheDocument()
    expect(within(ชีต).queryByText('ศูนย์พักพิงทดสอบ')).not.toBeInTheDocument()
  })

  it('เคสที่เจ้าหน้าที่ปฏิเสธ: แจ้งว่าเจ้าหน้าที่ปิดรายงานแล้ว', async () => {
    เปิดหน้า()
    await userEvent.click(await screen.findByRole('button', { name: /ประวัติการแจ้ง/ }))
    await userEvent.click(screen.getByText('#000084'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText('เจ้าหน้าที่ปิดรายงานนี้แล้ว')).toBeInTheDocument()
  })

  it('ลิงก์จากการแจ้งเตือน (?open=id) เปิดรายละเอียดของเคสนั้นอัตโนมัติ', async () => {
    เปิดหน้า('/track?open=85')
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText('รายงาน #000085')).toBeInTheDocument()
  })
})
