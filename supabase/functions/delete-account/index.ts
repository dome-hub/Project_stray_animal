// delete-account — Edge Function ลบบัญชีผู้ใช้ทั้งหมด (Right to be Forgotten)
// ใช้ Service Role Key ฝั่งเซิร์ฟเวอร์เท่านั้น จึง bypass RLS ได้ และทำงานเป็นชุดเดียว
//
// ลำดับสำคัญ (เพราะ foreign key constraint):
//   1. reports.reporter_id -> null   (เก็บรายงานไว้ แต่ตัดความเชื่อมโยงกับตัวบุคคล)
//   2. ลบ notifications ของ user นี้  (ข้อมูลส่วนตัว)
//   3. ลบ row ใน public.users        (ต้องลบก่อน ไม่งั้น auth.users ลบไม่ได้)
//   4. ลบ auth.users (บัญชี login จริง)
//
// ผู้เรียกลบได้แค่บัญชีของตัวเอง — ยืนยันตัวตนจาก JWT ที่ส่งมา ไม่รับ user id จาก client

import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function jsonResponse(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')
    const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

    if (!SUPABASE_URL || !ANON_KEY || !SERVICE_ROLE_KEY) {
      return jsonResponse({ step: 'env-check', error: 'Missing env vars' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return jsonResponse({ step: 'auth-header', error: 'Missing authorization header' }, 401)
    }

    // ยืนยันตัวตนผู้เรียกจาก JWT
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: userData, error: userError } = await userClient.auth.getUser()
    if (userError || !userData?.user) {
      return jsonResponse({ step: 'get-user', error: userError?.message || 'no user' }, 401)
    }
    const userId = userData.user.id

    // helper เรียก PostgREST / Auth Admin ด้วย service role ตรงๆ (เลี่ยงปัญหา SDK)
    const adminHeaders = {
      apikey: SERVICE_ROLE_KEY,
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    }

    // 1) ตัดความเชื่อมโยงรายงาน (เก็บรายงานไว้ในระบบ)
    const unlinkRes = await fetch(
      `${SUPABASE_URL}/rest/v1/reports?reporter_id=eq.${userId}`,
      { method: 'PATCH', headers: adminHeaders, body: JSON.stringify({ reporter_id: null }) }
    )
    if (!unlinkRes.ok) {
      return jsonResponse({ step: 'unlink-reports', status: unlinkRes.status, body: await unlinkRes.text().catch(() => '') }, 500)
    }

    // 2) ลบการแจ้งเตือนของผู้ใช้
    const notiRes = await fetch(
      `${SUPABASE_URL}/rest/v1/notifications?user_id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    )
    if (!notiRes.ok) {
      return jsonResponse({ step: 'delete-notifications', status: notiRes.status, body: await notiRes.text().catch(() => '') }, 500)
    }

    // 3) ลบ row ใน public.users (ต้องก่อนลบ auth.users)
    const profileRes = await fetch(
      `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}`,
      { method: 'DELETE', headers: adminHeaders }
    )
    if (!profileRes.ok) {
      return jsonResponse({ step: 'delete-profile', status: profileRes.status, body: await profileRes.text().catch(() => '') }, 500)
    }

    // 4) ลบบัญชี auth จริง
    const authRes = await fetch(
      `${SUPABASE_URL}/auth/v1/admin/users/${userId}`,
      { method: 'DELETE', headers: { apikey: SERVICE_ROLE_KEY, Authorization: `Bearer ${SERVICE_ROLE_KEY}` } }
    )
    if (!authRes.ok) {
      return jsonResponse({ step: 'delete-auth', status: authRes.status, body: await authRes.text().catch(() => '') }, 500)
    }

    return jsonResponse({ success: true }, 200)
  } catch (e) {
    return jsonResponse({ step: 'catch', error: e instanceof Error ? e.message : String(e) }, 500)
  }
})
