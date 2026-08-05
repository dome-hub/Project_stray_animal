-- ============================================================================
-- Row Level Security (RLS) policies — Project_stray_animal
-- ============================================================================
-- ทำไมต้องมีไฟล์นี้:
-- ตอนนี้การเช็คสิทธิ์ admin/volunteer ทำแค่ฝั่งหน้าเว็บ (React) เท่านั้น
-- โค้ดยิง query ไปหา Supabase ตรงๆ ด้วย anon key ถ้าตาราง users/reports/animals/
-- notifications ไม่มี RLS (หรือเปิดไว้แต่ไม่ได้ตั้ง policy) ผู้ใช้ทั่วไปที่ล็อกอินอยู่
-- จะเปิด browser console ยิง query ตรงๆ เลื่อนสิทธิ์ตัวเองเป็น admin, แก้ไข/ลบ
-- รายงานของคนอื่น, หรือแก้ข้อมูลสัตว์ในระบบได้เลย โดยไม่ต้องผ่านหน้าเว็บ
--
-- วิธีใช้:
-- 1. เปิด Supabase Dashboard ของโปรเจกต์นี้ → SQL Editor → New query
-- 2. Copy ทั้งไฟล์นี้วางแล้วกด Run
-- 3. ก่อนรันจริง แนะนำเปิด Table Editor เช็คชื่อคอลัมน์ในแต่ละตารางให้ตรงกับที่ไฟล์นี้
--    สมมติไว้ก่อน (ชื่อคอลัมน์ทั้งหมดอ้างอิงจากโค้ดจริงในแอปแล้ว แต่ยังไม่เคยรันเทียบกับ
--    schema จริงใน Supabase เพราะไม่มีไฟล์ migration เก็บไว้ในโปรเจกต์)
-- 4. รันเสร็จแล้ว "ต้องทดสอบใหม่ทุกฟีเจอร์ที่เกี่ยวกับสิทธิ์" (ล็อกอิน, ดูโปรไฟล์,
--    ส่งรายงาน, แก้/ยกเลิกรายงาน, งานฝั่ง volunteer/admin, การแจ้งเตือน) เพราะ RLS
--    ที่ตั้งผิดจุดจะทำให้ฟีเจอร์ปกติพังได้ (ขึ้น error "new row violates row-level
--    security policy" หรือ query คืนค่าว่างเปล่าทั้งที่ควรมีข้อมูล)
-- ============================================================================


-- ── Helper function: เช็คว่าคนที่ล็อกอินอยู่เป็น volunteer หรือ admin ไหม ──────────
-- ใช้ security definer เพื่อให้ฟังก์ชันนี้อ่านตาราง users ได้โดยไม่ติด RLS ของ users
-- เอง ซ้อนกันเป็นวงไม่รู้จบ (ถ้าไม่ทำแบบนี้ policy ของ users ที่เรียกฟังก์ชันนี้จะ error)
create or replace function public.is_staff()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role in ('volunteer', 'admin')
  );
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where id = auth.uid() and role = 'admin'
  );
$$;


-- ============================================================================
-- ตาราง users
-- ============================================================================
alter table public.users enable row level security;

drop policy if exists "users_select" on public.users;
create policy "users_select" on public.users
for select
using (
  auth.uid() = id            -- ดูโปรไฟล์ตัวเองได้เสมอ
  or role in ('volunteer', 'admin')  -- ใครก็ดูข้อมูลติดต่อของ volunteer/admin ได้ (ใช้โชว์หน้ารายละเอียดสัตว์/ติดตามรายงาน)
  or public.is_staff()       -- volunteer/admin ดูข้อมูลผู้แจ้ง (reporter) ได้ ใช้ตอนติดต่อประสานงาน
);

drop policy if exists "users_update_self" on public.users;
create policy "users_update_self" on public.users
for update
using (auth.uid() = id or public.is_admin())
with check (auth.uid() = id or public.is_admin());

-- กันไม่ให้ผู้ใช้ทั่วไปเปลี่ยน role/status ของตัวเอง (เช่น เลื่อนตัวเองเป็น admin
-- หรือปลดสถานะ suspended ของตัวเอง) — ต้องเป็น trigger เพราะ RLS ปกติเช็คได้แค่
-- "แถวไหนแก้ได้" ไม่ใช่ "คอลัมน์ไหนแก้ได้"
create or replace function public.ป้องกันแก้role_status_เอง()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    new.role   := old.role;
    new.status := old.status;
  end if;
  return new;
end;
$$;

drop trigger if exists ป้องกันแก้role_status_เอง on public.users;
create trigger ป้องกันแก้role_status_เอง
before update on public.users
for each row
execute function public.ป้องกันแก้role_status_เอง();


-- ============================================================================
-- ตาราง reports
-- ============================================================================
alter table public.reports enable row level security;

drop policy if exists "reports_select" on public.reports;
create policy "reports_select" on public.reports
for select
using (
  auth.uid() = reporter_id   -- เจ้าของรายงานดูของตัวเองได้
  or public.is_staff()       -- volunteer/admin ดูรายงานทั้งหมดได้ (ใช้จัดการเคส)
);

drop policy if exists "reports_insert" on public.reports;
create policy "reports_insert" on public.reports
for insert
with check (auth.uid() = reporter_id);  -- สร้างรายงานได้เฉพาะในชื่อตัวเอง (ห้ามยัด reporter_id เป็นคนอื่น)

drop policy if exists "reports_update" on public.reports;
create policy "reports_update" on public.reports
for update
using (
  auth.uid() = reporter_id   -- เจ้าของแก้/ยกเลิกรายงานตัวเองได้
  or public.is_staff()       -- volunteer/admin แก้สถานะ/หมายเหตุได้
)
with check (
  auth.uid() = reporter_id
  or public.is_staff()
);
-- หมายเหตุ: policy นี้ยอมให้เจ้าของรายงานแก้ status เป็นค่าไหนก็ได้ (ในแอปตอนนี้ใช้
-- แค่ยกเลิก = 'ยกเลิกโดยผู้แจ้ง') ถ้าอยากล็อกให้เจ้าของตั้ง status ได้แค่ค่านี้ค่าเดียว
-- ต้องเพิ่ม trigger แยกอีกชั้น บอกผมได้ถ้าต้องการให้เขียนเพิ่ม

drop policy if exists "reports_delete" on public.reports;
create policy "reports_delete" on public.reports
for delete
using (public.is_admin());  -- ลบรายงานได้เฉพาะ admin (ปกติแอปใช้วิธีเปลี่ยน status ไม่ลบจริง)


-- ============================================================================
-- ตาราง animals
-- ============================================================================
alter table public.animals enable row level security;

drop policy if exists "animals_select" on public.animals;
create policy "animals_select" on public.animals
for select
using (auth.role() = 'authenticated');  -- ผู้ใช้ที่ล็อกอินแล้วดูรายการสัตว์ได้ทุกคน (ใช้หน้าค้นหาสัตว์)

drop policy if exists "animals_insert" on public.animals;
create policy "animals_insert" on public.animals
for insert
with check (public.is_staff());  -- เพิ่มสัตว์ได้เฉพาะ volunteer/admin

drop policy if exists "animals_update" on public.animals;
create policy "animals_update" on public.animals
for update
using (public.is_staff())
with check (public.is_staff());

drop policy if exists "animals_delete" on public.animals;
create policy "animals_delete" on public.animals
for delete
using (public.is_staff());


-- ============================================================================
-- ตาราง notifications
-- ============================================================================
alter table public.notifications enable row level security;

drop policy if exists "notifications_select" on public.notifications;
create policy "notifications_select" on public.notifications
for select
using (auth.uid() = user_id);  -- เห็นแค่แจ้งเตือนของตัวเอง

drop policy if exists "notifications_insert" on public.notifications;
create policy "notifications_insert" on public.notifications
for insert
with check (
  auth.uid() = user_id       -- ส่งแจ้งเตือนให้ตัวเองได้ (เช่น ตอนส่งรายงานสำเร็จ)
  or public.is_staff()       -- volunteer/admin ส่งแจ้งเตือนให้ผู้ใช้คนอื่นได้ (ตอนอัปเดตสถานะเคส)
);

drop policy if exists "notifications_update" on public.notifications;
create policy "notifications_update" on public.notifications
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);  -- แก้ได้แค่ is_read ของตัวเอง

drop policy if exists "notifications_delete" on public.notifications;
create policy "notifications_delete" on public.notifications
for delete
using (auth.uid() = user_id);


-- ============================================================================
-- ตาราง lost_pets (เจอในโค้ด LostAndFoundPage.jsx ใช้คอลัมน์ owner_id — เผื่อไว้ด้วย)
-- ============================================================================
alter table public.lost_pets enable row level security;

drop policy if exists "lost_pets_select" on public.lost_pets;
create policy "lost_pets_select" on public.lost_pets
for select
using (auth.role() = 'authenticated');

drop policy if exists "lost_pets_insert" on public.lost_pets;
create policy "lost_pets_insert" on public.lost_pets
for insert
with check (auth.uid() = owner_id);

drop policy if exists "lost_pets_update" on public.lost_pets;
create policy "lost_pets_update" on public.lost_pets
for update
using (auth.uid() = owner_id or public.is_staff())
with check (auth.uid() = owner_id or public.is_staff());

drop policy if exists "lost_pets_delete" on public.lost_pets;
create policy "lost_pets_delete" on public.lost_pets
for delete
using (auth.uid() = owner_id or public.is_staff());
