// useSheet.js — ทำให้ bottom sheet / modal ทั้งแอปทำตัวเป็น "หน้าต่างซ้อน" จริงๆ
//
// ปัญหาเดิม: sheet ทุกอันเป็นแค่ <div> ลอยทับจอ เบราว์เซอร์กับ Android ไม่รู้ว่ามันคือ modal
//   1. กดปุ่ม Back ของ Android ตอนเปิด sheet อยู่ → เด้งออกจากหน้าไปเลย ไม่ใช่ปิดแค่ sheet
//      (คนไทยใช้ปุ่ม back เป็นนิสัย เจ้าหน้าที่ อบต. เจอทุกวัน)
//   2. กด Escape บนเว็บ ไม่มีอะไรเกิดขึ้น
//   3. โปรแกรมอ่านหน้าจออ่านเนื้อหาข้างหลัง sheet ปนเข้ามา เพราะไม่มี role="dialog"
//   4. กด Tab แล้วโฟกัสหลุดไปโดนปุ่มที่อยู่หลัง sheet ซึ่งมองไม่เห็น
//   5. ปิด sheet แล้วโฟกัสเด้งไปต้นหน้า ต้องไล่ Tab ใหม่หมด
//
// วิธีแก้: เก็บ sheet ที่เปิดอยู่เป็น "กองซ้อน" แล้วผูก listener ระดับแอปครั้งเดียว
// ปิดทีละชั้นจากบนลงล่าง — เปิด sheet ซ้อน sheet (เช่น ยืนยันลบ ซ้อน รายละเอียด) ก็ถูกลำดับ

import { useEffect, useRef } from 'react'
import { Capacitor } from '@capacitor/core'
import { App as CapApp } from '@capacitor/app'

// กองซ้อนของ sheet ที่เปิดอยู่ — ตัวท้ายสุด = ตัวบนสุดที่ผู้ใช้เห็น
const กอง = []

function ตัวบนสุด() {
  return กอง[กอง.length - 1] || null
}

function ปิดตัวบนสุด() {
  const บน = ตัวบนสุด()
  if (!บน) return false
  บน.ปิด()
  return true
}

// อิลิเมนต์ที่โฟกัสได้ภายใน sheet — ใช้ทั้งตอนโฟกัสครั้งแรกและตอนขังโฟกัส
const ตัวที่โฟกัสได้ =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), ' +
  'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

function รายการโฟกัส(el) {
  if (!el) return []
  return [...el.querySelectorAll(ตัวที่โฟกัสได้)].filter(function (n) {
    return n.offsetWidth > 0 || n.offsetHeight > 0 || n === document.activeElement
  })
}

// ผูก listener ระดับแอปครั้งเดียว ไม่ใช่ผูกใหม่ทุก sheet ที่เปิด
let ผูกแล้ว = false

function ผูกตัวจัดการกลาง() {
  if (ผูกแล้ว) return
  ผูกแล้ว = true

  window.addEventListener('keydown', function (e) {
    if (กอง.length === 0) return

    if (e.key === 'Escape') {
      e.preventDefault()
      ปิดตัวบนสุด()
      return
    }

    // ขังโฟกัสไว้ใน sheet บนสุด — วนกลับหัวท้ายแทนที่จะหลุดไปข้างหลัง
    if (e.key === 'Tab') {
      const บน = ตัวบนสุด()
      const รายการ = รายการโฟกัส(บน && บน.el)
      if (รายการ.length === 0) { e.preventDefault(); return }
      const แรก = รายการ[0]
      const ท้าย = รายการ[รายการ.length - 1]
      if (e.shiftKey && document.activeElement === แรก) {
        e.preventDefault(); ท้าย.focus()
      } else if (!e.shiftKey && document.activeElement === ท้าย) {
        e.preventDefault(); แรก.focus()
      }
    }
  })

  // ปุ่มย้อนกลับของ Android — สำคัญที่สุดในไฟล์นี้
  // หมายเหตุ: พอผูก listener นี้แล้ว Capacitor จะ "ปิดพฤติกรรมดีฟอลต์ทิ้ง"
  // เราจึงต้องเขียนพฤติกรรมเดิม (ถอยหน้า / ออกจากแอป) ขึ้นมาเองให้ครบ
  // ไม่งั้นจะกลายเป็นปุ่ม back ใช้ไม่ได้ทั้งแอป ซึ่งแย่กว่าเดิม
  if (Capacitor.isNativePlatform()) {
    CapApp.addListener('backButton', function (info) {
      if (ปิดตัวบนสุด()) return          // มี sheet เปิดอยู่ → ปิดทีละชั้น
      if (info && info.canGoBack) window.history.back()
      else CapApp.exitApp()
    })
  }
}

/**
 * ใช้กับ sheet/modal ทุกอัน — คืน ref ให้ผูกกับกล่องเนื้อหาของ sheet
 *
 *   const ชีต = useSheet(เปิดอยู่, ปิดฟังก์ชัน)
 *   <div ref={ชีต}> ...เนื้อหา sheet... </div>
 *
 * role="dialog" / aria-modal ถูกใส่ให้จาก ref โดยตรง เพื่อไม่ต้องไปแก้ className
 * หรือ props ของ sheet ทั้ง 21 จุดที่เขียนไว้คนละแบบกัน
 */
export function useSheet(เปิดอยู่, onClose) {
  const กล่อง = useRef(null)
  const ปิดล่าสุด = useRef(onClose)
  const โฟกัสเดิม = useRef(null)

  // เก็บ onClose ล่าสุดไว้ใน ref — กันปัญหา closure เก่าค้างตอน component re-render
  useEffect(function () { ปิดล่าสุด.current = onClose })

  useEffect(function () {
    if (!เปิดอยู่) return
    ผูกตัวจัดการกลาง()

    const el = กล่อง.current
    if (el) {
      el.setAttribute('role', 'dialog')
      el.setAttribute('aria-modal', 'true')
      if (!el.hasAttribute('tabindex')) el.setAttribute('tabindex', '-1')
    }

    // จำว่าก่อนเปิดโฟกัสอยู่ที่ไหน ไว้คืนให้ตอนปิด
    โฟกัสเดิม.current = document.activeElement

    const รายการ = { ปิด: function () { ปิดล่าสุด.current && ปิดล่าสุด.current() }, el: el }
    กอง.push(รายการ)

    // ย้ายโฟกัสเข้ามาใน sheet ให้คีย์บอร์ด/screen reader เริ่มอ่านจากตรงนี้
    const t = setTimeout(function () {
      const ใน = รายการโฟกัส(el)
      if (ใน.length > 0) ใน[0].focus()
      else if (el) el.focus()
    }, 50)

    return function () {
      clearTimeout(t)
      const i = กอง.indexOf(รายการ)
      if (i > -1) กอง.splice(i, 1)
      // คืนโฟกัสกลับที่เดิม เฉพาะตอนที่ปุ่มเดิมยังอยู่บนหน้า
      const เดิม = โฟกัสเดิม.current
      if (เดิม && document.contains(เดิม) && typeof เดิม.focus === 'function') เดิม.focus()
    }
  }, [เปิดอยู่])

  return กล่อง
}
