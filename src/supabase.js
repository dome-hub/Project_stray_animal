// supabase.js — ไฟล์เชื่อมต่อ Supabase Database
// anon/publishable key เป็น public key — ออกแบบมาให้ expose ได้ ไม่มีผลด้านความปลอดภัย
// ข้อมูลถูก RLS policy ปกป้องอยู่แล้ว

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://ipvidrxuajcpuqzevpnj.supabase.co'
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imlwdmlkcnh1YWpjcHVxemV2cG5qIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk3NzkwOTgsImV4cCI6MjA5NTM1NTA5OH0.SSa2kjuShOmDPwRDekHeB1ysALwMRVplUQJyRy6-A1g'

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY)