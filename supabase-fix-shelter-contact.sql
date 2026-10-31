-- supabase-fix-shelter-contact.sql
-- แก้: หน้าติดตามรายงานของผู้ใช้ทั่วไป ช่อง "ข้อมูลเจ้าหน้าที่ผู้รับผิดชอบ" ค้างที่ "กำลังโหลด..."
--
-- สาเหตุ: policy users_select ในฐานข้อมูลจริง (จาก supabase/rls_hardening.sql) ให้ดูได้แค่แถวตัวเอง
-- หรือเป็น staff ผู้ใช้ทั่วไปจึงอ่านแถวของ volunteer ไม่ได้ → query คืน [] (ไม่ error) → ค้าง
--
-- วิธีแก้: ไม่เปิด users ให้อ่านทั้งตาราง (จะเห็นอีเมล/role ของทุกคน) แต่ทำฟังก์ชัน SECURITY DEFINER
-- ที่คืนเฉพาะข้อมูลติดต่อที่ตั้งใจให้ผู้แจ้งเห็น (ชื่อ เบอร์ ศูนย์ ที่ตั้ง พื้นที่ รูปโปรไฟล์) เท่านั้น
-- รันซ้ำได้ปลอดภัย

create or replace function public.get_shelter_contact()
returns table (
  name             text,
  phone            text,
  shelter_name     text,
  shelter_location text,
  service_area     text,
  avatar_url       text
)
language sql
stable
security definer
set search_path = public
as $$
  select u.name, u.phone, u.shelter_name, u.shelter_location, u.service_area, u.avatar_url
  from public.users u
  where u.role = 'volunteer'
    and u.shelter_name is not null
  order by u.name
  limit 1;
$$;

revoke all on function public.get_shelter_contact() from public;
grant execute on function public.get_shelter_contact() to authenticated;

notify pgrst, 'reload schema';
