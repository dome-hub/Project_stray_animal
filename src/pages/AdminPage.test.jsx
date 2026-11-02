// @vitest-environment jsdom
// Integration + unit test: หน้าแอดมิน (AdminPage) — ภาพรวม/ผู้ใช้/พื้นที่/Export/ตั้งค่า/Log
//
// ครอบคลุม:
//  - Dashboard: สถิติรวม, เทียบเดือนนี้กับเดือนก่อน, งานค้าง, อัตราการรับเลี้ยง, โหลดพลาด+ลองใหม่
//  - ผู้ใช้: ค้นหา/กรอง, แบ่งหน้า (รวม "..." เลขหน้า), เลือกหลายคน (ยกเว้นตัวเอง),
//    เปลี่ยน role / ระงับบัญชี ทีละคนและหลายคนพร้อมกัน (ต้องผ่านขั้นยืนยัน + เรียก RPC)
//  - พื้นที่: จัดกลุ่มสถานะ 4 กลุ่มลงหมุด, กรองตามกลุ่ม
//  - Export: นับจำนวน, Export CSV จริง (ตรวจการกันสูตร CSV/Excel), กรณีไม่มีข้อมูล/error
//  - บันทึกการใช้งาน: กรองตามชนิด action, แปลง actor_id/record_id เป็นชื่อคน
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import AdminPage from './AdminPage'
import { db, รีเซ็ตฐานข้อมูลปลอม } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const ผู้ใช้แอดมิน = { id: 'admin-1', email: 'admin@test.com', name: 'แอดมินทดสอบ' }

function เปิดหน้า(หน้า, { user = ผู้ใช้แอดมิน, entries } = {}) {
  return render(
    <MemoryRouter initialEntries={entries || [`/admin/${หน้า}`]}>
      <AdminPage หน้า={หน้า} user={user} />
    </MemoryRouter>,
  )
}

// ===================================================================================
// Dashboard
// ===================================================================================
describe('หน้าภาพรวม (dashboard)', () => {
  // ควบคุมเวลา "วันนี้" ให้เป็นกลางเดือน มิ.ย. 2569 กันผลเทสต์ขึ้นกับวันที่รันจริง
  // และกันปัญหาขอบเดือนเพี้ยนไปตาม timezone ของเครื่องที่รัน (ใช้เวลากลางเดือนให้ชัวร์)
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
  })
  afterEach(() => { vi.useRealTimers() })

  const มิ6_10 = '2026-06-10T04:00:00.000Z'   // เดือนนี้
  const มิ6_11 = '2026-06-11T04:00:00.000Z'   // เดือนนี้
  const พค5_10 = '2026-05-10T04:00:00.000Z'   // เดือนก่อน
  const เมย4_05 = '2026-04-05T04:00:00.000Z'  // เก่ากว่าเดือนก่อน

  function ข้อมูลครบ() {
    รีเซ็ตฐานข้อมูลปลอม({
      tables: {
        users: [
          { id: 'u1', created_at: มิ6_10 },
          { id: 'u2', created_at: มิ6_11 },
          { id: 'u3', created_at: พค5_10 },
          { id: 'u4', created_at: เมย4_05 },
          { id: 'u5', created_at: เมย4_05 },
        ],
        reports: [
          { id: 1, status: 'รอดำเนินการ', created_at: มิ6_10 },
          { id: 2, status: 'รับเรื่องแล้ว', created_at: มิ6_10 },
          { id: 3, status: 'รับเรื่องแล้ว', created_at: มิ6_11 },
          { id: 4, status: 'รับเรื่องแล้ว', created_at: มิ6_11 },
          { id: 5, status: 'รอดำเนินการ', created_at: พค5_10 },
          { id: 6, status: 'รับเรื่องแล้ว', created_at: พค5_10 },
          { id: 7, status: 'รอดำเนินการ', created_at: เมย4_05 },
          { id: 8, status: 'รับเรื่องแล้ว', created_at: เมย4_05 },
          { id: 9, status: 'รับเรื่องแล้ว', created_at: เมย4_05 },
          { id: 10, status: 'รับเรื่องแล้ว', created_at: เมย4_05 },
        ],
        animals: [
          { id: 1, status: 'มีผู้รับเลี้ยง', created_at: มิ6_10 },
          { id: 2, status: 'มีผู้รับเลี้ยง', created_at: พค5_10 },
          { id: 3, status: 'มีผู้รับเลี้ยง', created_at: เมย4_05 },
          { id: 4, status: 'อยู่ศูนย์พักพิง', created_at: มิ6_10 },
          { id: 5, status: 'อยู่ศูนย์พักพิง', created_at: มิ6_10 },
          { id: 6, status: 'อยู่ศูนย์พักพิง', created_at: พค5_10 },
          { id: 7, status: 'อยู่ศูนย์พักพิง', created_at: เมย4_05 },
          { id: 8, status: 'อยู่ศูนย์พักพิง', created_at: เมย4_05 },
        ],
      },
    })
  }

  it('สถิติรวม + เทียบเดือนนี้กับเดือนก่อน + อัตราการรับเลี้ยง คำนวณถูกต้อง', async () => {
    ข้อมูลครบ()
    เปิดหน้า('dashboard')

    expect(await screen.findByText('5')).toBeInTheDocument()   // ผู้ใช้งานทั้งหมด
    expect(screen.getByText('10')).toBeInTheDocument()          // รายงานทั้งหมด
    expect(screen.getByText('8')).toBeInTheDocument()           // สัตว์ในระบบ
    expect(screen.getByText('3')).toBeInTheDocument()           // รับเลี้ยงแล้ว

    // งานค้าง: สถานะ 'รอดำเนินการ' สะสม = เคส 1,5,7 = 3 รายการ (ไม่ผูกกับเดือน)
    expect(screen.getByText('มีรายงานรอดำเนินการ 3 รายการ')).toBeInTheDocument()
    expect(screen.queryByText('ไม่มีรายงานค้างดำเนินการตอนนี้')).not.toBeInTheDocument()

    // สรุปเดือนนี้: รายงานใหม่ 4 (เดือนก่อน 2) → +2, การรับเลี้ยง 1 (เดือนก่อน 1) → เท่าเดิม, ผู้ใช้ใหม่ 2 (เดือนก่อน 1) → +1
    expect(screen.getByText('4 รายการ')).toBeInTheDocument()
    expect(screen.getByText(/\+2 จากเดือนก่อน/)).toBeInTheDocument()
    expect(screen.getByText('1 รายการ')).toBeInTheDocument()
    expect(screen.getByText(/เท่าเดิม/)).toBeInTheDocument()
    expect(screen.getByText('2 รายการ')).toBeInTheDocument()
    expect(screen.getByText(/\+1 จากเดือนก่อน/)).toBeInTheDocument()

    // อัตราการรับเลี้ยง = round(3/8*100) = 38%
    expect(screen.getByText('38%')).toBeInTheDocument()
    expect(screen.getByText('3 จาก 8 ตัวในระบบ')).toBeInTheDocument()
  })

  it('ไม่มีข้อมูลเลย: งานค้างแสดงกล่องสีเขียว และอัตรารับเลี้ยงไม่หารด้วยศูนย์ (0% ไม่ใช่ NaN)', async () => {
    รีเซ็ตฐานข้อมูลปลอม({ tables: { users: [], reports: [], animals: [] } })
    เปิดหน้า('dashboard')

    expect(await screen.findByText('ไม่มีรายงานค้างดำเนินการตอนนี้')).toBeInTheDocument()
    expect(screen.queryByText(/มีรายงานรอดำเนินการ/)).not.toBeInTheDocument()
    expect(screen.getByText('0%')).toBeInTheDocument()
    expect(screen.getByText('0 จาก 0 ตัวในระบบ')).toBeInTheDocument()
  })

  it('query ใดพลาดแม้แต่ตัวเดียว: ขึ้นสถานะโหลดไม่สำเร็จทั้งแดชบอร์ด (ไม่ใช่ตัวเลข 0 ที่ดูเหมือนปกติ) และลองใหม่สำเร็จ', async () => {
    รีเซ็ตฐานข้อมูลปลอม({ tables: { users: [], reports: [], animals: [] }, errors: { 'users:select': 'เซิร์ฟเวอร์ล่ม' } })
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('dashboard')

    expect(await screen.findByText('โหลดภาพรวมระบบไม่สำเร็จ')).toBeInTheDocument()
    expect(screen.queryByText('ไม่มีรายงานค้างดำเนินการตอนนี้')).not.toBeInTheDocument()

    delete db.errors['users:select']
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/ }))

    expect(await screen.findByText('ไม่มีรายงานค้างดำเนินการตอนนี้')).toBeInTheDocument()
    เสียงError.mockRestore()
  })
})

// ===================================================================================
// จัดการผู้ใช้
// ===================================================================================
describe('หน้าจัดการผู้ใช้ (users)', () => {
  const ผู้ใช้ตัวอย่าง = () => [
    { id: 'admin-1',    name: 'แอดมินทดสอบ',  email: 'admin@test.com',     role: 'admin',     status: 'active',    created_at: '2026-01-05T00:00:00Z' },
    { id: 'u-admin2',   name: 'แอดมินสอง',     email: 'admin2@test.com',   role: 'admin',     status: 'active',    created_at: '2026-01-04T00:00:00Z' },
    { id: 'u-suspended',name: 'คนถูกระงับ',    email: 'suspended@test.com',role: 'user',      status: 'suspended', created_at: '2026-01-03T00:00:00Z' },
    { id: 'u-somsri',   name: 'สมศรี รักสัตว์', email: 'somsri@test.com',   role: 'volunteer', status: 'active',
      shelter_name: 'ศูนย์ A', shelter_location: 'ที่ตั้ง A', service_area: 'พื้นที่ A', created_at: '2026-01-02T00:00:00Z' },
    { id: 'u-somchai',  name: 'สมชาย ใจดี',    email: 'somchai@test.com',  role: 'user',      status: 'active',    created_at: '2026-01-01T00:00:00Z' },
  ]

  beforeEach(() => {
    รีเซ็ตฐานข้อมูลปลอม({
      tables: { users: ผู้ใช้ตัวอย่าง(), reports: [] },
      rpc: { admin_set_user_role: null, admin_set_user_status: null },
    })
  })

  // ใช้ getAllByText เพราะชื่อเดียวกันอาจโผล่ซ้ำใน sheet รายละเอียดที่เปิดอยู่ด้วย (หัวข้อ/คำบรรยายในขั้นยืนยัน)
  // เลือกเฉพาะอันที่อยู่ในแถวรายชื่อ (มี class cursor-pointer) เท่านั้น
  const แถว = (ข้อความ) => screen.getAllByText(ข้อความ).map((el) => el.closest('div.cursor-pointer')).find(Boolean)

  it('แสดงรายชื่อครบ พร้อมป้าย role/สถานะ และป้าย "คุณ" เฉพาะแถวตัวเอง', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')

    expect(screen.getByText('ทั้งหมด 5 คน')).toBeInTheDocument()
    expect(within(แถว('แอดมินทดสอบ')).getByText('คุณ')).toBeInTheDocument()
    expect(within(แถว('สมชาย ใจดี')).queryByText('คุณ')).not.toBeInTheDocument()
    expect(within(แถว('คนถูกระงับ')).getByText('ระงับ')).toBeInTheDocument()
    expect(within(แถว('สมชาย ใจดี')).getByText('ใช้งาน')).toBeInTheDocument()
    expect(within(แถว('สมศรี รักสัตว์')).getByText('เจ้าหน้าที่')).toBeInTheDocument()
  })

  it('ค้นหาด้วยชื่อหรืออีเมล (ไม่สนตัวพิมพ์เล็กใหญ่)', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')
    await userEvent.type(screen.getByPlaceholderText('ค้นหาชื่อหรืออีเมล...'), 'SOMCHAI')
    expect(screen.getByText('สมชาย ใจดี')).toBeInTheDocument()
    expect(screen.queryByText('สมศรี รักสัตว์')).not.toBeInTheDocument()
    expect(screen.getByText('ทั้งหมด 1 คน')).toBeInTheDocument()
  })

  it('กรองตามสิทธิ์ (Role)', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')
    await userEvent.selectOptions(screen.getByDisplayValue('ทุกสิทธิ์'), 'admin')
    expect(screen.getByText('แอดมินทดสอบ')).toBeInTheDocument()
    expect(screen.getByText('แอดมินสอง')).toBeInTheDocument()
    expect(screen.queryByText('สมชาย ใจดี')).not.toBeInTheDocument()
    expect(screen.getByText('ทั้งหมด 2 คน')).toBeInTheDocument()
  })

  it('กรองตามสถานะ', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')
    await userEvent.selectOptions(screen.getByDisplayValue('ทุกสถานะ'), 'suspended')
    expect(screen.getByText('คนถูกระงับ')).toBeInTheDocument()
    expect(screen.queryByText('สมชาย ใจดี')).not.toBeInTheDocument()
    expect(screen.getByText('ทั้งหมด 1 คน')).toBeInTheDocument()
  })

  it('ทางลัดจาก Dashboard ("ดูผู้ใช้ที่ถูกระงับ") ตั้งตัวกรองสถานะล่วงหน้าให้ทันที', async () => {
    เปิดหน้า('users', { entries: [{ pathname: '/admin/users', state: { presetStatus: 'suspended' } }] })
    await screen.findByText('คนถูกระงับ')
    expect(screen.queryByText('สมชาย ใจดี')).not.toBeInTheDocument()
    expect(screen.getByDisplayValue('ถูกระงับ')).toBeInTheDocument()
  })

  it('ไม่มีผู้ใช้ในระบบเลย: ข้อความต่างจากกรณีกรองแล้วไม่พบ', async () => {
    db.tables.users = []
    เปิดหน้า('users')
    expect(await screen.findByText('ยังไม่มีผู้ใช้ในระบบ')).toBeInTheDocument()
  })

  it('มีผู้ใช้แต่กรองแล้วไม่พบ: ข้อความคนละแบบกับตอนไม่มีผู้ใช้เลย', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')
    await userEvent.type(screen.getByPlaceholderText('ค้นหาชื่อหรืออีเมล...'), 'ไม่มีคนนี้แน่นอน')
    expect(await screen.findByText('ไม่พบผู้ใช้ที่ตรงกับตัวกรอง')).toBeInTheDocument()
    expect(screen.queryByText('ยังไม่มีผู้ใช้ในระบบ')).not.toBeInTheDocument()
  })

  it('โหลดรายชื่อผู้ใช้พลาด: ขึ้น LoadFailed และลองใหม่สำเร็จ', async () => {
    db.errors['users:select'] = 'down'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('users')
    expect(await screen.findByText('โหลดรายชื่อผู้ใช้ไม่สำเร็จ')).toBeInTheDocument()

    delete db.errors['users:select']
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/ }))
    expect(await screen.findByText('สมชาย ใจดี')).toBeInTheDocument()
    เสียงError.mockRestore()
  })

  it('ตัวเองไม่มี checkbox ให้เลือก และเปิดดูบัญชีตัวเองได้แต่แก้ไขไม่ได้', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')
    expect(screen.queryByLabelText('เลือก แอดมินทดสอบ')).not.toBeInTheDocument()

    await userEvent.click(แถว('แอดมินทดสอบ'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText('ไม่สามารถแก้ไขบัญชีตัวเองได้')).toBeInTheDocument()
    expect(within(ชีต).queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('เปลี่ยน Role ทีละคน: ต้องผ่านขั้นยืนยันก่อน แล้วเรียก RPC admin_set_user_role และอัปเดตป้ายใน list', async () => {
    เปิดหน้า('users')
    await userEvent.click(await screen.findByText('สมชาย ใจดี'))
    const ชีต = await screen.findByRole('dialog')

    await userEvent.selectOptions(within(ชีต).getByRole('combobox'), 'volunteer')
    expect(await screen.findByText('เปลี่ยนสิทธิ์ผู้ใช้?')).toBeInTheDocument()
    expect(screen.getByText('คุณต้องการเปลี่ยนสิทธิ์ของ "สมชาย ใจดี" เป็น "เจ้าหน้าที่ / อาสาสมัคร" ใช่หรือไม่?')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์' }))

    expect(await screen.findByText('เปลี่ยนสิทธิ์เป็น "เจ้าหน้าที่ / อาสาสมัคร" แล้ว')).toBeInTheDocument()
    const เรียกRPC = db.rpcCalls.find((c) => c.name === 'admin_set_user_role')
    expect(เรียกRPC.args).toEqual({ target_ids: ['u-somchai'], new_role: 'volunteer' })
    expect(within(แถว('สมชาย ใจดี')).getByText('เจ้าหน้าที่')).toBeInTheDocument()
  })

  it('ระงับบัญชีทีละคน แล้วยกเลิกการระงับได้ — ทั้งสองทางเรียก RPC admin_set_user_status ด้วย status ที่ถูกต้อง', async () => {
    เปิดหน้า('users')
    await userEvent.click(await screen.findByText('สมชาย ใจดี'))
    let ชีต = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(ชีต).getByRole('combobox'), 'suspend-action')
    expect(await screen.findByText('ระงับบัญชีนี้?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันระงับบัญชี' }))

    expect(await screen.findByText('ระงับบัญชีแล้ว')).toBeInTheDocument()
    expect(db.rpcCalls.at(-1)).toMatchObject({ name: 'admin_set_user_status', args: { target_ids: ['u-somchai'], new_status: 'suspended' } })
    expect(within(แถว('สมชาย ใจดี')).getByText('ระงับ')).toBeInTheDocument()

    // ยกเลิกการระงับ — เลือกตัวเลือกเดิมอีกครั้ง (ตอนนี้กลายเป็น "ยกเลิกการระงับบัญชี")
    ชีต = screen.getByRole('dialog')
    await userEvent.selectOptions(within(ชีต).getByRole('combobox'), 'suspend-action')
    expect(await screen.findByText('ยกเลิกการระงับบัญชี?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันยกเลิกการระงับ' }))

    expect(await screen.findByText('ยกเลิกการระงับบัญชีแล้ว')).toBeInTheDocument()
    expect(db.rpcCalls.at(-1)).toMatchObject({ name: 'admin_set_user_status', args: { target_ids: ['u-somchai'], new_status: 'active' } })
    expect(within(แถว('สมชาย ใจดี')).getByText('ใช้งาน')).toBeInTheDocument()
  })

  it('ระงับบัญชีแอดมินด้วยกันไม่ได้: ไม่มีตัวเลือกระงับ มีแต่ข้อความอธิบาย', async () => {
    เปิดหน้า('users')
    await userEvent.click(await screen.findByText('แอดมินสอง'))
    const ชีต = await screen.findByRole('dialog')
    expect(within(ชีต).getByText('ไม่สามารถระงับบัญชีผู้ดูแลระบบ (Admin) ได้')).toBeInTheDocument()
    expect(within(ชีต).getAllByRole('option')).toHaveLength(3)   // user/volunteer/admin เท่านั้น ไม่มี suspend-action
  })

  it('RPC เปลี่ยนสิทธิ์ล้มเหลว: toastError ด้วยข้อความไทย และ list ไม่เปลี่ยน', async () => {
    db.rpc.admin_set_user_role = () => ({ error: 'permission denied for table users' })
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('users')
    await userEvent.click(await screen.findByText('สมชาย ใจดี'))
    const ชีต = await screen.findByRole('dialog')
    await userEvent.selectOptions(within(ชีต).getByRole('combobox'), 'admin')
    await userEvent.click(await screen.findByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์' }))

    expect(await screen.findByText('คุณไม่มีสิทธิ์ทำรายการนี้ หากคิดว่าผิดพลาดกรุณาติดต่อผู้ดูแลระบบ')).toBeInTheDocument()
    expect(within(แถว('สมชาย ใจดี')).getByText('ผู้ใช้')).toBeInTheDocument()   // ยังเป็น user เดิม
    เสียงError.mockRestore()
  })

  it('เลือกหลายคนพร้อมกันยกเว้นตัวเอง แล้วระงับเฉพาะคนที่ระงับได้จริง (ไม่รวมแอดมิน/คนที่ถูกระงับอยู่แล้ว)', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')

    await userEvent.click(screen.getByLabelText('เลือกทั้งหมดในหน้านี้'))
    expect(screen.getByText('เลือกอยู่ 4 คน')).toBeInTheDocument()   // ทุกคนยกเว้นแอดมินทดสอบ (ตัวเอง)

    const แถบ = screen.getByText(/เลือกอยู่/).closest('div')
    await userEvent.click(within(แถบ).getByRole('button', { name: 'ระงับที่เลือก' }))
    // ระงับได้จริงแค่ 2 คน: สมชาย(user,active) + สมศรี(volunteer,active) — ไม่รวมแอดมินสอง(admin) และคนถูกระงับ(ถูกระงับอยู่แล้ว)
    expect(await screen.findByText('ยืนยันระงับบัญชี (2 คน)')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันระงับบัญชี (2 คน)' }))

    expect(await screen.findByText('ระงับบัญชี 2 คนแล้ว')).toBeInTheDocument()
    const เรียกRPC = db.rpcCalls.find((c) => c.name === 'admin_set_user_status')
    expect(new Set(เรียกRPC.args.target_ids)).toEqual(new Set(['u-somchai', 'u-somsri']))
    expect(within(แถว('สมชาย ใจดี')).getByText('ระงับ')).toBeInTheDocument()
    expect(within(แถว('สมศรี รักสัตว์')).getByText('ระงับ')).toBeInTheDocument()
    expect(within(แถว('แอดมินสอง')).getByText('ใช้งาน')).toBeInTheDocument()   // ไม่ถูกแตะ
    expect(screen.queryByText(/เลือกอยู่/)).not.toBeInTheDocument()   // ล้างการเลือกหลังทำสำเร็จ
  })

  it('เปลี่ยน Role หลายคนพร้อมกัน ใช้ "ทุกคนที่ติ๊กไว้" ไม่ใช่แค่ที่ role เปลี่ยนได้ (รวมแอดมินที่ติ๊กไว้ด้วย)', async () => {
    เปิดหน้า('users')
    await screen.findByText('สมชาย ใจดี')

    await userEvent.click(screen.getByLabelText('เลือกทั้งหมดในหน้านี้'))
    const แถบ = screen.getByText(/เลือกอยู่/).closest('div')
    await userEvent.selectOptions(within(แถบ).getByRole('combobox'), 'volunteer')

    expect(await screen.findByText('เปลี่ยนสิทธิ์ผู้ใช้ที่เลือก?')).toBeInTheDocument()
    expect(screen.getByText('คุณต้องการเปลี่ยนสิทธิ์ผู้ใช้ที่เลือกไว้ 4 คน เป็น "เจ้าหน้าที่ / อาสาสมัคร" ใช่หรือไม่?')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'ยืนยันเปลี่ยนสิทธิ์ (4 คน)' }))

    expect(await screen.findByText('เปลี่ยนสิทธิ์ 4 คน เป็น "เจ้าหน้าที่ / อาสาสมัคร" แล้ว')).toBeInTheDocument()
    const เรียกRPC = db.rpcCalls.find((c) => c.name === 'admin_set_user_role')
    expect(new Set(เรียกRPC.args.target_ids)).toEqual(new Set(['u-admin2', 'u-suspended', 'u-somsri', 'u-somchai']))
    // แอดมินสองถูกลดสิทธิ์ไปด้วย เพราะ bulk role ไม่กรองเหมือน bulk suspend
    expect(within(แถว('แอดมินสอง')).getByText('เจ้าหน้าที่')).toBeInTheDocument()
  })

  it('แบ่งหน้า: 25 คน แสดง 20 คนแรกในหน้า 1 และเหลือ 5 คนในหน้า 2', async () => {
    db.tables.users = Array.from({ length: 25 }, (_, i) => ({
      id: `gen-${i + 1}`, name: `ผู้ใช้ทดสอบ ${i + 1}`, email: `user${i + 1}@test.com`, role: 'user', status: 'active',
      created_at: `2026-02-${String((i % 28) + 1).padStart(2, '0')}T00:00:00Z`,
    }))
    เปิดหน้า('users')
    expect(await screen.findByText('ทั้งหมด 25 คน')).toBeInTheDocument()
    expect(screen.getAllByText(/^ผู้ใช้ทดสอบ /)).toHaveLength(20)

    await userEvent.click(screen.getByRole('button', { name: 'หน้าถัดไป' }))
    expect(screen.getAllByText(/^ผู้ใช้ทดสอบ /)).toHaveLength(5)
  })

  it('เลขหน้าแบบมี "..." เมื่อมีหลายหน้า และเปลี่ยนจำนวนต่อหน้าแล้วรีเซ็ตกลับหน้า 1', async () => {
    db.tables.users = Array.from({ length: 130 }, (_, i) => ({
      id: `gen-${i + 1}`, name: `ผู้ใช้ทดสอบ ${i + 1}`, email: `user${i + 1}@test.com`, role: 'user', status: 'active', created_at: '2026-02-01T00:00:00Z',
    }))
    เปิดหน้า('users')
    await screen.findByText('ทั้งหมด 130 คน')   // 7 หน้า (20/หน้า)

    const หน้าถัดไป = () => screen.getByRole('button', { name: 'หน้าถัดไป' })
    await userEvent.click(หน้าถัดไป())
    await userEvent.click(หน้าถัดไป())
    await userEvent.click(หน้าถัดไป())   // ไปหน้า 4

    const แถบเลขหน้า = screen.getByRole('button', { name: '4' }).parentElement
    expect(within(แถบเลขหน้า).getByText('1')).toBeInTheDocument()
    expect(within(แถบเลขหน้า).getAllByText('...')).toHaveLength(2)
    expect(within(แถบเลขหน้า).getByText('3')).toBeInTheDocument()
    expect(within(แถบเลขหน้า).getByText('5')).toBeInTheDocument()
    expect(within(แถบเลขหน้า).getByText('7')).toBeInTheDocument()
    expect(within(แถบเลขหน้า).queryByText('2')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: '4' })).toHaveClass('bg-purple-600')

    // เปลี่ยนจำนวนต่อหน้าเป็น 50 → 3 หน้า และกลับไปหน้า 1
    await userEvent.selectOptions(screen.getByDisplayValue('20'), '50')
    const แถบใหม่ = screen.getByRole('button', { name: '1' }).parentElement
    expect(within(แถบใหม่).queryByText('...')).not.toBeInTheDocument()
    expect(within(แถบใหม่).getByText('3')).toBeInTheDocument()
  })
})

// ===================================================================================
// จัดการพื้นที่ (แผนที่)
// ===================================================================================
describe('หน้าจัดการพื้นที่ (areas)', () => {
  const รายงานพื้นที่ = () => [
    { id: 1, animal_type: 'หมา', location_text: 'จุด1', detail: null, status: 'รอดำเนินการ',          latitude: 14.01, longitude: 99.96, created_at: '2026-01-01T00:00:00Z' },
    { id: 2, animal_type: 'แมว', location_text: 'จุด2', detail: 'รายละเอียด2', status: 'รับเรื่องแล้ว', latitude: 14.02, longitude: 99.97, created_at: '2026-01-02T00:00:00Z' },
    { id: 3, animal_type: 'หมา', location_text: 'จุด3', detail: null, status: 'ส่งคืนเจ้าของสำเร็จ',   latitude: 14.03, longitude: 99.98, created_at: '2026-01-03T00:00:00Z' },
    { id: 4, animal_type: 'แมว', location_text: 'จุด4', detail: null, status: 'เสียชีวิต',             latitude: 14.04, longitude: 99.99, created_at: '2026-01-04T00:00:00Z' },
    { id: 5, animal_type: 'นก',  location_text: 'จุด5', detail: null, status: 'สถานะใหม่ที่ไม่รู้จัก', latitude: 14.05, longitude: 100.00, created_at: '2026-01-05T00:00:00Z' },
  ]

  beforeEach(() => {
    รีเซ็ตฐานข้อมูลปลอม({ tables: { reports: รายงานพื้นที่() } })
  })

  it('จัดกลุ่มสถานะลง 4 กลุ่มถูกต้อง (รวมสถานะไม่รู้จักตกกลุ่ม "ปิดเคส / อื่นๆ") และเรียงรายการใหม่สุดก่อน', async () => {
    เปิดหน้า('areas')
    expect(await screen.findByText('5 จุด')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'รอดำเนินการ 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'กำลังดำเนินการ 1' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'สำเร็จ 1' })).toBeInTheDocument()
    // ปิดเคส/อื่นๆ = เสียชีวิต(4) + สถานะไม่รู้จัก(5) = 2
    expect(screen.getByRole('button', { name: 'ปิดเคส / อื่นๆ 2' })).toBeInTheDocument()

    const รายการ = screen.getAllByText(/^#0000\d{2} —/).map((el) => el.textContent)
    expect(รายการ).toEqual([
      '#000005 — นก', '#000004 — แมว', '#000003 — หมา', '#000002 — แมว', '#000001 — หมา',
    ])
  })

  it('กดเลือกกลุ่มได้หลายกลุ่ม (OR) และล้างตัวกรองได้', async () => {
    เปิดหน้า('areas')
    await screen.findByText('5 จุด')

    await userEvent.click(screen.getByRole('button', { name: 'รอดำเนินการ 1' }))
    expect(screen.getByText('1 / 5 จุด')).toBeInTheDocument()
    expect(screen.getByText('#000001 — หมา')).toBeInTheDocument()
    expect(screen.queryByText('#000002 — แมว')).not.toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'กำลังดำเนินการ 1' }))
    expect(screen.getByText('2 / 5 จุด')).toBeInTheDocument()
    expect(screen.getByText('#000002 — แมว')).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'ล้างตัวกรอง' }))
    expect(screen.getByText('5 จุด')).toBeInTheDocument()
    expect(screen.getByText('#000003 — หมา')).toBeInTheDocument()
  })

  it('เลือกกลุ่มที่ไม่มีเคสจริง: ขึ้นข้อความ "ไม่มีเคสในสถานะที่เลือก" ไม่ใช่รายการว่างเงียบๆ', async () => {
    db.tables.reports = [รายงานพื้นที่()[0], รายงานพื้นที่()[1]]   // มีแค่ waiting + active
    เปิดหน้า('areas')
    await screen.findByText('2 จุด')
    await userEvent.click(screen.getByRole('button', { name: 'สำเร็จ 0' }))
    expect(screen.getByText('0 / 2 จุด')).toBeInTheDocument()
    expect(screen.getByText('ไม่มีเคสในสถานะที่เลือก')).toBeInTheDocument()
  })

  it('ไม่มีรายงานที่มีพิกัดเลย: ไม่มี chip กรอง และไม่มีรายการใต้แผนที่ (ไม่พัง)', async () => {
    db.tables.reports = []
    เปิดหน้า('areas')
    expect(await screen.findByText('0 จุด')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /รอดำเนินการ/ })).not.toBeInTheDocument()
    expect(screen.queryByText('เคสบนแผนที่')).not.toBeInTheDocument()
  })

  it('ดึงตำแหน่งรายงานพลาด: ขึ้น LoadFailed และลองใหม่สำเร็จ', async () => {
    db.errors['reports:select'] = 'down'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('areas')
    expect(await screen.findByText('โหลดตำแหน่งรายงานไม่สำเร็จ')).toBeInTheDocument()

    delete db.errors['reports:select']
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/ }))
    expect(await screen.findByText('5 จุด')).toBeInTheDocument()
    เสียงError.mockRestore()
  })
})

// ===================================================================================
// Export รายงาน
// ===================================================================================
describe('หน้า Export รายงาน', () => {
  let createObjectURL, revokeObjectURL, anchorClick
  let anchors

  beforeEach(() => {
    รีเซ็ตฐานข้อมูลปลอม({ tables: { reports: [{ id: 1 }, { id: 2 }, { id: 3 }], animals: [{ id: 1 }, { id: 2 }], users: [{ id: 1 }] } })
    anchors = []
    const สร้างเดิม = document.createElement.bind(document)
    vi.spyOn(document, 'createElement').mockImplementation((tag) => {
      const el = สร้างเดิม(tag)
      if (tag === 'a') anchors.push(el)
      return el
    })
    createObjectURL = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock-url')
    revokeObjectURL = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => {})
    anchorClick = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
  })

  afterEach(() => {
    createObjectURL.mockRestore()
    revokeObjectURL.mockRestore()
    anchorClick.mockRestore()
    vi.restoreAllMocks()
  })

  const แถวรายการ = (ชื่อ) => screen.getByText(ชื่อ).closest('div.justify-between')

  it('นับจำนวนที่ Export ได้ถูกต้องตามตารางจริง', async () => {
    เปิดหน้า('export')
    await screen.findByText('ข้อมูลที่ Export ได้')
    expect(within(แถวรายการ('รายงานสัตว์จรทั้งหมด')).getByText('3 รายการ')).toBeInTheDocument()
    expect(within(แถวรายการ('ข้อมูลสัตว์ในระบบ')).getByText('2 ตัว')).toBeInTheDocument()
    expect(within(แถวรายการ('ข้อมูลผู้ใช้งาน')).getByText('1 คน')).toBeInTheDocument()
  })

  it('นับจำนวนพลาด: ขึ้น "นับจำนวนไม่ได้" แทน 0 ที่ทำให้เข้าใจผิดว่าไม่มีข้อมูล', async () => {
    db.errors['reports:select'] = 'down'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('export')
    await screen.findByText('ข้อมูลที่ Export ได้')
    expect(within(แถวรายการ('รายงานสัตว์จรทั้งหมด')).getByText('นับจำนวนไม่ได้ — ยังกดโหลดได้')).toBeInTheDocument()
    เสียงError.mockRestore()
  })

  it('CSV กันสูตร Excel/CSV injection: ค่าที่ขึ้นต้นด้วย = + - @ tab หรือ CR ถูกเติม \' และ quote ภายในถูก escape เป็น ""', async () => {
    db.tables.users = [{
      id: 1,
      eq: '=1+1',
      plus: '+1',
      minus: '-1',
      at: '@user',
      tab: '\tindented',
      cr: '\rreturn',
      quote: 'she said "hello"',
      empty: null,
      normal: 'ปกติ 123',
    }]
    เปิดหน้า('export')
    await screen.findByText('ข้อมูลที่ Export ได้')
    await userEvent.click(within(แถวรายการ('ข้อมูลผู้ใช้งาน')).getByRole('button', { name: /CSV/ }))

    await waitFor(() => expect(createObjectURL).toHaveBeenCalledTimes(1))
    const blob = createObjectURL.mock.calls[0][0]

    // ตรวจไบต์ดิบว่ามี BOM (EF BB BF) จริงสำหรับ Excel ภาษาไทย — blob.text() เป็นฝั่งถอดรหัส UTF-8
    // ซึ่งตามสเปก TextDecoder จะตัด BOM ทิ้งให้อัตโนมัติ (ignoreBOM เป็น false โดยปริยาย) จึงต้องเช็คที่ไบต์ดิบแยก
    const ไบต์ = new Uint8Array(await blob.arrayBuffer())
    expect([...ไบต์.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf])

    const เนื้อหา = await blob.text()
    const header = '"id","eq","plus","minus","at","tab","cr","quote","empty","normal"'
    const แถวที่หวัง = '"1","\'=1+1","\'+1","\'-1","\'@user","\'\tindented","\'\rreturn","she said ""hello""","","ปกติ 123"'
    expect(เนื้อหา).toBe([header, แถวที่หวัง].join('\n'))
    expect(blob.type).toBe('text/csv;charset=utf-8')
    expect(anchors.at(-1).download).toMatch(/^ผู้ใช้งาน_.+\.csv$/)
  })

  it('ตารางไม่มีข้อมูล: แจ้งด้วย toast ปกติ (ไม่ใช่สีแดง) ไม่สร้างไฟล์ดาวน์โหลด', async () => {
    db.tables.animals = []
    เปิดหน้า('export')
    await screen.findByText('ข้อมูลที่ Export ได้')
    await userEvent.click(within(แถวรายการ('ข้อมูลสัตว์ในระบบ')).getByRole('button', { name: /CSV/ }))

    const toast = await screen.findByText('ยังไม่มีข้อมูลในตารางนี้')
    expect(toast.closest('div')).toHaveClass('bg-gray-800')
    expect(createObjectURL).not.toHaveBeenCalled()
  })

  it('ดึงข้อมูลเพื่อ export พลาด: toastError ข้อความไทย ไม่สร้างไฟล์ดาวน์โหลด', async () => {
    db.errors['reports:select'] = 'timeout'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('export')
    await screen.findByText('ข้อมูลที่ Export ได้')
    await userEvent.click(within(แถวรายการ('รายงานสัตว์จรทั้งหมด')).getByRole('button', { name: /CSV/ }))

    const toast = await screen.findByText('ระบบตอบสนองช้าเกินไป กรุณาลองใหม่อีกครั้ง')
    expect(toast.closest('div')).toHaveClass('bg-red-600')
    expect(createObjectURL).not.toHaveBeenCalled()
    เสียงError.mockRestore()
  })
})

// ===================================================================================
// ตั้งค่าระบบ (หน้าสถิตย์ล้วน — ยังไม่มีฟังก์ชันให้แก้ไขจริง)
// ===================================================================================
describe('หน้าตั้งค่าระบบ (settings)', () => {
  it('แสดงรายการค่าคงที่ของระบบครบ (ยังเป็นหน้าแสดงผลอย่างเดียว ไม่มีอะไรให้กดแก้)', async () => {
    เปิดหน้า('settings')
    expect(await screen.findByText('การแจ้งเตือน')).toBeInTheDocument()
    expect(screen.getByText('เปิดใช้งาน')).toBeInTheDocument()
    expect(screen.getByText('ภาษาระบบ')).toBeInTheDocument()
    expect(screen.getByText('ภาษาไทย')).toBeInTheDocument()
    expect(screen.getByText('เวอร์ชันระบบ')).toBeInTheDocument()
    expect(screen.getByText('v1.0.0')).toBeInTheDocument()
    expect(screen.getByText('ฐานข้อมูล')).toBeInTheDocument()
    expect(screen.getByText('สำรองข้อมูล')).toBeInTheDocument()
    // ไม่มีปุ่มกดแก้ไขค่าใดๆ ในเนื้อหน้า — มีแค่ปุ่มย้อนกลับที่ header เท่านั้น (ยืนยันว่ายังเป็นหน้าสถิตย์ล้วน)
    expect(screen.getAllByRole('button')).toHaveLength(1)
    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'ย้อนกลับ')
  })
})

// ===================================================================================
// บันทึกการใช้งาน (audit log)
// ===================================================================================
describe('หน้าบันทึกการใช้งาน (logs)', () => {
  const ผู้ใช้ตัวอย่าง = () => [
    { id: 'admin-1', name: 'แอดมินทดสอบ', email: 'admin@test.com', role: 'admin' },
    { id: 'u-somchai', name: 'สมชาย ใจดี', email: 'somchai@test.com', role: 'user' },
  ]
  const logตัวอย่าง = () => [
    { id: 1, action: 'role_changed', actor_id: 'admin-1', table_name: 'users', record_id: 'u-somchai',
      old_value: { role: 'user' }, new_value: { role: 'volunteer' }, created_at: '2026-01-05T10:00:00Z' },
    { id: 2, action: 'user_suspended', actor_id: 'admin-1', table_name: 'users', record_id: 'u-somchai',
      old_value: null, new_value: { status: 'suspended' }, created_at: '2026-01-04T10:00:00Z' },
    { id: 3, action: 'reports_deleted', actor_id: null, table_name: 'reports', record_id: 42,
      old_value: null, new_value: null, created_at: '2026-01-03T10:00:00Z' },
    { id: 4, action: 'role_changed', actor_id: 'ghost-user-id', table_name: 'users', record_id: 'u-somchai',
      old_value: { role: 'volunteer' }, new_value: { role: 'admin' }, created_at: '2026-01-02T10:00:00Z' },
  ]

  beforeEach(() => {
    รีเซ็ตฐานข้อมูลปลอม({ tables: { users: ผู้ใช้ตัวอย่าง(), audit_logs: logตัวอย่าง() } })
  })

  it('โหลดบันทึกครบ + แปลง actor_id/record_id เป็นชื่อคนจากรายชื่อผู้ใช้ที่โหลดมาด้วย', async () => {
    const { container } = เปิดหน้า('logs')
    // seed มี log ชนิด role_changed อยู่ 2 รายการ (id 1, id 4) — รอให้ขึ้นครบก่อนด้วย anchor ที่ไม่ซ้ำ
    await screen.findByText('ลบรายงาน')
    expect(screen.getAllByText('เปลี่ยนสิทธิ์ผู้ใช้')).toHaveLength(2)

    expect(screen.getAllByText(/โดย แอดมินทดสอบ/).length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText(/ต่อ สมชาย ใจดี/).length).toBeGreaterThanOrEqual(1)
    // actor_id เป็น null → ระบบ
    expect(screen.getByText(/โดย ระบบ/)).toBeInTheDocument()
    // record_id ไม่ใช่ตาราง users → แสดง table#id ตรงๆ ไม่ใช่ชื่อคน
    expect(screen.getByText(/reports #42/)).toBeInTheDocument()
    // actor_id อ้างถึงคนที่ไม่อยู่ในรายชื่อผู้ใช้แล้ว (ถูกลบ)
    expect(screen.getByText(/โดย ผู้ใช้ที่ถูกลบแล้ว/)).toBeInTheDocument()
    // ค่าเก่า→ใหม่ ของ log id 1 และ id 4 (ใช้ textContent ของทั้งหน้า กัน node ถูกตัดเป็นหลายท่อน)
    expect(container.textContent).toMatch(/user\s*→\s*volunteer/)
    expect(container.textContent).toMatch(/volunteer\s*→\s*admin/)
  })

  it('กรองตามชนิด action', async () => {
    เปิดหน้า('logs')
    await screen.findByText('ลบรายงาน')
    expect(screen.getAllByText('เปลี่ยนสิทธิ์ผู้ใช้')).toHaveLength(2)

    await userEvent.selectOptions(screen.getByDisplayValue(/ทุกประเภท/), 'role_changed')
    expect(screen.getAllByText('เปลี่ยนสิทธิ์ผู้ใช้')).toHaveLength(2)
    expect(screen.queryByText('ระงับบัญชี')).not.toBeInTheDocument()
    expect(screen.queryByText('ลบรายงาน')).not.toBeInTheDocument()
  })

  it('ไม่มีบันทึกเลย: ข้อความว่างเปล่าเฉพาะทาง', async () => {
    db.tables.audit_logs = []
    เปิดหน้า('logs')
    expect(await screen.findByText('ยังไม่มีบันทึกการใช้งาน')).toBeInTheDocument()
  })

  it('โหลดบันทึกพลาด: ขึ้น LoadFailed และลองใหม่สำเร็จ', async () => {
    db.errors['audit_logs:select'] = 'down'
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า('logs')
    expect(await screen.findByText('โหลดบันทึกการใช้งานไม่สำเร็จ')).toBeInTheDocument()

    delete db.errors['audit_logs:select']
    await userEvent.click(screen.getByRole('button', { name: /ลองใหม่/ }))
    expect(await screen.findByText('ลบรายงาน')).toBeInTheDocument()
    เสียงError.mockRestore()
  })
})
