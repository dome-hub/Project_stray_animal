-- lost_pets_rls.sql — ปิดช่องโหว่ของตารางประกาศตามหาสัตว์เลี้ยง (lost_pets)
--
-- ตารางนี้ถูกสร้างทีหลัง จึงไม่เคยผ่านรอบ rls_hardening ทั้ง 3 ไฟล์มาก่อน
--
-- ปัญหา: LostAndFoundPage.jsx ตัดสินว่าใครแก้/ลบประกาศได้จากฝั่งหน้าเว็บอย่างเดียว
--   const เป็นเจ้าของ = !!user?.id && โพสต์.owner_id === user.id
-- ปุ่มแก้ไข/ลบจะโผล่เฉพาะเจ้าของก็จริง แต่ตัวคำสั่ง update/delete วิ่งตรงไป PostgREST
-- ใครก็ตามที่ล็อกอินแล้วเปิด DevTools (หรือยิง API เอง) จึงลบประกาศตามหาสัตว์ของคนอื่นได้ทั้งหมด
-- ถ้าตารางนี้ยังไม่เปิด RLS — ซึ่งเป็นค่าเริ่มต้นตอน create table ผ่าน Dashboard
--
-- เกณฑ์ที่ตั้ง:
--   SELECT — ผู้ที่ล็อกอินแล้วอ่านได้ทุกประกาศ (หน้า /lost-found และแบนเนอร์หน้าแรกอยู่หลัง login อยู่แล้ว)
--            ไม่เปิดให้ anon เพราะแถวนี้มี contact_phone ซึ่งเป็นข้อมูลส่วนบุคคล
--   INSERT — โพสต์ในชื่อตัวเองเท่านั้น (owner_id ต้องเป็น auth.uid())
--   UPDATE — เจ้าของประกาศ หรือเจ้าหน้าที่/แอดมิน (ต้องปิดประกาศเป็น 'เจอแล้ว' ให้ได้)
--   DELETE — เจ้าของประกาศ หรือแอดมิน (ไว้ลบประกาศที่ไม่เหมาะสม)
--
-- รันใน Supabase Dashboard -> SQL Editor

alter table public.lost_pets enable row level security;

-- ============================================================
-- 1. ล้าง policy เดิมทั้งหมดก่อน
-- ============================================================
-- policy เดิมอาจถูกตั้งชื่อเป็นภาษาไทยตอนกดผ่านหน้า Dashboard และ policy ใน Postgres
-- เป็นแบบ permissive (OR กัน) — ถ้าเหลือของเก่าที่ใช้ USING (true) ไว้แม้แต่อันเดียว
-- policy ใหม่ด้านล่างจะไม่มีผลอะไรเลย (บทเรียนจาก rls_hardening_2.sql)
do $$
declare p record;
begin
  for p in
    select policyname from pg_policies
    where schemaname = 'public' and tablename = 'lost_pets'
  loop
    execute format('drop policy %I on public.lost_pets', p.policyname);
  end loop;
end $$;

-- ============================================================
-- 2. ตั้ง policy ใหม่
-- ============================================================

create policy lost_pets_select on public.lost_pets
  for select
  to authenticated
  using (true);

create policy lost_pets_insert on public.lost_pets
  for insert
  to authenticated
  with check (owner_id = auth.uid());

-- is_staff() ถูกสร้างไว้แล้วใน rls_hardening.sql (SECURITY DEFINER + set search_path)
create policy lost_pets_update on public.lost_pets
  for update
  to authenticated
  using (owner_id = auth.uid() or is_staff())
  with check (owner_id = auth.uid() or is_staff());

create policy lost_pets_delete on public.lost_pets
  for delete
  to authenticated
  using (
    owner_id = auth.uid()
    or exists (select 1 from public.users u where u.id = auth.uid() and u.role = 'admin')
  );

-- ============================================================
-- 3. ตรวจผล — ต้องได้ 4 บรรทัด และไม่มีอันไหน USING=true นอกจาก SELECT
-- ============================================================
select cmd || '  |  ' || policyname
       || '  |  USING=' || coalesce(qual, '-')
       || '  |  CHECK=' || coalesce(with_check, '-') as policy
from pg_policies
where schemaname = 'public' and tablename = 'lost_pets'
order by cmd;
