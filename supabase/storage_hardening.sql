-- storage_hardening.sql
--
-- src/utils/fileValidation.js already checks MIME type, extension, and
-- magic bytes in the browser before any upload — but that's a UI nicety,
-- not enforcement. Anyone can call the Supabase Storage REST API directly
-- with the public anon key (it's extractable from the built JS bundle) and
-- skip the browser check entirely. This locks the bucket itself down
-- server-side to match what fileValidation.js already enforces client-side.
--
-- Run this in the Supabase Dashboard -> SQL Editor. Confirm the bucket id
-- below ('report-images') matches your actual bucket name first — check
-- Storage in the dashboard sidebar.

update storage.buckets
set
  file_size_limit    = 10485760, -- 10MB, matches fileValidation.js
  allowed_mime_types  = array['image/jpeg', 'image/png', 'image/webp']
where id = 'report-images';

-- Sanity check — should show the values above, not null/empty
select id, file_size_limit, allowed_mime_types from storage.buckets where id = 'report-images';
