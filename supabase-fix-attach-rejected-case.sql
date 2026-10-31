-- =============================================================================
-- ให้ฟังก์ชันแนบข้อมูลเข้าเคสซ้ำ ถือว่าเคส "ปฏิเสธ (ไม่เกี่ยวข้อง)" เป็นเคสที่ปิดแล้ว
-- =============================================================================
-- ปัญหา: เจ้าหน้าที่กด "ปฏิเสธ (ไม่เกี่ยวข้อง)" แล้ว แต่รายการสถานะปิดเคสในฟังก์ชันนี้
-- ไม่มีสถานะนี้ ถ้าผู้แจ้งคนใหม่อยู่ใกล้เคสนั้นไม่เกิน 100 ม. แล้วกด "ใช่ ตัวเดียวกัน"
-- ข้อมูลจะถูกแนบเข้าเคสที่ปิดไปแล้ว ไม่มีเคสใหม่ถูกสร้าง และเจ้าหน้าที่ไม่เห็นรายงานจริง
--
-- ไฟล์นี้แก้เฉพาะฟังก์ชันตัวเดียว (create or replace) ไม่แตะ policy อื่น จึงรันซ้ำได้ปลอดภัย
-- เนื้อฟังก์ชันเหมือนใน supabase-fix-reports-update.sql ทุกอย่าง ต่างกันแค่เพิ่มสถานะ
-- 'ปฏิเสธ (ไม่เกี่ยวข้อง)' ในรายการ (ไม่ต้องรันไฟล์เดิมซ้ำ เพราะมันลบ/สร้าง policy ใหม่)
--
-- ต้องแก้คู่กับ src/pages/ReportAnimal.jsx (รายการ สถานะปิดเคส) — แก้ให้แล้ว
--
-- วิธีใช้: Supabase Dashboard -> SQL Editor -> New query -> วางทั้งไฟล์ -> Run
-- =============================================================================

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
    'ยุติการค้นหา', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'เคสซ้ำซ้อน', 'ยกเลิกโดยผู้แจ้ง',
    'ปฏิเสธ (ไม่เกี่ยวข้อง)'
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


-- ── ตรวจสอบผล ────────────────────────────────────────────────────────────────
-- ต้องได้ 1 แถว และคอลัมน์ มีสถานะปฏิเสธ = true
select
  p.proname                                          as ชื่อฟังก์ชัน,
  pg_get_function_identity_arguments(p.oid)          as พารามิเตอร์,
  position('ปฏิเสธ (ไม่เกี่ยวข้อง)' in p.prosrc) > 0 as มีสถานะปฏิเสธ
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname = 'แนบข้อมูลเข้าเคสซ้ำ';
