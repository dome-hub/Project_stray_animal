// setup.js — ตั้งค่ากลางของ Vitest (รันก่อนทุกไฟล์เทสต์)
//
// ไฟล์ unit test ของ utils รันบน node ล้วน (ไม่มี document) ส่วนไฟล์ที่เรนเดอร์หน้าเว็บประกาศ
// `// @vitest-environment jsdom` ไว้บนสุดของไฟล์ — จึงต้องเช็คว่ามี document ก่อนแตะของฝั่งเบราว์เซอร์

import { afterEach } from 'vitest'

if (typeof document !== 'undefined') {
  await import('@testing-library/jest-dom/vitest')
  const { cleanup } = await import('@testing-library/react')

  // RTL ล้าง DOM อัตโนมัติเฉพาะเมื่อมี afterEach เป็น global (เราไม่ได้เปิด globals) จึงต้องเรียกเอง
  afterEach(() => { cleanup() })

  // ของที่ jsdom ไม่มี แต่หน้าเว็บ/ไลบรารีเรียกใช้
  window.scrollTo = () => {}
  Element.prototype.scrollIntoView = () => {}
  window.matchMedia = window.matchMedia || (() => ({
    matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {},
  }))
  globalThis.ResizeObserver = globalThis.ResizeObserver || class { observe() {} unobserve() {} disconnect() {} }
}
