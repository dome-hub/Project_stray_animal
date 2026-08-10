-- =============================================================================
-- Audit log — บันทึกการกระทำที่อ่อนไหวในระบบ (OWASP A09: Security Logging)
-- =============================================================================
-- ทำไมต้องมีไฟล์นี้:
-- เดิมระบบไม่เก็บร่องรอยการกระทำสำคัญไว้เลย ถ้ามีคนเลื่อนสิทธิ์ตัวเองเป็น admin,
-- ระงับบัญชีคนอื่น, หรือลบรายงานทิ้ง จะไม่มีทางรู้ย้อนหลังว่า "ใครทำ ทำเมื่อไหร่
-- เปลี่ยนจากอะไรเป็นอะไร" ทำให้ตรวจสอบเหตุผิดปกติหรือหาผู้รับผิดชอบไม่ได้
--
-- ทำไมใช้ trigger ในฐานข้อมูล ไม่เขียน log จากฝั่งแอป:
-- ถ้าเขียน log จากโค้ด React ผู้โจมตีที่เรียก Supabase API ตรงๆ ด้วย anon key
-- (ข้ามหน้าเว็บไปเลย) จะไม่ถูกบันทึกอะไรเลย — ซึ่งเป็นเคสที่เราอยากจับที่สุดพอดี
-- ส่วน trigger ทำงานที่ชั้นฐานข้อมูล จึงเลี่ยงไม่ได้ ไม่ว่าคำสั่งจะมาจากทางไหน
--
-- วิธีใช้:
-- 1. เปิด Supabase Dashboard → SQL Editor → New query
-- 2. Copy ทั้งไฟล์นี้วางแล้วกด Run
-- 3. ทดสอบ: ลองเปลี่ยน role ผู้ใช้สักคนจากหน้า admin แล้ว
--    รัน  select * from public.audit_logs order by created_at desc limit 5;
--    ต้องเห็นรายการใหม่โผล่ขึ้นมา
--
-- ต้องรัน supabase-rls-policies.sql ก่อนไฟล์นี้ (ใช้ฟังก์ชัน public.is_admin())
-- =============================================================================


-- ── ตารางเก็บ log ─────────────────────────────────────────────────────────────
create table if not exists public.audit_logs (
  id           bigint generated always as identity primary key,
  actor_id     uuid references auth.users(id) on delete set null,  -- คนที่ลงมือทำ (null = ระบบ/ไม่ทราบ)
  action       text not null,        -- เช่น 'role_changed', 'user_suspended', 'report_deleted'
  table_name   text not null,
  record_id    text,                 -- เก็บเป็น text เพราะ id ของแต่ละตารางเป็นคนละชนิด (uuid/int)
  old_value    jsonb,
  new_value    jsonb,
  created_at   timestamptz not null default now()
);

-- ดัชนีสำหรับหน้า admin ที่เรียงตามเวลาล่าสุดและกรองตามประเภทการกระทำ
create index if not exists audit_logs_created_at_idx on public.audit_logs (created_at desc);
create index if not exists audit_logs_action_idx     on public.audit_logs (action);


-- ── RLS: อ่านได้เฉพาะ admin และห้ามใครแก้/ลบ log ───────────────────────────────
-- ไม่มี policy สำหรับ insert/update/delete เลย = ไม่มีใครทำได้ผ่าน API
-- (trigger ด้านล่างเป็น security definer จึงเขียนลงตารางนี้ได้โดยไม่ติด RLS)
alter table public.audit_logs enable row level security;

drop policy if exists "audit_logs_select_admin" on public.audit_logs;
create policy "audit_logs_select_admin" on public.audit_logs
for select
using (public.is_admin());


-- ── Trigger: บันทึกการเปลี่ยน role / status ของผู้ใช้ ─────────────────────────
create or replace function public.บันทึกการเปลี่ยนสิทธิ์()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role is distinct from old.role then
    insert into public.audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
    values (auth.uid(), 'role_changed', 'users', old.id::text,
            jsonb_build_object('role', old.role),
            jsonb_build_object('role', new.role));
  end if;

  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
    values (auth.uid(),
            case when new.status = 'suspended' then 'user_suspended' else 'user_unsuspended' end,
            'users', old.id::text,
            jsonb_build_object('status', old.status),
            jsonb_build_object('status', new.status));
  end if;

  return new;
end;
$$;

drop trigger if exists บันทึกการเปลี่ยนสิทธิ์ on public.users;
create trigger บันทึกการเปลี่ยนสิทธิ์
after update on public.users
for each row
execute function public.บันทึกการเปลี่ยนสิทธิ์();


-- ── Trigger: บันทึกการลบข้อมูลสำคัญ ───────────────────────────────────────────
create or replace function public.บันทึกการลบ()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.audit_logs (actor_id, action, table_name, record_id, old_value)
  values (auth.uid(), tg_table_name || '_deleted', tg_table_name,
          (to_jsonb(old) ->> 'id'), to_jsonb(old));
  return old;
end;
$$;

drop trigger if exists บันทึกการลบ_reports on public.reports;
create trigger บันทึกการลบ_reports
after delete on public.reports
for each row execute function public.บันทึกการลบ();

drop trigger if exists บันทึกการลบ_animals on public.animals;
create trigger บันทึกการลบ_animals
after delete on public.animals
for each row execute function public.บันทึกการลบ();

drop trigger if exists บันทึกการลบ_lost_pets on public.lost_pets;
create trigger บันทึกการลบ_lost_pets
after delete on public.lost_pets
for each row execute function public.บันทึกการลบ();


-- ── Trigger: บันทึกการเปลี่ยนสถานะรายงาน (ใครสั่งปิด/ยกเลิกเคส) ───────────────
create or replace function public.บันทึกสถานะรายงาน()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    insert into public.audit_logs (actor_id, action, table_name, record_id, old_value, new_value)
    values (auth.uid(), 'report_status_changed', 'reports', old.id::text,
            jsonb_build_object('status', old.status),
            jsonb_build_object('status', new.status));
  end if;
  return new;
end;
$$;

drop trigger if exists บันทึกสถานะรายงาน on public.reports;
create trigger บันทึกสถานะรายงาน
after update on public.reports
for each row
execute function public.บันทึกสถานะรายงาน();


-- ── ตรวจสอบว่าติดตั้งสำเร็จ ───────────────────────────────────────────────────
select tgname as trigger_name, tgrelid::regclass as on_table
from pg_trigger
where tgname in ('บันทึกการเปลี่ยนสิทธิ์', 'บันทึกการลบ_reports', 'บันทึกการลบ_animals',
                 'บันทึกการลบ_lost_pets', 'บันทึกสถานะรายงาน')
order by on_table;
