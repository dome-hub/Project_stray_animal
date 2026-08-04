-- push_notifications.sql — โครงสร้างสำหรับส่งแจ้งเตือนเด้งขึ้นหน้าจอมือถือ
--
-- ที่มีอยู่เดิมคือ "แจ้งเตือนในแอป" (ตาราง notifications + หน้าแจ้งเตือน)
-- ซึ่งผู้ใช้ต้องเปิดแอปเองจึงจะเห็น ไฟล์นี้เพิ่มส่วนที่ทำให้ข้อความเด้งขึ้นมือถือ
-- แม้ตอนปิดแอปอยู่ โดยส่งผ่าน Firebase Cloud Messaging (FCM)
--
-- ต้องรันหลังจากตั้งค่า Firebase เสร็จแล้ว (ดูขั้นตอนในแชท)
-- รันใน Supabase Dashboard -> SQL Editor

-- ============================================================
-- 1. ตารางเก็บ device token
-- ============================================================
-- FCM ให้ token มาต่อ "เครื่อง" ไม่ใช่ต่อ "คน" — คนเดียวมีได้หลายเครื่อง
-- และ token เปลี่ยนได้เองเมื่อผู้ใช้ล้างข้อมูลแอปหรือย้ายเครื่อง
create table if not exists public.device_tokens (
  token       text primary key,
  user_id     uuid not null references auth.users(id) on delete cascade,
  platform    text not null default 'android',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_id_idx on public.device_tokens(user_id);

alter table public.device_tokens enable row level security;

-- เจ้าของ token เท่านั้นที่จัดการของตัวเองได้
-- ไม่เปิดให้ staff อ่าน เพราะ token คือกุญแจส่งข้อความเข้าเครื่องคนอื่นโดยตรง
-- ตัวส่งจริงเป็น Edge Function ที่ใช้ service role ซึ่ง bypass RLS อยู่แล้ว
drop policy if exists device_tokens_select on public.device_tokens;
create policy device_tokens_select on public.device_tokens
  for select using (user_id = auth.uid());

drop policy if exists device_tokens_insert on public.device_tokens;
create policy device_tokens_insert on public.device_tokens
  for insert with check (user_id = auth.uid());

drop policy if exists device_tokens_update on public.device_tokens;
create policy device_tokens_update on public.device_tokens
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists device_tokens_delete on public.device_tokens;
create policy device_tokens_delete on public.device_tokens
  for delete using (user_id = auth.uid());

-- ============================================================
-- 2. ตรวจผล
-- ============================================================
select cmd || '  |  ' || policyname as policy
from pg_policies
where schemaname = 'public' and tablename = 'device_tokens'
order by cmd;
