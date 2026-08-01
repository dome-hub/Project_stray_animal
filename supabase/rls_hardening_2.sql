-- rls_hardening_2.sql — ปิดช่องที่ rls_hardening.sql รอบแรกพลาดไป
--
-- รอบแรกเขียนโดยสมมติว่าฐานข้อมูลยังไม่มี policy อยู่ก่อน ซึ่งผิด — มี policy เก่า
-- ค้างอยู่หลายตัว และ policy ใน Postgres เป็นแบบ permissive คือ OR กัน
-- ขอแค่ตัวใดตัวหนึ่งอนุญาตก็ผ่าน policy ที่เข้มกว่าจึงถูกตัวหลวมทับหมด
--
-- ที่ทดสอบเจอจริง (ยิง REST API ตรงจาก browser ที่ไม่ได้ล็อกอิน):
--   POST /rest/v1/notifications  ->  201 Created
--   คนที่ไม่มีบัญชีเลยยัดการแจ้งเตือนเข้าฐานข้อมูลได้ ต้นเหตุคือ policy
--   "anyone can insert notifications" ที่มี WITH CHECK = true
--
-- สคริปต์นี้ลบ policy ทั้งหมดของแต่ละตารางทิ้ง แล้วเหลือไว้เฉพาะชุดที่ตั้งใจ
-- (ลบตามชื่อทีละตัวไม่ได้ เพราะบางชื่อเป็นภาษาไทยและดูเหมือนถูกตัดปลาย)
--
-- รันใน Supabase Dashboard -> SQL Editor

-- ============================================================
-- 1. notifications — ช่องโหว่จริง ปิดก่อนเพื่อน
-- ============================================================
-- เหลือเฉพาะ 4 ตัวจาก rls_hardening.sql ที่เหลือเป็นของซ้ำหรือของหลวม
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'notifications'
      and policyname not in (
        'notifications_select', 'notifications_insert',
        'notifications_update', 'notifications_delete'
      )
  loop
    execute format('drop policy %I on public.notifications', p.policyname);
  end loop;
end $$;

-- ============================================================
-- 2. adoptions / captures / wishlist — policy dev_* เปิดหมดทั้ง read/write/delete
-- ============================================================
-- ไล่โค้ดทั้ง src/ แล้วไม่มีที่ไหนเรียกสามตารางนี้เลย (แท็บ "รับเลี้ยง" ในโปรไฟล์
-- เป็นหน้าว่างตายตัว ไม่ได้ query) จึงปิดตายทั้งหมด — RLS เปิดอยู่ + ไม่มี policy = ไม่มีใครเข้าถึงได้
-- ถ้าวันหน้าจะใช้จริง ค่อยเขียน policy ใหม่ให้ตรงกับที่โค้ดต้องการ
do $$
declare p record;
begin
  for p in
    select tablename, policyname from pg_policies
    where schemaname = 'public' and tablename in ('adoptions', 'captures', 'wishlist')
  loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;

-- ============================================================
-- 3. reports — SELECT เดิมเปิดให้คนที่ล็อกอินอ่านรายงานของ "ทุกคน"
-- ============================================================
-- policy authenticated_read_reports มี USING = true แปลว่าผู้ใช้ทั่วไปคนไหนก็อ่าน
-- พิกัด GPS / รายละเอียด / reporter_id ของเคสคนอื่นได้ทั้งหมด
--
-- แต่ลบทิ้งเฉยๆ ไม่ได้ เพราะหน้า "สัตว์หาย / พลัดหลง" ต้องให้ผู้ใช้ทั่วไป
-- เห็นรายงานของคนอื่นจริง ๆ (ดู LostAndFoundPage.jsx: โหลดรายการ)
--   - รายงานสถานะ 'ประกาศตามหาเจ้าของ'  = กระดานประกาศ
--   - รายงานต้นทางของสัตว์ที่เข้าศูนย์แล้วและตั้ง publish_mode = 'lost_and_found'
-- จึงเขียน policy ใหม่ให้ครอบเฉพาะสองกรณีนั้น แทนการเปิดทั้งตาราง
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reports' and cmd = 'SELECT'
  loop
    execute format('drop policy %I on public.reports', p.policyname);
  end loop;
end $$;

create policy reports_select on public.reports
  for select
  using (
    reporter_id = auth.uid()
    or public.is_staff()
    or status = 'ประกาศตามหาเจ้าของ'
    or exists (
      select 1 from public.animals a
      where a.report_id = reports.id and a.publish_mode = 'lost_and_found'
    )
  );

-- INSERT: policy เก่าเช็คแค่ "ล็อกอินหรือยัง" ผู้ใช้จึงยัด reporter_id เป็น id ของคนอื่นได้
-- เหลือไว้เฉพาะ reports_insert ที่บังคับ reporter_id = ตัวเอง
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'reports' and cmd = 'INSERT'
      and policyname <> 'reports_insert'
  loop
    execute format('drop policy %I on public.reports', p.policyname);
  end loop;
end $$;

-- UPDATE ของ reports ยังเปิดกว้างไว้เหมือนเดิมโดยตั้งใจ — ฟีเจอร์ "รวมเคสซ้ำ"
-- ใน ReportAnimal.jsx ต้องให้ผู้ใช้แนบรูป/รายละเอียดเข้าเคสที่คนอื่นแจ้งไว้ก่อน
-- ปิดให้สนิทต้องย้าย flow นั้นไปเป็น RPC เหมือน admin_set_user_role ซึ่งยังไม่ได้ทำ

-- ============================================================
-- 4. animals — ลบ policy ซ้ำซ้อน ให้เหลือชุดเดียว
-- ============================================================
-- authenticated_read_animals (USING = true) ผลลัพธ์เท่ากับ animals_select สำหรับผู้ใช้ที่ล็อกอิน
-- ส่วน staff_insert_animals / staff_update_animals ซ้ำกับ animals_write (ALL, is_staff)
-- ลบของซ้ำเพื่อให้เหลือแหล่งความจริงเดียว พฤติกรรมไม่เปลี่ยน
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'animals'
      and policyname not in ('animals_select', 'animals_write')
  loop
    execute format('drop policy %I on public.animals', p.policyname);
  end loop;
end $$;

-- ============================================================
-- 5. ตรวจผลลัพธ์
-- ============================================================
select tablename || '  |  ' || cmd || '  |  ' || policyname
       || '  |  USING=' || coalesce(qual, '-')
       || '  |  CHECK=' || coalesce(with_check, '-') as policy
from pg_policies
where schemaname = 'public'
order by tablename, cmd, policyname;
