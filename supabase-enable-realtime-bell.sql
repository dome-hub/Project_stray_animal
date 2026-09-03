-- =============================================================================
-- เปิด Realtime ให้ตาราง notifications และ reports
-- =============================================================================
-- ทำไมต้องมีไฟล์นี้:
-- Supabase จะส่งเหตุการณ์ realtime ให้เฉพาะตารางที่ถูกใส่ไว้ใน publication ชื่อ
-- supabase_realtime เท่านั้น ถ้าตารางไม่ได้อยู่ในนั้น โค้ดฝั่งแอปที่ subscribe
-- จะ "ต่อสำเร็จแต่ไม่มีเหตุการณ์เข้ามาเลย" — ไม่มี error ให้เห็น หาสาเหตุยากมาก
--
-- ตัวเลขบนกระดิ่งหน้า Home (src/pages/Home.jsx) พึ่งพา realtime ของ 2 ตารางนี้:
--   notifications -> ผู้ใช้ทั่วไป นับแถวของตัวเองที่ is_read = false
--   reports       -> เจ้าหน้าที่/แอดมิน นับเคสที่สถานะ 'รอดำเนินการ'
--
-- หมายเหตุเรื่องความปลอดภัย:
-- การเปิด realtime ไม่ได้ข้าม RLS — ผู้ใช้จะได้รับเหตุการณ์เฉพาะแถวที่ตัวเอง
-- มีสิทธิ์ SELECT ตาม policy เดิมอยู่แล้วเท่านั้น
--
-- วิธีใช้: Supabase Dashboard -> SQL Editor -> New query -> วางแล้วกด Run
-- =============================================================================


-- ── เพิ่มตารางเข้า publication (ถ้ายังไม่ได้เพิ่ม) ────────────────────────────
-- ใช้ DO block เพราะถ้าตารางอยู่ใน publication อยู่แล้วจะ error
-- 'relation is already member of publication' ซึ่งทำให้สคริปต์หยุดกลางคัน
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
    raise notice 'เพิ่ม notifications เข้า realtime แล้ว';
  else
    raise notice 'notifications อยู่ใน realtime อยู่แล้ว';
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'reports'
  ) then
    alter publication supabase_realtime add table public.reports;
    raise notice 'เพิ่ม reports เข้า realtime แล้ว';
  else
    raise notice 'reports อยู่ใน realtime อยู่แล้ว';
  end if;
end $$;


-- ── ตรวจสอบผล ────────────────────────────────────────────────────────────────
-- ต้องเห็น notifications และ reports อยู่ในผลลัพธ์
select schemaname, tablename
from pg_publication_tables
where pubname = 'supabase_realtime'
  and schemaname = 'public'
order by tablename;
