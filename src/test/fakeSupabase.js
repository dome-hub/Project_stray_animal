// fakeSupabase.js — Supabase ปลอมแบบ in-memory สำหรับ integration test ของหน้าเว็บ
//
// ทำไมไม่ต่อฐานข้อมูลจริง: เทสต์ต้องรันซ้ำได้ทุกครั้งผลเหมือนเดิม ไม่เขียนข้อมูลลง production และไม่พึ่งเน็ต
// ตัวนี้เลียนแบบเฉพาะส่วนของ query builder ที่หน้าเว็บของเราเรียกใช้จริง (select/insert/update/delete + ตัวกรอง)
// และจดทุกคำสั่งที่เขียนไว้ใน db.calls ให้เทสต์ตรวจได้ เช่น "กดส่ง 3 ครั้งต้อง insert reports แค่ครั้งเดียว"
//
// วิธีใช้ในไฟล์เทสต์:
//   vi.mock('../supabase', async () => ({ supabase: (await import('../test/fakeSupabase.js')).supabaseปลอม }))
//   beforeEach(() => รีเซ็ตฐานข้อมูลปลอม({ tables: { animals: [...] }, rpc: { get_shelter_contact: [...] } }))

import { vi } from 'vitest'

export const db = {
  tables: {},        // { ชื่อตาราง: [แถว...] }
  rpc: {},           // { ชื่อฟังก์ชัน: ค่าที่คืน | (args) => ค่าที่คืน | { data, error } }
  errors: {},        // { 'ตาราง:คำสั่ง': 'ข้อความ error' }  เช่น 'lost_pets:update'
  delay: {},         // { 'ตาราง:คำสั่ง': มิลลิวินาที }  จำลองเครือข่ายช้า
  calls: [],         // ทุกคำสั่งที่ยิงเข้าตาราง: { table, op, payload, eqs }
  rpcCalls: [],      // ทุก rpc: { name, args }
  uploads: [],       // ทุกไฟล์ที่อัปโหลดเข้า storage: { bucket, key, file }
  user: { id: 'u-test' },
}

export function รีเซ็ตฐานข้อมูลปลอม(ข้อมูล = {}) {
  db.tables = structuredClone(ข้อมูล.tables || {})
  db.rpc = ข้อมูล.rpc || {}
  db.errors = ข้อมูล.errors || {}
  db.delay = ข้อมูล.delay || {}
  db.calls = []
  db.rpcCalls = []
  db.uploads = []
  db.user = ข้อมูล.user === undefined ? { id: 'u-test' } : ข้อมูล.user
  supabaseปลอม.auth.signUp.mockClear()
  supabaseปลอม.auth.signInWithPassword.mockClear()
  supabaseปลอม.auth.resetPasswordForEmail.mockClear()
}

const รอ = (ms) => new Promise((r) => setTimeout(r, ms))

// '("a","b")' → ['a','b'] (รูปแบบที่ .not('col','in', ...) ส่งมา)
function แยกรายการ(ข้อความ) {
  return String(ข้อความ).replace(/^\(|\)$/g, '').split(',').map((s) => s.trim().replace(/^"|"$/g, ''))
}

function เท่ากัน(a, b) {
  if (a == null || b == null) return a === b
  return String(a) === String(b)
}

class Query {
  constructor(table) {
    this.table = table
    this.op = 'select'
    this.filters = []
    this.eqs = {}
    this.orders = []
    this.limitN = null
    this.mode = 'many'      // many | single | maybe
    this.returning = false  // insert/update ที่ต่อ .select() = ขอแถวกลับมา
    this.payload = null
    this.opts = {}
  }

  select(_cols, opts) {
    if (this.op === 'select') this.opts = opts || {}
    else this.returning = true
    return this
  }
  insert(p)  { this.op = 'insert'; this.payload = p; return this }
  update(p)  { this.op = 'update'; this.payload = p; return this }
  upsert(p)  { this.op = 'insert'; this.payload = p; return this }
  delete()   { this.op = 'delete'; return this }

  // เทียบแบบ Postgres: ค่าจาก URL เป็นสตริง ('25') แต่คอลัมน์ id เป็นตัวเลข (25) ต้องถือว่าเท่ากัน
  eq(c, v)  { this.eqs[c] = v; this.filters.push((r) => เท่ากัน(r[c], v)); return this }
  neq(c, v) { this.filters.push((r) => !เท่ากัน(r[c], v)); return this }
  in(c, arr) { this.filters.push((r) => arr.some((x) => เท่ากัน(r[c], x))); return this }
  gte(c, v) { this.filters.push((r) => r[c] >= v); return this }
  lte(c, v) { this.filters.push((r) => r[c] <= v); return this }
  not(c, op, v) {
    if (op === 'in')      this.filters.push((r) => !แยกรายการ(v).includes(r[c]))
    else if (op === 'is') this.filters.push((r) => (v === null ? r[c] != null : r[c] !== v))
    else if (op === 'eq') this.filters.push((r) => r[c] !== v)
    return this
  }
  order(c, { ascending = true } = {}) { this.orders.push({ c, ascending }); return this }
  limit(n) { this.limitN = n; return this }
  single() { this.mode = 'single'; return this }
  maybeSingle() { this.mode = 'maybe'; return this }

  then(resolve, reject) { return this._run().then(resolve, reject) }

  async _run() {
    const คีย์ = `${this.table}:${this.op}`
    if (db.delay[คีย์]) await รอ(db.delay[คีย์])
    const payload = this.payload
    db.calls.push({ table: this.table, op: this.op, payload, eqs: { ...this.eqs } })
    if (db.errors[คีย์]) return { data: null, error: { message: db.errors[คีย์] } }

    const แถวทั้งหมด = (db.tables[this.table] ||= [])
    const ตรงเงื่อนไข = () => แถวทั้งหมด.filter((r) => this.filters.every((f) => f(r)))

    if (this.op === 'insert') {
      const ใหม่ = (Array.isArray(payload) ? payload : [payload]).map((p) => ({
        id: Math.max(0, ...แถวทั้งหมด.map((r) => Number(r.id) || 0)) + 1,
        created_at: new Date().toISOString(),
        ...p,
      }))
      แถวทั้งหมด.push(...ใหม่)
      return this._ผล(this.returning ? ใหม่ : null)
    }

    if (this.op === 'update') {
      const แถว = ตรงเงื่อนไข()
      แถว.forEach((r) => Object.assign(r, payload))
      return this._ผล(this.returning ? แถว : null)
    }

    if (this.op === 'delete') {
      const ลบ = new Set(ตรงเงื่อนไข())
      db.tables[this.table] = แถวทั้งหมด.filter((r) => !ลบ.has(r))
      return this._ผล(null)
    }

    // select
    let แถว = ตรงเงื่อนไข()
    for (const { c, ascending } of [...this.orders].reverse()) {
      แถว = [...แถว].sort((a, b) => (a[c] > b[c] ? 1 : a[c] < b[c] ? -1 : 0) * (ascending ? 1 : -1))
    }
    if (this.limitN != null) แถว = แถว.slice(0, this.limitN)
    if (this.opts.count) return { data: this.opts.head ? null : แถว, count: แถว.length, error: null }
    return this._ผล(แถว)
  }

  _ผล(แถว) {
    if (แถว == null) return { data: null, error: null }
    if (this.mode === 'single') {
      return แถว.length === 1
        ? { data: แถว[0], error: null }
        : { data: null, error: { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' } }
    }
    if (this.mode === 'maybe') return { data: แถว[0] ?? null, error: null }
    return { data: แถว, error: null }
  }
}

export const supabaseปลอม = {
  from: (table) => new Query(table),

  rpc: async (name, args) => {
    db.rpcCalls.push({ name, args })
    const ค่า = db.rpc[name]
    if (ค่า === undefined) return { data: null, error: { message: `Could not find the function public.${name} in the schema cache` } }
    const ผล = typeof ค่า === 'function' ? await ค่า(args) : ค่า
    if (ผล && typeof ผล === 'object' && !Array.isArray(ผล) && ('data' in ผล || 'error' in ผล)) {
      return { data: ผล.data ?? null, error: ผล.error ? { message: ผล.error } : null }
    }
    return { data: ผล, error: null }
  },

  auth: {
    getSession: async () => ({ data: { session: db.user ? { user: db.user } : null }, error: null }),
    getUser: async () => ({ data: { user: db.user }, error: null }),
    onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    signUp: vi.fn(async () => ({ data: {}, error: null })),
    signInWithPassword: vi.fn(async () => ({ data: {}, error: null })),
    resetPasswordForEmail: vi.fn(async () => ({ data: {}, error: null })),
    signOut: vi.fn(async () => ({ error: null })),
    updateUser: vi.fn(async () => ({ data: {}, error: null })),
  },

  // Realtime: เทสต์ไม่ส่งเหตุการณ์ แค่ให้ subscribe/removeChannel เรียกได้โดยไม่ error
  channel: () => {
    const ช่อง = { on: () => ช่อง, subscribe: (cb) => { if (cb) cb('SUBSCRIBED'); return ช่อง } }
    return ช่อง
  },
  removeChannel: () => {},

  storage: {
    from: (bucket) => ({
      upload: async (key, file) => {
        db.uploads.push({ bucket, key, file })
        if (db.errors['storage:upload']) return { data: null, error: { message: db.errors['storage:upload'] } }
        return { data: { path: key }, error: null }
      },
      getPublicUrl: (path) => ({ data: { publicUrl: `https://files.test/${path}` } }),
      remove: async () => ({ data: [], error: null }),
    }),
  },

  functions: { invoke: async () => ({ data: {}, error: null }) },
}

// ─── ตัวช่วยสร้างข้อมูลทดสอบ ───
export const วันที่ผ่านมา = (วัน) => new Date(Date.now() - วัน * 24 * 60 * 60 * 1000).toISOString()
