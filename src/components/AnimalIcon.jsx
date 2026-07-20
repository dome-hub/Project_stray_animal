// AnimalIcon.jsx — ไอคอนสัตว์ (สุนัข/แมว) ใช้แทน emoji 🐕/🐈 ที่เคยใช้เป็นรูป fallback ตอนไม่มีภาพถ่าย
// รับ "ชนิด" เป็น string อะไรก็ได้ที่บอกชนิดสัตว์ (species / breed / animal_type) แล้วเดาจากคำว่า "แมว"
// ใช้ logic เดียวกับที่ FindPet ใช้แยกสุนัข/แมวอยู่แล้ว เพื่อให้ทั้งแอปตัดสินเหมือนกัน

import { Dog, Cat } from 'lucide-react'

export function เป็นแมว(ชนิด) {
  return typeof ชนิด === 'string' && ชนิด.includes('แมว')
}

function AnimalIcon({ ชนิด, size = 24, className = '', strokeWidth = 1.5 }) {
  const Icon = เป็นแมว(ชนิด) ? Cat : Dog
  return <Icon size={size} strokeWidth={strokeWidth} className={className} />
}

export default AnimalIcon
