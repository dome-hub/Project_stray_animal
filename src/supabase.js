// supabase.js — ไฟล์เชื่อมต่อ Supabase Database
// อ่านค่า URL และ KEY จากไฟล์ .env (ไม่ hardcode ตรงๆ เพื่อความปลอดภัย)

import { createClient } from '@supabase/supabase-js'

// import.meta.env คือวิธีอ่านตัวแปรจากไฟล์ .env ใน Vite
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_KEY

// สร้าง supabase client — export ออกไปให้ไฟล์อื่นใช้ได้
export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)