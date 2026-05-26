// supabase.js — ไฟล์เชื่อมต่อ Supabase Database
// anon/publishable key เป็น public key — ออกแบบมาให้ expose ได้ ไม่มีผลด้านความปลอดภัย
// ข้อมูลถูก RLS policy ปกป้องอยู่แล้ว

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ipvidrxuajcpuqzevpnj.supabase.co'
const SUPABASE_KEY = 'sb_publishable_gU0ProhtJurAs0PMtHzAtQ_6tqdwZ7p'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)