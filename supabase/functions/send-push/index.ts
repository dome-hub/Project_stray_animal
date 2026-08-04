// send-push — ส่งแจ้งเตือนเด้งขึ้นมือถือผ่าน Firebase Cloud Messaging
//
// ถูกเรียกโดย Database Webhook ของ Supabase ทุกครั้งที่มีแถวใหม่ในตาราง notifications
// (ตั้งค่าที่ Dashboard → Database → Webhooks — ดูขั้นตอนในแชท)
// จึงไม่ต้องแก้โค้ดฝั่งแอปที่สร้าง notification อยู่แล้วเลยสักบรรทัด
// ทั้ง VolunteerPage (อัปเดตสถานะ/รับเรื่อง) และ ReportAnimal (ส่งรายงาน) ได้ push ทันที
//
// ต้องตั้ง secret ก่อนใช้:
//   supabase secrets set FCM_SERVICE_ACCOUNT='<เนื้อหาไฟล์ service account json ทั้งไฟล์>'
//
// FCM HTTP v1 ต้องใช้ OAuth access token ที่เซ็นด้วย service account
// จึงต้องสร้าง JWT เองแล้วแลกเป็น token (Deno ไม่มี googleapis ให้ใช้)

import { createClient } from 'jsr:@supabase/supabase-js@2'

const FCM_SCOPE = 'https://www.googleapis.com/auth/firebase.messaging'

// ---- แปลง PEM เป็น CryptoKey สำหรับเซ็น JWT ----
function pemToArrayBuffer(pem: string): ArrayBuffer {
  const base64 = pem
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s/g, '')
  const raw = atob(base64)
  const buf = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) buf[i] = raw.charCodeAt(i)
  return buf.buffer
}

function base64url(input: string | Uint8Array): string {
  const bytes = typeof input === 'string' ? new TextEncoder().encode(input) : input
  let bin = ''
  bytes.forEach((b) => { bin += String.fromCharCode(b) })
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

// ---- ขอ access token จาก Google ด้วย service account ----
async function ขอAccessToken(sa: { client_email: string; private_key: string }): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const claim = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: FCM_SCOPE,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
  }))

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(`${header}.${claim}`),
  )
  const jwt = `${header}.${claim}.${base64url(new Uint8Array(sig))}`

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  })
  if (!res.ok) throw new Error(`ขอ access token ไม่สำเร็จ: ${await res.text()}`)
  return (await res.json()).access_token
}

Deno.serve(async (req) => {
  try {
    const saRaw = Deno.env.get('FCM_SERVICE_ACCOUNT')
    if (!saRaw) return new Response('ยังไม่ได้ตั้ง FCM_SERVICE_ACCOUNT', { status: 500 })
    const sa = JSON.parse(saRaw)

    // Database Webhook ส่งมาในรูป { type, table, record, old_record }
    const body = await req.json()
    const noti = body?.record
    if (!noti?.user_id) return new Response('ไม่มี user_id ในข้อมูล', { status: 200 })

    // service role เพื่ออ่าน device_tokens ของคนอื่น (RLS เปิดให้เจ้าของอ่านเองเท่านั้น)
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: tokens, error } = await admin
      .from('device_tokens')
      .select('token')
      .eq('user_id', noti.user_id)

    if (error) throw error
    if (!tokens?.length) {
      // ไม่ใช่ error — ผู้ใช้คนนี้ยังไม่เคยเปิดแอปบนมือถือ หรือไม่อนุญาตแจ้งเตือน
      return new Response(JSON.stringify({ ส่ง: 0, เหตุผล: 'ไม่มีเครื่องที่ลงทะเบียนไว้' }), { status: 200 })
    }

    const accessToken = await ขอAccessToken(sa)

    // เลขรายงานอยู่ใน title หรือ body — ดึงมาทำลิงก์เปิดหน้าติดตามเคสนั้นตรงๆ
    const m = String(`${noti.title || ''} ${noti.body || ''}`).match(/#(\d+)/)
    const path = m ? `/track?open=${parseInt(m[1], 10)}` : '/notifications'

    const ผล = await Promise.all(tokens.map(async ({ token }) => {
      const res = await fetch(
        `https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              token,
              notification: { title: noti.title || 'แจ้งจร', body: noti.body || '' },
              data: { path },
              android: { priority: 'HIGH', notification: { channel_id: 'default' } },
            },
          }),
        },
      )
      if (res.ok) return { token, ok: true }

      const ข้อความ = await res.text()
      // token ที่เครื่องถอนแอปไปแล้วจะคืน UNREGISTERED/INVALID_ARGUMENT
      // ต้องลบทิ้ง ไม่งั้นตารางจะบวมและยิงซ้ำทุกครั้งไปเรื่อยๆ
      if (/UNREGISTERED|INVALID_ARGUMENT|NOT_FOUND/.test(ข้อความ)) {
        await admin.from('device_tokens').delete().eq('token', token)
      }
      return { token, ok: false, ข้อความ: ข้อความ.slice(0, 200) }
    }))

    return new Response(JSON.stringify({
      ส่งสำเร็จ: ผล.filter((r) => r.ok).length,
      ล้มเหลว: ผล.filter((r) => !r.ok),
    }), { status: 200, headers: { 'Content-Type': 'application/json' } })
  } catch (e) {
    console.error('ส่ง push ไม่สำเร็จ:', e)
    return new Response(JSON.stringify({ error: String(e?.message || e) }), { status: 500 })
  }
})
