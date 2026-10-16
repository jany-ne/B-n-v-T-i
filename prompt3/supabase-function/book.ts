// Supabase Edge Function "book": kiểm tra Turnstile rồi mới lưu đơn đặt bàn.
// Tạo trong Supabase: Edge Functions > Deploy a new function > Via Editor, đặt tên "book", dán file này.
// Secret cần thêm (Edge Functions > Secrets): TURNSTILE_SECRET_KEY
// SUPABASE_URL và SUPABASE_SERVICE_ROLE_KEY được Supabase tự cấp, không cần thêm.

const ALLOWED_ORIGIN = 'https://jany-ne.github.io';

const cors = {
  'Access-Control-Allow-Origin': ALLOWED_ORIGIN,
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function reply(status: number, body: Record<string, unknown>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
  if (req.method !== 'POST') return reply(405, { error: 'method' });

  let payload: any;
  try {
    payload = await req.json();
  } catch {
    return reply(400, { error: 'json' });
  }
  const token = String(payload?.token ?? '');
  const b = payload?.booking ?? {};
  if (!token) return reply(400, { error: 'captcha' });

  // 1. Kiểm tra Turnstile với Cloudflare
  const verify = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      secret: Deno.env.get('TURNSTILE_SECRET_KEY') ?? '',
      response: token,
    }),
  });
  const result = await verify.json();
  if (!result.success) return reply(400, { error: 'captcha' });

  // 2. Kiểm tra dữ liệu đơn đặt bàn
  const name = String(b.name ?? '').trim();
  const phone = String(b.phone ?? '');
  const date = String(b.booking_date ?? '');
  const time = String(b.booking_time ?? '');
  const guests = Number(b.guests);
  const tableId = String(b.table_id ?? '');
  const note = b.note == null ? null : String(b.note).trim().slice(0, 500) || null;

  const valid =
    name.length >= 1 && name.length <= 100 &&
    /^(0|\+84)[0-9]{9}$/.test(phone) &&
    /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    /^\d{2}:\d{2}(:\d{2})?$/.test(time) && time.slice(0, 5) >= '09:00' && time.slice(0, 5) <= '21:30' &&
    Number.isInteger(guests) && guests >= 1 && guests <= 20 &&
    tableId.length > 0;
  if (!valid) return reply(400, { error: 'invalid' });

  const url = Deno.env.get('SUPABASE_URL')!;
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const headers = { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' };

  // 3. Bàn phải tồn tại và đủ chỗ
  const t = await fetch(`${url}/rest/v1/restaurant_tables?id=eq.${encodeURIComponent(tableId)}&select=seats`, { headers });
  const rows = await t.json();
  if (!Array.isArray(rows) || rows.length === 0 || guests > rows[0].seats) {
    return reply(400, { error: 'table' });
  }

  // 4. Lưu đơn. Ràng buộc trong cơ sở dữ liệu vẫn chặn đặt trùng giờ (trả 409).
  const ins = await fetch(`${url}/rest/v1/bookings`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=minimal' },
    body: JSON.stringify({
      name, phone, booking_date: date, booking_time: time, guests, table_id: tableId, note,
    }),
  });
  if (ins.status === 409) return reply(409, { error: 'conflict' });
  if (!ins.ok) return reply(400, { error: 'insert' });
  return reply(200, { ok: true });
});
