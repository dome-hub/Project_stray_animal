-- =============================================================================
-- แจ้งเตือนเจ้าหน้าที่เมื่อมีผู้ใช้แจ้งเคสสัตว์เข้ามาใหม่
-- =============================================================================
-- ปัญหาเดิม:
-- ตอนผู้ใช้ส่งรายงานใหม่ ระบบ insert แถวลง notifications ให้ "ตัวผู้แจ้งเอง" อย่างเดียว
-- (ข้อความ "ส่งรายงานสำเร็จ") ไม่มีการแจ้งใครฝั่งเจ้าหน้าที่เลย เจ้าหน้าที่จึงต้องเข้า
-- หน้า /volunteer/reports แล้วกดรีเฟรชเอง ถึงจะรู้ว่ามีเคสใหม่เข้ามา
--
-- ทำไมต้องใช้ RPC แทนการ insert ตรงๆ จากฝั่งแอป:
-- policy notifications_insert (ดู supabase-rls-policies.sql) เขียนไว้ว่า
--   with check ( auth.uid() = user_id  or  public.is_staff() )
-- แปลว่า "ผู้ใช้ทั่วไป insert ได้เฉพาะแถวที่ user_id เป็นตัวเอง" เท่านั้น
-- ถ้าให้ ReportAnimal.jsx ยิง insert แถวที่ user_id เป็นของเจ้าหน้าที่ตรงๆ จะโดน RLS
-- ปฏิเสธทันที ("new row violates row-level security policy")
--
-- การเปิด policy ให้ผู้ใช้ทั่วไป insert หา user_id ใครก็ได้ = ช่องโหว่ร้ายแรง
-- (ใครก็ยิงสแปมแจ้งเตือนใส่คนอื่นทั้งระบบได้) จึงใช้วิธีเดียวกับ แนบข้อมูลเข้าเคสซ้ำ คือ
-- ทำ SECURITY DEFINER function ที่ข้าม RLS ได้ "เฉพาะในขอบเขตที่ฟังก์ชันนี้อนุญาต"
-- และตรวจสอบเงื่อนไขให้แน่นก่อนเขียนทุกครั้ง
--
-- ด่านกันการใช้ผิดวัตถุประสงค์ในฟังก์ชันนี้:
--   1. ต้องล็อกอินอยู่
--   2. ต้องเป็นเจ้าของรายงานนั้นเองเท่านั้น (กันคนยิง RPC ตรงๆ ใส่เลขเคสมั่วเพื่อสแปม)
--   3. ถ้าเคสนี้เคยแจ้งเจ้าหน้าที่ไปแล้ว จะไม่ส่งซ้ำ (กันกรณี client ยิงซ้ำ)
--   4. เขียนได้เฉพาะตาราง notifications เท่านั้น แตะตารางอื่นไม่ได้เลย
--
-- ส่งหาใคร:
-- ส่งหา role = 'volunteer' เท่านั้น ไม่ส่งหา admin เพราะ:
--   - หน้ารายการเคส (/volunteer/reports) เปิดได้เฉพาะ role volunteer
--     (ดู ต้องRole ใน App.jsx ที่เช็คแบบตรงตัว user.role === role — admin จะโดนเด้งกลับ /home)
--   - งานของ admin คือดูแลระบบ (ผู้ใช้/พื้นที่/ตั้งค่า/ประวัติ) ไม่ใช่ลงพื้นที่รับเคส
-- ถ้าภายหลังอยากให้ admin ได้รับด้วย ให้แก้ where ด้านล่างเป็น
--   where u.role in ('volunteer', 'admin')
-- แล้วต้องแก้ path ใน supabase/functions/send-push/index.ts ให้ admin ไปหน้าที่เปิดได้ด้วย
--
-- ต้องแก้คู่กัน 2 ไฟล์:
--   1. src/pages/ReportAnimal.jsx  — เรียก RPC ตัวนี้หลังส่งรายงานสำเร็จ
--   2. supabase/functions/send-push/index.ts — ให้ deep link ของเจ้าหน้าที่ไปหน้าที่ถูก
--
-- วิธีใช้:
-- 1. เปิด Supabase Dashboard → SQL Editor → New query
-- 2. Copy ทั้งไฟล์นี้วางแล้วกด Run
-- 3. ทดสอบ: ล็อกอินเป็น user ทั่วไป ส่งรายงานใหม่ 1 เคส แล้วล็อกอินเป็น volunteer
--    เปิดหน้าการแจ้งเตือน ต้องเห็นการ์ด "เคสใหม่รอรับเรื่อง"
-- =============================================================================


create or replace function public.แจ้งเตือนเจ้าหน้าที่เคสใหม่(id_รายงาน bigint)
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
  -- ── ด่าน 1: ต้องล็อกอิน ──────────────────────────────────────────────────────
  if auth.uid() is null then
    raise exception 'ต้องเข้าสู่ระบบก่อน';
  end if;

  -- ── ด่าน 2: ต้องเป็นรายงานที่มีอยู่จริง และเป็นของคนที่เรียกเท่านั้น ──────────────
  select * into แถวรายงาน from public.reports where id = id_รายงาน;

  if not found then
    raise exception 'ไม่พบรายงานนี้';
  end if;

  if แถวรายงาน.reporter_id is distinct from auth.uid() then
    raise exception 'แจ้งเตือนเจ้าหน้าที่ได้เฉพาะรายงานของตัวเองเท่านั้น';
  end if;

  เลขเคส := lpad(id_รายงาน::text, 6, '0');

  -- ── ด่าน 3: กันส่งซ้ำ ────────────────────────────────────────────────────────
  -- ถ้ามีแถวแจ้งเตือนหัวข้อนี้ที่อ้างเลขเคสเดียวกันอยู่แล้ว แปลว่าเคยส่งไปแล้ว
  -- (เทียบทั้งหัวข้อและเลขเคส เพื่อไม่ให้ชนกับการ์ด "ส่งรายงานสำเร็จ" ของผู้แจ้งเอง
  --  ซึ่งมีเลขเคสเดียวกันแต่คนละหัวข้อ)
  if exists (
    select 1
    from public.notifications n
    where n.title = หัวข้อ
      and n.body like '%#' || เลขเคส || '%'
  ) then
    return 0;
  end if;

  -- ── ส่งจริง: หนึ่งแถวต่อเจ้าหน้าที่หนึ่งคน ────────────────────────────────────
  -- Database Webhook ของ Supabase จะจับ INSERT แต่ละแถวนี้ แล้วเรียก Edge Function
  -- send-push ไปยิง FCM ให้เอง (ตั้งค่าไว้ที่ Dashboard → Database → Webhooks)
  insert into public.notifications (user_id, title, body, type, is_read)
  select
    u.id,
    หัวข้อ,
    'มีรายงาน #' || เลขเคส
      || ' (' || coalesce(nullif(trim(แถวรายงาน.animal_type), ''), 'ไม่ระบุชนิด') || ')'
      || ' ที่ ' || coalesce(nullif(trim(แถวรายงาน.location_text), ''), 'ไม่ระบุตำแหน่ง')
      || ' — ความเร่งด่วน: ' || coalesce(nullif(trim(แถวรายงาน.urgency), ''), 'ปานกลาง'),
    'report_update',
    false
  from public.users u
  where u.role = 'volunteer'
    and u.id <> auth.uid();   -- ถ้าเจ้าหน้าที่เป็นคนแจ้งเคสเอง ไม่ต้องแจ้งเตือนตัวเอง

  get diagnostics จำนวนที่ส่ง = row_count;
  return จำนวนที่ส่ง;
end;
$$;

grant execute on function public.แจ้งเตือนเจ้าหน้าที่เคสใหม่(bigint) to authenticated;


-- ── ตรวจสอบว่าติดตั้งสำเร็จ ───────────────────────────────────────────────────
-- ต้องได้ 1 แถว: prosecdef = true (เป็น SECURITY DEFINER), pronargs = 1
select proname, pronargs, prosecdef
from pg_proc
where proname = 'แจ้งเตือนเจ้าหน้าที่เคสใหม่';

-- เช็คว่ามี volunteer อยู่กี่คนในระบบ (ถ้าได้ 0 แปลว่ายังไม่มีใครถูกตั้ง role นี้
-- ฟังก์ชันจะทำงานได้ปกติแต่จะไม่มีใครได้รับแจ้งเตือน)
select count(*) as จำนวนเจ้าหน้าที่ from public.users where role = 'volunteer';
