-- rls_hardening_3.sql — ตัดสิทธิ์ที่ให้เกินจำเป็นออกจาก notifications
--
-- rls_hardening.sql เขียน policy ของ notifications เป็น (user_id = auth.uid() OR is_staff())
-- ทั้ง SELECT / UPDATE / DELETE ผลคือเจ้าหน้าที่และแอดมินอ่านการแจ้งเตือนส่วนตัว
-- ของผู้ใช้ทุกคนได้ (ทดสอบจริง: user เห็น 34 แถว ส่วน volunteer/admin เห็น 39 แถว
-- = เห็นของคนอื่นด้วย)
--
-- ไล่โค้ดแล้วไม่มีหน้าไหนต้องใช้สิทธิ์นั้นเลย:
--   NotificationPage — role 'user' เท่านั้นที่อ่านตาราง notifications และกรอง user_id ของตัวเอง
--                      role volunteer/admin ดึงจาก reports แทน และเก็บสถานะอ่าน/ลบไว้ใน localStorage
--   Home.jsx         — รูปแบบเดียวกัน (user นับจาก notifications, staff นับจาก reports)
--
-- INSERT ยังต้องมี is_staff() ต่อไป เพราะเจ้าหน้าที่เป็นคนสร้างการแจ้งเตือน
-- ส่งให้ผู้แจ้ง (VolunteerPage insert ด้วย user_id = report.reporter_id)
--
-- รันใน Supabase Dashboard -> SQL Editor

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications
  for select
  using (user_id = auth.uid());

drop policy if exists notifications_update on public.notifications;
create policy notifications_update on public.notifications
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

drop policy if exists notifications_delete on public.notifications;
create policy notifications_delete on public.notifications
  for delete
  using (user_id = auth.uid());

-- ตรวจผล — ควรเหลือ is_staff() เฉพาะบรรทัด INSERT
select cmd || '  |  ' || policyname
       || '  |  USING=' || coalesce(qual, '-')
       || '  |  CHECK=' || coalesce(with_check, '-') as policy
from pg_policies
where schemaname = 'public' and tablename = 'notifications'
order by cmd;
