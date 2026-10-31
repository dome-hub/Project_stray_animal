// @vitest-environment jsdom
// Integration test: หน้า Login/สมัครสมาชิก — กฎรหัสผ่าน, เรียก Supabase Auth ถูกต้อง, ข้อความ error ภาษาไทย
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import Login from './Login'
import { supabaseปลอม, รีเซ็ตฐานข้อมูลปลอม } from '../test/fakeSupabase'

vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))

const auth = supabaseปลอม.auth

function เปิดหน้า() {
  render(<MemoryRouter><Login /></MemoryRouter>)
}

async function ไปสมัคร() {
  await userEvent.click(screen.getByRole('button', { name: 'สมัครสมาชิก' }))
  return {
    ชื่อ: screen.getByPlaceholderText('ชื่อ-นามสกุล'),
    อีเมล: screen.getAllByPlaceholderText('อีเมล').at(-1),
    รหัส: screen.getByPlaceholderText(/รหัสผ่าน \(อย่างน้อย/),
    // ปุ่มแท็บด้านบนก็ชื่อ 'สมัครสมาชิก' เหมือนกัน — ปุ่มส่งฟอร์มคือตัวที่อยู่ใน <form>
    ส่ง: screen.getAllByRole('button', { name: 'สมัครสมาชิก' }).find((b) => b.closest('form')),
  }
}

beforeEach(() => { รีเซ็ตฐานข้อมูลปลอม() })

describe('สมัครสมาชิก — กฎรหัสผ่าน', () => {
  it('ช่องไม่ครบ ไม่เรียก signUp', async () => {
    เปิดหน้า()
    const { ส่ง } = await ไปสมัคร()
    await userEvent.click(ส่ง)
    expect(await screen.findByText('กรุณากรอกข้อมูลให้ครบทุกช่อง')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('รหัสสั้นกว่า 8 ตัว ถูกปฏิเสธ', async () => {
    เปิดหน้า()
    const { ชื่อ, อีเมล, รหัส, ส่ง } = await ไปสมัคร()
    await userEvent.type(ชื่อ, 'ทดสอบ')
    await userEvent.type(อีเมล, 'a@test.com')
    await userEvent.type(รหัส, 'abc1234')
    await userEvent.click(ส่ง)
    expect(await screen.findByText(/อย่างน้อย 8 ตัวอักษร/)).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it.each(['12345678', 'password', 'PASSWORD123', 'aaaaaaaa', 'qwerty123'])('รหัสเดาง่าย "%s" ถูกปฏิเสธ', async (รหัสอ่อน) => {
    เปิดหน้า()
    const { ชื่อ, อีเมล, รหัส, ส่ง } = await ไปสมัคร()
    await userEvent.type(ชื่อ, 'ทดสอบ')
    await userEvent.type(อีเมล, 'a@test.com')
    await userEvent.type(รหัส, รหัสอ่อน)
    await userEvent.click(ส่ง)
    expect(await screen.findByText('รหัสผ่านนี้เดาง่ายเกินไป กรุณาตั้งรหัสผ่านอื่น')).toBeInTheDocument()
    expect(auth.signUp).not.toHaveBeenCalled()
  })

  it('ข้อมูลถูกต้อง: เรียก signUp พร้อมชื่อใน metadata แล้วขึ้นหน้ารอยืนยันอีเมล', async () => {
    เปิดหน้า()
    const { ชื่อ, อีเมล, รหัส, ส่ง } = await ไปสมัคร()
    await userEvent.type(ชื่อ, '  สมชาย ใจดี  ')
    await userEvent.type(อีเมล, ' somchai@test.com ')
    await userEvent.type(รหัส, 'รหัสดีมากๆ99')
    await userEvent.click(ส่ง)

    expect(await screen.findByText('ตรวจสอบอีเมลของคุณ')).toBeInTheDocument()
    expect(auth.signUp).toHaveBeenCalledWith({
      email: 'somchai@test.com',
      password: 'รหัสดีมากๆ99',
      options: { data: { name: 'สมชาย ใจดี' } },
    })
  })

  it('สมัครไม่สำเร็จ (อีเมลซ้ำ) แสดงข้อความไทย ไม่ใช่ข้อความดิบภาษาอังกฤษ', async () => {
    auth.signUp.mockResolvedValueOnce({ data: null, error: { message: 'User already registered' } })
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    const { ชื่อ, อีเมล, รหัส, ส่ง } = await ไปสมัคร()
    await userEvent.type(ชื่อ, 'ทดสอบ')
    await userEvent.type(อีเมล, 'dup@test.com')
    await userEvent.type(รหัส, 'strongpass99')
    await userEvent.click(ส่ง)
    expect(await screen.findByText('อีเมลนี้มีบัญชีอยู่แล้ว กรุณาเข้าสู่ระบบ')).toBeInTheDocument()
    expect(screen.queryByText(/already registered/i)).not.toBeInTheDocument()
    เสียงError.mockRestore()
  })
})

describe('เข้าสู่ระบบ', () => {
  it('ไม่กรอกอีเมล/รหัส ไม่เรียก Supabase', async () => {
    เปิดหน้า()
    await userEvent.click(document.querySelector('form button[type="submit"]'))
    expect(await screen.findByText('กรุณากรอกอีเมลและรหัสผ่าน')).toBeInTheDocument()
    expect(auth.signInWithPassword).not.toHaveBeenCalled()
  })

  it('กรอกครบ: เรียก signInWithPassword ด้วยอีเมลที่ตัดช่องว่าง', async () => {
    เปิดหน้า()
    await userEvent.type(screen.getByPlaceholderText('อีเมล'), ' me@test.com ')
    await userEvent.type(screen.getByPlaceholderText('รหัสผ่าน'), 'secret123')
    await userEvent.click(document.querySelector('form button[type="submit"]'))
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: 'me@test.com', password: 'secret123' })
  })

  it('รหัสผิด แสดงข้อความไทย', async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ data: null, error: { message: 'Invalid login credentials' } })
    const เสียงError = vi.spyOn(console, 'error').mockImplementation(() => {})
    เปิดหน้า()
    await userEvent.type(screen.getByPlaceholderText('อีเมล'), 'me@test.com')
    await userEvent.type(screen.getByPlaceholderText('รหัสผ่าน'), 'wrong')
    await userEvent.click(document.querySelector('form button[type="submit"]'))
    expect(await screen.findByText('อีเมลหรือรหัสผ่านไม่ถูกต้อง')).toBeInTheDocument()
    เสียงError.mockRestore()
  })

  it('ปุ่มดูรหัสผ่านสลับระหว่างซ่อน/แสดง', async () => {
    เปิดหน้า()
    const ช่อง = screen.getByPlaceholderText('รหัสผ่าน')
    expect(ช่อง).toHaveAttribute('type', 'password')
    await userEvent.click(screen.getByRole('button', { name: 'แสดงรหัสผ่าน' }))
    expect(ช่อง).toHaveAttribute('type', 'text')
  })
})

describe('ลืมรหัสผ่าน', () => {
  it('ไม่บอกว่าอีเมลนี้มีบัญชีหรือไม่: แสดงหน้า "ส่งแล้ว" เหมือนกันแม้ไม่พบผู้ใช้', async () => {
    auth.resetPasswordForEmail.mockResolvedValueOnce({ data: null, error: { message: 'User not found' } })
    เปิดหน้า()
    await userEvent.click(screen.getByRole('button', { name: /ลืมรหัสผ่าน/ }))
    await userEvent.type(screen.getByPlaceholderText('you@example.com'), 'ghost@test.com')
    await userEvent.click(screen.getByRole('button', { name: 'ส่งลิงก์ตั้งรหัสผ่านใหม่' }))
    expect(await screen.findByText(/หากมีบัญชีที่ใช้อีเมลนี้/)).toBeInTheDocument()
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('ghost@test.com', expect.any(Object))
  })
})
