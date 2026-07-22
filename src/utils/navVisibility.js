// navVisibility.js — ตัดสินว่าหน้าไหนควรมีแถบนำทางล่าง (BottomNav)
//
// แยกออกมาไว้ที่เดียว เพราะมีคน 2 ที่ต้องรู้คำตอบเดียวกัน:
//   1) ตัว BottomNav เอง — ว่าจะ render ไหม
//   2) App.jsx — ว่าจะเว้น padding ล่างให้เนื้อหาไหม (กันเนื้อหาโดนแถบทับ)
// ถ้าปล่อยให้ต่างคนต่างเช็ค เงื่อนไขจะหลุดกันภายหลังได้

// ความสูงของแถบ (px) — ใช้เป็น padding-bottom ของเนื้อหาให้พอดีกัน
export const ความสูงแถบนำทาง = 56

export function แสดงแถบนำทาง(user, pathname) {
  if (!user) return false                        // ยังไม่ได้เข้าระบบ
  if (user.role === 'admin') return false        // admin ใช้เมนูหน้าแรกตามเดิม
  if (pathname === '/') return false             // หน้า login
  if (pathname.startsWith('/admin')) return false
  return true
}
