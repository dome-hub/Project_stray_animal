-- add_avatar_to_signup.sql — ดึงรูปโปรไฟล์จาก Google มาใส่ตอนสมัครสมาชิก
--
-- trigger handle_new_user เดิมคัดลอกแค่ id / email / name / role / status
-- แต่ Google ส่ง metadata มาให้ครบกว่านั้น ตรวจจาก session จริงแล้วมีทั้ง
-- avatar_url และ picture (คีย์เดียวกัน ค่าเดียวกัน — Supabase ใส่ให้ทั้งคู่)
-- ผลคือผู้ใช้ที่สมัครด้วย Google ไม่มีรูปโปรไฟล์ ทั้งที่มีรูปอยู่แล้ว
-- และหน้าเจ้าหน้าที่ที่แสดงรูปผู้แจ้ง (VolunteerPage) ก็ขึ้นเป็นไอคอนเปล่า
--
-- สมัครด้วยอีเมล/รหัสผ่านจะไม่มีสองคีย์นี้ → ได้ null ซึ่งถูกต้องอยู่แล้ว
--
-- รันใน Supabase Dashboard -> SQL Editor

-- ============================================================
-- 1. แก้ trigger — ของเดิมคงไว้ทุกบรรทัด เพิ่มแค่ avatar_url
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
-- ตั้ง search_path ให้ชัด เป็นแนวปฏิบัติของฟังก์ชัน security definer
-- กันกรณีมีคนสร้าง schema ชื่อซ้ำมาแทรกหน้า public แล้วฟังก์ชันไปเขียนผิดตาราง
set search_path = public
as $function$
begin
  insert into public.users (id, email, name, role, status, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    'user',
    'active',
    -- Google ใส่มาทั้ง avatar_url และ picture เผื่อผู้ให้บริการอื่นในอนาคตส่งมาคีย์เดียว
    coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture')
  )
  on conflict (id) do nothing;
  return new;
end;
$function$;

-- ============================================================
-- 2. เติมรูปย้อนหลังให้คนที่สมัครด้วย Google ไปแล้วก่อนหน้านี้
-- ============================================================
-- แตะเฉพาะแถวที่ avatar_url ยังว่าง — คนที่อัปโหลดรูปเองไว้แล้วจะไม่ถูกทับ
update public.users u
set avatar_url = coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture')
from auth.users a
where a.id = u.id
  and u.avatar_url is null
  and coalesce(a.raw_user_meta_data->>'avatar_url', a.raw_user_meta_data->>'picture') is not null;

-- ============================================================
-- 3. ตรวจผล
-- ============================================================
select
  email,
  name,
  case when avatar_url is null then 'ไม่มีรูป' else 'มีรูปแล้ว' end as รูปโปรไฟล์
from public.users
order by created_at desc
limit 10;
