-- supabase-fix-lost-pets-expiry.sql
-- รองรับ "ต่ออายุประกาศตามหาสัตว์เลี้ยง" (หน้า /lost-found)
--
-- ประกาศแสดงต่อสาธารณะ 30 วันนับจาก created_at หรือ renewed_at (ถ้าเจ้าของกดต่ออายุ)
-- ต้องมีคอลัมน์ renewed_at ปุ่ม "ต่ออายุ" ถึงจะบันทึกได้ — ส่วนปุ่ม "เจอแล้ว" ไม่ต้องใช้คอลัมน์นี้
-- ไม่ต้องแก้ policy: lost_pets_update ให้เจ้าของประกาศแก้แถวตัวเองได้อยู่แล้ว (supabase/lost_pets_rls.sql)
-- รันซ้ำได้ปลอดภัย

alter table public.lost_pets
  add column if not exists renewed_at timestamptz;

notify pgrst, 'reload schema';

-- (ตรวจ) ถ้าปุ่ม "เจอแล้ว" บันทึกไม่ได้ ให้ดูว่ามี CHECK constraint บังคับค่า status ของ lost_pets หรือไม่
-- ถ้ามีและไม่รวม 'เจอแล้ว' ต้องเพิ่มค่านี้เข้าไปในเงื่อนไข
-- select conname, pg_get_constraintdef(oid) from pg_constraint
-- where conrelid = 'public.lost_pets'::regclass and contype = 'c';
