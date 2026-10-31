// ใช้ defineConfig ของ vite (ไม่ใช่ของ vitest) เพื่อให้ `vite build` บนเซิร์ฟเวอร์ deploy ไม่ต้องพึ่ง vitest
// Vitest อ่านคีย์ `test` จากไฟล์นี้ได้เอง ส่วน vite ตอน build/dev จะมองข้ามคีย์นี้
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  test: {
    // ไฟล์ตั้งค่ากลางของเทสต์ (matchers ของ jest-dom, ล้าง DOM หลังแต่ละเคส, stub ของที่ jsdom ไม่มี)
    setupFiles: ['./src/test/setup.js'],
    // ไม่ต้องประมวลผล CSS ตอนเทสต์ (leaflet.css ฯลฯ) — ไม่กระทบผลลัพธ์ แค่ช้าลง
    css: false,
  },
})
