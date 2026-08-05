-- =============================================================================
-- Harden Supabase Storage bucket "report-images" — จำกัดชนิดไฟล์แบบ whitelist
-- =============================================================================
-- ทำไมต้องมีไฟล์นี้:
-- ฝั่ง client (src/utils/fileValidation.js) มีการตรวจไฟล์อยู่แล้ว 3 ชั้น
-- (นามสกุล + MIME type + magic bytes) แต่เป็นแค่การกันผู้ใช้พลาด/กันการโจมตีเบื้องต้น
-- ผู้โจมตีที่ตั้งใจสามารถเรียก Supabase Storage API ตรงๆ ด้วย anon key ข้ามหน้าเว็บได้
-- (anon key เป็น public by design) การป้องกันที่แท้จริงต้องบังคับที่ตัว bucket ฝั่ง
-- Supabase เอง ซึ่งจะเช็คทุก request ที่เข้ามา ไม่ว่าจะยิงผ่านหน้าเว็บหรือยิงตรง API
--
-- วิธีใช้:
-- 1. เปิด Supabase Dashboard ของโปรเจกต์นี้ → เมนู SQL Editor
-- 2. วางคำสั่งด้านล่างทั้งหมด แล้วกด Run
-- 3. ตรวจผลด้วยคำสั่ง SELECT ท้ายไฟล์ ว่าค่าถูกอัปเดตจริง
-- =============================================================================

update storage.buckets
set
  allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp'],
  file_size_limit     = 10485760  -- 10MB, ตรงกับ MAX_IMAGE_BYTES ใน fileValidation.js
where id = 'report-images';

-- ตรวจสอบว่าอัปเดตสำเร็จ
select id, allowed_mime_types, file_size_limit
from storage.buckets
where id = 'report-images';
