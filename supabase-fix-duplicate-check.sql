-- supabase-fix-duplicate-check.sql
-- แก้: เตือนเคสซ้ำตอนแจ้งสัตว์จร ใช้ไม่ได้ข้ามผู้ใช้
--
-- สาเหตุ: หน้าแจ้ง (ReportAnimal.jsx) อ่านตาราง reports ตรงๆ แต่ policy reports_select ให้ผู้ใช้ทั่วไป
-- อ่านได้แค่รายงานของตัวเอง (หรือถ้าเป็น staff ถึงอ่านได้ทั้งหมด) การเช็ค "มีคนแจ้งตรงนี้แล้วหรือยัง"
-- จึงเห็นแต่เคสของตัวเอง ถ้าคนละบัญชีแจ้งสัตว์ตัวเดียวกันก็ไม่เตือน
--
-- วิธีแก้: ไม่เปิด reports ให้อ่านทั้งตาราง (จะเห็นรายละเอียด/ผู้แจ้งของทุกเคส) แต่ทำฟังก์ชัน SECURITY DEFINER
-- ที่รับพิกัด แล้วคืน "เคสที่ยังไม่ปิดที่ใกล้ที่สุดในรัศมี" เพียงเคสเดียว เฉพาะคอลัมน์ที่โมดัลเตือนใช้โชว์
-- (ไม่คืน reporter_id / รายละเอียดที่ผู้แจ้งพิมพ์ / เบอร์) — แนวเดียวกับ แนบข้อมูลเข้าเคสซ้ำ
--
-- รายการสถานะปิดเคสต้องตรงกับ src/pages/ReportAnimal.jsx (สถานะปิดเคส) และ
-- supabase-fix-attach-rejected-case.sql — ถ้าเพิ่มสถานะปิดใหม่ ต้องแก้ทั้ง 3 ที่
-- รันซ้ำได้ปลอดภัย (create or replace)

create or replace function public.find_nearby_open_report(
  p_lat    double precision,
  p_lng    double precision,
  p_radius integer default 100
)
returns table (
  id          bigint,
  animal_type text,
  image_url   text,
  status      text,
  latitude    double precision,
  longitude   double precision,
  created_at  timestamptz,
  distance_m  double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    d.id, d.animal_type, d.image_url, d.status, d.latitude, d.longitude, d.created_at, d.distance_m
  from (
    select
      r.id::bigint                      as id,
      r.animal_type::text               as animal_type,
      r.image_url::text                 as image_url,
      r.status::text                    as status,
      r.latitude::double precision      as latitude,
      r.longitude::double precision     as longitude,
      r.created_at::timestamptz         as created_at,
      6371000 * 2 * asin(sqrt(
        power(sin(radians(r.latitude::double precision - p_lat) / 2), 2)
        + cos(radians(p_lat)) * cos(radians(r.latitude::double precision))
          * power(sin(radians(r.longitude::double precision - p_lng) / 2), 2)
      ))                                as distance_m
    from public.reports r
    where auth.uid() is not null
      and r.latitude  is not null
      and r.longitude is not null
      -- กรอบสี่เหลี่ยมก่อน (~220 ม.) ลดจำนวนแถวที่ต้องคำนวณระยะ
      and r.latitude::double precision  between p_lat - 0.002 and p_lat + 0.002
      and r.longitude::double precision between p_lng - 0.002 and p_lng + 0.002
      and coalesce(r.status, '') <> all (array[
        'อยู่ศูนย์พักพิง', 'ส่งคืนเจ้าของสำเร็จ', 'มีผู้รับเลี้ยง',
        'ยุติการค้นหา', 'ปล่อยกลับถิ่นเดิม', 'เสียชีวิต', 'เคสซ้ำซ้อน', 'ยกเลิกโดยผู้แจ้ง',
        'ปฏิเสธ (ไม่เกี่ยวข้อง)'
      ])
  ) d
  where d.distance_m <= greatest(1, least(p_radius, 500))
  order by d.distance_m
  limit 1;
$$;

revoke all on function public.find_nearby_open_report(double precision, double precision, integer) from public;
grant execute on function public.find_nearby_open_report(double precision, double precision, integer) to authenticated;

notify pgrst, 'reload schema';
