import { describe, it, expect } from 'vitest'
import { ตรวจสอบไฟล์รูปภาพ } from './fileValidation'

// ลายเซ็นไฟล์จริงของแต่ละชนิด (byte แรกๆ) — fileValidation ตรวจจากเนื้อไฟล์ ไม่เชื่อแค่นามสกุล/MIME
const JPEG = [0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]
const PNG  = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]
const WEBP = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]
const ข้อความ = [0x68, 0x65, 0x6c, 0x6c, 0x6f, 0x20, 0x77, 0x6f, 0x72, 0x6c, 0x64, 0x21]

const ไฟล์ = (ชื่อ, ชนิด, ไบต์) => new File([new Uint8Array(ไบต์)], ชื่อ, { type: ชนิด })

describe('ตรวจสอบไฟล์รูปภาพ', () => {
  it('รับ JPEG / PNG / WEBP ที่ถูกต้อง', async () => {
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.jpg', 'image/jpeg', JPEG))).ok).toBe(true)
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.png', 'image/png', PNG))).ok).toBe(true)
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.webp', 'image/webp', WEBP))).ok).toBe(true)
  })

  it('รับไฟล์ชื่อภาษาไทย (รูปจากแกลเลอรีมือถือ)', async () => {
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('ทดสอบ_รูปแมว.png', 'image/png', PNG))).ok).toBe(true)
  })

  it('รับไฟล์ที่ชื่อไม่มีนามสกุล (Android บางรุ่นส่งมาแบบนี้) ถ้าชนิดและเนื้อไฟล์ถูกต้อง', async () => {
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('รูปแมว', 'image/jpeg', JPEG))).ok).toBe(true)
  })

  it('ปฏิเสธนามสกุลที่ไม่ใช่รูปที่รองรับ แม้ MIME จะบอกว่าเป็นรูป', async () => {
    const ผล = await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.gif', 'image/png', PNG))
    expect(ผล.ok).toBe(false)
    expect(ผล.error).toContain('นามสกุล')
  })

  it('ปฏิเสธ MIME ที่ไม่ใช่รูป (เช่น pdf, svg ที่ฝัง script ได้)', async () => {
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.png', 'application/pdf', PNG))).ok).toBe(false)
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.svg', 'image/svg+xml', ข้อความ))).ok).toBe(false)
  })

  it('ปฏิเสธไฟล์ปลอมนามสกุล: ชื่อ .png + MIME png แต่เนื้อไฟล์ไม่ใช่รูป', async () => {
    const ผล = await ตรวจสอบไฟล์รูปภาพ(ไฟล์('virus.png', 'image/png', ข้อความ))
    expect(ผล.ok).toBe(false)
    expect(ผล.error).toContain('ไม่ใช่รูปภาพจริง')
  })

  it('ปฏิเสธ WEBP ที่มีแค่ RIFF แต่ไม่ใช่ WEBP จริง', async () => {
    const ปลอม = [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x41, 0x56, 0x49, 0x20]   // RIFF....AVI
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.webp', 'image/webp', ปลอม))).ok).toBe(false)
  })

  it('ปฏิเสธไฟล์ใหญ่เกิน 10MB และรับที่ 10MB พอดี', async () => {
    const ใหญ่ = new Uint8Array(10 * 1024 * 1024 + 1)
    ใหญ่.set(PNG)
    const ผลใหญ่ = await ตรวจสอบไฟล์รูปภาพ(new File([ใหญ่], 'big.png', { type: 'image/png' }))
    expect(ผลใหญ่.ok).toBe(false)
    expect(ผลใหญ่.error).toContain('10MB')

    const พอดี = new Uint8Array(10 * 1024 * 1024)
    พอดี.set(PNG)
    expect((await ตรวจสอบไฟล์รูปภาพ(new File([พอดี], 'ok.png', { type: 'image/png' }))).ok).toBe(true)
  })

  it('ไม่มีไฟล์ได้ error ภาษาไทย ไม่ throw', async () => {
    const ผล = await ตรวจสอบไฟล์รูปภาพ(null)
    expect(ผล.ok).toBe(false)
    expect(ผล.error).toBeTruthy()
  })

  it('ไฟล์ว่างเปล่าถูกปฏิเสธ (ไม่มีลายเซ็น)', async () => {
    expect((await ตรวจสอบไฟล์รูปภาพ(ไฟล์('a.png', 'image/png', []))).ok).toBe(false)
  })
})
