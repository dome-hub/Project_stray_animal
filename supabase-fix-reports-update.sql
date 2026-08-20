-- =============================================================================
-- แก้ช่องโหว่ reports_update — ปิดสิทธิ์แก้ไขรายงานของคนอื่น (OWASP A01 Broken Access Control)
-- =============================================================================
-- ทำไมต้องมีไฟล์นี้:
-- ตรวจสอบ policy จริงบน production ด้วย
--   select cmd, policyname, qual, with_check from pg_policies
--   where schemaname='public' and tablename='reports';
-- พบว่าตาราง reports มี policy สำหรับ UPDATE พร้อมกัน 3 ตัว:
--   1) reports_update            USING (auth.uid() IS NOT NULL)        ← เปิดกว้างสุด
--   2) staff_update_reports      USING (is_staff())
--   3) users_can_unlink_own_reports USING (auth.uid() = reporter_id), CHECK (true)
--
-- Policy ใน Postgres เป็นแบบ permissive (OR กัน) ผ่านอันใดอันหนึ่งพอ — เพราะ (1)
-- กว้างกว่า (2) และ (3) ทุกกรณี (คนที่ is_staff() หรือเป็นเจ้าของรายงานก็ต้อง
-- login อยู่แล้วเสมอ) (2) และ (3) จึงไม่เคยมีผลจริงเลย ผลลัพธ์ตอนนี้คือ
-- "ผู้ใช้ที่ล็อกอินอยู่คนไหนก็ได้ แก้ไขฟิลด์ไหนก็ได้ของรายงานคนไหนก็ได้ในระบบ"
-- ไม่ใช่แค่ status/urgency/volunteer_notes ของคนอื่น แต่รวมถึง reporter_id เองด้วย
--
-- ที่มาของช่องโหว่: ตอนแรกเปิดไว้กว้างตั้งใจ เพราะฟีเจอร์ "แนบเข้าเคสเดิม" ใน
-- ReportAnimal.jsx (ตรวจจับเคสซ้ำในรัศมี 100 ม. แล้วให้ผู้แจ้งคนที่สองแนบรูป/
-- รายละเอียดเพิ่มเข้ารายงานของคนแรก) ต้องให้คนที่ไม่ใช่เจ้าของรายงานแก้ไข record
-- ของคนอื่นได้ — แต่แก้ปัญหาด้วยการเปิดทั้งตารางแทนที่จะเปิดเฉพาะสิ่งที่จำเป็นจริงๆ
--
-- ไฟล์นี้แก้โดย:
--   1. ลบ policy ทั้ง 3 ตัวข้างต้นทิ้ง (รวม users_can_unlink_own_reports ด้วย —
--      ไม่พบว่ามีโค้ดฝั่งแอปที่พึ่งพฤติกรรม "unlink" ของมันเลย และหลัง policy ใหม่
--      ด้านล่างมีผลแทนอยู่แล้วสำหรับกรณีที่เป็นเจ้าของรายงาน ถ้าจำได้ว่าตั้งใจสร้าง
--      ไว้ทำอะไรเป็นพิเศษ อย่าเพิ่งรันไฟล์นี้ — ทักมาคุยก่อน)
--   2. สร้าง policy reports_update ใหม่ที่แคบลง: เจ้าของรายงานเอง หรือ staff เท่านั้น
--   3. สร้างฟังก์ชัน RPC public.แนบข้อมูลเข้าเคสซ้ำ(...) เป็นทางเดียวที่ให้คนอื่น
--      (ที่ไม่ใช่เจ้าของ/ไม่ใช่ staff) แตะรายงานของคนอื่นได้ — จำกัดเฉพาะแก้
--      photos/detail/updated_at เท่านั้น และเช็คว่าเคสยังไม่ปิดก่อนเสมอ
--      (SECURITY DEFINER จึงข้าม RLS ได้เฉพาะภายในขอบเขตที่ฟังก์ชันนี้อนุญาตไว้)
--
-- ต้องแก้โค้ดคู่กัน: src/pages/ReportAnimal.jsx ฟังก์ชัน รวมเข้าเคสเดิม() ต้องเรียก
-- RPC ตัวนี้แทนการ .update() ตรงๆ — แก้ไปพร้อมกับไฟล์นี้แล้ว
--
-- วิธีใช้:
-- 1. เปิด Supabase Dashboard ของโปรเจกต์นี้ → SQL Editor → New query
-- 2. Copy ทั้งไฟล์นี้วางแล้วกด Run
-- 3. ทดสอบ: ลองแจ้งเคสซ้ำจริงในแอป (แจ้งจุดใกล้เคสที่ยังไม่ปิดในรัศมี 100 ม.)
--    กด "ใช่ ตัวเดียวกัน" ต้องแนบรูป/รายละเอียดสำเร็จเหมือนเดิม
--    แล้วลองเปิด DevTools ยิง supabase.from('reports').update(...) ไปที่รายงาน
--    ของคนอื่นตรงๆ (ไม่ผ่าน RPC) ต้องโดน RLS ปฏิเสธ
-- =============================================================================


-- ── 1. ลบ policy UPDATE เดิมทั้ง 3 ตัว ──────────────────────────────────────────
drop policy if exists reports_update on public.reports;
drop policy if exists staff_update_reports on public.reports;
drop policy if exists users_can_unlink_own_reports on public.reports;


-- ── 2. Policy ใหม่ที่แคบลง: เจ้าของรายงานเอง หรือ staff เท่านั้น ──────────────────
create policy reports_update on public.reports
  for update
  using (auth.uid() = reporter_id or public.is_staff())
  with check (auth.uid() = reporter_id or public.is_staff());


-- ── 3. RPC: ทางเดียวที่ให้คนอื่นแนบข้อมูลเข้ารายงานของคนอื่นได้ ──────────────────
-- จำกัดเฉพาะ photos/detail/updated_at, ล็อกแถวด้วย FOR UPDATE กันสองคนแนบพร้อมกัน
-- แล้วข้อมูลตีกัน, และปฏิเสธถ้าเคสปิดไปแล้ว (ตรงกับ สถานะปิดเคส ฝั่ง ReportAnimal.jsx)
create or replace function public.แนบข้อมูลเข้าเคสซ้ำ(
  id_เคส bigint,
  รูปใหม่ text,
  รายละเอียดเพิ่ม text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  แถวเดิม public.reports%rowtype;
  สถานะปิดเคส text[] := array[
    'อยู่ศูนย์พักพิง', 'ส่งคืนเจ้าของสำเร็จ', 'มีผู้รับเลี้ยง',
    'ยุติการค้นหา', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'เคสซ้ำซ้อน', 'ยกเลิกโดยผู้แจ้ง'
  ];
begin
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  select * into แถวเดิม from public.reports where id = id_เคส for update;

  if not found then
    raise exception 'ไม่พบรายงานนี้';
  end if;

  if แถวเดิม.status = any(สถานะปิดเคส) then
    raise exception 'เคสนี้ปิดไปแล้ว ไม่สามารถแนบข้อมูลเพิ่มได้';
  end if;

  update public.reports
  set
    photos = case
      when รูปใหม่ is not null and length(trim(รูปใหม่)) > 0
        then coalesce(แถวเดิม.photos, '{}'::text[]) || รูปใหม่
      else แถวเดิม.photos
    end,
    detail = case
      when รายละเอียดเพิ่ม is not null and length(trim(รายละเอียดเพิ่ม)) > 0
        then trim(both E'\n' from concat_ws(E'\n', แถวเดิม.detail, '[แจ้งเพิ่มเติม] ' || trim(รายละเอียดเพิ่ม)))
      else แถวเดิม.detail
    end,
    updated_at = now()
  where id = id_เคส;
end;
$$;

grant execute on function public.แนบข้อมูลเข้าเคสซ้ำ(bigint, text, text) to authenticated;


-- ── ตรวจสอบว่าติดตั้งสำเร็จ ───────────────────────────────────────────────────
-- ต้องเหลือ policy เดียวสำหรับ UPDATE บน reports (reports_update ตัวใหม่)
select cmd, policyname, qual as using_expr, with_check as check_expr
from pg_policies
where schemaname = 'public' and tablename = 'reports' and cmd = 'UPDATE';
