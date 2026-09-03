-- =============================================================================
-- แก้ชื่อฟังก์ชันที่ยาวเกินขีดจำกัดของ PostgreSQL + เก็บกวาดของที่ซ้ำ
-- =============================================================================
-- ปัญหาที่พบ:
-- PostgreSQL จำกัดชื่อ identifier ไว้ที่ 63 ไบต์ ตัวอักษรไทยกินตัวละ 3 ไบต์
-- ชื่อเดิม 'แจ้งเตือนเจ้าหน้าที่เคสใหม่' ยาว 27 ตัว = 81 ไบต์ -> เกิน
-- Postgres จึงตัดทิ้งเงียบๆ เหลือ 'แจ้งเตือนเจ้าหน้าที่เ' (21 ตัว = 63 ไบต์)
--
-- ผลคือ: แอปเรียกชื่อเต็ม 27 ตัว แต่ในฐานข้อมูลชื่อสั้น 21 ตัว
--        PostgREST หาไม่เจอ -> คืน 404 PGRST202
--        -> ไม่มีแถวแจ้งเตือนถูกสร้าง -> เจ้าหน้าที่ไม่ได้รับ push เลย
--        และเพราะแอป log error เงียบๆ (ตั้งใจ ไม่ให้ผู้แจ้งสับสน) จึงไม่มีใครเห็นปัญหา
--
-- ทางแก้: ตั้งชื่อใหม่ให้สั้นลง -> 'แจ้งเตือนเคสใหม่' (16 ตัว = 48 ไบต์ ปลอดภัย)
--
-- ⚠️ ต้องแก้คู่กับ src/pages/ReportAnimal.jsx (แก้ให้แล้ว) และต้อง deploy เว็บใหม่
--
-- วิธีใช้: Dashboard -> SQL Editor -> วางทั้งไฟล์ -> Run
-- =============================================================================


-- ── ขั้นที่ 1: สร้างฟังก์ชันชื่อใหม่ (เนื้อในเหมือนเดิมทุกประการ) ─────────────
create or replace function public.แจ้งเตือนเคสใหม่(id_รายงาน bigint)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  แถวรายงาน public.reports%rowtype;
  เลขเคส     text;
  หัวข้อ     constant text := 'เคสใหม่รอรับเรื่อง 🔔';
  จำนวนที่ส่ง integer := 0;
begin
  -- ด่าน 1: ต้องล็อกอิน
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  -- ด่าน 2: ต้องเป็นรายงานที่มีอยู่จริง และเป็นของคนที่เรียกเท่านั้น
  select * into แถวรายงาน from public.reports where id = id_รายงาน;
  if not found then
    raise exception 'ไม่พบรายงานนี้';
  end if;
  if แถวรายงาน.reporter_id is distinct from auth.uid() then
    raise exception 'แจ้งเตือนเจ้าหน้าที่ได้เฉพาะรายงานของตัวเองเท่านั้น';
  end if;

  เลขเคส := lpad(id_รายงาน::text, 6, '0');

  -- ด่าน 3: กันส่งซ้ำ
  if exists (
    select 1 from public.notifications n
    where n.title = หัวข้อ
      and n.body like concat('%#', เลขเคส, '%')
  ) then
    return 0;
  end if;

  -- ส่งจริง: หนึ่งแถวต่อเจ้าหน้าที่หนึ่งคน
  -- trigger push_on_notification จะจับ INSERT แต่ละแถวแล้วยิง FCM ต่อเอง
  insert into public.notifications (user_id, title, body, type, is_read)
  select
    u.id,
    หัวข้อ,
    concat(
      'มีรายงาน #', เลขเคส,
      ' (', coalesce(nullif(trim(แถวรายงาน.animal_type), ''), 'ไม่ระบุชนิด'), ')',
      ' ที่ ', coalesce(nullif(trim(แถวรายงาน.location_text), ''), 'ไม่ระบุตำแหน่ง'),
      ' — ความเร่งด่วน: ', coalesce(nullif(trim(แถวรายงาน.urgency), ''), 'ปานกลาง')
    ),
    'report_update',
    false
  from public.users u
  where u.role = 'volunteer'
    and u.id <> auth.uid();   -- ถ้าเจ้าหน้าที่แจ้งเคสเอง ไม่ต้องแจ้งเตือนตัวเอง

  get diagnostics จำนวนที่ส่ง = row_count;
  return จำนวนที่ส่ง;
end;
$$;

grant execute on function public.แจ้งเตือนเคสใหม่(bigint) to authenticated;


-- ── ขั้นที่ 2: ลบฟังก์ชันชื่อเก่าที่ถูกตัด (ถ้ามี) ───────────────────────────
-- ใช้ DO block ค้นหาเอง เพราะชื่อที่ถูกตัดพิมพ์ตามยาก
do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname like 'แจ้งเตือนเจ้าหน้าที่%'
  loop
    execute format('drop function %s', f.sig);
    raise notice 'ลบฟังก์ชันเก่า % แล้ว', f.sig;
  end loop;
end $$;


-- ── ขั้นที่ 3: ลบ trigger ซ้ำที่สร้างไว้ตอนหาสาเหตุ ──────────────────────────
-- เก็บไว้เฉพาะ push_on_notification (ตัวเดิมที่พิสูจน์แล้วว่าทำงานได้)
do $$
declare t record;
begin
  for t in
    select tr.tgname
    from pg_trigger tr
    join pg_class c on c.oid = tr.tgrelid
    join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public'
      and c.relname = 'notifications'
      and not tr.tgisinternal
      and tr.tgname like 'ยิงpush%'
  loop
    execute format('drop trigger %I on public.notifications', t.tgname);
    raise notice 'ลบ trigger % แล้ว', t.tgname;
  end loop;
end $$;

do $$
declare f record;
begin
  for f in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname like 'ยิงpush%'
  loop
    execute format('drop function %s', f.sig);
    raise notice 'ลบฟังก์ชัน % แล้ว', f.sig;
  end loop;
end $$;


-- ── ขั้นที่ 4: บอก PostgREST ให้รู้จักฟังก์ชันใหม่ทันที ──────────────────────
notify pgrst, 'reload schema';


-- ── ขั้นที่ 5: ตรวจผล ────────────────────────────────────────────────────────
-- ต้องได้ 1 แถว ชื่อ แจ้งเตือนเคสใหม่ ความยาว 16 (ไม่ถูกตัด)
select
  p.proname                                   as ชื่อฟังก์ชัน,
  length(p.proname)                           as จำนวนตัวอักษร,
  octet_length(p.proname)                     as จำนวนไบต์,
  pg_get_function_identity_arguments(p.oid)   as พารามิเตอร์,
  case when octet_length(p.proname) < 63 then 'ปลอดภัย ไม่ถูกตัด'
       else 'ยังเสี่ยงถูกตัด' end             as สถานะ
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname like 'แจ้งเตือน%';

-- ต้องเหลือ trigger เดียวคือ push_on_notification
select tgname as trigger_ที่เหลือ
from pg_trigger tr
join pg_class c on c.oid = tr.tgrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname = 'notifications'
  and not tr.tgisinternal;
